import { Hono } from "hono";
import WebSocket from "ws";

// Polyfill WebSocket for serverless
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket;
}

const wallet = new Hono();

/**
 * Middleware: authenticate attendee by token
 * Token comes as Bearer token or x-attendee-token header
 */
async function authAttendee(c, next) {
  const db = c.get("db");
  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.replace("Bearer ", "") || c.req.header("x-attendee-token");

  if (!token) {
    return c.json({ error: "Token requerido" }, 401);
  }

  const attendee = await db
    .prepare("SELECT * FROM attendees WHERE token = ?")
    .get(token);

  if (!attendee) {
    return c.json({ error: "Token inválido" }, 401);
  }

  // Update last_seen
  await db.prepare("UPDATE attendees SET last_seen_at = NOW() WHERE id = ?").run(attendee.id);

  c.set("attendee", attendee);
  await next();
}

wallet.use("*", authAttendee);

// ── GET /api/wallet/balance ──
wallet.get("/balance", async (c) => {
  const attendee = c.get("attendee");
  return c.json({
    balance: attendee.balance_sats,
    displayName: attendee.display_name,
    lightningAddress: attendee.lightning_address,
  });
});

// ── GET /api/wallet/transactions ──
wallet.get("/transactions", async (c) => {
  const db = c.get("db");
  const attendee = c.get("attendee");
  const limit = parseInt(c.req.query("limit") || "50");

  const txs = await db
    .prepare(
      "SELECT * FROM transactions WHERE attendee_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(attendee.id, limit);

  return c.json({
    transactions: txs.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount_sats,
      fee: tx.fee_sats || 0,
      description: tx.description,
      paymentHash: tx.payment_hash,
      createdAt: tx.created_at,
    })),
  });
});

// ── POST /api/wallet/pay ── pay a bolt11 invoice from custodial balance
wallet.post("/pay", async (c) => {
  const db = c.get("db");
  const attendee = c.get("attendee");
  const { invoice, description } = await c.req.json();

  if (!invoice) {
    return c.json({ error: "Invoice requerido" }, 400);
  }

  // Decode invoice to get amount
  let amountSats;
  try {
    amountSats = decodeBolt11Amount(invoice);
    if (!amountSats || amountSats <= 0) {
      return c.json({ error: "Invoice sin monto válido" }, 400);
    }
  } catch (err) {
    return c.json({ error: "Invoice inválido" }, 400);
  }

  // Check balance
  if (amountSats > attendee.balance_sats) {
    return c.json({ error: "Saldo insuficiente" }, 400);
  }

  // Get event NWC URL
  const nwcUrl = await getEventNwcUrl(db, attendee);
  if (!nwcUrl) {
    return c.json({ error: "Evento sin wallet configurada" }, 400);
  }

  // STEP 1: Deduct balance FIRST (safer — if payment fails, we refund)
  await db
    .prepare("UPDATE attendees SET balance_sats = balance_sats - ? WHERE id = ? AND balance_sats >= ?")
    .run(amountSats, attendee.id, amountSats);

  // Verify deduction happened
  const updated = await db.prepare("SELECT balance_sats FROM attendees WHERE id = ?").get(attendee.id);
  if (updated.balance_sats > attendee.balance_sats) {
    // Race condition — balance was already too low
    return c.json({ error: "Saldo insuficiente" }, 400);
  }

  // STEP 2: Pay via admin NWC
  try {
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });

    const result = await client.payInvoice({ invoice });
    await client.close();

    const feeSats = Math.floor((result.fees_paid || 0) / 1000);

    // Deduct fee if any
    if (feeSats > 0) {
      await db.prepare("UPDATE attendees SET balance_sats = balance_sats - ? WHERE id = ?").run(feeSats, attendee.id);
    }

    // Record transaction
    await db
      .prepare(
        "INSERT INTO transactions (attendee_id, type, amount_sats, fee_sats, description, payment_hash) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(attendee.id, "send", amountSats, feeSats, description || "Pago Lightning", result.payment_hash || null);

    const finalBalance = await db.prepare("SELECT balance_sats FROM attendees WHERE id = ?").get(attendee.id);

    return c.json({
      success: true,
      preimage: result.preimage,
      feePaid: feeSats,
      balance: finalBalance.balance_sats,
    });
  } catch (err) {
    // STEP 3: Payment failed — REFUND balance
    console.error("[Wallet] Pay failed, refunding:", err.message);
    await db.prepare("UPDATE attendees SET balance_sats = balance_sats + ? WHERE id = ?").run(amountSats, attendee.id);

    return c.json({ error: "Error al pagar: " + err.message }, 500);
  }
});

