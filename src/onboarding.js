/**
 * SatsParty — Onboarding Module
 *
 * Renderiza las pantallas de onboarding y conecta
 * la creación de wallet con NWC real.
 */

let ctx = {}; // contexto pasado desde main.js

export function renderOnboarding(app, context) {
  ctx = context;
  app.innerHTML = getOnboardingHTML();
  ctx.goTo("screen-welcome");
  setupOnboardingEvents();
}

function setupOnboardingEvents() {
  // Welcome → Connect
  on("btn-start", "click", () => ctx.goTo("screen-connect"));

  // Back to welcome
  on("btn-back-welcome", "click", () => ctx.goTo("screen-welcome"));

  // New wallet → Name screen
  on("btn-new-wallet", "click", () => ctx.goTo("screen-name"));

  // Back from name to connect
  on("btn-back-connect", "click", () => ctx.goTo("screen-connect"));

  // Name → Create wallet
  on("btn-continue-name", "click", handleNameSubmit);

  // Existing wallet
  on("btn-existing-wallet", "click", handleExistingWallet);

  // Mission list items (click to activate panel)
  on("m1", "click", () => activateMission(1));
  on("m2", "click", () => activateMission(2));
  on("m3", "click", () => activateMission(3));

  // Complete → Security
  on("btn-save-keys", "click", () => ctx.goTo("screen-security"));
  on("btn-skip-dashboard", "click", () => ctx.onOnboardingComplete());

  // Security
  on("btn-toggle-key", "click", toggleKey);
  on("btn-copy-key", "click", () => ctx.showToast("Clave copiada ✓"));
  on("btn-goto-dashboard", "click", () => ctx.onOnboardingComplete());
  on("btn-back-complete", "click", () => ctx.goTo("screen-complete"));

  // Name input: live preview of lightning address
  on("input-name", "input", () => {
    const input = document.getElementById("input-name");
    const preview = document.getElementById("name-preview-addr");
    if (!input || !preview) return;
    const val = input.value.trim();
    if (val.length > 0) {
      const clean = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);
      preview.textContent = `${clean || "user"}@${window.location.host}`;
      preview.style.color = "var(--electric)";
    } else {
      preview.textContent = `nombre@${window.location.host}`;
      preview.style.color = "var(--muted)";
    }
  });

  // Enter key on name input submits
  on("input-name", "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSubmit();
    }
  });

  // Created → Missions (activate first mission on enter)
  on("btn-goto-missions", "click", () => {
    ctx.goTo("screen-missions");
    setTimeout(() => activateMission(1), 100);
  });
}

// ── WALLET CREATION ──

