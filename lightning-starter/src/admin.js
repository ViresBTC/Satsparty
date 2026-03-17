/**
 * SatsParty — Admin Module
 *
 * Login con Nostr → Lista de Eventos → Detalle de Evento
 * Cada organizador (pubkey) ve solo sus propios eventos.
 */

import {
  loginWithPrivateKey,
  loginWithExtension,
  hasNostrExtension,
  truncateNpub,
} from "./services/nostr.js";
import { loadEvents, createEvent, updateEvent, deleteEvent, setEventClosed, setEventInfo } from "./services/state.js";

let currentScreen = null;
let ctx = null;
let activeEventId = null; // evento seleccionado para ver detalle

// ── RENDER ──

export function renderAdmin(app, context) {
  ctx = context;
  app.innerHTML = getAdminHTML();
  setupEvents();

  const state = ctx.getState();
  if (state.adminPubkey && state.adminNpub) {
    showEventsList();
  } else {
    goTo("screen-admin-login");
  }
}

// ══════════════════════════════════════════════════
// HTML
// ══════════════════════════════════════════════════

function getAdminHTML() {
  const hasExtension = hasNostrExtension();

  return `
    <!-- ═══ 1. LOGIN ═══ -->
    <div class="screen" id="screen-admin-login">
      <div class="topbar">
        <span class="topbar-logo">Sats<span>Party</span></span>
      </div>
      <div class="screen-body admin-login-body">
        <div class="admin-login-header">
          <div class="admin-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--electric)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
          <h1 class="admin-title">ADMIN PANEL</h1>
          <p class="admin-subtitle">Iniciá sesión con tu identidad Nostr</p>
        </div>

        <!-- Clave privada -->
        <div class="admin-section">
          <div class="admin-section-label">CLAVE PRIVADA</div>
          <div class="admin-input-wrap">
            <input type="password" class="field-input admin-key-input" id="admin-nsec-input"
              placeholder="nsec1... o hex privkey" autocomplete="off" spellcheck="false"/>
            <button class="admin-toggle-vis" id="btn-toggle-vis" title="Mostrar/ocultar">
              <svg id="icon-eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg id="icon-eye-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <button class="btn btn-electric admin-btn" id="btn-login-nsec">Iniciar Sesión</button>
        </div>

        <div class="admin-divider"><span>o</span></div>

        <!-- Extensión NIP-07 -->
        <div class="admin-section">
          <button class="btn btn-dim admin-btn admin-ext-btn" id="btn-login-extension" ${!hasExtension ? "disabled" : ""}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Conectar con Extensión Nostr
          </button>
          <div class="admin-ext-hint">
            ${hasExtension
              ? '<span class="admin-ext-detected">Extensión detectada</span>'
              : '<span class="admin-ext-missing">No se detectó extensión — <a href="https://getalby.com" target="_blank" rel="noopener">Instalar Alby</a></span>'}
          </div>
        </div>

        <div class="admin-error" id="admin-error" style="display:none"></div>
        <div class="admin-back-link">
          <a href="/" id="btn-back-app">Volver a SatsParty</a>
        </div>
      </div>
    </div>

    <!-- ═══ 2. MIS EVENTOS ═══ -->
    <div class="screen" id="screen-admin-events">
      <div class="topbar">
        <span class="topbar-logo">Sats<span>Party</span></span>
        <button class="admin-logout-btn" id="btn-admin-logout">Cerrar Sesión</button>
      </div>
      <div class="screen-body admin-panel-body">
        <div class="admin-panel-header">
          <div class="admin-panel-badge">ADMIN</div>
          <div class="admin-panel-identity" id="admin-identity"></div>
        </div>

        <h2 class="admin-events-title">MIS EVENTOS</h2>
        <div id="admin-events-list"></div>

        <button class="btn btn-electric admin-btn admin-create-btn" id="btn-create-event">
          + CREAR EVENTO
        </button>
      </div>
    </div>

    <!-- ═══ 3. CREAR / EDITAR EVENTO ═══ -->
    <div class="screen" id="screen-admin-event-form">
      <div class="topbar">
        <span class="topbar-logo">Sats<span>Party</span></span>
        <button class="admin-logout-btn" id="btn-back-events">Mis Eventos</button>
      </div>
      <div class="screen-body admin-panel-body">
        <h2 class="admin-events-title" id="event-form-title">NUEVO EVENTO</h2>

        <!-- Banner evento cerrado -->
        <div class="admin-closed-banner" id="event-closed-banner" style="display:none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          EVENTO CERRADO — Ya no se aceptan nuevos asistentes
        </div>

        <div class="admin-event-grid">
          <!-- ── COLUMNA IZQUIERDA: Config + NWC ── -->
          <div class="admin-event-col">
            <!-- Config -->
            <div class="admin-card">
              <div class="admin-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--electric)" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Configuraci\u00f3n
              </div>
              <div class="admin-card-body">
                <div class="field-label">Nombre del evento</div>
                <input class="field-input" id="admin-event-name" placeholder="Ej: La Crypta Meetup"/>
                <div class="field-label" style="margin-top:.75rem">Fecha</div>
                <input class="field-input" id="admin-event-date" placeholder="Ej: Marzo 2026"/>
                <div class="field-label" style="margin-top:.75rem">Sats de bienvenida</div>
                <input class="field-input" id="admin-welcome-sats" type="number" placeholder="100" value="100"/>
                <div class="field-label" style="margin-top:.75rem">M\u00e1ximo de asistentes</div>
                <input class="field-input" id="admin-max-attendees" type="number" placeholder="0 = sin l\u00edmite" value="0" min="0"/>
                <div class="admin-field-hint">0 = sin l\u00edmite</div>
              </div>
            </div>

            <!-- NWC -->
            <div class="admin-card">
              <div class="admin-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Wallet Connect (NWC)
              </div>
              <div class="admin-card-body">
                <div class="field-label">NWC URL del Organizador</div>
                <input class="field-input" id="admin-nwc-url" type="password" placeholder="nostr+walletconnect://..." autocomplete="off"/>
                <button class="btn btn-dim admin-btn" id="btn-test-nwc" style="margin-top:.75rem">Probar Conexi\u00f3n</button>
                <div class="admin-nwc-status" id="admin-nwc-status"></div>
              </div>
            </div>
          </div>

          <!-- ── COLUMNA DERECHA: QR + Stats + Asistentes ── -->
          <div class="admin-event-col">
            <!-- QR del evento (solo en modo edición) -->
            <div class="admin-card" id="event-qr-card" style="display:none">
              <div class="admin-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--electric)" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
                QR del Evento
              </div>
              <div class="admin-card-body" style="text-align:center">
                <div class="admin-qr-wrap" id="event-qr-container"></div>
                <div class="admin-qr-link-wrap">
                  <div class="field-label" style="margin-top:.75rem">LINK PARA ASISTENTES</div>
                  <div class="admin-qr-link" id="event-link-display"></div>
                  <button class="btn btn-dim admin-btn admin-copy-btn" id="btn-copy-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>

            <!-- Stats (solo en modo edición) -->
            <div class="admin-card" id="event-stats-card" style="display:none">
              <div class="admin-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Asistentes
              </div>
              <div class="admin-card-body">
                <div class="admin-stats-row">
                  <div class="admin-stat">
                    <div class="admin-stat-value" id="stat-total">0</div>
                    <div class="admin-stat-label">Registrados</div>
                  </div>
                  <div class="admin-stat">
                    <div class="admin-stat-value" id="stat-onboarded">0</div>
                    <div class="admin-stat-label">Onboarded</div>
                  </div>
                  <div class="admin-stat">
                    <div class="admin-stat-value" id="stat-sats">0</div>
                    <div class="admin-stat-label">Sats Repartidos</div>
                  </div>
                </div>

                <!-- Lista de asistentes -->
                <div class="admin-attendees-list" id="event-attendees-list">
                  <div class="admin-attendees-empty">
                    Todav\u00eda no hay asistentes registrados
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones (full width debajo del grid) -->
        <div class="admin-event-actions">
          <button class="btn btn-electric admin-btn" id="btn-save-event">
            Guardar Evento
          </button>
          <button class="btn btn-warning-ghost admin-btn" id="btn-close-event" style="display:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Cerrar Evento
          </button>
          <button class="btn btn-success-ghost admin-btn" id="btn-reopen-event" style="display:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5"/></svg>
            Reabrir Evento
          </button>
          <button class="btn btn-danger-ghost admin-btn" id="btn-delete-event" style="display:none">
            Eliminar Evento
          </button>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════

function setupEvents() {
  // Login
  onClick("btn-login-nsec", handleNsecLogin);
  onClick("btn-login-extension", handleExtensionLogin);
  onClick("btn-toggle-vis", toggleInputVisibility);

  const nsecInput = document.getElementById("admin-nsec-input");
  if (nsecInput) {
    nsecInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleNsecLogin();
    });
  }

  // Navigation
  onClick("btn-admin-logout", handleLogout);
  onClick("btn-back-events", () => showEventsList());
  onClick("btn-create-event", () => showEventForm(null));
  onClick("btn-back-app", (e) => {
    e.preventDefault();
    window.location.hash = "";
    window.location.reload();
  });

  // Event form
  onClick("btn-save-event", handleSaveEvent);
  onClick("btn-delete-event", handleDeleteEvent);
  onClick("btn-close-event", handleCloseEvent);
  onClick("btn-reopen-event", handleReopenEvent);
  onClick("btn-test-nwc", handleTestNwc);
  onClick("btn-copy-link", handleCopyLink);
}

// ══════════════════════════════════════════════════
// LOGIN HANDLERS
// ══════════════════════════════════════════════════

async function handleNsecLogin() {
  const input = document.getElementById("admin-nsec-input");
  const value = input?.value?.trim();

  if (!value) {
    showError("Pegá tu clave privada (nsec o hex).");
    return;
  }

  hideError();
  setLoading("btn-login-nsec", true);

  try {
    const { pubkey, npub } = loginWithPrivateKey(value);

    ctx.setState({ adminPubkey: pubkey, adminNpub: npub });
    input.value = "";

    ctx.showToast("Login exitoso");
    showEventsList();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading("btn-login-nsec", false);
  }
}

async function handleExtensionLogin() {
  hideError();
  setLoading("btn-login-extension", true);

  try {
    const { pubkey, npub } = await loginWithExtension();

    ctx.setState({ adminPubkey: pubkey, adminNpub: npub });

    ctx.showToast("Conectado con extensión");
    showEventsList();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading("btn-login-extension", false);
  }
}

function handleLogout() {
  ctx.setState({ adminPubkey: null, adminNpub: null });
  ctx.showToast("Sesión cerrada");
  goTo("screen-admin-login");
}

// ══════════════════════════════════════════════════
// EVENTS LIST
// ══════════════════════════════════════════════════

function showEventsList() {
  const state = ctx.getState();
  const pubkey = state.adminPubkey;
  const events = loadEvents(pubkey);

  // Identidad
  const identityEl = document.getElementById("admin-identity");
  if (identityEl) identityEl.textContent = truncateNpub(state.adminNpub);

  // Renderizar lista
  const listEl = document.getElementById("admin-events-list");
  if (!listEl) return;

  if (events.length === 0) {
    listEl.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-icon">⚡</div>
        <div class="admin-empty-text">No tenés eventos todavía</div>
        <div class="admin-empty-sub">Creá tu primer evento para empezar a recibir asistentes</div>
      </div>
    `;
  } else {
    listEl.innerHTML = events
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (evt) => `
      <div class="admin-event-card ${evt.closed ? "is-closed" : ""}" data-event-id="${evt.id}">
        <div class="admin-event-card-left">
          <div class="admin-event-card-name">
            ${escapeHtml(evt.name)}
            ${evt.closed ? '<span class="admin-event-closed-badge">CERRADO</span>' : ""}
          </div>
          <div class="admin-event-card-meta">
            ${evt.date ? escapeHtml(evt.date) + " \u00b7 " : ""}${evt.attendees || 0}${evt.maxAttendees ? "/" + evt.maxAttendees : ""} asistentes \u00b7 ${(evt.satsDistributed || 0).toLocaleString()} sats
          </div>
        </div>
        <div class="admin-event-card-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `
      )
      .join("");

    // Bind click en cada card
    listEl.querySelectorAll(".admin-event-card").forEach((card) => {
      card.addEventListener("click", () => {
        const eventId = card.dataset.eventId;
        showEventForm(eventId);
      });
    });
  }

  goTo("screen-admin-events");
}

