import { mergeClose, quantize, rgbToHex, uniqueNames, makePaletteColor, type RGB } from './colors';
import type { Grid, PaletteColor } from './types';

/** Região do gráfico dentro da imagem, em frações (0..1) da largura/altura. */
export interface CropFractions {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const FULL_IMAGE: CropFractions = { left: 0, top: 0, right: 1, bottom: 1 };

export interface SampleOptions {
  rows: number;
  cols: number;
  maxColors: number;
  /** fração central da célula usada para amostrar (evita as linhas do grid). 0.5 = metade central */
  innerFraction?: number;
  /** distância abaixo da qual duas cores são consideradas a mesma */
  mergeThreshold?: number;
}

/**
 * Lê as cores de um gráfico a partir de pixels RGBA já recortados para a área do grid.
 * Para cada célula pega a mediana dos pixels da parte central (ignorando as linhas do grid)
 * e depois agrupa em uma paleta reduzida.
 */
export function sampleGridFromRGBA(
  rgba: Uint8Array,
  width: number,
  height: number,
  opts: SampleOptions,
): { grid: Grid; palette: PaletteColor[] } {
  const { rows, cols } = opts;
  const inner = opts.innerFraction ?? 0.5;
  const samples: RGB[] = [];
  const cw = width / cols;
  const ch = height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cw;
      const cy = (r + 0.5) * ch;
      const hw = Math.max(0.5, (cw * inner) / 2);
      const hh = Math.max(0.5, (ch * inner) / 2);
      const x0 = Math.max(0, Math.floor(cx - hw));
      const x1 = Math.min(width - 1, Math.ceil(cx + hw) - 1);
      const y0 = Math.max(0, Math.floor(cy - hh));
      const y1 = Math.min(height - 1, Math.ceil(cy + hh) - 1);
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];
      for (let y = y0; y <= Math.max(y0, y1); y++) {
        for (let x = x0; x <= Math.max(x0, x1); x++) {
          const p = (y * width + x) * 4;
          const a = rgba[p + 3] / 255;
          // pixels transparentes viram branco
          rs.push(rgba[p] * a + 255 * (1 - a));
          gs.push(rgba[p + 1] * a + 255 * (1 - a));
          bs.push(rgba[p + 2] * a + 255 * (1 - a));
        }
      }
      samples.push([median(rs), median(gs), median(bs)]);
    }
  }
  const q = quantize(samples, opts.maxColors);
  const m = mergeClose(q.centers, q.labels, opts.mergeThreshold ?? 40);
  const palette = uniqueNames(m.centers.map((c) => makePaletteColor(rgbToHex(c))));
  const cells = m.labels.map((l) => palette[l].id);
  return { grid: { rows, cols, cells, done: '0'.repeat(rows * cols) }, palette: sortPaletteByUsage(palette, cells) };
}

function median(v: number[]): number {
  if (v.length === 0) return 255;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function sortPaletteByUsage(palette: PaletteColor[], cells: (string | null)[]): PaletteColor[] {
  const count = new Map<string, number>();
  for (const c of cells) if (c) count.set(c, (count.get(c) ?? 0) + 1);
  return [...palette].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
}

/** Converte frações de recorte em pixels inteiros, garantindo área mínima. */
export function cropToPixels(c: CropFractions, width: number, height: number) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const l = clamp(Math.min(c.left, c.right));
  const r = clamp(Math.max(c.left, c.right));
  const t = clamp(Math.min(c.top, c.bottom));
  const b = clamp(Math.max(c.top, c.bottom));
  const originX = Math.floor(l * width);
  const originY = Math.floor(t * height);
  return {
    originX,
    originY,
    width: Math.max(1, Math.min(width - originX, Math.round((r - l) * width))),
    height: Math.max(1, Math.min(height - originY, Math.round((b - t) * height))),
  };
}
