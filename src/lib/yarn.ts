import { colorStats } from './grid';
import type { Grid, PaletteColor, StitchType, YarnSettings } from './types';
import type { WorkOrder } from './workOrder';

/**
 * Consumo médio de fio por ponto (cm), para fio médio (~4–5 mm de agulha).
 * São estimativas iniciais: o ideal é calibrar (fazer 10 pontos, medir o fio gasto e dividir por 10).
 */
export const DEFAULT_STITCHES: StitchType[] = [
  { id: 'corr', name: 'Correntinha (corr)', cmPerStitch: 1.5 },
  { id: 'pbx', name: 'Ponto baixíssimo (pbx)', cmPerStitch: 2 },
  { id: 'pb', name: 'Ponto baixo (pb)', cmPerStitch: 4 },
  { id: 'mpa', name: 'Meio ponto alto (mpa)', cmPerStitch: 5.5 },
  { id: 'pa', name: 'Ponto alto (pa)', cmPerStitch: 7 },
  { id: 'pad', name: 'Ponto alto duplo (pad)', cmPerStitch: 9.5 },
];

export const DEFAULT_YARN: YarnSettings = {
  gridStitchId: 'pb',
  stitchTypes: DEFAULT_STITCHES,
  wastePercent: 15,
  tailPerColorChangeCm: 15,
  metersPerSkein: 100,
  gramsPerSkein: 50,
};

export interface ColorYarnEstimate {
  colorId: string;
  name: string;
  hex: string;
  stitches: number;
  segments: number;
  meters: number;
  skeins: number;
  grams?: number;
}

export interface YarnEstimate {
  perColor: ColorYarnEstimate[];
  totalMeters: number;
  totalSkeins: number;
  totalGrams?: number;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

function finish(meters: number, y: YarnSettings) {
  const skeins = y.metersPerSkein > 0 ? meters / y.metersPerSkein : 0;
  return {
    meters: round2(meters),
    skeins: Math.ceil(skeins * 100) / 100,
    grams: y.gramsPerSkein ? round1(skeins * y.gramsPerSkein) : undefined,
  };
}

/** Estimativa de fio por cor, a partir do grid (1 célula = 1 ponto do tipo escolhido). */
export function estimateFromGrid(g: Grid, palette: PaletteColor[], order: WorkOrder, y: YarnSettings): YarnEstimate {
  const st = y.stitchTypes.find((s) => s.id === y.gridStitchId) ?? y.stitchTypes[0];
  const stats = colorStats(g, order);
  const perColor: ColorYarnEstimate[] = [];
  for (const color of palette) {
    const s = stats.get(color.id);
    if (!s) continue;
    const cm = s.stitches * st.cmPerStitch * (1 + y.wastePercent / 100) + s.segments * y.tailPerColorChangeCm;
    perColor.push({ colorId: color.id, name: color.name, hex: color.hex, stitches: s.stitches, segments: s.segments, ...finish(cm / 100, y) });
  }
  perColor.sort((a, b) => b.meters - a.meters);
  const totalMeters = perColor.reduce((a, c) => a + c.meters, 0);
  return { perColor, ...totalsOf(totalMeters, y) };
}

function totalsOf(totalMeters: number, y: YarnSettings) {
  const f = finish(totalMeters, y);
  return { totalMeters: f.meters, totalSkeins: f.skeins, totalGrams: f.grams };
}

/** Calibração: o usuário faz N pontos e mede o fio gasto (cm). */
export const calibrate = (stitches: number, cmUsed: number) => (stitches > 0 ? round1(cmUsed / stitches) : 0);