// ══════════════════════════════════════════════════
// EVENT FORM (crear / editar)
// ══════════════════════════════════════════════════

function showEventForm(eventId) {
  const state = ctx.getState();
  const pubkey = state.adminPubkey;
  const isNew = !eventId;

  activeEventId = eventId;

  // Titulo
  const titleEl = document.getElementById("event-form-title");
  if (titleEl) titleEl.textContent = isNew ? "NUEVO EVENTO" : "EDITAR EVENTO";

  // Campos
  const nameInput = document.getElementById("admin-event-name");
  const dateInput = document.getElementById("admin-event-date");
  const satsInput = document.getElementById("admin-welcome-sats");
  const maxInput = document.getElementById("admin-max-attendees");
  const nwcInput = document.getElementById("admin-nwc-url");
  const statsCard = document.getElementById("event-stats-card");
  const qrCard = document.getElementById("event-qr-card");
  const deleteBtn = document.getElementById("btn-delete-event");
  const closeBtn = document.getElementById("btn-close-event");
  const reopenBtn = document.getElementById("btn-reopen-event");
  const closedBanner = document.getElementById("event-closed-banner");
  const nwcStatus = document.getElementById("admin-nwc-status");

  if (nwcStatus) nwcStatus.innerHTML = "";

  if (isNew) {
    // Form vacío para crear
    if (nameInput) nameInput.value = "";
    if (dateInput) dateInput.value = "";
    if (satsInput) satsInput.value = "100";
    if (maxInput) maxInput.value = "0";
    if (nwcInput) nwcInput.value = "";
    if (statsCard) statsCard.style.display = "none";
    if (qrCard) qrCard.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    if (closeBtn) closeBtn.style.display = "none";
    if (reopenBtn) reopenBtn.style.display = "none";
    if (closedBanner) closedBanner.style.display = "none";
  } else {
    // Cargar datos del evento existente
    const events = loadEvents(pubkey);
    const evt = events.find((e) => e.id === eventId);
    if (!evt) return;

    const isClosed = !!evt.closed;

    if (nameInput) nameInput.value = evt.name || "";
    if (dateInput) dateInput.value = evt.date || "";
    if (satsInput) satsInput.value = evt.welcomeSats || 100;
    if (maxInput) maxInput.value = evt.maxAttendees || 0;
    if (nwcInput) nwcInput.value = evt.nwcUrl || "";

    // Mostrar/ocultar banner de cerrado
    if (closedBanner) closedBanner.style.display = isClosed ? "flex" : "none";

    // Botones cerrar/reabrir
    if (closeBtn) closeBtn.style.display = isClosed ? "none" : "block";
    if (reopenBtn) reopenBtn.style.display = isClosed ? "block" : "none";

    // QR del evento
    if (qrCard) {
      qrCard.style.display = "block";
      const eventUrl = getEventUrl(evt.id);
      const qrContainer = document.getElementById("event-qr-container");
      const linkDisplay = document.getElementById("event-link-display");

      if (qrContainer && ctx.generateQRSvg) {
        qrContainer.innerHTML = `<div class="admin-qr-svg">${ctx.generateQRSvg(eventUrl, 180)}</div>`;
      }
      if (linkDisplay) {
        linkDisplay.textContent = eventUrl;
      }
    }

    // Stats — mostrar max attendees info
    if (statsCard) statsCard.style.display = "block";
    const statTotal = document.getElementById("stat-total");
    const statOnboarded = document.getElementById("stat-onboarded");
    const statSats = document.getElementById("stat-sats");
    if (statTotal) {
      const maxLabel = evt.maxAttendees ? ` / ${evt.maxAttendees}` : "";
      statTotal.textContent = (evt.attendees || 0) + maxLabel;
    }
    if (statOnboarded) statOnboarded.textContent = evt.attendees || 0;
    if (statSats) statSats.textContent = (evt.satsDistributed || 0).toLocaleString();

    // Lista de asistentes
    renderAttendeesList(evt);

    if (deleteBtn) deleteBtn.style.display = "block";
  }

  goTo("screen-admin-event-form");
}

