/**
 * SatsParty — App State
 *
 * Estado global de la app. Persiste en localStorage para que
 * el usuario no pierda su wallet al cerrar el browser.
 */

const STORAGE_KEY = "satsparty_state";

const defaultState = {
  // Wallet
  nwcUrl: null,
  lightningAddress: null,
  balance: 0,
  walletCreated: false,

  // Onboarding
  onboardingComplete: false,
  missionsCompleted: [],

  // Event
  eventName: "La Crypta Meetup",
  eventDate: "Marzo 2026",

  // Transactions (local cache)
  transactions: [],

  // Prices
  btcUsd: 84210,
  usdArs: 1285,

  // Admin
  adminPubkey: null,
  adminNpub: null,
  adminNwcUrl: null,
  welcomeSats: 100,
};

let state = { ...defaultState };

/**
 * Cargar estado desde localStorage
 */
export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.warn("Error cargando estado:", e);
  }
  return state;
}

/**
 * Guardar estado en localStorage
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Error guardando estado:", e);
  }
}

/**
 * Obtener estado actual
 */
export function getState() {
  return state;
}

/**
 * Actualizar estado (merge parcial)
 * @param {Partial<typeof defaultState>} updates
 */
export function setState(updates) {
  Object.assign(state, updates);
  saveState();
}

/**
 * Resetear todo el estado (útil para testing)
 */
export function resetState() {
  state = { ...defaultState };
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Helpers de precio
 */
export function satsToUsd(sats) {
  return (sats * state.btcUsd) / 100_000_000;
}

export function satsToArs(sats) {
  return satsToUsd(sats) * state.usdArs;
}

export function usdToSats(usd) {
  return Math.round((usd / state.btcUsd) * 100_000_000);
}

export function arsToSats(ars) {
  return usdToSats(ars / state.usdArs);
}

// ═══ EVENTOS POR PUBKEY ═══

const EVENTS_PREFIX = "satsparty_events_";

/**
 * Obtener la key de localStorage para los eventos de un pubkey
 */
function eventsKey(pubkey) {
  return EVENTS_PREFIX + pubkey.slice(0, 16);
}

/**
 * Cargar eventos de un organizador (por pubkey)
 * @param {string} pubkey - hex pubkey del organizador
 * @returns {Array} lista de eventos
 */
export function loadEvents(pubkey) {
  try {
    const raw = localStorage.getItem(eventsKey(pubkey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guardar eventos de un organizador
 * @param {string} pubkey
 * @param {Array} events
 */
export function saveEvents(pubkey, events) {
  try {
    localStorage.setItem(eventsKey(pubkey), JSON.stringify(events));
  } catch (e) {
    console.warn("Error guardando eventos:", e);
  }
}

/**
 * Crear un evento nuevo
 * @param {string} pubkey
 * @param {{ name: string, date: string, welcomeSats: number }} data
 * @returns {object} el evento creado
 */
export function createEvent(pubkey, data) {
  const events = loadEvents(pubkey);
  const event = {
    id: "evt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: data.name || "Nuevo Evento",
    date: data.date || "",
    welcomeSats: data.welcomeSats || 100,
    maxAttendees: data.maxAttendees || 0, // 0 = sin límite
    nwcUrl: null,
    attendees: 0,
    satsDistributed: 0,
    closed: false,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  saveEvents(pubkey, events);
  return event;
}

/**
 * Actualizar un evento existente
 * @param {string} pubkey
 * @param {string} eventId
 * @param {object} updates
 * @returns {object|null} el evento actualizado
 */
export function updateEvent(pubkey, eventId, updates) {
  const events = loadEvents(pubkey);
  const idx = events.findIndex((e) => e.id === eventId);
  if (idx === -1) return null;
  Object.assign(events[idx], updates);
  saveEvents(pubkey, events);
  return events[idx];
}

/**
 * Eliminar un evento
 * @param {string} pubkey
 * @param {string} eventId
 */
export function deleteEvent(pubkey, eventId) {
  const events = loadEvents(pubkey).filter((e) => e.id !== eventId);
  saveEvents(pubkey, events);
  // Limpiar registro global
  setEventClosed(eventId, false);
}

// ═══ REGISTRO GLOBAL DE EVENTOS CERRADOS ═══
// Permite que el flujo de asistentes (sin conocer el pubkey del admin)
// pueda verificar si un evento está cerrado.

const CLOSED_PREFIX = "satsparty_closed_";

/**
 * Marcar un evento como cerrado o abierto (registro global)
 * @param {string} eventId
 * @param {boolean} closed
 */
export function setEventClosed(eventId, closed) {
  try {
    if (closed) {
      localStorage.setItem(CLOSED_PREFIX + eventId, "1");
    } else {
      localStorage.removeItem(CLOSED_PREFIX + eventId);
    }
  } catch (e) {
    console.warn("Error guardando estado cerrado:", e);
  }
}

/**
 * Verificar si un evento está cerrado (registro global)
 * @param {string} eventId
 * @returns {boolean}
 */
export function isEventClosed(eventId) {
  try {
    return localStorage.getItem(CLOSED_PREFIX + eventId) === "1";
  } catch {
    return false;
  }
}

// ═══ REGISTRO GLOBAL DE INFO PÚBLICA DEL EVENTO ═══
// Permite que el onboarding lea nombre/fecha del evento sin conocer el pubkey.

const EVENT_INFO_PREFIX = "satsparty_info_";

/**
 * Guardar info pública de un evento (nombre, fecha, welcomeSats)
 * @param {string} eventId
 * @param {{ name: string, date: string, welcomeSats: number }} info
 */
export function setEventInfo(eventId, info) {
  try {
    localStorage.setItem(EVENT_INFO_PREFIX + eventId, JSON.stringify(info));
  } catch (e) {
    console.warn("Error guardando info de evento:", e);
  }
}

/**
 * Leer info pública de un evento
 * @param {string} eventId
 * @returns {{ name: string, date: string, welcomeSats: number } | null}
 */
export function getEventInfo(eventId) {
  try {
    const raw = localStorage.getItem(EVENT_INFO_PREFIX + eventId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
