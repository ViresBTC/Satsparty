/**
 * SatsParty — Main Entry Point
 *
 * Maneja el routing entre onboarding y dashboard,
 * y conecta los módulos NWC con las vistas.
 */

import * as nwcService from "./services/nwc.js";
import { loadState, getState, setState, satsToUsd, satsToArs, usdToSats, arsToSats } from "./services/state.js";
import { generateQRSvg } from "./services/qr.js";
import { renderOnboarding } from "./onboarding.js";
import { renderDashboard } from "./dashboard.js";

// ── GLOBALS ──
let currentScreen = null;
let eventData = null; // datos del evento desde el backend

// ── INIT ──
async function init() {
  try {
    console.log("[SatsParty] Iniciando...");
    loadState();
    const state = getState();
    console.log("[SatsParty] Estado:", JSON.stringify({ onboardingComplete: state.onboardingComplete, hasNwc: !!state.nwcUrl }));

    if (state.onboardingComplete && state.nwcUrl) {
      startDashboard();
    } else {
      // Extraer código de evento de la URL
      const eventCode = getEventCode();
      if (eventCode) {
        console.log("[SatsParty] Código de evento:", eventCode);
        const validation = await validateEvent(eventCode);
        if (validation.ok) {
          eventData = validation.event;
          // Guardar datos del evento en el state
          setState({
            eventName: eventData.name,
            eventDate: eventData.date,
            eventCode: eventData.code,
            welcomeSats: eventData.welcomeSats,
          });
          startOnboarding();
        } else {
          showEventBlocked(validation);
        }
      } else {
        // Sin código → modo demo o ya tiene state previo
        startOnboarding();
      }
    }
    console.log("[SatsParty] Init OK");
  } catch (err) {
    console.error("[SatsParty] Error:", err);
    document.getElementById("app").innerHTML = `<div style="padding:2rem;color:#F7FF00;font-family:monospace;">${err.message}<br><br><pre>${err.stack}</pre></div>`;
  }
}

/**
 * Extraer código de evento de la URL
 * Soporta: /onboard/CODIGO o ?code=CODIGO
 */
function getEventCode() {
  // Path: /onboard/CODIGO
  const pathMatch = window.location.pathname.match(/\/onboard\/([^/]+)/);
  if (pathMatch) return pathMatch[1];
  // Query: ?code=CODIGO
  const params = new URLSearchParams(window.location.search);
  return params.get("code") || null;
}

/**
 * Validar evento con el backend
 */
async function validateEvent(code) {
  try {
    const res = await fetch(`/api/onboard/${code}`);
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, ...data };
    }
    return { ok: true, event: data.event };
  } catch (err) {
    console.warn("[SatsParty] Backend no disponible, modo offline");
    return { ok: true, event: null }; // Si backend no está, dejar pasar
  }
}

/**
 * Mostrar pantalla de evento bloqueado (cerrado / lleno / no encontrado)
 */
