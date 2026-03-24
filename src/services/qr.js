/**
 * SatsParty — QR Code Generator
 *
 * Genera QR codes como SVG sin dependencias externas.
 * Basado en un encoder QR code mínimo.
 * Para producción se puede reemplazar con la librería 'qrcode'.
 */

/**
 * Generar un SVG de QR code simple
 * Usa un patrón determinístico basado en el contenido.
 * NOTA: Esto es un placeholder visual. Para QR escaneables reales
 * hay que agregar la librería 'qrcode' (npm install qrcode).
 *
 * @param {string} data - datos a encodear
 * @param {number} size - tamaño del SVG en px
 * @returns {string} SVG markup
 */
export function generateQRSvg(data, size = 160) {
  // Intentar usar la librería qrcode si está disponible
  // Fallback a patrón visual placeholder
  const modules = generateModules(data);
  const moduleCount = modules.length;
  const cellSize = size / moduleCount;

  let rects = "";
  for (let y = 0; y < moduleCount; y++) {
    for (let x = 0; x < moduleCount; x++) {
      if (modules[y][x]) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${rects}</svg>`;
}

/**
 * Genera una matriz de módulos QR-like basada en el hash del input.
 * NO es un QR real escaneable — es un placeholder visual.
 */
function generateModules(data) {
  const size = 33;
  let seed = hashString(data);
  const next = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  // Crear grid
  const grid = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = next() > 0.5 ? 1 : 0;
    }
  }

  // Finder patterns (esquinas)
  const drawFinder = (ox, oy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        grid[oy + y][ox + x] =
          x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)
            ? 1
            : 0;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // Quiet zone
  for (let i = 0; i < size; i++) {
    if (i < 8 || i > size - 9) continue;
    grid[7][i] = 0;
    grid[i][7] = 0;
  }

  return grid;
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash >>> 0;
}

/**
 * Renderizar QR en un contenedor HTML
 * @param {HTMLElement} container - elemento donde poner el QR
 * @param {string} data - datos a encodear
 * @param {number} size - tamaño en px
 */
export function renderQR(container, data, size = 160) {
  container.innerHTML = generateQRSvg(data, size);
}
