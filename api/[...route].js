// ═══════════════════════════════════════
//  SatsParty — Vercel Serverless Handler
//  Converts Node.js req/res to Web Request/Response for Hono
//  (replaces hono/vercel handle() which hangs on Node v24)
// ═══════════════════════════════════════

import app from "../server/app.js";

export default async function handler(req, res) {
  try {
    // Build a full URL from the incoming request
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url}`;

    // Read body for non-GET requests
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    // Convert Node headers to Headers object
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Create Web Request
    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: "half",
    });

    // Let Hono handle it
    const webResponse = await app.fetch(webRequest);

    // Convert Web Response back to Node res
    res.status(webResponse.status);

    for (const [key, value] of webResponse.headers.entries()) {
      res.setHeader(key, value);
    }

    const responseBody = await webResponse.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err) {
    console.error("[route] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}
