import { Hono } from "hono";
import { getPrices } from "../services/prices.js";

const prices = new Hono();

// GET /api/prices — BTC/USD and USD/ARS (cached 60s in memory)
prices.get("/", async (c) => {
  try {
    const data = await getPrices();

    // Persist to DB for offline fallback
    const db = c.get("db");
    db.prepare(
      "UPDATE price_cache SET btc_usd = ?, usd_ars = ?, updated_at = ? WHERE id = 1"
    ).run(data.btcUsd, data.usdArs, data.updatedAt);

    return c.json(data);
  } catch (err) {
    console.error("[Prices] Error:", err.message);

    // Fallback: return last cached DB values
    const db = c.get("db");
    const row = db
      .prepare("SELECT btc_usd, usd_ars, updated_at FROM price_cache WHERE id = 1")
      .get();

    return c.json({
      btcUsd: row?.btc_usd || 84210,
      usdArs: row?.usd_ars || 1285,
      updatedAt: row?.updated_at || null,
    });
  }
});

export default prices;
