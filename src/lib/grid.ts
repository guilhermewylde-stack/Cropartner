import type { Grid } from './types';
import type { RowDirection, WorkOrder, WorkRow } from './workOrder';

export const idx = (g: Pick<Grid, 'cols'>, row: number, col: number) => row * g.cols + col;
export const rowOf = (g: Pick<Grid, 'cols'>, i: number) => Math.floor(i / g.cols);
export const colOf = (g: Pick<Grid, 'cols'>, i: number) => i % g.cols;

export function createGrid(rows: number, cols: number, fill: string | null = null): Grid {
  const n = rows * cols;
  return { rows, cols, cells: new Array(n).fill(fill), done: '0'.repeat(n) };
}

/** Redimensiona o grid mantendo o conteúdo ancorado no canto superior esquerdo. */
export function resizeGrid(g: Grid, rows: number, cols: number): Grid {
  const out = createGrid(rows, cols);
  const done = out.done.split('');
  for (let r = 0; r < Math.min(rows, g.rows); r++) {
    for (let c = 0; c < Math.min(cols, g.cols); c++) {
      out.cells[idx(out, r, c)] = g.cells[idx(g, r, c)];
      done[idx(out, r, c)] = g.done[idx(g, r, c)];
    }
  }
  out.done = done.join('');
  return out;
}

export const isDone = (g: Grid, i: number) => g.done.charCodeAt(i) === 49; // '1'

export function setDone(g: Grid, indices: number[], value: boolean): Grid {
  const arr = g.done.split('');
  const ch = value ? '1' : '0';
  for (const i of indices) arr[i] = ch;
  return { ...g, done: arr.join('') };
}

export function countDone(g: Grid): number {
  let n = 0;
  for (let i = 0; i < g.done.length; i++) if (g.done.charCodeAt(i) === 49) n++;
  return n;
}

export interface ColorRun {
  colorId: string | null;
  length: number;
}

interface PlacedRun extends ColorRun {
  /** posição (0-based) do primeiro ponto do bloco dentro da carreira */
  start: number;
}

/** Divide uma carreira em blocos de cor contínuos, no sentido de trabalho. */
function placedRuns(g: Grid, row: WorkRow): PlacedRun[] {
  const runs: PlacedRun[] = [];
  row.cells.forEach((cell, k) => {
    const colorId = g.cells[cell] ?? null;
    const last = runs[runs.length - 1];
    if (last && last.colorId === colorId) last.length++;
    else runs.push({ colorId, start: k, length: 1 });
  });
  return runs;
}

/** Blocos de cor de uma carreira, ex.: "3 azul, 5 branco, 2 azul". */
export function rowRuns(g: Grid, row: WorkRow): ColorRun[] {
  return placedRuns(g, row).map(({ colorId, length }) => ({ colorId, length }));
}

export interface PositionInfo {
  cell: number;
  gridRow: number;
  gridCol: number;
  /** número da carreira no sentido de trabalho (1-based) */
  workRow: number;
  totalRows: number;
  direction: RowDirection;
  /** número do ponto dentro da carreira, contado a partir do início da carreira (1-based) */
  stitchInRow: number;
  stitchesInRow: number;
  remainingInRow: number;
  /** coluna contada da esquerda / da direita do gráfico (1-based) */
  colFromLeft: number;
  colFromRight: number;
  /** bloco de cor contínuo que contém a célula (no sentido de trabalho) */
  colorId: string | null;
  runLength: number;
  positionInRun: number; // 1-based
  remainingInRun: number; // pontos após este, na mesma cor
  /** índice do bloco na carreira (1-based) e total de blocos */
  runIndex: number;
  runsInRow: number;
  /** próximos blocos de cor da carreira (após o atual) */
  upcomingRuns: ColorRun[];
  /** ponto global na ordem de trabalho (1-based) */
  overallStitch: number;
  totalStitches: number;
}

