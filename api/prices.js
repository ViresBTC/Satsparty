// Lightweight prices endpoint — only fetches live data, no DB
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { getPrices } = await import("../server/services/prices.js");
    const data = await getPrices();
    res.status(200).json(data);
  } catch (err) {
    res.status(200).json({
      btcUsd: 84210,
      usdArs: 1285,
      updatedAt: null,
      fallback: true,
      error: err.message,
    });
  }
}
