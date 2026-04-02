/**
 * SatsParty — Landing Page
 *
 * Presenta el producto para organizadores y asistentes.
 */

export function renderLanding(app, context) {
  app.innerHTML = getLandingHTML();
  setupLandingEvents(context);
  setupDemoAnimation();
}

function setupLandingEvents(ctx) {
  const btnOrganizer = document.getElementById("landing-btn-organizer");
  const btnWallet = document.getElementById("landing-btn-wallet");

  if (btnOrganizer) {
    btnOrganizer.addEventListener("click", () => {
      window.location.href = "/admin";
    });
  }

  if (btnWallet) {
    btnWallet.addEventListener("click", () => {
      window.location.href = "/wallet";
    });
  }
}

function getLandingHTML() {
  return `
    <div class="landing">
      <!-- Hero -->
      <section class="landing-hero">
        <div class="landing-hero-content">
          <div class="landing-logo">Sats<span>Party</span></div>
          <h1 class="landing-title">
            Bitcoin Lightning<br>
            <span class="landing-highlight">para eventos.</span>
          </h1>
          <p class="landing-subtitle">
            Un QR. Una wallet. Sats reales.<br>
            Onboarding masivo en 10 segundos.
          </p>
          <div class="landing-ctas">
            <button id="landing-btn-organizer" class="landing-btn landing-btn-primary">Soy organizador</button>
            <button id="landing-btn-wallet" class="landing-btn landing-btn-secondary">Abrir mi wallet</button>
          </div>
        </div>
        <div class="landing-bolt">⚡</div>
      </section>

      <!-- Interactive Demo -->
      <section class="landing-section landing-demo-section">
        <h2 class="landing-section-title">Miralo en acción</h2>
        <div class="demo-phone-wrapper">
          <div class="demo-phone" aria-hidden="true">
            <div class="demo-phone-notch"></div>
            <div class="demo-phone-screen">

              <!-- Screen 1: Scan QR -->
              <div class="demo-screen demo-screen--active" data-step="0">
                <div class="demo-s1-header">SatsParty</div>
                <div class="demo-s1-viewfinder">
                  <div class="demo-s1-corners">
                    <span></span><span></span><span></span><span></span>
                  </div>
                  <div class="demo-s1-qr">
                    <svg viewBox="0 0 100 100" width="80" height="80">
                      <rect x="5" y="5" width="25" height="25" rx="3" fill="none" stroke="rgba(212,255,0,0.8)" stroke-width="3"/>
                      <rect x="10" y="10" width="15" height="15" rx="1" fill="rgba(212,255,0,0.6)"/>
                      <rect x="70" y="5" width="25" height="25" rx="3" fill="none" stroke="rgba(212,255,0,0.8)" stroke-width="3"/>
                      <rect x="75" y="10" width="15" height="15" rx="1" fill="rgba(212,255,0,0.6)"/>
                      <rect x="5" y="70" width="25" height="25" rx="3" fill="none" stroke="rgba(212,255,0,0.8)" stroke-width="3"/>
                      <rect x="10" y="75" width="15" height="15" rx="1" fill="rgba(212,255,0,0.6)"/>
                      <rect x="38" y="8" width="8" height="8" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="50" y="8" width="5" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="38" y="20" width="5" height="8" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="47" y="18" width="8" height="5" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="8" y="38" width="8" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="8" y="48" width="5" height="8" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="20" y="40" width="5" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="38" y="38" width="24" height="24" rx="2" fill="none" stroke="rgba(212,255,0,0.5)" stroke-width="2"/>
                      <rect x="43" y="43" width="14" height="14" rx="1" fill="rgba(212,255,0,0.5)"/>
                      <rect x="70" y="38" width="5" height="8" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="80" y="40" width="8" height="5" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="70" y="52" width="8" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="82" y="50" width="5" height="8" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="38" y="70" width="8" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="50" y="72" width="5" height="8" rx="1" fill="rgba(212,255,0,0.4)"/>
                      <rect x="40" y="82" width="5" height="5" rx="1" fill="rgba(212,255,0,0.3)"/>
                      <rect x="70" y="70" width="18" height="18" rx="2" fill="none" stroke="rgba(212,255,0,0.4)" stroke-width="2"/>
                      <rect x="75" y="75" width="8" height="8" rx="1" fill="rgba(212,255,0,0.4)"/>
                    </svg>
                  </div>
                  <div class="demo-s1-scanline"></div>
                </div>
                <div class="demo-s1-text">Escaneando QR del evento...</div>
                <div class="demo-s1-event">⚡ Bitcoin Meetup BA</div>
              </div>

              <!-- Screen 2: Enter Name -->
              <div class="demo-screen" data-step="1">
                <div class="demo-s2-header">
                  <div class="demo-s2-logo">Sats<span>Party</span></div>
                  <div class="demo-s2-event-badge">Bitcoin Meetup BA</div>
                </div>
                <div class="demo-s2-body">
                  <div class="demo-s2-label">¿Cómo te llamás?</div>
                  <div class="demo-s2-input">
                    <span class="demo-s2-typed"></span><span class="demo-s2-cursor">|</span>
                  </div>
                  <div class="demo-s2-address-preview"></div>
                  <div class="demo-s2-btn">Crear mi wallet ⚡</div>
                </div>
              </div>

              <!-- Screen 3: Wallet Created -->
              <div class="demo-screen" data-step="2">
                <div class="demo-s3-confetti-container"></div>
                <div class="demo-s3-body">
                  <div class="demo-s3-bolt">⚡</div>
                  <div class="demo-s3-title">¡Wallet creada!</div>
                  <div class="demo-s3-balance">
                    <span class="demo-s3-amount">0</span>
                    <span class="demo-s3-unit">SATS</span>
                  </div>
                  <div class="demo-s3-subtitle">Sats de bienvenida acreditados</div>
                  <div class="demo-s3-address">satoshi@satsparty.app</div>
                </div>
              </div>

              <!-- Screen 4: Dashboard -->
              <div class="demo-screen" data-step="3">
                <div class="demo-s4-topbar">
                  <div class="demo-s4-logo">Sats<span>Party</span></div>
                  <div class="demo-s4-pill">satoshi@satsparty.app</div>
                </div>
                <div class="demo-s4-balance-area">
                  <div class="demo-s4-amount">500</div>
                  <div class="demo-s4-unit">SATS</div>
                  <div class="demo-s4-fiat">≈ $0.52 USD</div>
                </div>
                <div class="demo-s4-actions">
                  <div class="demo-s4-action"><span>↑</span>Enviar</div>
                  <div class="demo-s4-action"><span>↓</span>Recibir</div>
                  <div class="demo-s4-action"><span>⊞</span>Escanear</div>
                </div>
                <div class="demo-s4-history">
                  <div class="demo-s4-history-title">Historial</div>
                  <div class="demo-s4-tx demo-s4-tx-in">
                    <div class="demo-s4-tx-icon">↓</div>
                    <div class="demo-s4-tx-info"><div>Bienvenida</div><div class="demo-s4-tx-sub">hace 1 min</div></div>
                    <div class="demo-s4-tx-amount">+500</div>
                  </div>
                </div>
              </div>

              <!-- Screen 5: Send Payment -->
              <div class="demo-screen" data-step="4">
                <div class="demo-s5-header">Enviar sats</div>
                <div class="demo-s5-body">
                  <div class="demo-s5-to">
                    <div class="demo-s5-label">Para</div>
                    <div class="demo-s5-recipient">maria@satsparty.app</div>
                  </div>
                  <div class="demo-s5-amount-box">
                    <div class="demo-s5-amount-num">100</div>
                    <div class="demo-s5-amount-unit">SATS</div>
                  </div>
                  <div class="demo-s5-btn demo-s5-btn-send">Enviar ⚡</div>
                  <div class="demo-s5-status"></div>
                </div>
              </div>

            </div>
          </div>

          <!-- Step indicators -->
          <div class="demo-indicators">
            <div class="demo-dot demo-dot--active" data-dot="0"></div>
            <div class="demo-dot" data-dot="1"></div>
            <div class="demo-dot" data-dot="2"></div>
            <div class="demo-dot" data-dot="3"></div>
            <div class="demo-dot" data-dot="4"></div>
          </div>
          <div class="demo-step-label">Escanear QR</div>
        </div>
      </section>

      <!-- How it works -->
      <section class="landing-section">
        <h2 class="landing-section-title">Cómo funciona</h2>
        <div class="landing-steps">
          <div class="landing-step">
            <div class="landing-step-number">1</div>
            <div class="landing-step-icon">⚙️</div>
            <h3>Creá tu evento</h3>
            <p>Configurá nombre, fecha y sats de bienvenida desde el panel admin.</p>
          </div>
          <div class="landing-step">
            <div class="landing-step-number">2</div>
            <div class="landing-step-icon">📱</div>
            <h3>Compartí el QR</h3>
            <p>Imprimí o mostrá el QR. Los asistentes lo escanean con la cámara.</p>
          </div>
          <div class="landing-step">
            <div class="landing-step-number">3</div>
            <div class="landing-step-icon">⚡</div>
            <h3>Reciben sats</h3>
            <p>Wallet Lightning + sats reales + Lightning Address. En 10 segundos.</p>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="landing-section landing-section-dark">
        <h2 class="landing-section-title">Todo incluido</h2>
        <div class="landing-features">
          <div class="landing-feature">
            <div class="landing-feature-icon">💳</div>
            <h4>Wallet completa</h4>
            <p>Enviar, recibir, historial. Todo desde el navegador.</p>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon">📧</div>
            <h4>Lightning Address</h4>
            <p>Cada asistente recibe su dirección para recibir pagos.</p>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon">💱</div>
            <h4>Multi-moneda</h4>
            <p>Balance en SATS, USD y ARS con precios en vivo.</p>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon">🔐</div>
            <h4>Wallets aisladas</h4>
            <p>Cada asistente tiene su propia wallet. Sin acceso cruzado.</p>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon">🆔</div>
            <h4>Auth Nostr</h4>
            <p>Sin passwords. Login con tu clave Nostr.</p>
          </div>
          <div class="landing-feature">
            <div class="landing-feature-icon">🌐</div>
            <h4>Open Source</h4>
            <p>Deployá tu propia instancia en un click.</p>
          </div>
        </div>
      </section>

      <!-- For organizers -->
      <section class="landing-section">
        <div class="landing-organizer-box">
          <h2>¿Organizás un evento Bitcoin?</h2>
          <p>Conectá tu wallet Lightning con NWC y SatsParty se encarga del resto. Cada asistente recibe su cuenta con sats automáticamente. Vos controlás todo desde el panel admin.</p>
          <button id="landing-btn-organizer-2" class="landing-btn landing-btn-primary" onclick="window.location.href='/admin'">Crear mi evento</button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="landing-footer-logo">Sats<span>Party</span></div>
        <p>Proyecto para la hackathon <strong>FOUNDATIONS</strong> de La Crypta — Marzo 2026</p>
        <div class="landing-footer-links">
          <a href="https://github.com/ViresBTC/Satsparty" target="_blank">GitHub</a>
          <a href="https://hackaton.lacrypta.ar" target="_blank">La Crypta</a>
        </div>
        <p class="landing-footer-small">Hecho con ⚡ para la comunidad Bitcoin</p>
      </footer>
    </div>
  `;
}

