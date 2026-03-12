// ═══════════════════════════════════════
//  SatsParty — Admin Panel
// ═══════════════════════════════════════

import QRCode from "qrcode";

const API = "/api";
const app = document.getElementById("admin-app");

let token = localStorage.getItem("sp_admin_token") || null;
let currentScreen = "login"; // login | dashboard | detail
let currentEventId = null;

// ── API Helper ──
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
}

// ── INIT ──
async function init() {
  if (token) {
    try {
      await api("/auth/me");
      showDashboard();
    } catch {
      token = null;
      localStorage.removeItem("sp_admin_token");
      showLogin();
    }
  } else {
    showLogin();
  }
}

// ════════════════════════════════════════
//  LOGIN SCREEN
// ════════════════════════════════════════
function showLogin() {
  currentScreen = "login";
  app.innerHTML = `
    <div class="admin-screen active" id="screen-login">
      <div class="login-wrap">
        <div class="login-brand">
          <h1>Sats<span>Party</span></h1>
          <div class="login-badge">Admin Panel</div>
        </div>
        <form class="login-form" id="login-form">
          <label class="field-label">Password</label>
          <input type="password" class="field-input" id="login-password"
                 placeholder="Ingresá la contraseña" autofocus />
          <div class="login-error" id="login-error"></div>
          <button type="submit" class="btn btn-electric">
            ⚡ Ingresar
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("login-form").addEventListener("submit", handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const pw = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";

  if (!pw) {
    errEl.textContent = "Ingresá la contraseña";
    return;
  }

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: pw }),
    });
    token = data.token;
    localStorage.setItem("sp_admin_token", token);
    showDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ════════════════════════════════════════
//  DASHBOARD SCREEN
// ════════════════════════════════════════
async function showDashboard() {
  currentScreen = "dashboard";
  currentEventId = null;

  app.innerHTML = `
    <div class="admin-screen active" id="screen-dashboard">
      ${topbar()}
      <div class="admin-content" id="dashboard-content">
        <div style="text-align:center;padding:3rem;color:var(--muted)">
          Cargando eventos...
        </div>
      </div>
    </div>
    <div class="form-overlay" id="create-form"></div>
  `;

  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  try {
    const data = await api("/events");
    renderDashboardContent(data.events);
  } catch (err) {
    document.getElementById("dashboard-content").innerHTML = `
      <div style="text-align:center;padding:3rem;color:#ff5555">
        Error: ${err.message}
      </div>
    `;
  }
}

function renderDashboardContent(events) {
  const content = document.getElementById("dashboard-content");

  // Global stats
  const totalAttendees = events.reduce((s, e) => s + (e.attendeeCount || 0), 0);
  const totalOnboarded = events.reduce((s, e) => s + (e.onboardedCount || 0), 0);
  const activeEvents = events.filter((e) => e.status === "active").length;

  content.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-card-value electric">${events.length}</div>
        <div class="stat-card-label">Eventos totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value green">${activeEvents}</div>
        <div class="stat-card-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value cyan">${totalAttendees}</div>
        <div class="stat-card-label">Asistentes</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value orange">${totalOnboarded}</div>
        <div class="stat-card-label">Onboarded</div>
      </div>
    </div>

    <div class="admin-section-header">
      <div class="admin-section-title">Eventos</div>
      <button class="btn-create" id="btn-create-event">+ Nuevo Evento</button>
    </div>

    <div class="event-list" id="event-list">
      ${
        events.length === 0
          ? `<div class="no-events">
               <div class="no-events-icon">⚡</div>
               <div class="no-events-text">Todavía no hay eventos</div>
               <div class="no-events-hint">Creá tu primer evento para empezar el onboarding</div>
             </div>`
          : events.map((e) => eventCard(e)).join("")
      }
    </div>
  `;

  // Bind events
  document.getElementById("btn-create-event").addEventListener("click", openCreateForm);
  document.querySelectorAll(".event-card").forEach((card) => {
    card.addEventListener("click", () => showEventDetail(card.dataset.id));
  });
}

