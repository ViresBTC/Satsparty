/**
 * SatsParty — Landing Page
 *
 * Presenta el producto para organizadores y asistentes.
 */

export function renderLanding(app, context) {
  app.innerHTML = getLandingHTML();
  setupLandingEvents(context);
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
