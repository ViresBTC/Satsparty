/**
 * SatsParty — Main Entry Point
 *
 * Maneja el routing entre onboarding y dashboard,
 * y conecta los módulos NWC con las vistas.
 */

import * as nwcService from "./services/nwc.js";
import { loadState, getState, setState, satsToUsd, satsToArs } from "./services/state.js";
import { generateQRSvg } from "./services/qr.js";
import { renderOnboarding } from "./onboarding.js";
import { renderDashboard } from "./dashboard.js";

// ── GLOBALS ──
let currentScreen = null;

// ── INIT ──
function init() {
  try {
    console.log("[SatsParty] Iniciando...");
    loadState();
    const state = getState();
    console.log("[SatsParty] Estado:", JSON.stringify({ onboardingComplete: state.onboardingComplete, hasNwc: !!state.nwcUrl }));

    if (state.onboardingComplete && state.nwcUrl) {
      startDashboard();
    } else {
      startOnboarding();
    }
    console.log("[SatsParty] Init OK");
  } catch (err) {
    console.error("[SatsParty] Error:", err);
    document.getElementById("app").innerHTML = `<div style="padding:2rem;color:#F7FF00;font-family:monospace;">${err.message}<br><br><pre>${err.stack}</pre></div>`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ── ROUTING ──

function startOnboarding() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  renderOnboarding(app, {
    goTo,
    showToast,
    launchConfetti,
    onWalletCreated,
    onOnboardingComplete,
    getState,
    setState,
    nwcService,
    generateQRSvg,
  });
}

function startDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  renderDashboard(app, {
    goTo,
    showToast,
    launchConfetti,
    getState,
    setState,
    nwcService,
    generateQRSvg,
    satsToUsd,
    satsToArs,
    reconnectWallet,
  });
}

// ── SCREEN NAVIGATION ──

export function goTo(id) {
  const curr = currentScreen ? document.getElementById(currentScreen) : null;
  const next = document.getElementById(id);

  if (curr) {
    curr.classList.remove("active");
    curr.classList.add("exit");
    setTimeout(() => curr.classList.remove("exit"), 450);
  }

  if (next) {
    next.classList.add("active");
  }

  currentScreen = id;
}

// ── NWC ACTIONS ──

async function onWalletCreated(nwcUrl) {
  try {
    const info = await nwcService.connect(nwcUrl);
    const balance = await nwcService.getBalance();

    setState({
      nwcUrl,
      walletCreated: true,
      balance,
    });

    return { info, balance };
  } catch (err) {
    console.error("Error conectando wallet:", err);
    throw err;
  }
}

async function reconnectWallet() {
  const state = getState();
  if (!state.nwcUrl) return false;

  try {
    await nwcService.connect(state.nwcUrl);
    const balance = await nwcService.getBalance();
    setState({ balance });
    return true;
  } catch (err) {
    console.error("Error reconectando:", err);
    return false;
  }
}

function onOnboardingComplete() {
  setState({ onboardingComplete: true });
  startDashboard();
}

// ── UI HELPERS ──

export function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

export function launchConfetti() {
  const container = document.getElementById("confetti");
  if (!container) return;
  const colors = ["#F7FF00", "#FF6B1A", "#00FF87", "#F2EDE6"];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");
    const size = Math.random() * 8 + 4;
    const dur = Math.random() * 1.5 + 1;
    const delay = Math.random() * 0.8;
    piece.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;top:-10px;
      border-radius:${Math.random() > 0.5 ? "50%" : "0"};
      pointer-events:none;z-index:500;
      animation:confettiFall ${dur}s ease-in ${delay}s forwards;
    `;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), (dur + delay) * 1000 + 300);
  }
}