async function handleNameSubmit() {
  const input = document.getElementById("input-name");
  const errEl = document.getElementById("name-error");
  const name = input?.value?.trim();

  if (errEl) errEl.textContent = "";

  if (!name || name.length < 2) {
    if (errEl) errEl.textContent = "Ingresá tu nombre (mínimo 2 letras)";
    return;
  }

  ctx.goTo("screen-creating");
  const state = ctx.getState();
  const eventCode = state.eventCode;
  let walletOk = false;

  // Try to claim via backend (with timeout), fallback to demo mode
  if (eventCode) {
    await runCreationAnimation(async (step) => {
      if (step === 1) {
        // Step 1 = "Creando Lightning Address"
        let backendOk = false;

        try {
          // Timeout de 4s para no quedarnos colgados si el backend no responde
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(`/api/onboard/${eventCode}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: name }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const data = await res.json();

          if (!res.ok) {
            console.warn("[SatsParty] Backend rechazó claim:", data.error);
            // No bloquear — fallback a demo mode abajo
          } else {
            // Save attendee data from backend
            ctx.setState({
              displayName: name,
              lightningAddress: data.attendee.lightningAddress,
              attendeeToken: data.attendee.token,
              balance: data.attendee.balanceSats,
              walletCreated: true,
              nwcUrl: data.attendee.nwcUrl,
            });
            updateCreatedScreen(data.attendee.balanceSats);
            backendOk = true;
          }
        } catch (err) {
          console.warn("[SatsParty] Backend no disponible, modo demo:", err.message || err);
        }

        // Fallback: demo mode si el backend no funcionó
        if (!backendOk) {
          const addr = generateLocalAddress(name);
          ctx.setState({
            displayName: name,
            lightningAddress: addr,
            balance: state.welcomeSats || 100,
            walletCreated: true,
          });
          updateCreatedScreen(state.welcomeSats || 100);
        }
      }
      return true;
    });
    walletOk = true;
  } else {
    // No event code — demo mode directo
    await runCreationAnimation();
    const addr = generateLocalAddress(name);
    ctx.setState({
      displayName: name,
      lightningAddress: addr,
      balance: 100,
      walletCreated: true,
    });
    updateCreatedScreen(100);
    walletOk = true;
  }

  if (walletOk) {
    ctx.launchLightningBolt();
    setTimeout(() => ctx.launchConfetti(), 350);
    ctx.goTo("screen-created");
  }
}

/**
 * Generate a local lightning address for demo mode
 */
function generateLocalAddress(name) {
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  return `${clean || "user"}@${window.location.host}`;
}

async function handleNewWallet() {
  // Legacy: redirect to name screen
  ctx.goTo("screen-name");
}

function handleExistingWallet() {
  // Mostrar input para pegar NWC URL
  const connectBody = document.querySelector(".connect-body");
  if (!connectBody) return;

  connectBody.innerHTML = `
    <p class="screen-label">Conectar wallet</p>
    <h2 class="screen-title" style="font-size:2.5rem">Pegá tu<br>NWC URL</h2>
    <p class="screen-desc">Copiá tu Nostr Wallet Connect URL desde Alby Hub, Zeus u otra wallet compatible.</p>
    <div class="field-label">NWC Connection String</div>
    <input class="field-input" type="text" id="nwc-input" placeholder="nostr+walletconnect://..." style="font-size:.75rem;font-family:var(--font-mono)"/>
    <button class="btn btn-electric" id="btn-connect-nwc">Conectar ⚡</button>
    <div style="height:.6rem"></div>
    <button class="btn btn-dim" id="btn-back-connect">← Volver</button>
  `;

  on("btn-connect-nwc", "click", async () => {
    const input = document.getElementById("nwc-input");
    const url = input?.value?.trim();
    if (!url || !url.startsWith("nostr+walletconnect://")) {
      ctx.showToast("URL inválida — debe empezar con nostr+walletconnect://");
      return;
    }

    ctx.setState({ nwcUrl: url });
    ctx.goTo("screen-creating");

    await runCreationAnimation(async (step) => {
      if (step === 0) {
        try {
          const result = await ctx.onWalletCreated(url);
          updateCreatedScreen(result.balance);
        } catch (err) {
          ctx.showToast("Error: " + err.message);
          ctx.goTo("screen-connect");
          return false;
        }
      }
      return true;
    });

    ctx.goTo("screen-created");
  });

  on("btn-back-connect", "click", () => {
    // Re-render onboarding
    const app = document.getElementById("app");
    renderOnboarding(app, ctx);
    ctx.goTo("screen-connect");
  });
}

function updateCreatedScreen(balance) {
  const balEl = document.getElementById("created-balance");
  const balDisplayEl = document.getElementById("created-balance-display");
  const addrEl = document.getElementById("created-address");
  const balCardEl = document.getElementById("created-balance-card");
  const state = ctx.getState();

  if (balEl) balEl.textContent = balance;
  if (balDisplayEl) balDisplayEl.textContent = balance;
  if (addrEl) addrEl.textContent = state.lightningAddress || `wallet@${window.location.host}`;
  if (balCardEl) balCardEl.textContent = balance + " sats";
}

// ── CREATION ANIMATION ──

async function runCreationAnimation(onStep) {
  const steps = ["ls1", "ls2", "ls3", "ls4"];
  const texts = [
    "Generando claves...",
    "Creando Lightning Address...",
    "Conectando a la red...",
    "Enviando sats de bienvenida...",
  ];

  for (let i = 0; i < steps.length; i++) {
    // Update progress
    const prog = document.getElementById("lp1");
    const loadText = document.getElementById("loading-text");
    if (prog) prog.style.width = ((i + 1) / steps.length) * 100 + "%";
    if (loadText) loadText.textContent = texts[i];

    // Mark current step
    const el = document.getElementById(steps[i]);
    if (el) {
      el.style.color = "var(--white)";
    }

    // Wait
    await sleep(700);

    // Call callback on first step (connect wallet)
    if (onStep) {
      const ok = await onStep(i);
      if (ok === false) return;
    }

    // Mark step done
    if (el) {
      const dot = el.querySelector(".step-dot");
      if (dot) {
        dot.textContent = "✓";
        dot.style.color = "var(--electric)";
      }
      el.style.color = "rgba(242,237,230,0.5)";
    }
  }

  await sleep(400);
}

// ── MISSIONS ──

let completedMissions = 0;

const missionContent = {
  1: {
    title: "Ver tu balance",
    desc: "Esta es tu wallet. El número de abajo muestra cuántos sats tenés. Los sats son fracciones de Bitcoin — 100 millones de sats = 1 Bitcoin.",
    getContent: () => {
      const state = ctx.getState();
      const bal = state.balance || 100;
      const usd = ((bal * state.btcUsd) / 100_000_000).toFixed(4);
      return `
        <div class="balance-display">
          <div class="balance-sats">${bal}</div>
          <div class="balance-unit">SATOSHIS</div>
          <div class="balance-fiat">\u2248 $${usd} USD</div>
        </div>
        <button class="btn btn-electric" id="btn-mission-1">Entendido ⚡</button>
      `;
    },
  },
  2: {
    title: "Tu Lightning Address",
    desc: "Esta es tu dirección Bitcoin. Funciona como un email — cualquier persona en el mundo puede mandarte sats escribiendo esta dirección.",
    getContent: () => {
      const state = ctx.getState();
      const addr = state.lightningAddress || `wallet@${window.location.host}`;
      return `
        <div class="info-card" style="margin-bottom:1rem;">
          <div class="info-card-icon">📧</div>
          <div class="info-card-content">
            <div class="info-card-label">Tu dirección</div>
            <div class="info-card-value electric ln-addr">${addr}</div>
          </div>
        </div>
        <button class="btn btn-dim" style="margin-bottom:0.6rem" onclick="document.dispatchEvent(new CustomEvent('copy-address'))">Copiar dirección</button>
        <button class="btn btn-electric" id="btn-mission-2">¡Entendido! ⚡</button>
      `;
    },
  },
  3: {
    title: "Precio en vivo",
    desc: "Este es el precio de Bitcoin ahora mismo. Cualquier persona en el mundo paga lo mismo — sin bancos, sin fronteras.",
    getContent: () => {
      const state = ctx.getState();
      return `
        <div style="background:var(--black);border:1px solid var(--mid);padding:1.2rem;margin-bottom:1rem;position:relative;overflow:hidden">
          <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--electric),var(--orange))"></div>
          <div style="font-family:var(--font-mono);font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Bitcoin · USD · en vivo</div>
          <div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:.3rem">
            <div style="font-family:var(--font-display);font-size:2.8rem;line-height:1;color:var(--white)">$${state.btcUsd.toLocaleString()}</div>
          </div>
          <div style="font-family:var(--font-mono);font-size:.6rem;color:var(--muted)">
            1 sat = $${(state.btcUsd / 100_000_000).toFixed(5)} USD
          </div>
        </div>
        <div style="background:var(--dim);border:1px solid var(--mid);padding:1.2rem;margin-bottom:1rem;text-align:center">
          <div style="font-family:var(--font-mono);font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.8rem">¿Sabías que?</div>
          <div style="font-family:var(--font-display);font-size:1.5rem;color:var(--white);line-height:1.1;margin-bottom:.5rem">1 BTC</div>
          <div style="font-family:var(--font-mono);font-size:.65rem;color:var(--muted);margin-bottom:.6rem">=</div>
          <div style="font-family:var(--font-display);font-size:2.4rem;color:var(--electric);line-height:1;margin-bottom:.3rem">100.000.000</div>
          <div style="font-family:var(--font-mono);font-size:.65rem;letter-spacing:.12em;color:var(--muted)">SATOSHIS</div>
        </div>
        <button class="btn btn-electric" id="btn-mission-3">¡Entendido! ⚡</button>
      `;
    },
  },
};

function activateMission(n) {
  const amp = document.getElementById("amp");
  const data = missionContent[n];
  if (!amp || !data) return;

  const titleEl = document.getElementById("amp-title");
  const descEl = document.getElementById("amp-desc");
  const contentEl = document.getElementById("amp-content");

  if (titleEl) titleEl.textContent = data.title;
  if (descEl) descEl.textContent = data.desc;
  if (contentEl) contentEl.innerHTML = data.getContent();
  amp.classList.add("visible");

  // Re-bind the button inside the dynamic content
  setTimeout(() => {
    const btn = document.getElementById("btn-mission-" + n);
    if (btn) {
      btn.addEventListener("click", () => completeMission(n));
    }
  }, 50);

  // Mission 3 (Precio en vivo): auto-update when prices change
  if (n === 3 && ctx.onStateChange) {
    if (activateMission._unsub) activateMission._unsub();
    activateMission._unsub = ctx.onStateChange((st) => {
      if (contentEl && amp.classList.contains("visible")) {
        contentEl.innerHTML = data.getContent();
        const btn = document.getElementById("btn-mission-3");
        if (btn) btn.addEventListener("click", () => completeMission(3));
      }
    });
  }
}

function completeMission(n) {
  const el = document.getElementById("m" + n);
  if (!el) return;

  el.classList.remove("active");
  el.classList.add("completed");
  const check = el.querySelector(".mission-check");
  if (check) check.textContent = "✓";

  completedMissions++;
  const countEl = document.getElementById("missions-count");
  if (countEl) countEl.textContent = completedMissions;

  // Update state
  const state = ctx.getState();
  const missions = [...(state.missionsCompleted || []), n];
  ctx.setState({ missionsCompleted: missions });

  if (n === 3) {
    ctx.showToast("Todas las misiones completadas");
    setTimeout(() => {
      ctx.launchConfetti();
      ctx.goTo("screen-complete");
    }, 800);
    return;
  }

  // Unlock next
  const next = document.getElementById("m" + (n + 1));
  if (next) {
    next.classList.remove("locked");
    next.classList.add("active");
    setTimeout(() => activateMission(n + 1), 300);
  }

  if (n === 1) ctx.showToast("Misión completada ✓");
  if (n === 2) ctx.showToast("Dirección lista ✓");
}

// ── SECURITY ──

let keyRevealed = false;

function toggleKey() {
  const kv = document.getElementById("key-value");
  const btn = document.getElementById("btn-toggle-key");
  keyRevealed = !keyRevealed;
  if (kv) kv.classList.toggle("revealed", keyRevealed);
  if (btn) btn.textContent = keyRevealed ? "Ocultar" : "Mostrar";
}

// ── HTML TEMPLATE ──

function getOnboardingHTML() {
  const state = ctx.getState();
  const eventName = state.eventName || "La Crypta Meetup";
  const eventDate = state.eventDate || "Marzo 2026";
  const nwcUrl = state.nwcUrl || "nostr+walletconnect://...";

  return `
  <!-- SCREEN: WELCOME -->
  <div class="screen" id="screen-welcome">
    <div class="welcome-bg"></div>
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <div class="topbar-event">
        <strong>${eventName}</strong>
        ${eventDate}
      </div>
    </div>
    <div class="welcome-ticker">BITCOIN ⚡ LIGHTNING ⚡ SATSPARTY ⚡ BITCOIN ⚡ LIGHTNING ⚡ SATSPARTY ⚡</div>
    <div class="welcome-body">
      <p class="welcome-tag">Bienvenido al evento</p>
      <h1 class="welcome-title">Tu primer<br><span class="accent">Bitcoin.</span><br>Hoy.</h1>
      <p class="welcome-desc">
        En 2 minutos vas a tener tu propia wallet Lightning, tu dirección Bitcoin, y tus primeros sats reales.
      </p>
      <div class="welcome-promise">
        <div class="promise-item">
          <div class="promise-dot">⚡</div>
          <span>Wallet Lightning creada automáticamente</span>
        </div>
        <div class="promise-item">
          <div class="promise-dot">📧</div>
          <span>Tu propia dirección Bitcoin para recibir</span>
        </div>
        <div class="promise-item">
          <div class="promise-dot">🎁</div>
          <span>Sats gratis para empezar</span>
        </div>
      </div>
    </div>
    <div class="bottom-nav">
      <button class="btn btn-electric" id="btn-start">Empezar ⚡</button>
      <p style="text-align:center; font-family: var(--font-mono); font-size: 0.58rem; color: var(--muted); letter-spacing: 0.08em;">Sin registro · Sin email · En 2 minutos</p>
    </div>
  </div>

  <!-- SCREEN: CONNECT -->
  <div class="screen" id="screen-connect">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button id="btn-back-welcome" style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:0.62rem;cursor:pointer;letter-spacing:0.1em;">← VOLVER</button>
    </div>
    <div class="progress-wrap">
      <div class="progress-steps">
        <div class="progress-step active"></div>
        <div class="progress-step"></div>
        <div class="progress-step"></div>
        <div class="progress-step"></div>
      </div>
    </div>
    <div class="connect-body">
      <p class="screen-label">Paso 1 de 4</p>
      <h2 class="screen-title" style="font-size:3rem">¿Tenés una<br>wallet?</h2>
      <p class="screen-desc">Si ya usás Bitcoin, conectá tu wallet. Si no, te creamos una en segundos.</p>
      <div class="connect-options">
        <div class="connect-option" id="btn-new-wallet">
          <div class="option-icon">✨</div>
          <div class="option-content">
            <div class="option-title">Crear wallet nueva</div>
            <div class="option-desc">Primera vez con Bitcoin — te ayudamos</div>
          </div>
          <span class="option-tag">Recomendado</span>
        </div>
        <div class="connect-option" id="btn-existing-wallet">
          <div class="option-icon">🔌</div>
          <div class="option-content">
            <div class="option-title">Conectar la mía</div>
            <div class="option-desc">Tengo Alby, Zeus, Wallet of Satoshi u otra</div>
          </div>
        </div>
        <div style="margin-top: auto; padding-top: 1rem;">
          <p style="font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.08em; color: var(--muted); text-align: center; line-height: 1.7;">
            Tu wallet es tuya. Nadie más tiene acceso<br>a tus sats en ningún momento.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SCREEN: NAME -->
  <div class="screen" id="screen-name">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button id="btn-back-connect" style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:0.62rem;cursor:pointer;letter-spacing:0.1em;">← VOLVER</button>
    </div>
    <div class="progress-wrap">
      <div class="progress-steps">
        <div class="progress-step done"></div>
        <div class="progress-step active"></div>
        <div class="progress-step"></div>
        <div class="progress-step"></div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;padding:1rem 1.5rem 2rem;">
      <p class="screen-label">Paso 2 de 4</p>
      <h2 class="screen-title" style="font-size:3rem">¿Cómo te<br>llamás?</h2>
      <p class="screen-desc">Tu nombre se usa para crear tu Lightning Address personal. Así te van a poder enviar sats.</p>
      <div style="margin-bottom:.3rem">
        <div class="field-label">Tu nombre</div>
        <input class="field-input" type="text" id="input-name" placeholder="Ej: Satoshi" autofocus
               style="font-size:1.1rem;font-weight:500;text-align:center" maxlength="30" />
      </div>
      <div id="name-preview" style="text-align:center;margin-bottom:1.5rem;">
        <div style="font-family:var(--font-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Tu dirección será</div>
        <div style="font-family:var(--font-address);font-size:1rem;color:var(--electric);font-weight:300;letter-spacing:.03em" id="name-preview-addr">nombre@${window.location.host}</div>
      </div>
      <div class="login-error" id="name-error"></div>
    </div>
    <div class="bottom-nav">
      <button class="btn btn-electric" id="btn-continue-name">Crear mi wallet ⚡</button>
      <p style="text-align:center;font-family:var(--font-mono);font-size:.55rem;color:var(--muted);letter-spacing:.06em">
        No se guarda ningún dato personal
      </p>
    </div>
  </div>

  <!-- SCREEN: CREATING -->
  <div class="screen" id="screen-creating">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding: 2rem 1.5rem; gap: 2rem;">
      <div>
        <p style="font-family: var(--font-display); font-size: 3.5rem; line-height: 0.9; margin-bottom: 1rem;">Creando<br>tu wallet<span style="color:var(--electric)">.</span></p>
        <p style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--muted); letter-spacing: 0.08em;" id="loading-text">Generando claves...</p>
      </div>
      <div style="display:flex; flex-direction:column; gap: 0.6rem;">
        <div class="loading-bar"><div class="loading-progress" id="lp1"></div></div>
      </div>
      <div style="display:flex; flex-direction:column; gap: 0.5rem;">
        <div style="display:flex; align-items:center; gap: 0.8rem; font-family: var(--font-mono); font-size: 0.65rem; color: var(--muted);" id="ls1">
          <span class="step-dot" style="color:var(--muted)">○</span> Generando claves únicas
        </div>
        <div style="display:flex; align-items:center; gap: 0.8rem; font-family: var(--font-mono); font-size: 0.65rem; color: var(--muted);" id="ls2">
          <span class="step-dot" style="color:var(--muted)">○</span> Creando Lightning Address
        </div>
        <div style="display:flex; align-items:center; gap: 0.8rem; font-family: var(--font-mono); font-size: 0.65rem; color: var(--muted);" id="ls3">
          <span class="step-dot" style="color:var(--muted)">○</span> Conectando a la red Lightning
        </div>
        <div style="display:flex; align-items:center; gap: 0.8rem; font-family: var(--font-mono); font-size: 0.65rem; color: var(--muted);" id="ls4">
          <span class="step-dot" style="color:var(--muted)">○</span> Enviando sats de bienvenida
        </div>
      </div>
    </div>
  </div>

  <!-- SCREEN: CREATED -->
  <div class="screen" id="screen-created">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
    </div>
    <div class="progress-wrap">
      <div class="progress-steps">
        <div class="progress-step done"></div>
        <div class="progress-step active"></div>
        <div class="progress-step"></div>
        <div class="progress-step"></div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;padding:1rem 1.5rem 2rem;">
      <p class="screen-label">Wallet creada ✓</p>
      <h2 class="screen-title" style="font-size:3rem">¡Tu primer<br>Bitcoin llegó!</h2>
      <div class="sats-burst">
        <div class="sats-ring"></div>
        <div class="sats-ring sats-ring-2"></div>
        <div class="sats-circle">
          <div class="sats-circle-inner" id="created-balance">100</div>
          <div class="sats-circle-label">SAT</div>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:2rem">
        <div style="font-family:var(--font-mono);font-size:.62rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Acabás de recibir</div>
        <div style="font-family:var(--font-display);font-size:1.8rem;color:var(--green)">+ <span id="created-balance-display">100</span> sats ⚡</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.8rem">
        <div class="info-card">
          <div class="info-card-icon">📧</div>
          <div class="info-card-content">
            <div class="info-card-label">Tu Lightning Address</div>
            <div class="info-card-value electric ln-addr" id="created-address">wallet@${window.location.host}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">💰</div>
          <div class="info-card-content">
            <div class="info-card-label">Balance actual</div>
            <div class="info-card-value" id="created-balance-card">100 sats</div>
          </div>
        </div>
      </div>
    </div>
    <div class="bottom-nav">
      <button class="btn btn-electric" id="btn-goto-missions">Ver mis misiones ⚡</button>
    </div>
  </div>

  <!-- SCREEN: MISSIONS -->
  <div class="screen" id="screen-missions">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--electric);">
        <span id="missions-count">0</span>/3 ✓
      </div>
    </div>
    <div class="progress-wrap">
      <div class="progress-steps">
        <div class="progress-step done"></div>
        <div class="progress-step done"></div>
        <div class="progress-step active"></div>
        <div class="progress-step"></div>
      </div>
    </div>
    <div class="missions-body">
      <p class="screen-label">Misiones</p>
      <h2 class="screen-title" style="font-size:3rem">Aprendé<br>haciendo.</h2>
      <div class="missions-list">
        <div class="mission completed" id="m0">
          <div class="mission-check">✓</div>
          <div class="mission-content">
            <div class="mission-title">Creaste tu wallet</div>
            <div class="mission-desc">Ya sos parte de la red Lightning</div>
          </div>
          <div class="mission-reward">+100 sats</div>
        </div>
        <div class="mission active" id="m1">
          <div class="mission-check">1</div>
          <div class="mission-content">
            <div class="mission-title">Ver tu balance</div>
            <div class="mission-desc">Mirá cuánto tenés en tu wallet</div>
          </div>
          <div class="mission-reward">gratis</div>
        </div>
        <div class="mission locked" id="m2">
          <div class="mission-check">2</div>
          <div class="mission-content">
            <div class="mission-title">Conocé tu dirección</div>
            <div class="mission-desc">Tu Lightning Address para recibir sats</div>
          </div>
          <div class="mission-reward">gratis</div>
        </div>
        <div class="mission locked" id="m3">
          <div class="mission-check">3</div>
          <div class="mission-content">
            <div class="mission-title">Precio de Bitcoin</div>
            <div class="mission-desc">Mirá cuánto vale 1 BTC ahora mismo</div>
          </div>
          <div class="mission-reward">en vivo</div>
        </div>
      </div>
      <div class="active-mission-panel visible" id="amp">
        <div class="amp-label">Misión activa</div>
        <div class="amp-title" id="amp-title">Ver tu balance</div>
        <div class="amp-desc" id="amp-desc">Esta es tu wallet. El número de abajo muestra cuántos sats tenés.</div>
        <div id="amp-content"></div>
      </div>
    </div>
  </div>

  <!-- SCREEN: COMPLETE -->
  <div class="screen" id="screen-complete">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
    </div>
    <div class="progress-wrap">
      <div class="progress-steps">
        <div class="progress-step done"></div>
        <div class="progress-step done"></div>
        <div class="progress-step done"></div>
        <div class="progress-step done"></div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;padding:1rem 1.5rem 2rem;">
      <p class="screen-label">Misiones completadas</p>
      <h2 class="screen-title" style="font-size:3rem">Ya sos<br>parte de<br><span style="color:var(--electric)">Bitcoin.</span></h2>
      <div class="achievements">
        <div class="achievement">
          <div class="achievement-icon">⚡</div>
          <div class="achievement-label">Primera wallet</div>
        </div>
        <div class="achievement">
          <div class="achievement-icon">📧</div>
          <div class="achievement-label">Lightning Address</div>
        </div>
        <div class="achievement">
          <div class="achievement-icon">🚀</div>
          <div class="achievement-label">Bitcoiner</div>
        </div>
      </div>
      <div class="ticket">
        <div class="ticket-header">
          <div class="ticket-event-name">${eventName}</div>
          <span class="ticket-badge">Bitcoiner ✓</span>
        </div>
        <div class="ticket-body">
          <div class="ticket-row">
            <div>
              <div class="ticket-field-label">Tu Lightning Address</div>
              <div class="ticket-field-value electric ln-addr" id="ticket-address">wallet@${window.location.host}</div>
            </div>
          </div>
          <div class="ticket-row">
            <div>
              <div class="ticket-field-label">Balance</div>
              <div class="ticket-field-value electric" id="ticket-balance">100 sats</div>
            </div>
            <div style="text-align:right">
              <div class="ticket-field-label">Fecha</div>
              <div class="ticket-field-value">${eventDate}</div>
            </div>
          </div>
        </div>
        <div class="ticket-footer">
          <span class="ticket-footer-text">Guardá tu clave de acceso para no perder tu wallet</span>
          <span style="font-size:1.2rem">🔑</span>
        </div>
      </div>
    </div>
    <div class="bottom-nav">
      <button class="btn btn-electric" id="btn-save-keys">Guardar mis claves 🔑</button>
      <button class="btn btn-dim" id="btn-skip-dashboard">Continuar al dashboard →</button>
    </div>
  </div>

  <!-- SCREEN: SECURITY -->
  <div class="screen" id="screen-security">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button id="btn-back-complete" style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:0.62rem;cursor:pointer;letter-spacing:0.1em;">← VOLVER</button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;padding:1rem 1.5rem 2rem;">
      <p class="screen-label">Seguridad</p>
      <h2 class="screen-title" style="font-size:3rem;margin-bottom:1.2rem;">Tus<br>claves.</h2>
      <div class="security-warning">
        <span style="font-size:1rem;flex-shrink:0;margin-top:0.1rem;">⚠️</span>
        <span class="warning-text">Esta clave es el único acceso a tu wallet. Quien la tenga puede gastar tus sats. Guardala en un lugar seguro y nunca la compartas.</span>
      </div>
      <div class="key-card">
        <div class="key-card-header">
          <span class="key-card-title">Clave de acceso</span>
          <button class="key-toggle" id="btn-toggle-key">Mostrar</button>
        </div>
        <div class="key-value" id="key-value">${nwcUrl}</div>
        <div style="display:flex;gap:0.6rem;">
          <button class="btn btn-dim btn-ghost-small" style="flex:1" id="btn-copy-key">Copiar</button>
        </div>
      </div>
      <div style="background:var(--dim);border:1px solid var(--mid);padding:1.5rem;text-align:center;margin-bottom:1rem;">
        <p style="font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;">QR para importar</p>
        <div style="background:var(--white);padding:1rem;display:inline-block;margin-bottom:0.8rem;" id="security-qr">
          <!-- QR gets rendered here -->
        </div>
        <p style="font-family:var(--font-mono);font-size:0.65rem;color:var(--muted);line-height:1.6;">Escaneá con Alby Go para<br>importar tu wallet al celu</p>
      </div>
      <p style="font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.08em;color:var(--muted);text-align:center;line-height:1.7;margin-bottom:1rem;">
        Compatible con Alby, Zeus, Mutiny,<br>y cualquier wallet con soporte NWC
      </p>
      <button class="btn btn-electric" id="btn-goto-dashboard">Ir a mi wallet ⚡</button>
    </div>
  </div>
  `;
}

// ── HELPERS ──

function on(id, event, handler) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }, 10);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
