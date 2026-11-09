import type { PaletteColor } from './types';

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  return rgbToHex(hexToRgb(hex));
}

/** Distância perceptual aproximada ("redmean"), barata e suficiente para agrupar cores de gráficos. */
export function colorDistance(a: RGB, b: RGB): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Cor do texto (preto/branco) legível sobre um fundo. */
export function textColorOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1E1E1E' : '#FFFFFF';
}

/**
 * Agrupa uma lista de cores amostradas em no máximo `maxColors` cores (k-means simples,
 * inicializado por "farthest point"). Retorna os centróides e o índice do grupo de cada amostra.
 */
export function quantize(samples: RGB[], maxColors: number, iterations = 12): { centers: RGB[]; labels: number[] } {
  if (samples.length === 0) return { centers: [], labels: [] };
  const k = Math.max(1, Math.min(maxColors, samples.length));
  const centers: RGB[] = [samples[0]];
  const minDist = samples.map((s) => colorDistance(s, centers[0]));
  while (centers.length < k) {
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < samples.length; i++) {
      if (minDist[i] > bestD) {
        bestD = minDist[i];
        best = i;
      }
    }
    if (bestD <= 0) break; // menos cores distintas que k
    centers.push(samples[best]);
    for (let i = 0; i < samples.length; i++) {
      minDist[i] = Math.min(minDist[i], colorDistance(samples[i], samples[best]));
    }
  }
  const labels = new Array<number>(samples.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let i = 0; i < samples.length; i++) {
      let bi = 0;
      let bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = colorDistance(samples[i], centers[c]);
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      if (labels[i] !== bi) {
        labels[i] = bi;
        changed = true;
      }
    }
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i++) {
      const s = sums[labels[i]];
      s[0] += samples[i][0];
      s[1] += samples[i][1];
      s[2] += samples[i][2];
      s[3]++;
    }
    for (let c = 0; c < centers.length; c++) {
      if (sums[c][3] > 0) centers[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    }
    if (!changed && it > 0) break;
  }
  return { centers, labels };
}

/** Une centróides muito próximos (diferença imperceptível no gráfico). */
export function mergeClose(centers: RGB[], labels: number[], threshold = 40): { centers: RGB[]; labels: number[] } {
  const map = centers.map((_, i) => i);
  for (let i = 0; i < centers.length; i++) {
    if (map[i] !== i) continue;
    for (let j = i + 1; j < centers.length; j++) {
      if (map[j] === j && colorDistance(centers[i], centers[j]) < threshold) map[j] = i;
    }
  }
  const kept = [...new Set(map)];
  const renum = new Map(kept.map((old, n) => [old, n]));
  return { centers: kept.map((i) => centers[i]), labels: labels.map((l) => renum.get(map[l])!) };
}

const NAMED: [string, RGB][] = [
  ['Branco', [255, 255, 255]],
  ['Cru', [240, 230, 210]],
  ['Bege', [215, 195, 160]],
  ['Preto', [20, 20, 20]],
  ['Cinza', [128, 128, 128]],
  ['Cinza claro', [200, 200, 200]],
  ['Vermelho', [210, 30, 40]],
  ['Vinho', [120, 20, 40]],
  ['Rosa', [240, 150, 180]],
  ['Pink', [230, 40, 130]],
  ['Laranja', [245, 140, 30]],
  ['Amarelo', [250, 215, 40]],
  ['Mostarda', [210, 165, 40]],
  ['Verde', [50, 150, 60]],
  ['Verde claro', [150, 210, 120]],
  ['Verde musgo', [90, 110, 50]],
  ['Azul', [40, 90, 200]],
  ['Azul claro', [140, 190, 235]],
  ['Azul marinho', [20, 35, 90]],
  ['Turquesa', [40, 190, 190]],
  ['Roxo', [120, 50, 160]],
  ['Lilás', [190, 160, 220]],
  ['Marrom', [110, 70, 40]],
  ['Caramelo', [180, 110, 50]],
];

/** Nome aproximado em português para uma cor. */
export function colorName(hex: string): string {
  const rgb = hexToRgb(hex);
  let best = NAMED[0];
  let bd = Infinity;
  for (const n of NAMED) {
    const d = colorDistance(rgb, n[1]);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best[0];
}

export const SWATCHES: string[] = NAMED.map(([, rgb]) => rgbToHex(rgb));

let counter = 0;
export function newColorId(): string {
  counter = (counter + 1) % 1e6;
  return `c${Date.now().toString(36)}${counter.toString(36)}`;
}

export function makePaletteColor(hex: string, name?: string): PaletteColor {
  const h = normalizeHex(hex);
  return { id: newColorId(), hex: h, name: name ?? colorName(h) };
}

/** Garante nomes únicos ("Azul", "Azul 2"...). */
export function uniqueNames(colors: PaletteColor[]): PaletteColor[] {
  const seen = new Map<string, number>();
  return colors.map((c) => {
    const n = (seen.get(c.name) ?? 0) + 1;
    seen.set(c.name, n);
    return n === 1 ? c : { ...c, name: `${c.name} ${n}` };
  });
}