function getEventUrl(eventId) {
  const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
  return base + "?event=" + eventId;
}

function renderAttendeesList(evt) {
  const listEl = document.getElementById("event-attendees-list");
  if (!listEl) return;

  const attendees = evt.attendeesList || [];

  if (attendees.length === 0) {
    listEl.innerHTML = `
      <div class="admin-attendees-empty">
        Todav\u00eda no hay asistentes registrados
      </div>
    `;
  } else {
    listEl.innerHTML = `
      <div class="admin-attendees-header">
        <span>Nombre</span>
        <span>Lightning Address</span>
        <span>Estado</span>
      </div>
      ${attendees.map((a) => `
        <div class="admin-attendee-row">
          <span class="admin-attendee-name">${escapeHtml(a.name || "Sin nombre")}</span>
          <span class="admin-attendee-addr">${escapeHtml(a.lightningAddress || "—")}</span>
          <span class="admin-attendee-status ${a.onboarded ? "is-active" : ""}">${a.onboarded ? "Completado" : "Pendiente"}</span>
        </div>
      `).join("")}
    `;
  }
}

// ══════════════════════════════════════════════════
// EVENT FORM HANDLERS
// ══════════════════════════════════════════════════

function handleSaveEvent() {
  const state = ctx.getState();
  const pubkey = state.adminPubkey;

  const name = document.getElementById("admin-event-name")?.value?.trim();
  const date = document.getElementById("admin-event-date")?.value?.trim();
  const sats = parseInt(document.getElementById("admin-welcome-sats")?.value) || 100;
  const maxAtt = parseInt(document.getElementById("admin-max-attendees")?.value) || 0;
  const nwcUrl = document.getElementById("admin-nwc-url")?.value?.trim();

  if (!name) {
    ctx.showToast("Ponele un nombre al evento");
    return;
  }

  if (activeEventId) {
    // Editar existente
    updateEvent(pubkey, activeEventId, {
      name,
      date,
      welcomeSats: sats,
      maxAttendees: maxAtt,
      nwcUrl: nwcUrl || null,
    });
    setEventInfo(activeEventId, { name, date, welcomeSats: sats });
    ctx.showToast("Evento actualizado");
  } else {
    // Crear nuevo
    const evt = createEvent(pubkey, { name, date, welcomeSats: sats, maxAttendees: maxAtt });
    if (nwcUrl) {
      updateEvent(pubkey, evt.id, { nwcUrl });
    }
    setEventInfo(evt.id, { name, date, welcomeSats: sats });
    activeEventId = evt.id;
    ctx.showToast("Evento creado");
  }

  showEventsList();
}

