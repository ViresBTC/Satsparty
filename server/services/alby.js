/**
 * SatsParty — Alby Hub API Client
 *
 * Crea sub-wallets aisladas para cada asistente del evento.
 * Usa la API interna de Alby Hub (POST /api/apps).
 *
 * Ref: https://github.com/getAlby/hub (api/models.go)
 */

const DEFAULT_SCOPES = [
  "get_balance",
  "get_info",
  "make_invoice",
  "pay_invoice",
  "lookup_invoice",
  "list_transactions",
  "notifications",
];

/**
 * Verify Alby Hub credentials work.
 * @param {string} hubUrl - Alby Hub URL (e.g. https://my-hub.albylndhub.com)
 * @param {string} authToken - Unlock password / auth token
 * @returns {Promise<{ ok: boolean, appCount?: number, error?: string }>}
 */
export async function testConnection(hubUrl, authToken) {
  const url = apiUrl(hubUrl, "/v1/apps");
  console.log(`[Alby] Testing connection to: ${url}`);

  try {
    const res = await fetch(url, {
      headers: authHeaders(authToken),
    });

    const contentType = res.headers.get("content-type") || "";
    console.log(`[Alby] Response: ${res.status} ${contentType}`);

    if (!contentType.includes("application/json")) {
      const text = (await res.text()).substring(0, 200);
      console.log(`[Alby] Non-JSON response: ${text}`);
      return { ok: false, error: `Alby Hub devolvió HTML (status ${res.status}). ¿Es correcta la URL?` };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.message || `HTTP ${res.status}` };
    }

    const apps = await res.json();
    return { ok: true, appCount: Array.isArray(apps) ? apps.length : 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Create an isolated sub-wallet (app connection) for an attendee.
 *
 * Alby Hub API: POST /api/apps
 * Request: CreateAppRequest { name, isolated, scopes, maxAmount, budgetRenewal }
 * Response: CreateAppResponse { pairingUri, lud16, id, name, ... }
 *
 * @param {string} hubUrl - Alby Hub URL
 * @param {string} authToken - Unlock password / auth token
 * @param {string} displayName - Attendee display name (used as app name)
 * @param {number} maxAmountSat - Max budget in sats (0 = unlimited)
 * @returns {Promise<{ nwcUrl: string, lud16: string, appId: number }>}
 */
export async function createSubWallet(hubUrl, authToken, displayName, maxAmountSat = 0) {
  const body = {
    name: `SatsParty: ${displayName}`,
    isolated: true,
    scopes: DEFAULT_SCOPES,
    budgetRenewal: "never",
    maxAmount: maxAmountSat,
  };

  const res = await fetch(apiUrl(hubUrl, "/v1/apps"), {
    method: "POST",
    headers: {
      ...authHeaders(authToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Alby Hub error ${res.status}: ${text || "Failed to create sub-wallet"}`);
  }

  const data = await res.json();

  return {
    nwcUrl: data.pairingUri,
    lud16: data.lud16 || null,
    appId: data.id,
    walletPubkey: data.walletPubkey || null,
  };
}

/**
 * Send internal payment to fund the sub-wallet with welcome sats.
 * Creates an invoice on the sub-wallet's NWC, then pays it from the main wallet.
 *
 * @param {string} hubUrl - Alby Hub URL
 * @param {string} authToken - Unlock password / auth token
 * @param {string} nwcUrl - Sub-wallet's NWC pairing URI
 * @param {number} amountSats - Welcome sats to send
 * @returns {Promise<boolean>} true if funded successfully
 */
export async function fundSubWallet(hubUrl, authToken, nwcUrl, amountSats) {
  if (!amountSats || amountSats <= 0) return false;

  // We use Alby Hub's internal transfer if available,
  // otherwise this needs to be done via NWC (make invoice on sub + pay from main).
  // For now, we'll use the NWC approach which is protocol-standard.
  // The actual NWC funding will be handled by the onboard route using the nwc SDK.
  // This function is a placeholder for future optimization with internal transfers.

  console.log(`[Alby] fundSubWallet: ${amountSats} sats (via NWC — handled by onboard route)`);
  return true;
}

// ── Helpers ──

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

/** Build full API URL. Handles both "http://host:port" and "http://host:port/api" as base. */
function apiUrl(hubUrl, path) {
  const base = normalizeUrl(hubUrl);
  return base.endsWith("/api") ? base + path : base + "/api" + path;
}

function authHeaders(authToken) {
  return {
    Authorization: `Bearer ${authToken}`,
  };
}