/* ══════════════════════════════════════
   Interactive Demo Animation
   ══════════════════════════════════════ */

const DEMO_STEPS = [
  { duration: 3200, label: "Escanear QR" },
  { duration: 4000, label: "Ingresar nombre" },
  { duration: 3500, label: "¡Wallet creada!" },
  { duration: 3500, label: "Tu wallet" },
  { duration: 3500, label: "Enviar pago" },
];

let demoTimer = null;
let demoStep = 0;
let demoRunning = false;

function setupDemoAnimation() {
  const section = document.querySelector(".landing-demo-section");
  if (!section) return;

  // Start on intersection
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !demoRunning) {
          startDemo();
        } else if (!e.isIntersecting && demoRunning) {
          stopDemo();
        }
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(section);
}

function startDemo() {
  demoRunning = true;
  demoStep = 0;
  showDemoStep(0);
  scheduleDemoNext();
}

function stopDemo() {
  demoRunning = false;
  if (demoTimer) clearTimeout(demoTimer);
  demoTimer = null;
}

function scheduleDemoNext() {
  if (!demoRunning) return;
  demoTimer = setTimeout(() => {
    demoStep = (demoStep + 1) % DEMO_STEPS.length;
    showDemoStep(demoStep);
    scheduleDemoNext();
  }, DEMO_STEPS[demoStep].duration);
}

