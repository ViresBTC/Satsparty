/**
 * SatsParty — Dashboard Module
 *
 * Renderiza el dashboard principal con balance real via NWC,
 * envío/recepción de sats, historial y configuración.
 */

import { LightningAddress } from "@getalby/lightning-tools";
import { Html5Qrcode } from "html5-qrcode";

let ctx = {};
let currentView = "s-dashboard";
let currencyIdx = 0;
let qrScanner = null;

export function renderDashboard(app, context) {
  ctx = context;
  app.innerHTML = getDashboardHTML();

  // Reconectar wallet y cargar balance real
  initDashboard();
}

async function initDashboard() {
  navTo("s-dashboard");

  // Generar QR de Lightning Address
  const state = ctx.getState();
  const addr = state.lightningAddress || "wallet@satsparty.app";
  const qrContainer = document.getElementById("address-qr-container");
  if (qrContainer) {
    qrContainer.innerHTML = ctx.generateQRSvg(addr, 150);
  }

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
  // Light ripple effect on action buttons
  setupLightRipple();

  // Navigation
  onClick("nav-home", () => navTo("s-dashboard"));
  onClick("nav-history", () => {
    refreshHistory();
    navTo("s-history");
  });
  onClick("nav-settings", () => navTo("s-settings"));

  // Dashboard actions
  onClick("dash-address-pill", () => {
    copyToClipboard(ctx.getState().lightningAddress || "wallet@satsparty.app");
  });
  onClick("dash-balance-row", cycleCurrency);

  // Action buttons
  onClick("action-recv", () => navTo("s-receive"));
  onClick("action-send", () => navTo("s-send"));
  onClick("action-scan", () => {
    navTo("s-scan");
    setTimeout(() => startRealScan(), 300);
  });

  // Receive
  onClick("tab-address-btn", () => switchTab("address"));
  onClick("tab-invoice-btn", () => switchTab("invoice"));
  onClick("btn-copy-address", () => {
    copyToClipboard(ctx.getState().lightningAddress || "wallet@satsparty.app");
  });
  onClick("btn-generate-invoice", generateInvoice);

  // Send
  onClick("btn-send-confirm", confirmSend);

  // Scan
  onClick("btn-simulate-scan", simulateScan);
  onClick("btn-use-scan", useScanResult);
  onClick("btn-scan-again", () => {
    resetScanUI();
    startRealScan();
  });

  // Settings
  onClick("btn-toggle-settings-key", () => {
    document.getElementById("settings-key-val")?.classList.toggle("shown");
  });
  onClick("btn-copy-nwc", () => {
    copyToClipboard(ctx.getState().nwcUrl || "");
  });
  onClick("btn-reset-wallet", () => {
    if (confirm("¿Seguro? Vas a perder el acceso a esta wallet si no guardaste la clave.")) {
      import("./services/state.js").then(({ resetState }) => {
        resetState();
        window.location.reload();
      });
    }
  });

  // Recharge banners
  setTimeout(() => {
    document.querySelector(".recharge-banner.pesos")?.addEventListener("click", () => {
      resetWizard("pesos", 4);
      navTo("s-recharge-pesos");
    });
    document.querySelector(".recharge-banner.usdt")?.addEventListener("click", () => {
      resetWizard("usdt", 3);
      navTo("s-recharge-usdt");
    });
  }, 10);

  // Pesos wizard navigation
  onClick("pesos-next-1", () => wizardStep("pesos", 2, 4));
  onClick("pesos-next-2", () => wizardStep("pesos", 3, 4));
  onClick("pesos-next-3", () => wizardStep("pesos", 4, 4));
  onClick("pesos-prev-2", () => wizardStep("pesos", 1, 4));
  onClick("pesos-prev-3", () => wizardStep("pesos", 2, 4));
  onClick("pesos-prev-4", () => wizardStep("pesos", 3, 4));
  onClick("btn-copy-addr-pesos", () => {
    copyToClipboard(ctx.getState().lightningAddress || "wallet@satsparty.app");
  });
  onClick("btn-invoice-pesos", () => {
    navTo("s-receive");
    setTimeout(() => switchTab("invoice"), 100);
  });

  // USDT wizard navigation
  onClick("usdt-next-1", () => wizardStep("usdt", 2, 3));
  onClick("usdt-next-2", () => wizardStep("usdt", 3, 3));
  onClick("usdt-prev-2", () => wizardStep("usdt", 1, 3));
  onClick("usdt-prev-3", () => wizardStep("usdt", 2, 3));
  onClick("btn-open-fixedfloat", () => {
    window.open("https://ff.io/exchange/usdttrc20/btcln", "_blank");
  });

  // Close buttons (back to dashboard)
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      stopScanner();
      resetScanUI();
      navTo("s-dashboard");
    });
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
  "s-receive": "nav-home",
  "s-send": "nav-home",
  "s-history": "nav-history",
  "s-settings": "nav-settings",
};
const hideNavScreens = ["s-success", "s-scan", "s-recharge-pesos", "s-recharge-usdt"];

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

