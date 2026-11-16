import type { CropFractions } from './sampling';

/** Parte do recorte que o dedo está arrastando. `move` desloca o recorte inteiro. */
export type CropHandle =
  | 'move'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** Menor largura/altura do recorte, em fração da imagem. */
export const MIN_CROP = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Recorte resultante de arrastar uma alça. `start` é o recorte no início do gesto e `dx`/`dy` o
 * deslocamento total do dedo desde então, em frações da largura/altura da imagem — assim o
 * resultado não acumula erro durante o arrasto. O recorte nunca sai da imagem, nunca inverte e
 * nunca fica menor que `minSize`.
 */
export function dragCrop(start: CropFractions, handle: CropHandle, dx: number, dy: number, minSize = MIN_CROP): CropFractions {
  if (handle === 'move') {
    const w = start.right - start.left;
    const h = start.bottom - start.top;
    const left = clamp(start.left + dx, 0, 1 - w);
    const top = clamp(start.top + dy, 0, 1 - h);
    return { left, top, right: left + w, bottom: top + h };
  }
  const out = { ...start };
  if (handle.includes('left')) out.left = clamp(start.left + dx, 0, Math.max(0, start.right - minSize));
  if (handle.includes('right')) out.right = clamp(start.right + dx, Math.min(1, start.left + minSize), 1);
  if (handle.includes('top')) out.top = clamp(start.top + dy, 0, Math.max(0, start.bottom - minSize));
  if (handle.includes('bottom')) out.bottom = clamp(start.bottom + dy, Math.min(1, start.top + minSize), 1);
  return out;
}

/**
 * Qual alça um toque em (x, y) pega, tudo em frações da imagem. `tolX`/`tolY` são a folga do dedo.
 * Cantos têm prioridade sobre bordas; dentro do recorte, longe das bordas, o toque move tudo;
 * fora do recorte não pega nada (a tela pode rolar).
 */
export function hitCropHandle(crop: CropFractions, x: number, y: number, tolX: number, tolY: number): CropHandle | null {
  const corners: [CropHandle, number, number][] = [
    ['top-left', crop.left, crop.top],
    ['top-right', crop.right, crop.top],
    ['bottom-left', crop.left, crop.bottom],
    ['bottom-right', crop.right, crop.bottom],
  ];
  let best: CropHandle | null = null;
  let bestD = Infinity;
  for (const [handle, cx, cy] of corners) {
    const ex = Math.abs(x - cx) / tolX;
    const ey = Math.abs(y - cy) / tolY;
    if (ex > 1 || ey > 1) continue;
    const d = ex * ex + ey * ey;
    if (d < bestD) {
      bestD = d;
      best = handle;
    }
  }
  if (best) return best;

  const inX = x >= crop.left - tolX && x <= crop.right + tolX;
  const inY = y >= crop.top - tolY && y <= crop.bottom + tolY;
  if (!inX || !inY) return null;
  const edges: [CropHandle, number][] = [
    ['left', Math.abs(x - crop.left) / tolX],
    ['right', Math.abs(x - crop.right) / tolX],
    ['top', Math.abs(y - crop.top) / tolY],
    ['bottom', Math.abs(y - crop.bottom) / tolY],
  ];
  for (const [handle, d] of edges) {
    if (d <= 1 && d < bestD) {
      bestD = d;
      best = handle;
    }
  }
  return best ?? 'move';
}
