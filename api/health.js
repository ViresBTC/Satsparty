// Lightweight health check — NO heavy imports
export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    app: "SatsParty Backend",
    runtime: "vercel",
    node: process.version,
    timestamp: new Date().toISOString(),
  });
}