function getDemoTransactions() {
  const now = Math.floor(Date.now() / 1000);
  return [
    { type: "in", amount: 100, description: "🎉 Bienvenida SatsParty", timestamp: now - 120 },
    { type: "out", amount: 50, description: "☕ Café con Lightning", timestamp: now - 900 },
    { type: "in", amount: 200, description: "🎯 Misión: Primer pago", timestamp: now - 1800 },
    { type: "out", amount: 30, description: "🍕 Porción de pizza", timestamp: now - 3600 },
    { type: "in", amount: 500, description: "💸 Recarga desde exchange", timestamp: now - 7200 },
    { type: "out", amount: 150, description: "🎁 Regalo a amigo", timestamp: now - 10800 },
    { type: "in", amount: 1000, description: "🏆 Premio trivia Lightning", timestamp: now - 86400 },
    { type: "out", amount: 75, description: "🍺 Cerveza artesanal", timestamp: now - 86400 - 1800 },
    { type: "in", amount: 300, description: "🤝 Split de cuenta", timestamp: now - 86400 - 3600 },
    { type: "out", amount: 21, description: "⚡ Tip al barista", timestamp: now - 86400 * 2 },
    { type: "in", amount: 150, description: "🎯 Misión: Escanear QR", timestamp: now - 86400 * 2 - 600 },
  ];
}

async function refreshHistory() {
  try {
    if (ctx.nwcService.isConnected()) {
      const txs = await ctx.nwcService.listTransactions(20);
      ctx.setState({ transactions: txs });
      renderHistoryList(txs);
    } else {
      // Demo mode: show example transactions
      const demoTxs = getDemoTransactions();
      renderHistoryList(demoTxs);
    }
  } catch (err) {
    console.error("Error fetching history:", err);
    renderHistoryList(ctx.getState().transactions || getDemoTransactions());
  }
}

