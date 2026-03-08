/**
 * SatsParty — Dashboard Module
 *
 * Renderiza el dashboard principal con balance real via NWC,
 * envío/recepción de sats, historial y configuración.
 */

import { LightningAddress } from "@getalby/lightning-tools";

let ctx = {};
let currentView = "s-dashboard";
let currencyIdx = 0;

export function renderDashboard(app, context) {
  ctx = context;
  app.innerHTML = getDashboardHTML();

  // Reconectar wallet y cargar balance real
  initDashboard();
}

async function initDashboard() {
  navTo("s-dashboard");

  // Reconectar NWC
  const connected = await ctx.reconnectWallet();
  if (connected) {
    await refreshBalance();
    await refreshHistory();
  }

  setupDashboardEvents();
  // Activar primera misión en onboarding si aplica
  activateMission(1);
}

function setupDashboardEvents() {
  // Navigation
  onClick("nav-home", () => navTo("s-dashboard"));
  onClick("nav-receive", () => navTo("s-receive"));
  onClick("nav-send", () => navTo("s-send"));
  onClick("nav-history", () => {
    refreshHistory();
    navTo("s-history");
  });
  onClick("nav-settings", () => navTo("s-settings"));

  // Dashboard actions
  onClick("dash-address-pill", () => {
    ctx.showToast("Lightning Address copiada");
  });
  onClick("dash-balance-row", cycleCurrency);

  // Action buttons
  onClick("action-recv", () => navTo("s-receive"));
  onClick("action-send", () => navTo("s-send"));
  onClick("action-scan", () => navTo("s-scan"));

  // Receive
  onClick("tab-address-btn", () => switchTab("address"));
  onClick("tab-invoice-btn", () => switchTab("invoice"));
  onClick("btn-copy-address", () => ctx.showToast("Lightning Address copiada"));
  onClick("btn-generate-invoice", generateInvoice);

  // Send
  onClick("btn-send-confirm", confirmSend);

  // Scan
  onClick("btn-simulate-scan", simulateScan);
  onClick("btn-use-scan", useScanResult);

  // Settings
  onClick("btn-toggle-settings-key", () => {
    document.getElementById("settings-key-val")?.classList.toggle("shown");
  });

  // Close buttons (back to dashboard)
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => navTo("s-dashboard"));
  });

  // Back buttons
  document.querySelectorAll("[data-back]").forEach((el) => {
    el.addEventListener("click", () => navTo(el.dataset.back));
  });

  // Refresh balance on dashboard visit
  onClick("nav-home", async () => {
    navTo("s-dashboard");
    await refreshBalance();
  });

  // Send inputs
  const destInput = document.getElementById("send-dest");
  const amtInput = document.getElementById("send-amount");
  if (destInput) destInput.addEventListener("input", updateSendPreview);
  if (amtInput) amtInput.addEventListener("input", updateSendPreview);

  // Invoice currency toggle
  onClick("icur-sats", () => setInvoiceCurrency("sats"));
  onClick("icur-usd", () => setInvoiceCurrency("usd"));
  onClick("icur-ars", () => setInvoiceCurrency("ars"));

  // Invoice amount input
  const invInput = document.getElementById("invoice-amount");
  if (invInput) invInput.addEventListener("input", updateInvoiceConversion);
}

// ── NAVIGATION ──

const navMap = {
  "s-dashboard": "nav-home",
  "s-receive": "nav-receive",
  "s-send": "nav-send",
  "s-history": "nav-history",
  "s-settings": "nav-settings",
};
const hideNavScreens = ["s-success", "s-scan"];

function navTo(id) {
  const curr = document.getElementById(currentView);
  const next = document.getElementById(id);

  if (curr) {
    curr.classList.remove("active");
    curr.classList.add("exit-left");
    setTimeout(() => curr?.classList.remove("exit-left"), 400);
  }
  if (next) next.classList.add("active");
  currentView = id;

  // Update bottom nav
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  const navId = navMap[id];
  if (navId) document.getElementById(navId)?.classList.add("active");

  // Hide/show bottom nav
  const bnav = document.getElementById("bottom-nav-bar");
  if (bnav) bnav.style.display = hideNavScreens.includes(id) ? "none" : "flex";
}

// ── BALANCE ──

