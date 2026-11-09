import { colorStats } from './grid';
import type { Grid, PaletteColor, RecipeStitchCount, StitchType, WorkSettings, YarnSettings } from './types';

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
export function estimateFromGrid(g: Grid, palette: PaletteColor[], work: WorkSettings, y: YarnSettings): YarnEstimate {
  const st = y.stitchTypes.find((s) => s.id === y.gridStitchId) ?? y.stitchTypes[0];
  const stats = colorStats(g, work);
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

/** Associa o nome do ponto escrito na receita a um tipo de ponto conhecido. */
export function matchStitch(name: string, types: StitchType[]): StitchType | undefined {
  const n = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  const aliases: Record<string, string[]> = {
    corr: ['corr', 'correntinha', 'corrente', 'ch', 'chain', 'cad', 'cadeneta'],
    pbx: ['pbx', 'baixissimo', 'slip', 'sl st', 'slst', 'ss', 'pd', 'deslizado'],
    pb: ['pb', 'ponto baixo', 'sc', 'single crochet', 'mp', 'medio punto'],
    mpa: ['mpa', 'meio ponto alto', 'hdc', 'half double', 'mpa'],
    pa: ['pa', 'ponto alto', 'dc', 'double crochet', 'vareta'],
    pad: ['pad', 'ponto alto duplo', 'tr', 'treble', 'triple', 'pa duplo'],
  };
  // abreviação exata primeiro
  for (const t of types) if (t.id === n || t.name.toLowerCase().includes(`(${n})`)) return t;
  // procura pelos aliases mais longos primeiro para "ponto alto duplo" não cair em "ponto alto"
  const entries = Object.entries(aliases).flatMap(([id, list]) => list.map((a) => [id, a] as const));
  entries.sort((a, b) => b[1].length - a[1].length);
  for (const [id, a] of entries) {
    const re = new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?([^a-z]|$)`);
    if (re.test(n)) return types.find((t) => t.id === id);
  }
  return undefined;
}

export interface RecipeYarnLine {
  stitch: string;
  count: number;
  matched?: StitchType;
  meters: number;
}

/** Estimativa total de fio a partir das contagens de pontos extraídas da receita. */
export function estimateFromRecipe(counts: RecipeStitchCount[], y: YarnSettings) {
  const fallback = y.stitchTypes.find((s) => s.id === y.gridStitchId) ?? y.stitchTypes[0];
  const lines: RecipeYarnLine[] = counts.map((c) => {
    const matched = matchStitch(c.stitch, y.stitchTypes);
    const cm = c.count * (matched ?? fallback).cmPerStitch * (1 + y.wastePercent / 100);
    return { stitch: c.stitch, count: c.count, matched, meters: round2(cm / 100) };
  });
  const totalMeters = lines.reduce((a, l) => a + l.meters, 0);
  return { lines, ...totalsOf(totalMeters, y) };
}

/** Calibração: o usuário faz N pontos e mede o fio gasto (cm). */
export const calibrate = (stitches: number, cmUsed: number) => (stitches > 0 ? round1(cmUsed / stitches) : 0);
