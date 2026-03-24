/**
 * SatsParty — NWC Service
 *
 * Wrapper sobre @getalby/sdk para todas las operaciones Lightning.
 * Maneja conexión, balance, invoices, pagos e historial.
 *
 * NOTA: @getalby/sdk v3.x usa el protocolo NIP-47 que trabaja en MILLISATS.
 * Este wrapper convierte a/desde SATS para la UI.
 */

import { nwc } from "@getalby/sdk";

let client = null;
let connectionUrl = null;

/**
 * Conectar a una wallet via NWC
 * @param {string} nwcUrl - nostr+walletconnect://...
 * @returns {Promise<{alias: string, pubkey: string, network: string}>}
 */
export async function connect(nwcUrl) {
  if (client) {
    client.close();
  }

  connectionUrl = nwcUrl;

  client = new nwc.NWCClient({
    nostrWalletConnectUrl: nwcUrl,
  });

  const info = await client.getInfo();
  console.log("[NWC] Connected:", info.alias || "wallet", "| methods:", info.methods?.join(", ") || "unknown");

  return {
    alias: info.alias || "SatsParty Wallet",
    pubkey: info.pubkey || "",
    network: info.network || "mainnet",
  };
}

/**
 * Obtener balance en sats
 * @returns {Promise<number>} balance en sats
 */
export async function getBalance() {
  ensureConnected();
  const result = await client.getBalance();
  // NIP-47 devuelve balance en millisats → convertir a sats
  console.log("[NWC] getBalance raw (msats):", result.balance);
  return Math.floor(result.balance / 1000);
}

/**
 * Crear invoice para recibir sats
 * @param {number} amountSats - monto en sats
 * @param {string} description - descripción del pago
 * @returns {Promise<{paymentRequest: string, paymentHash: string}>}
 */
export async function makeInvoice(amountSats, description = "SatsParty") {
  ensureConnected();

  // NIP-47 espera amount en millisats
  const amountMsats = amountSats * 1000;
  console.log("[NWC] makeInvoice:", amountSats, "sats =", amountMsats, "msats");

  const result = await client.makeInvoice({
    amount: amountMsats,
    description,
  });

  console.log("[NWC] makeInvoice response keys:", Object.keys(result));
  console.log("[NWC] makeInvoice invoice field:", result.invoice ? "present (" + result.invoice.substring(0, 30) + "...)" : "MISSING");

  // NIP-47 Nip47Transaction: campo "invoice" contiene el bolt11 string
  const paymentRequest = result.invoice;
  const paymentHash = result.payment_hash;

  if (!paymentRequest) {
    console.error("[NWC] makeInvoice: no 'invoice' field in response:", JSON.stringify(result));
    throw new Error("El wallet no devolvió un invoice válido");
  }

  return { paymentRequest, paymentHash };
}

/**
 * Pagar un invoice bolt11
 * @param {string} invoice - bolt11 payment request
 * @returns {Promise<{preimage: string, feesPaid: number}>}
 */
export async function payInvoice(invoice) {
  ensureConnected();
  console.log("[NWC] payInvoice:", invoice.substring(0, 30) + "...");

  const result = await client.payInvoice({
    invoice,
  });

  console.log("[NWC] payInvoice result:", result);

  return {
    preimage: result.preimage,
    // fees_paid en millisats → convertir a sats
    feesPaid: Math.floor((result.fees_paid || 0) / 1000),
  };
}

/**
 * Verificar estado de un invoice
 * @param {string} paymentHash
 * @returns {Promise<{paid: boolean, preimage: string|null, amount: number}>}
 */
export async function lookupInvoice(paymentHash) {
  ensureConnected();
  const result = await client.lookupInvoice({
    payment_hash: paymentHash,
  });

  return {
    paid: result.settled_at != null,
    preimage: result.preimage || null,
    // amount en millisats → sats
    amount: Math.floor((result.amount || 0) / 1000),
  };
}

/**
 * Obtener historial de transacciones
 * @param {number} limit - cantidad máxima de txs
 * @returns {Promise<Array<{type: string, amount: number, description: string, timestamp: number, settled: boolean}>>}
 */
export async function listTransactions(limit = 20) {
  ensureConnected();
  const result = await client.listTransactions({ limit });

  if (!result.transactions || result.transactions.length === 0) {
    return [];
  }

  return result.transactions.map((tx) => ({
    type: tx.type === "incoming" ? "in" : "out",
    // amount en millisats → sats
    amount: Math.floor((tx.amount || 0) / 1000),
    description: tx.description || "",
    timestamp: tx.settled_at || tx.created_at || 0,
    settled: tx.settled_at != null,
  }));
}

/**
 * Obtener la connection URL actual (para mostrar al usuario)
 * @returns {string|null}
 */
export function getConnectionUrl() {
  return connectionUrl;
}

/**
 * Verificar si hay conexión activa
 * @returns {boolean}
 */
export function isConnected() {
  return client !== null;
}

/**
 * Desconectar
 */
export function disconnect() {
  if (client) {
    client.close();
    client = null;
    connectionUrl = null;
  }
}

function ensureConnected() {
  if (!client) {
    throw new Error("Wallet no conectada. Llamá a connect() primero.");
  }
}