async function refreshBalance() {
  try {
    if (!ctx.nwcService.isConnected()) return;
    const bal = await ctx.nwcService.getBalance();
    ctx.setState({ balance: bal });
    updateBalanceDisplay();
  } catch (err) {
    console.error("Error fetching balance:", err);
  }
}

function updateBalanceDisplay() {
  const state = ctx.getState();
  const balEl = document.getElementById("dash-balance");
  if (balEl) balEl.textContent = state.balance;

  const unitEl = document.getElementById("balance-unit");
  if (unitEl) unitEl.textContent = "SATS";

  currencyIdx = 0;
}

function cycleCurrency() {
  const state = ctx.getState();
  currencyIdx = (currencyIdx + 1) % 3;

  const balEl = document.getElementById("dash-balance");
  const unitEl = document.getElementById("balance-unit");
  const fiatEl = document.getElementById("dash-fiat");
  const btcEl = document.getElementById("btc-symbol");

  if (currencyIdx === 0) {
    if (balEl) balEl.textContent = state.balance;
    if (unitEl) unitEl.textContent = "SATS";
    if (fiatEl) fiatEl.innerHTML = '<span style="opacity:.4;font-size:.6rem">Tocá para cambiar moneda</span>';
    if (btcEl) btcEl.style.opacity = "1";
  } else if (currencyIdx === 1) {
    const usd = ctx.satsToUsd(state.balance).toFixed(4);
    if (balEl) balEl.textContent = "$" + usd;
    if (unitEl) unitEl.textContent = "USD";
    if (fiatEl) fiatEl.innerHTML = `<span style="color:var(--green)">1 sat ≈ $${(state.btcUsd / 100_000_000).toFixed(6)} USD</span>`;
    if (btcEl) btcEl.style.opacity = "0";
  } else {
    const ars = Math.round(ctx.satsToArs(state.balance)).toLocaleString();
    if (balEl) balEl.textContent = "$" + ars;
    if (unitEl) unitEl.textContent = "ARS";
    if (fiatEl) fiatEl.innerHTML = `<span style="color:var(--orange)">1 USD = $${state.usdArs.toLocaleString()} ARS</span>`;
    if (btcEl) btcEl.style.opacity = "0";
  }
}

// ── HISTORY ──

async function refreshHistory() {
  try {
    if (!ctx.nwcService.isConnected()) return;
    const txs = await ctx.nwcService.listTransactions(20);
    ctx.setState({ transactions: txs });
    renderHistoryList(txs);
  } catch (err) {
    console.error("Error fetching history:", err);
    // Render from cached state
    renderHistoryList(ctx.getState().transactions || []);
  }
}

function renderHistoryList(txs) {
  const el = document.getElementById("history-body");
  if (!el) return;

  if (txs.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:3rem 1rem;color:var(--muted);font-family:var(--font-mono);font-size:.7rem;">Sin transacciones todavía</div>`;
    return;
  }

  // Group by date
  const grouped = {};
  txs.forEach((tx) => {
    const date = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString("es-AR") : "Hoy";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tx);
  });

  el.innerHTML = Object.entries(grouped)
    .map(
      ([date, dayTxs]) => `
    <div class="history-day">
      <div class="history-day-label">${date}</div>
      ${dayTxs
        .map(
          (tx) => `
        <div class="tx-item">
          <div class="tx-icon ${tx.type}">${tx.type === "in" ? "⬇" : "⬆"}</div>
          <div class="tx-content">
            <div class="tx-desc">${tx.description || (tx.type === "in" ? "Recibido" : "Enviado")}</div>
            <div class="tx-meta">${tx.timestamp ? timeAgo(tx.timestamp) : ""}</div>
          </div>
          <div class="tx-amount ${tx.type}">${tx.type === "in" ? "+" : "-"}${tx.amount.toLocaleString()} sats</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
    )
    .join("");
}

function timeAgo(timestamp) {
  const diff = Math.floor(Date.now() / 1000 - timestamp);
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

// ── RECEIVE ──

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.getElementById(tab === "address" ? "tab-address-btn" : "tab-invoice-btn")?.classList.add("active");
  const addrTab = document.getElementById("tab-address");
  const invTab = document.getElementById("tab-invoice");
  if (addrTab) addrTab.style.display = tab === "address" ? "block" : "none";
  if (invTab) invTab.style.display = tab === "invoice" ? "block" : "none";
}

let invoiceCurrency = "sats";