function showDemoStep(step) {
  const screens = document.querySelectorAll(".demo-screen");
  const dots = document.querySelectorAll(".demo-dot");
  const label = document.querySelector(".demo-step-label");

  screens.forEach((s, i) => {
    s.classList.remove("demo-screen--active", "demo-screen--exit");
    if (i === step) {
      s.classList.add("demo-screen--active");
    }
  });

  dots.forEach((d, i) => {
    d.classList.toggle("demo-dot--active", i === step);
  });

  if (label) label.textContent = DEMO_STEPS[step].label;

  // Trigger step-specific animations
  if (step === 1) triggerTypingAnimation();
  if (step === 2) triggerWalletCreated();
  if (step === 4) triggerSendAnimation();
}

/* ── Screen 2: Typing ── */

function triggerTypingAnimation() {
  const typed = document.querySelector(".demo-s2-typed");
  const preview = document.querySelector(".demo-s2-address-preview");
  const btn = document.querySelector(".demo-s2-btn");
  if (!typed) return;

  const name = "Satoshi";
  typed.textContent = "";
  if (preview) preview.textContent = "";
  if (btn) btn.classList.remove("demo-s2-btn--ready");

  let i = 0;
  const typeInterval = setInterval(() => {
    if (i < name.length) {
      typed.textContent = name.slice(0, i + 1);
      if (preview) {
        preview.textContent = name.slice(0, i + 1).toLowerCase() + "@satsparty.app";
        preview.style.opacity = "1";
      }
      i++;
    } else {
      clearInterval(typeInterval);
      if (btn) btn.classList.add("demo-s2-btn--ready");
    }
  }, 180);
}

