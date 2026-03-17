/**
 * SatsParty — Main Entry Point
 *
 * Maneja el routing entre onboarding y dashboard,
 * y conecta los módulos NWC con las vistas.
 */

import * as nwcService from "./services/nwc.js";
import { loadState, getState, setState, satsToUsd, satsToArs, isEventClosed, getEventInfo } from "./services/state.js";
import { generateQRSvg } from "./services/qr.js";
import { renderOnboarding } from "./onboarding.js";
import { renderDashboard } from "./dashboard.js";
import { renderAdmin } from "./admin.js";

// ── GLOBALS ──
let currentScreen = null;

// ── INIT ──
function init() {
  try {
    console.log("[SatsParty] Iniciando...");
    loadState();
    const state = getState();
    console.log("[SatsParty] Estado:", JSON.stringify({ onboardingComplete: state.onboardingComplete, hasNwc: !!state.nwcUrl }));

    // Detectar evento desde URL (?event=evt_xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get("event");

    // Si viene con ?event=, cargar info del evento al state
    if (eventParam) {
      const eventInfo = getEventInfo(eventParam);
      if (eventInfo) {
        setState({
          eventCode: eventParam,
          eventName: eventInfo.name,
          eventDate: eventInfo.date,
          welcomeSats: eventInfo.welcomeSats,
        });
      } else {
        setState({ eventCode: eventParam });
      }
    }

    // Routing: #admin → panel admin, sino → flujo normal
    if (window.location.hash === "#admin") {
      startAdmin();
    } else if (eventParam && isEventClosed(eventParam)) {
      // Evento cerrado — bloquear acceso
      showEventClosed();
    } else if (state.onboardingComplete && state.nwcUrl) {
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

function startAdmin() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.classList.add("app--admin");
  renderAdmin(app, {
    goTo,
    showToast,
    launchConfetti,
    getState,
    setState,
    nwcService,
    generateQRSvg,
    satsToUsd,
    satsToArs,
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

function showEventClosed() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="screen active" id="screen-event-closed">
      <div class="topbar">
        <span class="topbar-logo">Sats<span>Party</span></span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center;">
        <div style="font-size:4rem;margin-bottom:1.5rem;opacity:0.6;">🔒</div>
        <h1 style="font-family:var(--font-display);font-size:2.8rem;color:var(--white);line-height:0.95;margin-bottom:1rem;">Evento<br><span style="color:var(--orange)">Cerrado</span></h1>
        <p style="font-family:var(--font-body);font-size:0.95rem;color:var(--muted);line-height:1.5;max-width:300px;margin-bottom:2rem;">
          Este evento ya no acepta nuevos asistentes. Si ya tenés tu wallet, podés seguir usándola normalmente.
        </p>
        <div style="padding:1rem 1.5rem;background:var(--dim);border:1px solid var(--mid);border-radius:12px;max-width:300px;">
          <div style="font-family:var(--font-mono);font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem;">¿Ya tenés wallet?</div>
          <p style="font-family:var(--font-body);font-size:0.8rem;color:var(--white);line-height:1.5;margin:0;">
            Tus sats y tu Lightning Address siguen siendo tuyas para siempre. Podés usarla desde cualquier wallet compatible.
          </p>
        </div>
      </div>
    </div>
  `;
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