function renderHistoryList(txs) {
  const el = document.getElementById("history-body");
  const summaryEl = document.getElementById("history-summary");
  if (!el) return;

  if (txs.length === 0) {
    if (summaryEl) summaryEl.innerHTML = "";
    el.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;">
        <div style="font-size:2rem;margin-bottom:.8rem;opacity:.4">⚡</div>
        <div style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:.4rem;color:var(--white)">Sin transacciones</div>
        <div style="font-family:var(--font-mono);font-size:.6rem;color:var(--muted);line-height:1.6">Enviá o recibí sats para ver<br>tu historial acá.</div>
      </div>`;
    return;
  }

  // Calculate summary
  const totalIn = txs.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="history-stats">
        <div class="history-stat">
          <span class="history-stat-label">⬇ Recibido</span>
          <span class="history-stat-value in">+${totalIn.toLocaleString()} sats</span>
        </div>
        <div class="history-stat">
          <span class="history-stat-label">⬆ Enviado</span>
          <span class="history-stat-value out">-${totalOut.toLocaleString()} sats</span>
        </div>
      </div>`;
  }

  // Group by date label
  const now = Math.floor(Date.now() / 1000);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayTs = Math.floor(todayStart.getTime() / 1000);
  const yesterdayTs = todayTs - 86400;

  const grouped = {};
  txs.forEach((tx) => {
    let label;
    if (!tx.timestamp) { label = "Hoy"; }
    else if (tx.timestamp >= todayTs) { label = "Hoy"; }
    else if (tx.timestamp >= yesterdayTs) { label = "Ayer"; }
    else { label = new Date(tx.timestamp * 1000).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" }); }
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(tx);
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

async function startRealScan() {
  const readerEl = document.getElementById("qr-reader");
  const idleEl = document.getElementById("scan-idle");
  const statusEl = document.getElementById("scan-status");

  if (!readerEl) return;

  // Ocultar placeholder, mostrar reader
  if (idleEl) idleEl.style.display = "none";
  if (statusEl) statusEl.textContent = "Iniciando cámara...";

  try {
    qrScanner = new Html5Qrcode("qr-reader");

    await qrScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      },
      (decodedText) => {
        // QR leído exitosamente
        handleScanResult(decodedText);
      },
      () => {
        // Silenciar errores de frames sin QR
      }
    );

    if (statusEl) statusEl.textContent = "Apuntá la cámara al código QR";
  } catch (err) {
    console.error("Error iniciando cámara:", err);
    // Fallback: mostrar el modo simulado
    if (idleEl) idleEl.style.display = "flex";
    if (statusEl) statusEl.textContent = "No se pudo acceder a la cámara";
    document.getElementById("scan-fallback")?.style.setProperty("display", "block");
  }
}

async function stopScanner() {
  if (qrScanner) {
    try {
      const state = qrScanner.getState();
      // state 2 = scanning
      if (state === 2) {
        await qrScanner.stop();
      }
    } catch (e) {
      // Ignorar errores al detener
    }
    qrScanner = null;
  }
}

function handleScanResult(rawText) {
  // Detener scanner
  stopScanner();

  // Parsear el resultado: puede ser lightning address, bolt11, lnurl, o NWC URL
  let parsed = parseScanData(rawText);

  // Mostrar resultado
  const overlay = document.getElementById("scan-success-overlay");
  const typeEl = document.getElementById("scan-result-type");
  const addrEl = document.getElementById("scan-result-addr");

  if (overlay) overlay.style.display = "flex";
  if (typeEl) typeEl.textContent = parsed.typeLabel;
  if (addrEl) addrEl.textContent = parsed.display;

  window._scanResult = parsed;
}

function parseScanData(raw) {
  const text = raw.trim();

  // Lightning invoice (bolt11)
  if (text.toLowerCase().startsWith("lnbc") || text.toLowerCase().startsWith("lightning:lnbc")) {
    const invoice = text.replace(/^lightning:/i, "");
    return { type: "invoice", value: invoice, display: invoice.substring(0, 40) + "...", typeLabel: "LIGHTNING INVOICE" };
  }

  // LNURL
  if (text.toLowerCase().startsWith("lnurl") || text.toLowerCase().startsWith("lightning:lnurl")) {
    const lnurl = text.replace(/^lightning:/i, "");
    return { type: "lnurl", value: lnurl, display: lnurl.substring(0, 40) + "...", typeLabel: "LNURL" };
  }

  // NWC URL
  if (text.startsWith("nostr+walletconnect://")) {
    return { type: "nwc", value: text, display: text.substring(0, 40) + "...", typeLabel: "NWC WALLET" };
  }

  // Lightning Address (email-like)
  if (text.includes("@") && text.includes(".") && !text.includes(" ")) {
    const addr = text.replace(/^lightning:/i, "");
    return { type: "address", value: addr, display: addr, typeLabel: "LIGHTNING ADDRESS" };
  }

  // Bitcoin on-chain address
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,}$/.test(text) || text.toLowerCase().startsWith("bitcoin:")) {
    return { type: "bitcoin", value: text, display: text.substring(0, 40) + "...", typeLabel: "BITCOIN ADDRESS" };
  }

  // Desconocido - intentar usar como destino
  return { type: "unknown", value: text, display: text.substring(0, 50), typeLabel: "QR ESCANEADO" };
}

