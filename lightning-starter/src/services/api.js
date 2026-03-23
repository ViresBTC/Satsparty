/**
 * SatsParty — API Client
 *
 * HTTP client para el backend. Maneja JWT y wrappea todos los endpoints.
 * Todos los métodos lanzan Error si el backend responde con error.
 */

const API_BASE = "/api";
let _token = null;

// ── JWT ──

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

// ── HTTP ──

function headers() {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
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

// ── ALBY ──

export async function testAlbyConnection(albyHubUrl, albyAuthToken) {
  return request("POST", "/events/test-alby", { albyHubUrl, albyAuthToken });
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