function handleDeleteEvent() {
  if (!activeEventId) return;

  const state = ctx.getState();
  deleteEvent(state.adminPubkey, activeEventId);
  activeEventId = null;

  ctx.showToast("Evento eliminado");
  showEventsList();
}

function handleCloseEvent() {
  if (!activeEventId) return;

  if (!confirm("¿Cerrar este evento? Los asistentes ya no podrán registrarse.")) return;

  const state = ctx.getState();
  updateEvent(state.adminPubkey, activeEventId, { closed: true });
  setEventClosed(activeEventId, true);
  ctx.showToast("Evento cerrado");
  showEventForm(activeEventId);
}

function handleReopenEvent() {
  if (!activeEventId) return;

  const state = ctx.getState();
  updateEvent(state.adminPubkey, activeEventId, { closed: false });
  setEventClosed(activeEventId, false);
  ctx.showToast("Evento reabierto");
  showEventForm(activeEventId);
}

function handleCopyLink() {
  const linkEl = document.getElementById("event-link-display");
  if (!linkEl) return;
  const url = linkEl.textContent;
  navigator.clipboard.writeText(url).then(() => {
    ctx.showToast("Link copiado");
  }).catch(() => {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    ctx.showToast("Link copiado");
  });
}

async function handleTestNwc() {
  const nwcUrl = document.getElementById("admin-nwc-url")?.value?.trim();
  const statusEl = document.getElementById("admin-nwc-status");

  if (!nwcUrl) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--orange)">Pegá una NWC URL primero</span>';
    return;
  }

  if (statusEl) statusEl.innerHTML = '<span style="color:var(--muted)">Conectando...</span>';

  try {
    await ctx.nwcService.connect(nwcUrl);
    const balance = await ctx.nwcService.getBalance();
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--green)">Conectado — Balance: ${balance.toLocaleString()} sats</span>`;
    }
    ctx.showToast("NWC conectado");
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#ff4444">Error: ${err.message}</span>`;
    }
  }
}

// ══════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════

function toggleInputVisibility() {
  const input = document.getElementById("admin-nsec-input");
  const eyeOn = document.getElementById("icon-eye");
  const eyeOff = document.getElementById("icon-eye-off");

  if (input.type === "password") {
    input.type = "text";
    if (eyeOn) eyeOn.style.display = "none";
    if (eyeOff) eyeOff.style.display = "block";
  } else {
    input.type = "password";
    if (eyeOn) eyeOn.style.display = "block";
    if (eyeOff) eyeOff.style.display = "none";
  }
}

function goTo(id) {
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

function onClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function showError(msg) {
  const el = document.getElementById("admin-error");
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

function hideError() {
  const el = document.getElementById("admin-error");
  if (el) el.style.display = "none";
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Conectando...";
    btn.disabled = true;
    btn.style.opacity = "0.6";
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
