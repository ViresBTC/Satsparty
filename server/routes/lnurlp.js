import { Hono } from "hono";

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
      "SELECT id, display_name, nwc_url, lightning_address FROM attendees WHERE lightning_address LIKE ?"
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
 * Uses the attendee's NWC connection to create the invoice.
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
      "SELECT id, display_name, nwc_url, lightning_address FROM attendees WHERE lightning_address LIKE ?"
    )
    .get(`${username}@%`);

  if (!attendee) {
    return c.json({ status: "ERROR", reason: "User not found" }, 404);
  }

  if (!attendee.nwc_url) {
    return c.json({ status: "ERROR", reason: "User has no wallet connected" }, 400);
  }

  try {
    // Connect to attendee's wallet via NWC and create invoice
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: attendee.nwc_url });

    const result = await client.makeInvoice({
      amount: amountMsat, // already in millisats
      description: `Pago a ${attendee.display_name} via SatsParty`,
    });

    await client.close();

    const invoice = result.invoice || result.paymentRequest || result.payment_request;

    if (!invoice) {
      return c.json({ status: "ERROR", reason: "Could not generate invoice" }, 500);
    }

    return c.json({
      status: "OK",
      pr: invoice,
      routes: [],
    });
  } catch (err) {
    console.error("[LNURLP] Error generating invoice:", err.message);
    return c.json({ status: "ERROR", reason: "Invoice generation failed" }, 500);
  }
});

export default lnurlp;
