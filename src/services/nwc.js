/**
 * SatsParty — NWC Service
 *
 * Wrapper sobre @getalby/sdk para todas las operaciones Lightning.
 * Maneja conexión, balance, invoices, pagos e historial.
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
  // NWC devuelve balance en millisats
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
  const result = await client.makeInvoice({
    amount: amountSats * 1000, // convertir a millisats
    description,
  });

  return {
    paymentRequest: result.paymentRequest,
    paymentHash: result.paymentHash,
  };
}

/**
 * Pagar un invoice bolt11
 * @param {string} invoice - bolt11 payment request
 * @returns {Promise<{preimage: string, feesPaid: number}>}
 */
export async function payInvoice(invoice) {
  ensureConnected();
  const result = await client.payInvoice({
    invoice,
  });

  return {
    preimage: result.preimage,
    feesPaid: Math.floor((result.fees_paid || 0) / 1000),
  };
}

/**
 * Verificar estado de un invoice
 * @param {string} paymentHash
 * @returns {Promise<{paid: boolean, preimage: string|null}>}
 */
export async function lookupInvoice(paymentHash) {
  ensureConnected();
  const result = await client.lookupInvoice({
    payment_hash: paymentHash,
  });

  return {
    paid: result.settled_at != null,
    preimage: result.preimage || null,
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
