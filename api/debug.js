// Minimal debug endpoint — no dependencies
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    node: process.version,
    env: process.env.VERCEL ? "vercel" : "local",
    time: new Date().toISOString(),
  });
}