function setInvoiceCurrency(cur) {
  invoiceCurrency = cur;
  document.querySelectorAll(".inv-cur-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("icur-" + cur)?.classList.add("active");
  const label = document.getElementById("inv-cur-label");
  if (label) label.textContent = { sats: "SATS", usd: "USD", ars: "ARS" }[cur];
  updateInvoiceConversion();
}

function updateInvoiceConversion() {
  const el = document.getElementById("inv-conversion");
  const input = document.getElementById("invoice-amount");
  if (!el || !input) return;
  const v = parseFloat(input.value);
  if (!v || v <= 0) { el.textContent = ""; return; }

  const state = ctx.getState();
  const satUsd = state.btcUsd / 100_000_000;
  const satArs = satUsd * state.usdArs;

  if (invoiceCurrency === "sats") {
    el.innerHTML = `≈ <span style="color:var(--green)">$${(v * satUsd).toFixed(4)} USD</span> · <span style="color:var(--orange)">$${Math.round(v * satArs).toLocaleString()} ARS</span>`;
  } else if (invoiceCurrency === "usd") {
    const sats = Math.round(v / satUsd);
    el.innerHTML = `≈ <span style="color:var(--electric)">${sats.toLocaleString()} sats</span> · <span style="color:var(--orange)">$${Math.round(v * state.usdArs).toLocaleString()} ARS</span>`;
  } else {
    const sats = Math.round(v / satArs);
    el.innerHTML = `≈ <span style="color:var(--electric)">${sats.toLocaleString()} sats</span> · <span style="color:var(--green)">$${(v / state.usdArs).toFixed(4)} USD</span>`;
  }
}

async function generateInvoice() {
  const input = document.getElementById("invoice-amount");
  const val = parseFloat(input?.value);
  if (!val || val <= 0) { ctx.showToast("Ingresá un monto"); return; }

  const state = ctx.getState();
  const satUsd = state.btcUsd / 100_000_000;
  const satArs = satUsd * state.usdArs;

  let sats;
  if (invoiceCurrency === "sats") sats = Math.round(val);
  else if (invoiceCurrency === "usd") sats = Math.round(val / satUsd);
  else sats = Math.round(val / satArs);

  try {
    if (ctx.nwcService.isConnected()) {
      // Real invoice
      const inv = await ctx.nwcService.makeInvoice(sats, "SatsParty Invoice");
      const resultEl = document.getElementById("invoice-result");
      const amountEl = document.getElementById("invoice-amount-display");
      const qrEl = document.getElementById("invoice-qr-container");

      if (amountEl) amountEl.textContent = sats.toLocaleString() + " sats";
      if (qrEl) qrEl.innerHTML = ctx.generateQRSvg(inv.paymentRequest, 160);
      if (resultEl) resultEl.style.display = "block";

      ctx.showToast("Invoice generado ✓");

      // Poll for payment
      pollInvoice(inv.paymentHash, sats);
    } else {
      ctx.showToast("Wallet no conectada");
    }
  } catch (err) {
    ctx.showToast("Error: " + err.message);
  }
}

async function pollInvoice(paymentHash, sats) {
  // Check every 3s for 5 minutes
  for (let i = 0; i < 100; i++) {
    await sleep(3000);
    try {
      const result = await ctx.nwcService.lookupInvoice(paymentHash);
      if (result.paid) {
        ctx.showToast(`+${sats} sats recibidos ⚡`);
        ctx.launchConfetti();
        await refreshBalance();
        return;
      }
    } catch (e) {
      // Ignore lookup errors, keep polling
    }
  }
}

// ── SEND ──

function updateSendPreview() {
  const dest = document.getElementById("send-dest")?.value;
  const amt = document.getElementById("send-amount")?.value;
  const preview = document.getElementById("send-preview");
  if (!preview) return;

  if (dest && amt > 0) {
    preview.classList.add("visible");
    const previewAmt = document.getElementById("preview-amount");
    const previewDest = document.getElementById("preview-dest");
    if (previewAmt) previewAmt.textContent = parseInt(amt).toLocaleString() + " sats";
    if (previewDest) previewDest.textContent = dest;
  } else {
    preview.classList.remove("visible");
  }
}

async function confirmSend() {
  const dest = document.getElementById("send-dest")?.value?.trim();
  const amt = parseInt(document.getElementById("send-amount")?.value) || 0;
  const state = ctx.getState();

  if (!dest || amt <= 0) { ctx.showToast("Completá el formulario"); return; }
  if (amt > state.balance) { ctx.showToast("Saldo insuficiente"); return; }

  const btn = document.getElementById("btn-send-confirm");
  if (btn) { btn.disabled = true; btn.textContent = "⚡ Enviando..."; }

  try {
    if (ctx.nwcService.isConnected()) {
      // Resolve Lightning Address to invoice
      const ln = new LightningAddress(dest);
      await ln.fetch();
      const invoice = await ln.requestInvoice({ satoshi: amt });

      // Pay invoice
      await ctx.nwcService.payInvoice(invoice.paymentRequest);
    }

    // Update state
    const newBalance = state.balance - amt;
    ctx.setState({ balance: newBalance });

    // Show success
    const successAmt = document.getElementById("success-amount");
    const successTo = document.getElementById("success-to");
    const successBal = document.getElementById("success-new-balance");
    if (successAmt) successAmt.textContent = amt.toLocaleString();
    if (successTo) successTo.textContent = "→ " + dest;
    if (successBal) successBal.textContent = newBalance + " sats";

    // Update dashboard balance
    const dashBal = document.getElementById("dash-balance");
    if (dashBal) dashBal.textContent = newBalance;

    navTo("s-success");
    ctx.launchConfetti();

    // Reset form
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar envío ⚡"; }
    const destInput = document.getElementById("send-dest");
    const amtInput = document.getElementById("send-amount");
    if (destInput) destInput.value = "";
    if (amtInput) amtInput.value = "";
    document.getElementById("send-preview")?.classList.remove("visible");
  } catch (err) {
    ctx.showToast("Error: " + err.message);
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar envío ⚡"; }
  }
}

// ── SCAN ──

function simulateScan() {
  const addrs = ["pagos@bitcoinbeach.com", "cafe@btcpay.ar", "amigo@walletofsatoshi.com"];
  const picked = addrs[Math.floor(Math.random() * addrs.length)];
  document.getElementById("scan-idle")?.style.setProperty("display", "none");
  const overlay = document.getElementById("scan-success-overlay");
  if (overlay) overlay.classList.add("visible");
  const addr = document.getElementById("scan-result-addr");
  if (addr) addr.textContent = picked;
  window._scanResult = picked;
}

function useScanResult() {
  navTo("s-send");
  setTimeout(() => {
    const dest = document.getElementById("send-dest");
    if (dest) dest.value = window._scanResult || "";
    document.getElementById("scan-idle")?.style.setProperty("display", "block");
    document.getElementById("scan-success-overlay")?.classList.remove("visible");
  }, 100);
}

// ── DASHBOARD HTML ──

function getDashboardHTML() {
  const state = ctx.getState();
  const addr = state.lightningAddress || "wallet@satsparty.app";
  const balance = state.balance || 0;
  const nwcUrl = state.nwcUrl || "nostr+walletconnect://...";

  return `
  <!-- DASHBOARD -->
  <div class="screen" id="s-dashboard">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <div class="topbar-right">
        <button class="icon-btn" id="nav-history-top" onclick="document.getElementById('nav-history').click()" title="Historial">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,6 12,12 16,14"/></svg>
        </button>
        <button class="icon-btn" id="nav-settings-top" onclick="document.getElementById('nav-settings').click()" title="Config">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.8"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></svg>
        </button>
      </div>
    </div>
    <div class="dash-hero">
      <div class="dash-address-pill" id="dash-address-pill">
        <span>⚡</span><span>${addr}</span><span style="opacity:.4">⎘</span>
      </div>
      <div class="dash-balance-wrap">
        <div class="dash-balance-label">Tu saldo</div>
        <div class="dash-balance-row" id="dash-balance-row" style="cursor:pointer">
          <div class="dash-balance-num" id="dash-balance">${balance}</div>
          <div style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:.4rem;gap:.15rem">
            <span id="btc-symbol" style="font-family:Georgia,serif;font-size:3.2rem;color:var(--white);line-height:1;transition:opacity .2s">₿</span>
            <div class="dash-balance-unit" id="balance-unit">SATS</div>
          </div>
        </div>
        <div class="dash-balance-fiat" id="dash-fiat">
          <span style="opacity:.4;font-size:.6rem">Tocá para cambiar moneda</span>
        </div>
      </div>
    </div>
    <div class="dash-actions">
      <div class="action-btn recv" id="action-recv">
        <svg class="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7,10 12,15 17,10"/><line x1="5" y1="21" x2="19" y2="21"/></svg>
        <span class="action-btn-label">Recibir</span>
      </div>
      <div class="action-btn send" id="action-send">
        <svg class="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="21" x2="12" y2="9"/><polyline points="7,14 12,9 17,14"/><line x1="5" y1="3" x2="19" y2="3"/></svg>
        <span class="action-btn-label">Enviar</span>
      </div>
      <div class="action-btn scan" id="action-scan">
        <svg class="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h2"/><path d="M16 3h2a2 2 0 0 1 2 2v3"/><path d="M21 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
        <span class="action-btn-label">Escanear</span>
      </div>
    </div>
    <div class="recharge-section">
      <div class="recharge-label">Recargar con fiat</div>
      <div class="recharge-banner pesos"><div class="recharge-banner-left"><span style="font-size:1.2rem">🧉</span><div><div class="recharge-banner-title">PESOS → SATS</div><div class="recharge-banner-sub">Tutorial · Exchange local → Lightning</div></div></div><span class="recharge-banner-chevron">›</span></div>
      <div class="recharge-banner usdt"><div class="recharge-banner-left"><span style="font-size:1.2rem">💵</span><div><div class="recharge-banner-title">USDT → SATS</div><div class="recharge-banner-sub">Swap automático · Boltz</div></div></div><span class="recharge-banner-chevron">›</span></div>
    </div>
  </div>

  <!-- RECEIVE -->
  <div class="screen slide-up" id="s-receive">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">✕ CERRAR</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <p class="screen-title">Recibir<br><span style="color:var(--electric)">sats.</span></p>
      <p class="screen-desc">Compartí tu Lightning Address o generá un invoice.</p>
      <div class="receive-tabs">
        <button class="tab active" id="tab-address-btn">Address</button>
        <button class="tab" id="tab-invoice-btn">Invoice</button>
      </div>
      <div id="tab-address">
        <div class="address-card">
          <div class="field-label">Tu Lightning Address</div>
          <div class="address-val">${addr}</div>
          <button class="btn-primary" id="btn-copy-address">Copiar address ⎘</button>
        </div>
      </div>
      <div id="tab-invoice" style="display:none">
        <div style="display:flex;gap:0;margin-bottom:1rem">
          <button class="inv-cur-btn active" id="icur-sats">SATS</button>
          <button class="inv-cur-btn" id="icur-usd">USD</button>
          <button class="inv-cur-btn" id="icur-ars">ARS</button>
        </div>
        <div style="position:relative;margin-bottom:.5rem">
          <input class="field-input" type="number" id="invoice-amount" placeholder="0" inputmode="decimal" style="padding-right:3.5rem;font-family:var(--font-display);font-size:1.6rem;margin-bottom:0"/>
          <span id="inv-cur-label" style="position:absolute;right:1rem;top:50%;transform:translateY(-50%);font-family:var(--font-mono);font-size:.65rem;color:var(--muted);pointer-events:none">SATS</span>
        </div>
        <div id="inv-conversion" style="font-family:var(--font-mono);font-size:.62rem;color:var(--muted);margin-bottom:1rem;min-height:1.2rem;padding:.4rem .2rem"></div>
        <button class="btn-primary" id="btn-generate-invoice">Generar invoice ⚡</button>
        <div class="invoice-result" id="invoice-result">
          <div style="font-family:var(--font-mono);font-size:.55rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Invoice generado</div>
          <div class="invoice-amount-display" id="invoice-amount-display">—</div>
          <div style="background:#fff;padding:12px;display:inline-block;margin:.8rem 0" id="invoice-qr-container"></div>
          <div style="font-family:var(--font-mono);font-size:.55rem;color:var(--muted);margin-bottom:.8rem">Escaneá para pagar · Lightning Network</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SEND -->
  <div class="screen slide-up" id="s-send">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">✕ CERRAR</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <p class="screen-title">Enviar<br><span style="color:var(--electric)">sats.</span></p>
      <div class="field-label">Destino (Lightning Address)</div>
      <input class="field-input" type="text" id="send-dest" placeholder="nombre@dominio.com"/>
      <div class="field-label">Monto (sats)</div>
      <input class="field-input" type="number" id="send-amount" placeholder="0" inputmode="numeric"/>
      <div class="send-preview" id="send-preview">
        <div class="send-preview-row" style="margin-bottom:.4rem">
          <span class="send-preview-label">Enviás</span>
          <span class="send-preview-val" id="preview-amount">—</span>
        </div>
        <div class="send-preview-row">
          <span class="send-preview-label">A</span>
          <span class="send-preview-val" id="preview-dest" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">—</span>
        </div>
      </div>
      <div style="height:.8rem"></div>
      <button class="btn-primary" id="btn-send-confirm">Confirmar envío ⚡</button>
      <div style="height:.5rem"></div>
      <button class="btn-secondary" data-close>Cancelar</button>
    </div>
  </div>

  <!-- SCAN -->
  <div class="screen slide-up" id="s-scan">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">✕ CERRAR</button>
    </div>
    <div class="scan-viewfinder">
      <div id="scan-idle"><div class="scan-frame"><span></span><div class="scan-line"></div></div></div>
      <div class="scan-success-overlay" id="scan-success-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.85);align-items:center;justify-content:center;flex-direction:column;gap:.8rem;">
        <div style="font-size:2rem">✓</div>
        <div id="scan-result-addr" style="font-family:var(--font-mono);font-size:.7rem;color:var(--electric);text-align:center;padding:0 2rem"></div>
        <button class="btn-primary" style="margin:0 2rem" id="btn-use-scan">Usar esta address</button>
      </div>
    </div>
    <div style="padding:1rem 1.4rem;font-family:var(--font-mono);font-size:.62rem;color:var(--muted);text-align:center;letter-spacing:.08em">Apuntá la cámara al QR</div>
    <div style="padding:0 1.4rem 1.2rem"><button class="btn-secondary" id="btn-simulate-scan">⚡ Simular escaneo</button></div>
  </div>

  <!-- SUCCESS -->
  <div class="screen" id="s-success">
    <div class="success-body">
      <div class="success-icon">⚡</div>
      <div class="success-amount" id="success-amount">0</div>
      <div class="success-label">sats enviados</div>
      <div class="success-to" id="success-to"></div>
      <div style="font-family:var(--font-mono);font-size:.6rem;color:var(--muted);margin-bottom:2rem">Nuevo saldo: <span id="success-new-balance" style="color:var(--electric)"></span></div>
      <button class="btn-primary" style="max-width:260px" data-close>Volver al inicio ⚡</button>
    </div>
  </div>

  <!-- HISTORY -->
  <div class="screen" id="s-history">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">← VOLVER</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <p class="screen-title">Historial</p>
    </div>
    <div id="history-body" class="history-body"></div>
  </div>

  <!-- SETTINGS -->
  <div class="screen" id="s-settings">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">← VOLVER</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <div class="settings-section">
        <div class="settings-section-label">Wallet</div>
        <div class="settings-row">
          <span class="settings-row-label">Lightning Address</span>
          <span class="settings-row-val">${addr}</span>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Red</span>
          <span class="settings-row-val">Lightning Network</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">Seguridad</div>
        <div class="settings-key-box">
          <div class="field-label">NWC Connection String</div>
          <div class="settings-key-val" id="settings-key-val">${nwcUrl}</div>
        </div>
        <button class="btn-secondary" id="btn-toggle-settings-key" style="margin-bottom:.6rem">Revelar / ocultar clave</button>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">App</div>
        <div class="settings-row">
          <span class="settings-row-label">Versión</span>
          <span class="settings-row-val">0.1.0 · Hackathon</span>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM NAV BAR -->
  <div class="bottom-nav-bar" id="bottom-nav-bar">
    <button class="nav-item active" id="nav-home">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>
      <span>Inicio</span>
    </button>
    <button class="nav-item" id="nav-receive">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7,10 12,15 17,10"/><line x1="5" y1="21" x2="19" y2="21"/></svg>
      <span>Recibir</span>
    </button>
    <button class="nav-item" id="nav-send">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="21" x2="12" y2="9"/><polyline points="7,14 12,9 17,14"/><line x1="5" y1="3" x2="19" y2="3"/></svg>
      <span>Enviar</span>
    </button>
    <button class="nav-item" id="nav-history">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,6 12,12 16,14"/></svg>
      <span>Historial</span>
    </button>
    <button class="nav-item" id="nav-settings">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.8"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></svg>
      <span>Config</span>
    </button>
  </div>
  `;
}

// ── HELPERS ──

function onClick(id, handler) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", handler);
  }, 10);
}

function activateMission() {}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
