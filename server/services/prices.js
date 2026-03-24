/**
 * SatsParty — Price Service
 *
 * Consulta precios BTC/USD y USD/ARS desde APIs públicas.
 * Cache en memoria de 60 segundos para no saturar las fuentes.
 *
 * Fuentes:
 *   BTC/USD → CoinGecko (gratis, sin API key)
 *   USD/ARS → Yadio (cotización cripto argentina)
 */

let cache = {
  btcUsd: null,
  usdArs: null,
  updatedAt: null,
};

const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Obtener precios actualizados (con cache)
 * @returns {Promise<{ btcUsd: number, usdArs: number, updatedAt: string }>}
 */
export async function getPrices() {
  if (cache.btcUsd && cache.updatedAt) {
    const age = Date.now() - new Date(cache.updatedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return { ...cache };
    }
  }

  const [btcUsd, usdArs] = await Promise.all([
    fetchBtcUsd(),
    fetchUsdArs(),
  ]);

  cache = {
    btcUsd,
    usdArs,
    updatedAt: new Date().toISOString(),
  };

  return { ...cache };
}

/**
 * BTC/USD desde CoinGecko
 */
async function fetchBtcUsd() {
  const sources = [
    {
      name: "CoinGecko",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      parse: (data) => data?.bitcoin?.usd,
    },
    {
      name: "Blockchain.info",
      url: "https://blockchain.info/ticker",
      parse: (data) => data?.USD?.last,
    },
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const price = source.parse(data);

      if (price && price > 0) {
        console.log(`[Prices] BTC/USD: $${price} (${source.name})`);
        return price;
      }
    } catch (err) {
      console.warn(`[Prices] ${source.name} failed: ${err.message}`);
    }
  }

  // Fallback al cache anterior o valor por defecto
  console.warn("[Prices] All BTC/USD sources failed, using fallback");
  return cache.btcUsd || 84210;
}

/**
 * USD/ARS desde Yadio (cotización cripto/blue)
 */
async function fetchUsdArs() {
  const sources = [
    {
      name: "Yadio",
      url: "https://api.yadio.io/rate/ARS/USD",
      parse: (data) => data?.rate,
    },
    {
      name: "DolarAPI (blue)",
      url: "https://dolarapi.com/v1/dolares/blue",
      parse: (data) => data?.venta,
    },
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const price = source.parse(data);

      if (price && price > 0) {
        console.log(`[Prices] USD/ARS: $${price} (${source.name})`);
        return price;
      }
    } catch (err) {
      console.warn(`[Prices] ${source.name} failed: ${err.message}`);
    }
  }

  console.warn("[Prices] All USD/ARS sources failed, using fallback");
  return cache.usdArs || 1285;
}
