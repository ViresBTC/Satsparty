/**
 * SatsParty — API Client
 *
 * HTTP client para el backend. Maneja JWT y tokens de attendee.
 */

const API_BASE = "/api";
let _token = null;        // admin JWT
let _attendeeToken = null; // attendee token for wallet API

// ── JWT (admin) ──

export function setToken(token) {
  _token = token;
  localStorage.setItem("satsparty_jwt", token);
}

export function loadToken() {
  _token = localStorage.getItem("satsparty_jwt");
  return _token;
}

export function clearToken() {
  _token = null;
  localStorage.removeItem("satsparty_jwt");
}

export function hasToken() {
  return !!_token || !!localStorage.getItem("satsparty_jwt");
}

// ── Attendee Token ──

export function setAttendeeToken(token) {
  _attendeeToken = token;
  localStorage.setItem("satsparty_attendee_token", token);
}

export function loadAttendeeToken() {
  _attendeeToken = localStorage.getItem("satsparty_attendee_token");
  return _attendeeToken;
}

export function clearAttendeeToken() {
  _attendeeToken = null;
  localStorage.removeItem("satsparty_attendee_token");
}

export function getAttendeeToken() {
  return _attendeeToken || localStorage.getItem("satsparty_attendee_token");
}

// ── HTTP ──

function headers() {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

function walletHeaders() {
  const token = _attendeeToken || localStorage.getItem("satsparty_attendee_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function walletRequest(method, path, body) {
  const opts = { method, headers: walletHeaders() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── AUTH ──

export async function authNostr(signedEvent) {
  const data = await request("POST", "/auth/nostr", { event: signedEvent });
  setToken(data.token);
  return data;
}

export async function authDemoLogin(password) {
  const data = await request("POST", "/auth/login", { password });
  setToken(data.token);
  return data;
}

export async function authVerify() {
  return request("GET", "/auth/me");
}

// ── EVENTS ──

export async function createEvent(eventData) {
  return request("POST", "/events", eventData);
}

export async function listEvents() {
  return request("GET", "/events");
}

export async function getEvent(id) {
  return request("GET", `/events/${id}`);
}

export async function updateEvent(id, updates) {
  return request("PATCH", `/events/${id}`, updates);
}

export async function deleteEvent(id) {
  return request("DELETE", `/events/${id}`);
}

export async function getEventAttendees(id) {
  return request("GET", `/events/${id}/attendees`);
}

// ── ONBOARD ──

export async function fetchEventByCode(code) {
  return request("GET", `/onboard/${code}`);
}

// ── ATTENDEES ──

export async function recoverAccount(token) {
  return request("POST", "/attendees/recover", { token });
}

// ── WALLET (custodial) ──

export async function getWalletBalance() {
  return walletRequest("GET", "/wallet/balance");
}

export async function getWalletTransactions(limit = 50) {
  return walletRequest("GET", `/wallet/transactions?limit=${limit}`);
}

export async function walletPay(invoice, description) {
  return walletRequest("POST", "/wallet/pay", { invoice, description });
}

export async function walletCreateInvoice(amountSats, description) {
  return walletRequest("POST", "/wallet/invoice", { amountSats, description });
}

export async function walletCheckInvoice(paymentHash) {
  return walletRequest("GET", `/wallet/check-invoice/${paymentHash}`);
}

// ── ALBY ──

export async function testAlbyConnection(albyHubUrl, albyAuthToken) {
  return request("POST", "/events/test-alby", { albyHubUrl, albyAuthToken });
}

// ── PRICES ──

export async function fetchPrices() {
  return request("GET", "/prices");
}

// ── HEALTH ──

export async function checkHealth() {
  try {
    const data = await request("GET", "/health");
    return data.status === "ok";
  } catch {
    return false;
  }
}
