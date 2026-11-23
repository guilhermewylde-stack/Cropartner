import { colorStats, rowRuns } from './grid';
import type { Grid, PaletteColor, StitchType, Yarn, YarnSettings, YarnStock } from './types';
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
  defaultYarnId: null,
  colorYarns: {},
  stock: {},
};

export interface ColorYarnEstimate {
  colorId: string;
  name: string;
  hex: string;
  stitches: number;
  segments: number;
  meters: number;
  /** linha usada pela cor (a própria ou a do projeto); sem ela não há novelos nem gramas */
  yarn?: Yarn;
  /** novelos necessários (fração) */
  skeins?: number;
  /** novelos inteiros a comprar */
  skeinsToBuy?: number;
  grams?: number;
}

export interface YarnEstimate {
  /** da cor mais usada para a menos usada */
  perColor: ColorYarnEstimate[];
  totalMeters: number;
  /** soma dos novelos a comprar de cada cor (um novelo não serve a duas cores) */
  totalSkeinsToBuy: number;
  /** soma das gramas das cores cuja linha tem peso cadastrado */
  totalGrams?: number;
  /** cores sem linha associada (nem própria nem do projeto) */
  colorsWithoutYarn: number;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
/** Novelos inteiros para cobrir `x` novelos: 1,0000001 (erro de conta) é 1, mas 0,0002 de um novelo grande ainda é 1. */
const wholeSkeins = (x: number) => (x > 0 ? Math.max(1, Math.ceil(x - 1e-6)) : 0);

const findYarn = (yarns: Yarn[], id: string | null | undefined) => (id ? yarns.find((y) => y.id === id) : undefined);

/** Linha de uma cor: a associada à cor ou, se não houver (ou foi excluída do cadastro), a do projeto. */
export function yarnForColor(y: YarnSettings, yarns: Yarn[], colorId: string): Yarn | undefined {
  return findYarn(yarns, y.colorYarns?.[colorId]) ?? findYarn(yarns, y.defaultYarnId);
}

/** Associa uma linha à cor; `null` volta a usar a linha do projeto. */
export function setColorYarn(y: YarnSettings, colorId: string, yarnId: string | null): YarnSettings {
  const colorYarns = { ...y.colorYarns };
  if (yarnId) colorYarns[colorId] = yarnId;
  else delete colorYarns[colorId];
  return { ...y, colorYarns };
}

type ColorCounts = Map<string, { stitches: number; segments: number }>;

/** Lista de compras: metros por cor (pontos × cm/ponto × (1 + perda) + ponta por bloco) e novelos/gramas pela linha da cor. */
export function estimateFromGrid(g: Grid, palette: PaletteColor[], order: WorkOrder, y: YarnSettings, yarns: Yarn[] = []): YarnEstimate {
  return estimateFromCounts(colorStats(g, order), palette, y, yarns);
}

/**
 * Quanto falta: o mesmo cálculo, só com os pontos ainda não feitos (`done` = pontos feitos na ordem
 * de trabalho). A ponta conta só para os blocos ainda não começados. As cores já terminadas ficam
 * na lista com zero.
 */
export function estimateRemaining(g: Grid, palette: PaletteColor[], order: WorkOrder, y: YarnSettings, yarns: Yarn[], done: number): YarnEstimate {
  const counts: ColorCounts = new Map();
  for (let w = 1; w <= order.totalRows; w++) {
    const row = order.row(w);
    let start = row.startIndex;
    for (const run of rowRuns(g, row)) {
      if (run.colorId != null) {
        const c = counts.get(run.colorId) ?? { stitches: 0, segments: 0 };
        c.stitches += Math.max(0, Math.min(run.length, start + run.length - done));
        if (start >= done) c.segments += 1;
        counts.set(run.colorId, c);
      }
      start += run.length;
    }
  }
  return estimateFromCounts(counts, palette, y, yarns);
}

function estimateFromCounts(counts: ColorCounts, palette: PaletteColor[], y: YarnSettings, yarns: Yarn[]): YarnEstimate {
  const st = y.stitchTypes.find((s) => s.id === y.gridStitchId) ?? y.stitchTypes[0];
  const cmPerStitch = st?.cmPerStitch ?? 0;
  const perColor: ColorYarnEstimate[] = [];
  for (const color of palette) {
    const s = counts.get(color.id);
    if (!s) continue;
    const cm = s.stitches * cmPerStitch * (1 + y.wastePercent / 100) + s.segments * y.tailPerColorChangeCm;
    const meters = round2(cm / 100);
    const yarn = yarnForColor(y, yarns, color.id);
    const entry: ColorYarnEstimate = { colorId: color.id, name: color.name, hex: color.hex, stitches: s.stitches, segments: s.segments, meters };
    if (yarn && yarn.metersPerSkein > 0) {
      const exact = meters / yarn.metersPerSkein;
      entry.yarn = yarn;
      entry.skeins = round2(exact);
      entry.skeinsToBuy = wholeSkeins(exact);
      if (yarn.gramsPerSkein) entry.grams = round1(exact * yarn.gramsPerSkein);
    }
    perColor.push(entry);
  }
  perColor.sort((a, b) => b.meters - a.meters);
  const withGrams = perColor.filter((c) => c.grams != null);
  return {
    perColor,
    totalMeters: round2(perColor.reduce((t, c) => t + c.meters, 0)),
    totalSkeinsToBuy: perColor.reduce((t, c) => t + (c.skeinsToBuy ?? 0), 0),
    totalGrams: withGrams.length ? round1(withGrams.reduce((t, c) => t + c.grams!, 0)) : undefined,
    colorsWithoutYarn: perColor.filter((c) => !c.yarn).length,
  };
}

// ── Estoque: vai dar / vai faltar ────────────────────────────────────────────────────────────────

export type StockVerdict =
  | { status: 'unknown'; reason: 'no-stock' | 'no-yarn' }
  | { status: 'enough'; haveMeters: number; leftoverMeters: number }
  | { status: 'short'; haveMeters: number; missingMeters: number; skeinsToBuy?: number };

/**
 * Compara o que falta de uma cor com o estoque dela. Estoque em novelos precisa da linha da cor para
 * virar metros; sem estoque (ou sem como converter) não há veredito.
 */
export function stockVerdict(need: Pick<ColorYarnEstimate, 'meters' | 'yarn'>, stock: YarnStock | undefined): StockVerdict {
  if (!stock) return { status: 'unknown', reason: 'no-stock' };
  const perSkein = need.yarn?.metersPerSkein;
  if (stock.unit === 'skeins' && !(perSkein && perSkein > 0)) return { status: 'unknown', reason: 'no-yarn' };
  const haveMeters = round2(stock.unit === 'skeins' ? stock.amount * perSkein! : stock.amount);
  const diff = round2(haveMeters - need.meters);
  if (diff >= 0) return { status: 'enough', haveMeters, leftoverMeters: diff };
  const missingMeters = -diff;
  return perSkein && perSkein > 0
    ? { status: 'short', haveMeters, missingMeters, skeinsToBuy: wholeSkeins(missingMeters / perSkein) }
    : { status: 'short', haveMeters, missingMeters };
}

/** Informa o estoque de uma cor; `null` apaga (volta a "não informado"). */
export function setStock(y: YarnSettings, colorId: string, stock: YarnStock | null): YarnSettings {
  const next = { ...y.stock };
  if (stock) next[colorId] = stock;
  else delete next[colorId];
  return { ...y, stock: next };
}

/** Calibração: a usuária faz N pontos e mede o fio gasto (cm). */
export const calibrate = (stitches: number, cmUsed: number) => (stitches > 0 ? round1(cmUsed / stitches) : 0);

/** Aplica a calibração ao consumo de um ponto. Medida inválida (ou ponto desconhecido) não muda nada. */
export function applyCalibration(y: YarnSettings, stitchId: string, stitches: number, cmUsed: number): YarnSettings {
  const cm = calibrate(stitches, cmUsed);
  if (!(cm > 0) || !y.stitchTypes.some((s) => s.id === stitchId)) return y;
  return { ...y, stitchTypes: y.stitchTypes.map((s) => (s.id === stitchId ? { ...s, cmPerStitch: cm } : s)) };
}

// ── Linhas cadastradas ──────────────────────────────────────────────────────────────────────────

export interface YarnInput {
  name: string;
  metersPerSkein: number;
  gramsPerSkein?: number;
}

/** Mensagem pronta para a usuária, ou null se a linha pode ser salva. */
export function yarnInputError(input: YarnInput): string | null {
  if (!input.name.trim()) return 'Dê um nome para a linha.';
  if (!(input.metersPerSkein > 0)) return 'Informe quantos metros tem um novelo.';
  if (input.gramsPerSkein != null && !(input.gramsPerSkein >= 0)) return 'As gramas por novelo não podem ser negativas.';
  return null;
}

const cleanYarn = (id: string, input: YarnInput): Yarn => ({
  id,
  name: input.name.trim(),
  metersPerSkein: input.metersPerSkein,
  ...(input.gramsPerSkein ? { gramsPerSkein: input.gramsPerSkein } : {}),
});

let counter = 0;
const newYarnId = () => {
  counter = (counter + 1) % 1e6;
  return `y${Date.now().toString(36)}${counter.toString(36)}`;
};

export function addYarn(yarns: Yarn[], input: YarnInput): { yarns: Yarn[]; yarn: Yarn } {
  const yarn = cleanYarn(newYarnId(), input);
  return { yarns: [...yarns, yarn], yarn };
}

export const updateYarn = (yarns: Yarn[], id: string, input: YarnInput): Yarn[] => yarns.map((y) => (y.id === id ? cleanYarn(id, input) : y));

export const removeYarn = (yarns: Yarn[], id: string): Yarn[] => yarns.filter((y) => y.id !== id);