function showEventBlocked(validation) {
  const app = document.getElementById("app");
  const isClosed = validation.closed;
  const isFull = validation.full;
  const eventName = validation.eventName || "Evento";

  app.innerHTML = `
    <div class="screen active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;gap:1.5rem;">
      <span class="topbar-logo" style="font-size:1.8rem">Sats<span>Party</span></span>
      <div style="font-size:3rem">${isClosed ? "🔒" : isFull ? "👥" : "❌"}</div>
      <h2 style="font-family:var(--font-display);font-size:2.2rem;color:var(--white);line-height:1.1">
        ${isClosed ? "Evento<br>finalizado" : isFull ? "Evento<br>lleno" : "Evento no<br>encontrado"}
      </h2>
      <p style="font-family:var(--font-body);font-size:.9rem;color:var(--muted);line-height:1.6;max-width:300px">
        ${validation.error || "No se pudo acceder al evento."}
      </p>
      ${isClosed ? `<div style="font-family:var(--font-mono);font-size:.6rem;letter-spacing:.1em;color:var(--muted);background:rgba(255,85,85,.08);border:1px solid rgba(255,85,85,.15);padding:.5rem 1rem;border-radius:8px">
        ${eventName}
      </div>` : ""}
    </div>
  `;
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
    usdToSats,
    arsToSats,
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
  container.innerHTML = "";

  // Double flash — intense strobe
  for (let f = 0; f < 2; f++) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position:fixed;inset:0;
      background:radial-gradient(circle at 50% 45%, rgba(247,255,0,.35), rgba(247,255,0,.08) 60%, transparent 80%);
      pointer-events:none;z-index:499;
      animation:lightningFlash ${0.4 + f * 0.3}s ease-out ${f * 0.15}s forwards;
    `;
    container.appendChild(flash);
    setTimeout(() => flash.remove(), 800 + f * 300);
  }

  // SVG lightning bolt (no emoji)
  const bolt = document.createElement("div");
  bolt.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="#F7FF00" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/></svg>`;
  bolt.style.cssText = `
    position:fixed;left:50%;top:45%;
    transform:translate(-50%,-50%) scale(0);
    z-index:502;pointer-events:none;
    animation:boltAppear .6s cubic-bezier(.34,1.56,.64,1) forwards;
    filter:drop-shadow(0 0 30px rgba(247,255,0,.8)) drop-shadow(0 0 60px rgba(247,255,0,.4));
  `;
  container.appendChild(bolt);
  setTimeout(() => bolt.remove(), 2500);

  // Core glow behind bolt
  const glow = document.createElement("div");
  glow.style.cssText = `
    position:fixed;left:50%;top:45%;
    width:20px;height:20px;border-radius:50%;
    background:radial-gradient(circle, rgba(247,255,0,.6) 0%, transparent 70%);
    transform:translate(-50%,-50%) scale(1);
    pointer-events:none;z-index:500;
    animation:glowPulse .8s ease-out forwards;
  `;
  container.appendChild(glow);
  setTimeout(() => glow.remove(), 1000);

  // Pulse rings — 5 waves, more intense
  for (let i = 0; i < 5; i++) {
    const ring = document.createElement("div");
    const color = i % 2 === 0 ? "rgba(247,255,0,.5)" : "rgba(0,255,135,.3)";
    ring.style.cssText = `
      position:fixed;left:50%;top:45%;
      width:30px;height:30px;border-radius:50%;
      border:2px solid ${color};
      transform:translate(-50%,-50%) scale(1);
      pointer-events:none;z-index:501;
      animation:pulseRing 1.2s ease-out ${i * 0.18}s forwards;
    `;
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 1800 + i * 180);
  }

  // Electric sparks — 20 particles, bigger spread
  for (let i = 0; i < 20; i++) {
    const spark = document.createElement("div");
    const angle = (i / 20) * 360 + (Math.random() - 0.5) * 30;
    const dist = 80 + Math.random() * 120;
    const size = Math.random() * 4 + 2;
    const dur = 0.5 + Math.random() * 0.5;
    const delay = Math.random() * 0.25;
    const colors = ["#F7FF00", "#00FF87", "#F2EDE6", "#FF6B1A"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    spark.style.cssText = `
      position:fixed;left:50%;top:45%;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      transform:translate(-50%,-50%);
      pointer-events:none;z-index:501;
      animation:sparkFly ${dur}s ease-out ${delay}s forwards;
      --spark-x:${Math.cos(angle * Math.PI / 180) * dist}px;
      --spark-y:${Math.sin(angle * Math.PI / 180) * dist}px;
      box-shadow:0 0 8px ${color};
    `;
    container.appendChild(spark);
    setTimeout(() => spark.remove(), (dur + delay) * 1000 + 200);
  }

  // Electric arc lines — 6 random lightning branches
  for (let i = 0; i < 6; i++) {
    const arc = document.createElement("div");
    const angle = Math.random() * 360;
    const len = 40 + Math.random() * 60;
    const delay = Math.random() * 0.3;
    arc.style.cssText = `
      position:fixed;left:50%;top:45%;
      width:${len}px;height:1.5px;
      background:linear-gradient(90deg, rgba(247,255,0,.8), transparent);
      transform-origin:left center;
      transform:translate(0,-50%) rotate(${angle}deg);
      pointer-events:none;z-index:501;
      animation:arcFlash .3s ease-out ${delay}s forwards;
      box-shadow:0 0 4px rgba(247,255,0,.6);
    `;
    container.appendChild(arc);
    setTimeout(() => arc.remove(), 600 + delay * 1000);
  }
}
