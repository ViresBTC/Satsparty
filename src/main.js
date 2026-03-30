/**
 * SatsParty — Main Entry Point
 *
 * Maneja el routing entre onboarding y dashboard,
 * y conecta los módulos NWC con las vistas.
 */

import * as nwcService from "./services/nwc.js";
import * as api from "./services/api.js";
import { loadState, getState, setState, onStateChange, satsToUsd, satsToArs, isEventClosed, getEventInfo } from "./services/state.js";
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

    // Routing: /admin or #admin → panel admin, sino → flujo normal
    const isAdmin = window.location.hash === "#admin" || window.location.pathname === "/admin";
    if (isAdmin) {
      startAdmin();
    } else if (eventParam && isEventClosed(eventParam)) {
      // Evento cerrado — bloquear acceso
      showEventClosed();
    } else if (state.onboardingComplete && state.nwcUrl) {
      startDashboard();
    } else {
      startOnboarding();
    }
    // Fetch live prices (non-blocking)
    updatePrices();

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

// Listen for hash changes (e.g. user navigates to #admin)
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#admin") {
    startAdmin();
  }
});

// Listen for popstate (e.g. user navigates to /admin via history)
window.addEventListener("popstate", () => {
  if (window.location.pathname === "/admin") {
    startAdmin();
  }
});

// ── PRICES ──
async function updatePrices() {
  try {
    const data = await api.fetchPrices();
    if (data.btcUsd && data.usdArs) {
      setState({ btcUsd: data.btcUsd, usdArs: data.usdArs });
      console.log(`[SatsParty] Precios: BTC/USD $${data.btcUsd.toLocaleString()} | USD/ARS $${Math.round(data.usdArs).toLocaleString()}`);
    }
  } catch (err) {
    console.warn("[SatsParty] No se pudieron cargar precios:", err.message);
  }
}

// ── ROUTING ──

function startOnboarding() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  renderOnboarding(app, {
    goTo,
    showToast,
    launchConfetti,
    launchLightningBolt,
    onWalletCreated,
    onOnboardingComplete,
    getState,
    setState,
    nwcService,
    generateQRSvg,
    onStateChange,
  });
}

function startAdmin() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.className = "app--admin";
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
    launchLightningBolt,
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

export function launchLightningBolt() {
  const container = document.getElementById("confetti");
  if (!container) return;

  // 1 — Flash amarillo de pantalla
  const flash = document.createElement("div");
  flash.style.cssText = `
    position:fixed;inset:0;background:rgba(247,255,0,.18);
    pointer-events:none;z-index:510;
    animation:lightningFlash .45s ease-out forwards;
  `;
  container.appendChild(flash);
  setTimeout(() => flash.remove(), 500);

  // 2 — Rayo ⚡ central grande
  const bolt = document.createElement("div");
  bolt.textContent = "⚡";
  bolt.style.cssText = `
    position:fixed;left:50%;top:45%;
    font-size:6rem;line-height:1;
    pointer-events:none;z-index:520;
    filter:drop-shadow(0 0 30px rgba(247,255,0,.7)) drop-shadow(0 0 60px rgba(247,255,0,.3));
    animation:boltAppear .9s cubic-bezier(.22,.68,0,1.2) forwards;
  `;
  container.appendChild(bolt);
  setTimeout(() => bolt.remove(), 1000);

  // 3 — Glow pulse central
  const glow = document.createElement("div");
  glow.style.cssText = `
    position:fixed;left:50%;top:45%;width:20px;height:20px;
    border-radius:50%;
    background:radial-gradient(circle,rgba(247,255,0,.5),transparent 70%);
    pointer-events:none;z-index:505;
    animation:glowPulse .8s ease-out forwards;
  `;
  container.appendChild(glow);
  setTimeout(() => glow.remove(), 900);

  // 4 — Anillos expansivos
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement("div");
    ring.style.cssText = `
      position:fixed;left:50%;top:45%;width:30px;height:30px;
      border-radius:50%;border:2px solid rgba(247,255,0,.4);
      pointer-events:none;z-index:506;
      animation:pulseRing .7s ease-out ${i * 0.15}s forwards;
    `;
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 900 + i * 150);
  }

  // 5 — Chispas volando en todas direcciones
  const sparkCount = 12;
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement("div");
    const angle = (i / sparkCount) * 360;
    const dist = 60 + Math.random() * 80;
    const sx = Math.cos((angle * Math.PI) / 180) * dist;
    const sy = Math.sin((angle * Math.PI) / 180) * dist;
    const size = 3 + Math.random() * 4;
    spark.style.cssText = `
      position:fixed;left:50%;top:45%;
      width:${size}px;height:${size}px;
      background:${Math.random() > 0.5 ? "#F7FF00" : "#FF6B1A"};
      border-radius:50%;
      pointer-events:none;z-index:515;
      --spark-x:${sx}px;--spark-y:${sy}px;
      animation:sparkFly .6s ease-out ${Math.random() * 0.15}s forwards;
    `;
    container.appendChild(spark);
    setTimeout(() => spark.remove(), 800);
  }

  // 6 — Arcos eléctricos
  for (let i = 0; i < 4; i++) {
    const arc = document.createElement("div");
    const angle = Math.random() * 360;
    arc.style.cssText = `
      position:fixed;left:50%;top:45%;
      width:${40 + Math.random() * 30}px;height:2px;
      background:linear-gradient(90deg,rgba(247,255,0,.8),transparent);
      pointer-events:none;z-index:512;
      transform-origin:left center;
      --angle:${angle}deg;
      animation:arcFlash .4s ease-out ${i * 0.08}s forwards;
    `;
    container.appendChild(arc);
    setTimeout(() => arc.remove(), 600);
  }
}
