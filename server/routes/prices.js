import { Hono } from "hono";
import { getPrices } from "../services/prices.js";

const prices = new Hono();

// GET /api/prices — BTC/USD and USD/ARS (cached 60s in memory, no DB needed)
prices.get("/", async (c) => {
  try {
    const data = await getPrices();

    // Persist to DB if available (optional fallback cache)
    try {
      const db = c.get("db");
      if (db) {
        await db.prepare(
          "UPDATE price_cache SET btc_usd = ?, usd_ars = ?, updated_at = ? WHERE id = 1"
        ).run(data.btcUsd, data.usdArs, data.updatedAt);
      }
    } catch (_) {
      // DB not available — that's fine, memory cache works
    }

    return c.json(data);
  } catch (err) {
    console.error("[Prices] Error:", err.message);

    // Fallback: try DB cache if available
    try {
      const db = c.get("db");
      if (db) {
        const row = await db
          .prepare("SELECT btc_usd, usd_ars, updated_at FROM price_cache WHERE id = 1")
          .get();
        if (row) {
          return c.json({
            btcUsd: row.btc_usd,
            usdArs: row.usd_ars,
            updatedAt: row.updated_at,
          });
        }
      }
    } catch (_) {}

    // Ultimate fallback: hardcoded defaults
    return c.json({
      btcUsd: 84210,
      usdArs: 1285,
      updatedAt: null,
      fallback: true,
    });
  }
});

export default prices;