function eventCard(e) {
  return `
    <div class="event-card" data-id="${e.id}">
      <div class="event-card-top">
        <div class="event-card-name">${esc(e.name)}</div>
        <div class="event-card-status ${e.status}">${e.status}</div>
      </div>
      <div class="event-card-meta">
        <div class="event-card-meta-item">📅 <strong>${e.date}</strong></div>
        <div class="event-card-meta-item">👥 <strong>${e.attendeeCount || 0}</strong> asistentes</div>
        <div class="event-card-meta-item">⚡ <strong>${e.welcomeSats}</strong> sats bienvenida</div>
        <div class="event-card-meta-item">🔗 <strong>${e.code}</strong></div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════
//  CREATE EVENT FORM
// ════════════════════════════════════════
function openCreateForm() {
  const overlay = document.getElementById("create-form");
  overlay.classList.add("active");
  overlay.innerHTML = `
    <div class="form-header">
      <div class="form-title">Nuevo Evento</div>
      <button class="btn-close-form" id="btn-close-form">✕</button>
    </div>
    <div class="form-body">
      <div class="form-group">
        <label class="field-label">Nombre del evento</label>
        <input type="text" class="field-input" id="evt-name" placeholder="Ej: Bitcoin Meetup BA" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Fecha</label>
          <input type="date" class="field-input" id="evt-date" />
        </div>
        <div class="form-group">
          <label class="field-label">Máx. asistentes</label>
          <input type="number" class="field-input" id="evt-max" value="100" min="1" />
        </div>
      </div>

      <div class="form-group">
        <label class="field-label">Sats de bienvenida</label>
        <input type="number" class="field-input" id="evt-sats" value="100" min="1" />
        <div class="form-hint">Cada asistente recibirá esta cantidad al hacer onboarding</div>
      </div>

      <div class="form-group">
        <label class="field-label">Alby Hub URL</label>
        <input type="url" class="field-input" id="evt-alby-url" placeholder="https://tu-alby-hub.example.com" />
        <div class="form-hint">URL de tu Alby Hub con la API habilitada</div>
      </div>

      <div class="form-group">
        <label class="field-label">Alby Hub Auth Token</label>
        <input type="password" class="field-input" id="evt-alby-token" placeholder="Token de autenticación" />
        <div class="form-hint">Se almacena de forma segura en el servidor</div>
      </div>

      <div class="login-error" id="create-error"></div>
    </div>
    <div class="form-footer">
      <button class="btn btn-electric" id="btn-submit-event">⚡ Crear Evento</button>
    </div>
  `;

  document.getElementById("btn-close-form").addEventListener("click", closeCreateForm);
  document.getElementById("btn-submit-event").addEventListener("click", submitCreateEvent);
}

function closeCreateForm() {
  const overlay = document.getElementById("create-form");
  overlay.classList.remove("active");
  overlay.innerHTML = "";
}

async function submitCreateEvent() {
  const errEl = document.getElementById("create-error");
  errEl.textContent = "";

  const name = document.getElementById("evt-name").value.trim();
  const date = document.getElementById("evt-date").value;
  const maxAttendees = parseInt(document.getElementById("evt-max").value) || 100;
  const welcomeSats = parseInt(document.getElementById("evt-sats").value) || 100;
  const albyHubUrl = document.getElementById("evt-alby-url").value.trim();
  const albyAuthToken = document.getElementById("evt-alby-token").value.trim();

  if (!name) { errEl.textContent = "Ingresá el nombre del evento"; return; }
  if (!date) { errEl.textContent = "Seleccioná la fecha"; return; }
  if (!albyHubUrl) { errEl.textContent = "Ingresá la URL de Alby Hub"; return; }
  if (!albyAuthToken) { errEl.textContent = "Ingresá el token de Alby Hub"; return; }

  try {
    await api("/events", {
      method: "POST",
      body: JSON.stringify({ name, date, welcomeSats, maxAttendees, albyHubUrl, albyAuthToken }),
    });
    closeCreateForm();
    showDashboard(); // Refresh
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ════════════════════════════════════════
//  EVENT DETAIL SCREEN
// ════════════════════════════════════════
async function showEventDetail(id) {
  currentScreen = "detail";
  currentEventId = id;

  app.innerHTML = `
    <div class="admin-screen active" id="screen-detail">
      ${topbar()}
      <div class="admin-content" id="detail-content">
        <div style="text-align:center;padding:3rem;color:var(--muted)">
          Cargando evento...
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  try {
    const [evData, attData] = await Promise.all([
      api(`/events/${id}`),
      api(`/events/${id}/attendees`),
    ]);
    renderEventDetail(evData.event, evData.stats, attData.attendees);
  } catch (err) {
    document.getElementById("detail-content").innerHTML = `
      <div style="text-align:center;padding:3rem;color:#ff5555">
        Error: ${err.message}
      </div>
    `;
  }
}

