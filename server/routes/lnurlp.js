import { Hono } from "hono";
import WebSocket from "ws";

// Polyfill WebSocket for serverless (NWC uses Nostr relays via WebSocket)
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket;
}

const lnurlp = new Hono();

/**
 * GET /.well-known/lnurlp/:username
 *
 * LNURL-pay endpoint for Lightning Addresses.
 * When someone pays "juan@satsparty.vercel.app", their wallet
 * makes a GET to https://satsparty.vercel.app/.well-known/lnurlp/juan
 */
lnurlp.get("/:username", async (c) => {
  const username = c.req.param("username").toLowerCase();
  const db = c.get("db");
  const host = c.req.header("host") || "localhost";
  const proto = c.req.header("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  // Find attendee by username (part before @)
  const attendee = await db
    .prepare(
      "SELECT id, display_name, lightning_address, event_id FROM attendees WHERE lightning_address LIKE ?"
    )
    .get(`${username}@%`);

  if (!attendee) {
    return c.json({ status: "ERROR", reason: "User not found" }, 404);
  }

  // LNURL-pay step 1: return metadata
  return c.json({
    status: "OK",
    tag: "payRequest",
    callback: `${baseUrl}/.well-known/lnurlp/${username}/callback`,
    minSendable: 1000, // 1 sat in millisats
    maxSendable: 1000000000, // 1M sats in millisats
    metadata: JSON.stringify([
      ["text/plain", `Pago a ${attendee.display_name} via SatsParty`],
      ["text/identifier", attendee.lightning_address],
    ]),
    commentAllowed: 0,
  });
});

/**
 * GET /.well-known/lnurlp/:username/callback?amount=<millisats>
 *
 * LNURL-pay step 2: generate invoice for the requested amount.
 * Uses the EVENT's NWC (admin wallet) to create the invoice.
 * When paid, credits the attendee's custodial balance.
 */
lnurlp.get("/:username/callback", async (c) => {
  const username = c.req.param("username").toLowerCase();
  const amountMsat = parseInt(c.req.query("amount"));
  const db = c.get("db");

  if (!amountMsat || amountMsat < 1000) {
    return c.json({ status: "ERROR", reason: "Invalid amount" }, 400);
  }

  const attendee = await db
    .prepare(
      "SELECT id, display_name, lightning_address, event_id, nwc_url FROM attendees WHERE lightning_address LIKE ?"
    )
    .get(`${username}@%`);

  if (!attendee) {
    return c.json({ status: "ERROR", reason: "User not found" }, 404);
  }

  // Get NWC URL: event's admin wallet (custodial) or attendee's own NWC (self-registered)
  let nwcUrl = null;

  if (attendee.event_id) {
    // Custodial: use event admin's NWC
    const event = await db
      .prepare("SELECT nwc_url FROM events WHERE id = ?")
      .get(attendee.event_id);
    nwcUrl = event?.nwc_url;
  }

  // Fallback: attendee's own NWC (self-registered users)
  if (!nwcUrl) {
    nwcUrl = attendee.nwc_url;
  }

  if (!nwcUrl) {
    return c.json({ status: "ERROR", reason: "No wallet configured" }, 400);
  }

  try {
    console.log("[LNURLP] Connecting to NWC for:", username, "amount:", amountMsat, "msats");
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });

    const result = await client.makeInvoice({
      amount: amountMsat,
      description: `Pago a ${attendee.display_name} via SatsParty`,
    });

    await client.close();

    const invoice = result.invoice || result.paymentRequest || result.payment_request;

    if (!invoice) {
      console.error("[LNURLP] No invoice in result:", JSON.stringify(result));
      return c.json({ status: "ERROR", reason: "Could not generate invoice" }, 500);
    }

    const amountSats = Math.floor(amountMsat / 1000);
    const paymentHash = result.payment_hash;

    // For custodial attendees, we need to track this so we can credit their balance when paid
    // Store a pending receive record
    if (attendee.event_id && paymentHash) {
      try {
        const existing = await db
          .prepare("SELECT id FROM transactions WHERE attendee_id = ? AND payment_hash = ?")
          .get(attendee.id, paymentHash);

        if (!existing) {
          await db
            .prepare(
              "INSERT INTO transactions (attendee_id, type, amount_sats, fee_sats, description, payment_hash) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .run(attendee.id, "receive_pending", amountSats, 0, "Lightning Address pago pendiente", paymentHash);
        }
      } catch (err) {
        console.warn("[LNURLP] Could not store pending tx:", err.message);
      }
    }

    console.log("[LNURLP] Invoice generated for", username, "hash:", paymentHash);
    return c.json({
      status: "OK",
      pr: invoice,
      routes: [],
    });
  } catch (err) {
    console.error("[LNURLP] Error generating invoice:", err.message);
    return c.json({ status: "ERROR", reason: `Invoice generation failed: ${err.message}` }, 500);
  }
});

export default lnurlp;
