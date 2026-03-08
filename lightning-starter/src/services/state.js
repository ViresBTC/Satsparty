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
