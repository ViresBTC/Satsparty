// Test: raw Node.js handler, no Hono
export default async function handler(req, res) {
  res.status(200).json({ ok: true, url: req.url, method: req.method });
}