/* ── Screen 3: Wallet Created + Confetti ── */

function triggerWalletCreated() {
  const amountEl = document.querySelector(".demo-s3-amount");
  const container = document.querySelector(".demo-s3-confetti-container");

  // Animate counter from 0 to 500
  if (amountEl) {
    let current = 0;
    const target = 500;
    const step = Math.ceil(target / 25);
    const counterInterval = setInterval(() => {
      current = Math.min(current + step, target);
      amountEl.textContent = current;
      if (current >= target) clearInterval(counterInterval);
    }, 40);
  }

  // CSS confetti particles
  if (container) {
    container.innerHTML = "";
    const colors = ["#d4ff00", "#ff6b1a", "#00ff87", "#f2ede6", "#ff3c3c", "#00d4ff"];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      p.className = "demo-confetti-particle";
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[i % colors.length]};
        animation-delay: ${Math.random() * 0.6}s;
        animation-duration: ${1.5 + Math.random() * 1.2}s;
      `;
      container.appendChild(p);
    }
  }
}

/* ── Screen 5: Send Animation ── */

function triggerSendAnimation() {
  const btn = document.querySelector(".demo-s5-btn-send");
  const status = document.querySelector(".demo-s5-status");
  if (!btn || !status) return;

  btn.classList.remove("demo-s5-btn--sending", "demo-s5-btn--done");
  status.textContent = "";
  status.className = "demo-s5-status";

  // Animate: click → sending → done
  setTimeout(() => {
    btn.classList.add("demo-s5-btn--sending");
    btn.textContent = "Enviando...";
    status.textContent = "";
  }, 800);

  setTimeout(() => {
    btn.classList.remove("demo-s5-btn--sending");
    btn.classList.add("demo-s5-btn--done");
    btn.textContent = "✓ Enviado";
    status.textContent = "¡100 sats enviados a María!";
    status.className = "demo-s5-status demo-s5-status--done";
  }, 2200);

  // Reset for next loop
  setTimeout(() => {
    btn.classList.remove("demo-s5-btn--done");
    btn.textContent = "Enviar ⚡";
    status.textContent = "";
    status.className = "demo-s5-status";
  }, 3300);
}