/** Calcula onde a célula está em relação ao grid, para não precisar contar pontos. */
export function positionInfo(g: Grid, order: WorkOrder, cell: number): PositionInfo {
  const gridRow = rowOf(g, cell);
  const gridCol = colOf(g, cell);
  const row = order.rowOf(cell);
  const workIndex = order.workIndexOf(cell);
  const k = workIndex - row.startIndex; // 0-based na carreira
  const runs = placedRuns(g, row);
  const runIdx = runs.findIndex((r) => k >= r.start && k < r.start + r.length);
  const run = runs[runIdx];

  return {
    cell,
    gridRow,
    gridCol,
    workRow: row.workRow,
    totalRows: order.totalRows,
    direction: row.direction,
    stitchInRow: k + 1,
    stitchesInRow: row.cells.length,
    remainingInRow: row.cells.length - k - 1,
    colFromLeft: gridCol + 1,
    colFromRight: g.cols - gridCol,
    colorId: run.colorId,
    runLength: run.length,
    positionInRun: k - run.start + 1,
    remainingInRun: run.start + run.length - k - 1,
    runIndex: runIdx + 1,
    runsInRow: runs.length,
    upcomingRuns: runs.slice(runIdx + 1).map((r) => ({ colorId: r.colorId, length: r.length })),
    overallStitch: workIndex + 1,
    totalStitches: order.totalStitches,
  };
}

/** Marca como feitas todas as células da ordem de trabalho até `cell` (inclusive) e desmarca as seguintes. */
export function markUpTo(g: Grid, order: WorkOrder, cell: number): Grid {
  const end = order.workIndexOf(cell);
  const arr = g.done.split('');
  for (let w = 0; w < order.totalStitches; w++) arr[order.cellAt(w)] = w <= end ? '1' : '0';
  return { ...g, done: arr.join('') };
}

/** Próxima célula na ordem de trabalho (ou null se acabou). */
export function nextCell(order: WorkOrder, cell: number | null | undefined, steps = 1): number | null {
  const w = (cell == null ? -1 : order.workIndexOf(cell)) + steps;
  return w < 0 || w >= order.totalStitches ? null : order.cellAt(w);
}

/** Primeira célula ainda não feita na ordem de trabalho. */
export function firstPendingCell(g: Grid, order: WorkOrder): number | null {
  for (let w = 0; w < order.totalStitches; w++) {
    const c = order.cellAt(w);
    if (!isDone(g, c)) return c;
  }
  return null;
}

/** Substitui todas as ocorrências de uma cor por outra (mesclar cores). */
export function replaceColor(g: Grid, fromId: string, toId: string | null): Grid {
  return { ...g, cells: g.cells.map((c) => (c === fromId ? toId : c)) };
}

/** Contagem de pontos por cor e de blocos (cada bloco = um início de fio/troca de cor). */
export function colorStats(g: Grid, order: WorkOrder): Map<string, { stitches: number; segments: number }> {
  const stats = new Map<string, { stitches: number; segments: number }>();
  for (let w = 1; w <= order.totalRows; w++) {
    for (const run of rowRuns(g, order.row(w))) {
      if (run.colorId == null) continue;
      const st = stats.get(run.colorId) ?? { stitches: 0, segments: 0 };
      st.stitches += run.length;
      st.segments += 1;
      stats.set(run.colorId, st);
    }
  }
  return stats;
}

export type AdvanceKind = 'stitch' | 'color' | 'row';

/**
 * Para onde avançar a partir da última célula feita:
 * - stitch: próximo ponto
 * - color: fim do bloco de cor atual (ou do próximo bloco, se já está no fim)
 * - row: fim da carreira atual (ou da próxima, se já está no fim)
 */
export function advanceTarget(g: Grid, order: WorkOrder, last: number | null | undefined, kind: AdvanceKind): number | null {
  const start = nextCell(order, last); // primeiro ponto ainda não feito depois do último
  if (start == null || kind === 'stitch') return start;
  const p = positionInfo(g, order, start);
  return nextCell(order, start, kind === 'color' ? p.remainingInRun : p.remainingInRow);
}

/** Células na ordem de trabalho depois de `from` (exclusivo) até `to` (inclusivo). */
export function cellsBetween(order: WorkOrder, from: number | null | undefined, to: number): number[] {
  const a = from == null ? 0 : order.workIndexOf(from) + 1;
  const b = order.workIndexOf(to);
  const out: number[] = [];
  for (let w = a; w <= b; w++) out.push(order.cellAt(w));
  return out;
}

/** Balde de tinta: pinta a região contínua (4 vizinhos) da mesma cor. */
export function floodFill(g: Grid, start: number, colorId: string | null): Grid {
  const target = g.cells[start];
  if (target === colorId) return g;
  const cells = [...g.cells];
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    if (cells[i] !== target) continue;
    cells[i] = colorId;
    const r = rowOf(g, i);
    const c = colOf(g, i);
    if (r > 0) stack.push(i - g.cols);
    if (r < g.rows - 1) stack.push(i + g.cols);
    if (c > 0) stack.push(i - 1);
    if (c < g.cols - 1) stack.push(i + 1);
  }
  return { ...g, cells };
}
