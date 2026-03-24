// ═══════════════════════════════════════
//  SatsParty — Vercel Serverless Handler
//  Catches all /api/* and /.well-known/* requests
// ═══════════════════════════════════════

let handler;

export default async function (req, res) {
  try {
    if (!handler) {
      const { handle } = await import("hono/vercel");
      const { default: app } = await import("../server/app.js");
      handler = handle(app);
    }
    return handler(req, res);
  } catch (err) {
    res.status(500).json({
      error: "Serverless init failed",
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 5),
    });
  }
}
