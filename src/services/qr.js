/**
 * SatsParty — QR Code Generator
 *
 * Genera QR codes reales escaneables como SVG usando la librería 'qrcode'.
 */

import QRCode from "qrcode";

/**
 * Generar un SVG string de QR code real escaneable
 * @param {string} data - datos a encodear (bolt11 invoice, lightning address, etc.)
 * @param {number} size - tamaño del SVG en px
 * @returns {string} SVG markup
 */
export function generateQRSvg(data, size = 200) {
  if (!data) {
    console.warn("[QR] generateQRSvg called with empty data");
    return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.8rem;">Sin datos</div>`;
  }

  // QRCode.create genera la matriz de módulos sincrónicamente
  try {
    const qr = QRCode.create(data, {
      errorCorrectionLevel: "M",
    });

    const modules = qr.modules;
    const moduleCount = modules.size;
    const cellSize = size / (moduleCount + 2); // +2 para quiet zone
    const offset = cellSize; // 1 cell quiet zone

    let rects = "";
    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (modules.get(x, y)) {
          rects += `<rect x="${(offset + x * cellSize).toFixed(2)}" y="${(offset + y * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#000"/>`;
        }
      }
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="#FFF" rx="8"/>
      ${rects}
    </svg>`;
  } catch (err) {
    console.error("[QR] Error generating QR:", err);
    return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;color:var(--orange);font-size:0.7rem;text-align:center;">Error generando QR</div>`;
  }
}

/**
 * Generar QR como data URL (PNG) — async
 * @param {string} data - datos a encodear
 * @param {number} size - tamaño en px
 * @returns {Promise<string>} data URL base64
 */
export async function generateQRDataUrl(data, size = 200) {
  if (!data) return "";
  return QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Renderizar QR en un contenedor HTML
 * @param {HTMLElement} container - elemento donde poner el QR
 * @param {string} data - datos a encodear
 * @param {number} size - tamaño en px
 */
export function renderQR(container, data, size = 200) {
  container.innerHTML = generateQRSvg(data, size);
}