function simulateScan() {
  const addrs = ["pagos@bitcoinbeach.com", "cafe@btcpay.ar", "amigo@walletofsatoshi.com"];
  const picked = addrs[Math.floor(Math.random() * addrs.length)];
  handleScanResult(picked);
}

function useScanResult() {
  const result = window._scanResult;
  if (!result) return;

  stopScanner();

  if (result.type === "invoice") {
    // Para invoices, ir directo a pagar
    navTo("s-send");
    setTimeout(() => {
      const dest = document.getElementById("send-dest");
      if (dest) dest.value = result.value;
    }, 100);
  } else if (result.type === "nwc") {
    // NWC URL - conectar wallet
    ctx.showToast("NWC URL detectada");
    ctx.setState({ nwcUrl: result.value });
  } else {
    // Lightning Address, LNURL u otro - ir a enviar
    navTo("s-send");
    setTimeout(() => {
      const dest = document.getElementById("send-dest");
      if (dest) dest.value = result.value;
    }, 100);
  }

  // Reset scan UI
  resetScanUI();
}

function resetScanUI() {
  const overlay = document.getElementById("scan-success-overlay");
  const idleEl = document.getElementById("scan-idle");
  if (overlay) overlay.style.display = "none";
  if (idleEl) idleEl.style.display = "flex";
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
      <div class="recharge-banner usdt"><div class="recharge-banner-left"><span style="font-size:1.2rem">💵</span><div><div class="recharge-banner-title">USDT → SATS</div><div class="recharge-banner-sub">Swap automático · FixedFloat</div></div></div><span class="recharge-banner-chevron">›</span></div>
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
        <div class="address-card" style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:.5rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Tu Lightning Address</div>
          <div class="address-val">${addr}</div>
          <div style="background:#fff;padding:12px;display:inline-block;margin:0 auto .8rem;border-radius:10px" id="address-qr-container"></div>
          <div style="font-family:var(--font-mono);font-size:.55rem;color:var(--muted);text-align:center;margin-bottom:.8rem">Escaneá para pagar a esta address</div>
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
      <!-- Placeholder antes de iniciar cámara -->
      <div id="scan-idle" style="display:flex;align-items:center;justify-content:center;flex:1;">
        <div class="scan-frame"><span></span><div class="scan-line"></div></div>
      </div>
      <!-- Container para html5-qrcode -->
      <div id="qr-reader"></div>
      <!-- Resultado exitoso -->
      <div class="scan-success-overlay" id="scan-success-overlay" style="display:none;position:absolute;inset:0;background:rgba(8,8,8,.92);align-items:center;justify-content:center;flex-direction:column;gap:.8rem;z-index:10;">
        <div style="font-size:2.5rem;margin-bottom:.4rem">✓</div>
        <div id="scan-result-type" style="font-family:var(--font-mono);font-size:.55rem;letter-spacing:.15em;color:var(--muted);text-transform:uppercase"></div>
        <div id="scan-result-addr" style="font-family:var(--font-mono);font-size:.72rem;color:var(--electric);text-align:center;padding:0 2rem;word-break:break-all;line-height:1.5"></div>
        <div style="display:flex;flex-direction:column;gap:.5rem;width:100%;padding:0 2rem;margin-top:.5rem">
          <button class="btn-primary" id="btn-use-scan">Usar ⚡</button>
          <button class="btn-secondary" id="btn-scan-again">Escanear otro</button>
        </div>
      </div>
    </div>
    <div id="scan-status" style="padding:.8rem 1.4rem;font-family:var(--font-mono);font-size:.62rem;color:var(--muted);text-align:center;letter-spacing:.08em">Apuntá la cámara al código QR</div>
    <div id="scan-fallback" style="padding:0 1.4rem 1.2rem;display:none"><button class="btn-secondary" id="btn-simulate-scan">⚡ Simular escaneo (sin cámara)</button></div>
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
      <div class="history-summary" id="history-summary"></div>
      <div id="history-body" class="history-body"></div>
    </div>
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
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="btn-toggle-settings-key" style="flex:1">Revelar / ocultar</button>
          <button class="btn-secondary" id="btn-copy-nwc" style="flex:1">Copiar clave ⎘</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">App</div>
        <div class="settings-row">
          <span class="settings-row-label">Versión</span>
          <span class="settings-row-val">0.1.0 · Hackathon</span>
        </div>
      </div>
      <div class="settings-section">
        <button class="btn-secondary" id="btn-reset-wallet" style="color:var(--orange);border-color:rgba(255,107,26,.3);width:100%">Resetear wallet</button>
        <div style="font-family:var(--font-mono);font-size:.5rem;color:var(--muted);text-align:center;margin-top:.5rem;line-height:1.5">Esto borra tu wallet de este dispositivo.<br>Asegurate de tener tu clave guardada.</div>
      </div>
    </div>
  </div>

  <!-- RECHARGE: PESOS → SATS -->
  <div class="screen slide-up" id="s-recharge-pesos">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">← VOLVER</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <p class="screen-title">Pesos → Sats<br><span style="color:var(--electric)">guía paso a paso.</span></p>
      <p class="screen-desc">Cómo convertir pesos argentinos a sats vía un exchange local.</p>

      <!-- Step indicators -->
      <div class="wizard-steps" id="pesos-steps">
        <div class="wizard-step-dot active" data-step="1">1</div>
        <div class="wizard-step-line"></div>
        <div class="wizard-step-dot" data-step="2">2</div>
        <div class="wizard-step-line"></div>
        <div class="wizard-step-dot" data-step="3">3</div>
        <div class="wizard-step-line"></div>
        <div class="wizard-step-dot" data-step="4">4</div>
      </div>

      <!-- Step 1: Elegir exchange -->
      <div class="wizard-card" id="pesos-step-1">
        <div class="wizard-card-header">
          <span class="wizard-card-num">01</span>
          <span class="wizard-card-title">Elegí un exchange</span>
        </div>
        <p class="wizard-card-desc">Necesitás una cuenta en un exchange argentino que soporte Lightning Network o retiro de BTC.</p>
        <div class="wizard-options">
          <div class="wizard-option">
            <div class="wizard-option-name" style="color:var(--electric)">Belo</div>
            <div class="wizard-option-sub">Retiro Lightning directo</div>
          </div>
          <div class="wizard-option">
            <div class="wizard-option-name" style="color:var(--electric)">Lemon</div>
            <div class="wizard-option-sub">Exchange popular · Retiro BTC on-chain</div>
          </div>
          <div class="wizard-option">
            <div class="wizard-option-name" style="color:var(--electric)">Ripio</div>
            <div class="wizard-option-sub">Exchange histórico · Retiro BTC</div>
          </div>
        </div>
        <div class="wizard-tip">
          <span style="color:var(--electric)">TIP:</span> Belo tiene retiro Lightning nativo, es lo más rápido y barato.
        </div>
        <button class="btn-primary" id="pesos-next-1">Siguiente →</button>
      </div>

      <!-- Step 2: Depositar ARS -->
      <div class="wizard-card" id="pesos-step-2" style="display:none">
        <div class="wizard-card-header">
          <span class="wizard-card-num">02</span>
          <span class="wizard-card-title">Depositá ARS</span>
        </div>
        <p class="wizard-card-desc">Transferí pesos al exchange desde tu banco o billetera virtual.</p>
        <div class="wizard-info-box">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Método</span>
            <span class="wizard-info-val">Transferencia bancaria / CVU</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Demora</span>
            <span class="wizard-info-val" style="color:var(--green)">Inmediato</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Comisión</span>
            <span class="wizard-info-val" style="color:var(--green)">$0</span>
          </div>
        </div>
        <div class="wizard-tip">
          <span style="color:var(--electric)">TIP:</span> Usá Mercado Pago o tu banco. La transferencia a CVU es gratis e inmediata.
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="pesos-prev-2" style="flex:1">← Atrás</button>
          <button class="btn-primary" id="pesos-next-2" style="flex:1">Siguiente →</button>
        </div>
      </div>

      <!-- Step 3: Comprar BTC -->
      <div class="wizard-card" id="pesos-step-3" style="display:none">
        <div class="wizard-card-header">
          <span class="wizard-card-num">03</span>
          <span class="wizard-card-title">Comprá Bitcoin</span>
        </div>
        <p class="wizard-card-desc">Con los ARS depositados, comprá BTC en el exchange.</p>
        <div class="wizard-info-box">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Par</span>
            <span class="wizard-info-val">BTC/ARS</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Precio ref.</span>
            <span class="wizard-info-val" style="color:var(--electric)">~$${Math.round(state.btcUsd * state.usdArs).toLocaleString()} ARS</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Mínimo</span>
            <span class="wizard-info-val">~$500 ARS (depende del exchange)</span>
          </div>
        </div>
        <div class="wizard-tip">
          <span style="color:var(--electric)">TIP:</span> No necesitás comprar 1 BTC entero. Podés comprar fracciones (satoshis).
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="pesos-prev-3" style="flex:1">← Atrás</button>
          <button class="btn-primary" id="pesos-next-3" style="flex:1">Siguiente →</button>
        </div>
      </div>

      <!-- Step 4: Retirar a Lightning -->
      <div class="wizard-card" id="pesos-step-4" style="display:none">
        <div class="wizard-card-header">
          <span class="wizard-card-num">04</span>
          <span class="wizard-card-title">Retirá a Lightning</span>
        </div>
        <p class="wizard-card-desc">Enviá los BTC desde el exchange a tu Lightning Address o usá un invoice para recibir un monto exacto.</p>
        <div class="wizard-info-box">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Tu address</span>
            <span class="wizard-info-val" style="color:var(--electric);font-size:.55rem">${addr}</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Red</span>
            <span class="wizard-info-val" style="color:var(--electric)">Lightning Network ⚡</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Demora</span>
            <span class="wizard-info-val" style="color:var(--green)">~10 segundos</span>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;margin-bottom:.5rem">
          <button class="btn-primary" id="btn-copy-addr-pesos" style="flex:1">Copiar Address ⎘</button>
          <button class="btn-primary" id="btn-invoice-pesos" style="flex:1">Generar Invoice ⚡</button>
        </div>
        <div style="font-family:var(--font-mono);font-size:.52rem;color:rgba(242,237,230,.45);line-height:1.6;margin-bottom:.8rem;padding:0 .2rem">
          <strong style="color:rgba(242,237,230,.65)">Address</strong> = recibís cualquier monto, como un alias.<br>
          <strong style="color:rgba(242,237,230,.65)">Invoice</strong> = pedís un monto exacto, con QR escaneable.
        </div>
        <div class="wizard-tip">
          <span style="color:var(--electric)">TIP:</span> El exchange te puede pedir que les des un invoice con un monto en vez de mandar directamente a tu address.
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="pesos-prev-4" style="flex:1">← Atrás</button>
          <button class="btn-primary" data-close style="flex:1">Listo ⚡</button>
        </div>
      </div>
    </div>
  </div>

  <!-- RECHARGE: USDT → SATS -->
  <div class="screen slide-up" id="s-recharge-usdt">
    <div class="topbar">
      <span class="topbar-logo">Sats<span>Party</span></span>
      <button data-close style="background:none;border:none;color:var(--muted);font-family:var(--font-mono);font-size:.6rem;cursor:pointer;letter-spacing:.1em">← VOLVER</button>
    </div>
    <div class="screen-body" style="flex:1;overflow-y:auto;padding:.5rem 1.4rem 1.4rem">
      <p class="screen-title">USDT → Sats<br><span style="color:#00d4ff">swap automático.</span></p>
      <p class="screen-desc">Convertí USDT a sats vía FixedFloat. Sin registro, sin KYC.</p>

      <!-- Step indicators -->
      <div class="wizard-steps" id="usdt-steps">
        <div class="wizard-step-dot active" data-step="1" style="--dot-color:#00d4ff">1</div>
        <div class="wizard-step-line" style="--line-color:#00d4ff"></div>
        <div class="wizard-step-dot" data-step="2" style="--dot-color:#00d4ff">2</div>
        <div class="wizard-step-line" style="--line-color:#00d4ff"></div>
        <div class="wizard-step-dot" data-step="3" style="--dot-color:#00d4ff">3</div>
      </div>

      <!-- Step 1: Enviar USDT -->
      <div class="wizard-card" id="usdt-step-1">
        <div class="wizard-card-header">
          <span class="wizard-card-num" style="color:#00d4ff">01</span>
          <span class="wizard-card-title">Enviá USDT</span>
        </div>
        <p class="wizard-card-desc">Enviá USDT a la dirección que te da FixedFloat. Soporta Tron (TRC-20), Ethereum, BSC y más.</p>
        <div class="wizard-info-box" style="border-color:rgba(0,212,255,.25)">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Red recomendada</span>
            <span class="wizard-info-val" style="color:#00d4ff">Tron TRC-20 (fees bajos)</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Dirección</span>
            <span class="wizard-info-val" style="color:#00d4ff;font-size:.5rem">Se genera en ff.io</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Mínimo</span>
            <span class="wizard-info-val">~$1 USDT</span>
          </div>
        </div>
        <button class="btn-primary" id="btn-open-fixedfloat" style="margin-bottom:.5rem;background:rgba(0,212,255,.15);border-color:#00d4ff;color:#00d4ff">Abrir FixedFloat ↗</button>
        <div class="wizard-tip" style="border-left-color:#00d4ff">
          <span style="color:#00d4ff">IMPORTANTE:</span> Seleccioná USDT como origen y Lightning BTC como destino. Red recomendada: Tron (TRC-20) por fees bajos.
        </div>
        <button class="btn-primary" id="usdt-next-1" style="background:rgba(0,212,255,.15);border-color:#00d4ff;color:#00d4ff">Siguiente →</button>
      </div>

      <!-- Step 2: Swap automático -->
      <div class="wizard-card" id="usdt-step-2" style="display:none">
        <div class="wizard-card-header">
          <span class="wizard-card-num" style="color:#00d4ff">02</span>
          <span class="wizard-card-title">Swap automático</span>
        </div>
        <p class="wizard-card-desc">FixedFloat convierte tus USDT a BTC y los envía por Lightning Network automáticamente.</p>
        <div class="wizard-info-box" style="border-color:rgba(0,212,255,.25)">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Proceso</span>
            <span class="wizard-info-val">Automático (tipo de cambio fijo)</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Demora</span>
            <span class="wizard-info-val" style="color:var(--green)">~5-30 minutos</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Fee</span>
            <span class="wizard-info-val">~1%</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">KYC</span>
            <span class="wizard-info-val" style="color:var(--green)">No requiere</span>
          </div>
        </div>
        <div class="wizard-tip" style="border-left-color:#00d4ff">
          <span style="color:#00d4ff">NOTA:</span> FixedFloat es un exchange automatizado. El swap se procesa al recibir tu depósito.
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="usdt-prev-2" style="flex:1">← Atrás</button>
          <button class="btn-primary" id="usdt-next-2" style="flex:1;background:rgba(0,212,255,.15);border-color:#00d4ff;color:#00d4ff">Siguiente →</button>
        </div>
      </div>

      <!-- Step 3: Recibir sats -->
      <div class="wizard-card" id="usdt-step-3" style="display:none">
        <div class="wizard-card-header">
          <span class="wizard-card-num" style="color:#00d4ff">03</span>
          <span class="wizard-card-title">Recibí tus sats</span>
        </div>
        <p class="wizard-card-desc">Los sats llegan directo a tu wallet SatsParty vía Lightning Network.</p>
        <div class="wizard-info-box" style="border-color:rgba(0,212,255,.25)">
          <div class="wizard-info-row">
            <span class="wizard-info-label">Destino</span>
            <span class="wizard-info-val" style="color:var(--electric);font-size:.55rem">${addr}</span>
          </div>
          <div class="wizard-info-row">
            <span class="wizard-info-label">Conversión aprox.</span>
            <span class="wizard-info-val" style="color:var(--electric)">1 USDT ≈ ${Math.round(100_000_000 / state.btcUsd).toLocaleString()} sats</span>
          </div>
        </div>
        <div class="wizard-tip" style="border-left-color:#00d4ff">
          <span style="color:#00d4ff">TIP:</span> Podés verificar el estado del swap en ff.io con tu order ID.
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-secondary" id="usdt-prev-3" style="flex:1">← Atrás</button>
          <button class="btn-primary" data-close style="flex:1;background:rgba(0,212,255,.15);border-color:#00d4ff;color:#00d4ff">Listo ⚡</button>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM NAV BAR -->
  <div class="bottom-nav-bar" id="bottom-nav-bar">
    <button class="nav-item active" id="nav-home">
      <span class="nav-logo">Sats<span>Party</span></span>
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

function setupLightRipple() {
  document.querySelectorAll(".action-btn").forEach((btn) => {
    const getColor = (el) => {
      if (el.classList.contains("recv")) return "rgba(247,255,0,.25)";
      if (el.classList.contains("send")) return "rgba(255,255,255,.18)";
      return "rgba(255,255,255,.12)";
    };

    const startRipple = (x, y) => {
      // Remove any existing ripple
      btn.querySelectorAll(".light-ripple").forEach((r) => r.remove());

      const rect = btn.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;

      // Size = 2x the max distance to any corner
      const maxDist = Math.max(
        Math.hypot(localX, localY),
        Math.hypot(rect.width - localX, localY),
        Math.hypot(localX, rect.height - localY),
        Math.hypot(rect.width - localX, rect.height - localY)
      );
      const size = maxDist * 2.5;
      const color = getColor(btn);

      const ripple = document.createElement("div");
      ripple.className = "light-ripple";
      ripple.style.cssText = `
        left:${localX}px;top:${localY}px;
        width:${size}px;height:${size}px;
        background:radial-gradient(circle, ${color} 0%, transparent 70%);
      `;
      btn.appendChild(ripple);

      // Force reflow then expand
      ripple.offsetWidth;
      ripple.classList.add("expanding");
    };

    const endRipple = () => {
      btn.querySelectorAll(".light-ripple.expanding").forEach((r) => {
        r.classList.add("fading");
        setTimeout(() => r.remove(), 400);
      });
    };

    // Mouse
    btn.addEventListener("mousedown", (e) => startRipple(e.clientX, e.clientY));
    btn.addEventListener("mouseup", endRipple);
    btn.addEventListener("mouseleave", endRipple);

    // Touch
    btn.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startRipple(t.clientX, t.clientY);
    }, { passive: true });
    btn.addEventListener("touchend", endRipple);
    btn.addEventListener("touchcancel", endRipple);
  });
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      ctx.showToast("Copiado al portapapeles ✓");
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  ctx.showToast("Copiado al portapapeles ✓");
}

function onClick(id, handler) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", handler);
  }, 10);
}

// ── WIZARD HELPERS ──

function wizardStep(prefix, step, total) {
  // Hide all steps
  for (let i = 1; i <= total; i++) {
    const el = document.getElementById(`${prefix}-step-${i}`);
    if (el) el.style.display = i === step ? "block" : "none";
  }
  // Update step dots
  const stepsContainer = document.getElementById(`${prefix}-steps`);
  if (stepsContainer) {
    stepsContainer.querySelectorAll(".wizard-step-dot").forEach((dot) => {
      const s = parseInt(dot.dataset.step);
      dot.classList.toggle("active", s === step);
      dot.classList.toggle("done", s < step);
    });
  }
}

function resetWizard(prefix, total) {
  wizardStep(prefix, 1, total);
}

function activateMission() {}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