function renderEventDetail(event, stats, attendees) {
  const content = document.getElementById("detail-content");
  const onboardUrl = `${window.location.origin}/onboard/${event.code}`;

  content.innerHTML = `
    <button class="detail-back" id="btn-back">← Volver a eventos</button>

    <div class="detail-header">
      <div>
        <div class="detail-name">${esc(event.name)}</div>
        <div style="font-family:var(--font-mono);font-size:.6rem;color:var(--muted);margin-top:.3rem">
          📅 ${event.date} · Máx ${event.maxAttendees} asistentes
          ${event.status === "closed" ? ' · <span style="color:#ff5555">CERRADO</span>' : ' · <span style="color:var(--green)">ACTIVO</span>'}
        </div>
      </div>
      <div class="detail-code-wrap">
        <div class="detail-code">${event.code}</div>
        <button class="btn-copy-link" id="btn-copy-link">📋 Copiar link</button>
      </div>
    </div>

    ${event.status === "closed"
      ? `<div class="event-closed-banner">
           <div class="event-closed-banner-text">🔒 Evento cerrado — el QR ya no dispensa sats</div>
           <button class="btn-reopen" id="btn-toggle-event">🔓 Reabrir Evento</button>
         </div>`
      : `<div class="event-action-row">
           <button class="btn-close-event" id="btn-toggle-event">🔒 Cerrar Evento</button>
         </div>`
    }

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-card-value cyan">${stats.totalAttendees}</div>
        <div class="stat-card-label">Asistentes</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value green">${stats.onboarded}</div>
        <div class="stat-card-label">Onboarded</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value orange">${stats.funded}</div>
        <div class="stat-card-label">Funded</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value electric">${stats.totalSatsDistributed}</div>
        <div class="stat-card-label">Sats distribuidos</div>
      </div>
    </div>

    <div class="qr-section">
      <canvas id="qr-canvas"></canvas>
      <div class="qr-url">${onboardUrl}</div>
      <div style="font-family:var(--font-mono);font-size:.5rem;color:var(--muted);margin-top:.5rem;letter-spacing:.08em">
        LOS ASISTENTES ESCANEAN ESTE QR PARA ONBOARDING
      </div>
    </div>

    <div class="attendee-section-title">Asistentes (${attendees.length})</div>

    ${
      attendees.length === 0
        ? `<div class="no-events">
             <div class="no-events-icon">👥</div>
             <div class="no-events-text">Todavía no hay asistentes</div>
             <div class="no-events-hint">Compartí el link de onboarding en el evento</div>
           </div>`
        : `<div class="attendee-header">
             <div class="attendee-header-label">Lightning Address</div>
             <div class="attendee-header-label">Saldo</div>
             <div class="attendee-header-label">Nostr / Correo</div>
             <div class="attendee-header-label">NWC</div>
           </div>
           <div class="attendee-list">
             ${attendees
               .map(
                 (a, i) => `
               <div class="attendee-row">
                 <div class="att-address">⚡ ${esc(a.lightningAddress || "wallet-" + (i + 1) + "@satsparty.app")}</div>
                 <div class="att-balance">₿ ${a.balanceSats.toLocaleString()}</div>
                 <div class="att-nostr">${esc(a.displayName || "—")}</div>
                 <div class="att-nwc">
                   <button class="btn-reveal-nwc" data-idx="${i}">🔒 Ver</button>
                   <div class="att-nwc-value" id="nwc-val-${i}">${esc(a.nwcUrl || "nostr+walletconnect://...")}</div>
                 </div>
               </div>`
               )
               .join("")}
           </div>`
    }
  `;

  document.getElementById("btn-back").addEventListener("click", showDashboard);

  // Generate real QR code
  const qrCanvas = document.getElementById("qr-canvas");
  if (qrCanvas) {
    QRCode.toCanvas(qrCanvas, onboardUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch((err) => console.error("QR error:", err));
  }

  document.getElementById("btn-copy-link").addEventListener("click", () => {
    navigator.clipboard.writeText(onboardUrl).then(() => {
      const btn = document.getElementById("btn-copy-link");
      btn.textContent = "✓ Copiado";
      setTimeout(() => { btn.textContent = "📋 Copiar link"; }, 2000);
    });
  });

  // Reveal NWC buttons
  document.querySelectorAll(".btn-reveal-nwc").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = btn.dataset.idx;
      const valEl = document.getElementById(`nwc-val-${idx}`);
      if (valEl) {
        const isVisible = valEl.classList.toggle("visible");
        btn.textContent = isVisible ? "🔓 Ocultar" : "🔒 Ver";
      }
    });
  });

  // Close / Reopen event
  document.getElementById("btn-toggle-event").addEventListener("click", () => {
    if (event.status === "closed") {
      handleToggleEvent(event.id, "active", "¿Reabrir evento? El QR volverá a dispensar sats.");
    } else {
      handleToggleEvent(event.id, "closed", "¿Cerrar evento? El QR dejará de dispensar sats a nuevos asistentes.");
    }
  });
}

async function handleToggleEvent(eventId, newStatus, confirmMsg) {
  if (!confirm(confirmMsg)) return;

  try {
    await api(`/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    // Refresh detail view
    showEventDetail(eventId);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ════════════════════════════════════════
//  SHARED UI
// ════════════════════════════════════════
function topbar() {
  return `
    <div class="admin-topbar">
      <div class="admin-topbar-brand">Sats<span>Party</span></div>
      <div class="admin-topbar-right">
        <div class="admin-status">Conectado</div>
        <button class="btn-logout" id="btn-logout">Salir</button>
      </div>
    </div>
  `;
}

function handleLogout() {
  token = null;
  localStorage.removeItem("sp_admin_token");
  showLogin();
}

// ── Utilities ──
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + "Z"); // treat as UTC
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Start ──
document.addEventListener("DOMContentLoaded", init);