// ── POST /api/wallet/invoice ── create an invoice to receive sats
wallet.post("/invoice", async (c) => {
  const db = c.get("db");
  const attendee = c.get("attendee");
  const { amountSats, description } = await c.req.json();

  if (!amountSats || amountSats <= 0) {
    return c.json({ error: "Monto requerido" }, 400);
  }

  const nwcUrl = await getEventNwcUrl(db, attendee);
  if (!nwcUrl) {
    return c.json({ error: "Evento sin wallet configurada" }, 400);
  }

  try {
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });

    const result = await client.makeInvoice({
      amount: amountSats * 1000, // NIP-47 uses millisats
      description: description || `Pago a ${attendee.display_name} via SatsParty`,
    });
    await client.close();

    const invoice = result.invoice || result.paymentRequest || result.payment_request;
    const paymentHash = result.payment_hash;

    if (!invoice) {
      return c.json({ error: "No se pudo generar el invoice" }, 500);
    }

    return c.json({
      invoice,
      paymentHash,
      amountSats,
    });
  } catch (err) {
    console.error("[Wallet] Invoice error:", err.message);
    return c.json({ error: "Error generando invoice: " + err.message }, 500);
  }
});

// ── GET /api/wallet/check-invoice/:hash ── check if invoice was paid
wallet.get("/check-invoice/:hash", async (c) => {
  const db = c.get("db");
  const attendee = c.get("attendee");
  const paymentHash = c.req.param("hash");

  const nwcUrl = await getEventNwcUrl(db, attendee);
  if (!nwcUrl) {
    return c.json({ error: "Evento sin wallet configurada" }, 400);
  }

  try {
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });

    const result = await client.lookupInvoice({ payment_hash: paymentHash });
    await client.close();

    const paid = result.settled_at != null;
    const amountSats = Math.floor((result.amount || 0) / 1000);

    if (paid) {
      // Credit the attendee's balance
      await db.prepare("UPDATE attendees SET balance_sats = balance_sats + ? WHERE id = ?").run(amountSats, attendee.id);

      // Check if already recorded
      const existing = await db
        .prepare("SELECT id FROM transactions WHERE attendee_id = ? AND payment_hash = ?")
        .get(attendee.id, paymentHash);

      if (!existing) {
        await db
          .prepare(
            "INSERT INTO transactions (attendee_id, type, amount_sats, fee_sats, description, payment_hash) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .run(attendee.id, "receive", amountSats, 0, "Invoice recibido", paymentHash);
      }

      const updated = await db.prepare("SELECT balance_sats FROM attendees WHERE id = ?").get(attendee.id);
      return c.json({ paid: true, amount: amountSats, balance: updated.balance_sats });
    }

    return c.json({ paid: false });
  } catch (err) {
    console.error("[Wallet] Check invoice error:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ── HELPERS ──

/**
 * Get the NWC URL for the event this attendee belongs to
 */
async function getEventNwcUrl(db, attendee) {
  if (!attendee.event_id) return null;

  const event = await db
    .prepare("SELECT nwc_url FROM events WHERE id = ?")
    .get(attendee.event_id);

  return event?.nwc_url || null;
}

/**
 * Decode amount from a BOLT11 invoice (basic parsing)
 */
function decodeBolt11Amount(invoice) {
  const lower = invoice.toLowerCase().trim();
  // lnbc = mainnet, lntb = testnet, lnbcrt = regtest
  const match = lower.match(/^ln(?:bc|tb|bcrt)(\d+)([munp]?)/);
  if (!match) return 0;

  const num = parseInt(match[1]);
  const multiplier = match[2];

  // Convert to sats based on multiplier
  // Amount is in BTC by default
  switch (multiplier) {
    case "m": return num * 100000;     // milli-BTC → sats
    case "u": return num * 100;        // micro-BTC → sats
    case "n": return Math.floor(num / 10); // nano-BTC → sats
    case "p": return Math.floor(num / 10000); // pico-BTC → sats (sub-sat)
    default: return num * 100000000;   // BTC → sats
  }
}

export default wallet;
