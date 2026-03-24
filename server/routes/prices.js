import { Hono } from "hono";

const prices = new Hono();

// GET /api/prices — BTC/USD and USD/ARS (cached 60s)
prices.get("/", async (c) => {
  const db = c.get("db");
  const row = db.prepare("SELECT btc_usd, usd_ars, updated_at FROM price_cache WHERE id = 1").get();

  return c.json({
    btcUsd: row?.btc_usd || 84210,
    usdArs: row?.usd_ars || 1285,
    updatedAt: row?.updated_at,
  });
});

export default prices;
