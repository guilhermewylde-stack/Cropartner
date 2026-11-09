import type { Grid, WorkSettings } from './types';

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

/**
 * Informações de uma carreira no sentido de trabalho:
 * - workRow: número da carreira (1 = primeira carreira trabalhada)
 * - gridRow: linha correspondente no grid (0 = topo)
 * - leftToRight: sentido de trabalho dessa carreira
 */
export interface RowInfo {
  workRow: number;
  gridRow: number;
  leftToRight: boolean;
}

export function rowInfoForGridRow(g: Pick<Grid, 'rows'>, s: WorkSettings, gridRow: number): RowInfo {
  const fromBottom = s.startCorner.startsWith('bottom');
  const startsRight = s.startCorner.endsWith('right');
  const workRowIndex = fromBottom ? g.rows - 1 - gridRow : gridRow; // 0-based
  let leftToRight = !startsRight;
  if (s.mode === 'flat' && workRowIndex % 2 === 1) leftToRight = !leftToRight;
  return { workRow: workRowIndex + 1, gridRow, leftToRight };
}

export function rowInfoForWorkRow(g: Pick<Grid, 'rows'>, s: WorkSettings, workRow: number): RowInfo {
  const fromBottom = s.startCorner.startsWith('bottom');
  const gridRow = fromBottom ? g.rows - workRow : workRow - 1;
  return rowInfoForGridRow(g, s, gridRow);
}

/** Índices das células de uma linha do grid, na ordem em que são trabalhadas. */
export function rowCellsInWorkOrder(g: Pick<Grid, 'rows' | 'cols'>, s: WorkSettings, gridRow: number): number[] {
  const { leftToRight } = rowInfoForGridRow(g, s, gridRow);
  const out: number[] = [];
  for (let k = 0; k < g.cols; k++) {
    const c = leftToRight ? k : g.cols - 1 - k;
    out.push(gridRow * g.cols + c);
  }
  return out;
}

/** Sequência completa de células na ordem de trabalho (carreira 1, ponto 1 ... última carreira). */
export function workOrder(g: Pick<Grid, 'rows' | 'cols'>, s: WorkSettings): number[] {
  const out: number[] = [];
  for (let w = 1; w <= g.rows; w++) {
    out.push(...rowCellsInWorkOrder(g, s, rowInfoForWorkRow(g, s, w).gridRow));
  }
  return out;
}

/** Posição (0-based) de uma célula dentro da ordem de trabalho. */
export function workIndexOf(g: Pick<Grid, 'rows' | 'cols'>, s: WorkSettings, cell: number): number {
  const r = rowOf(g, cell);
  const c = colOf(g, cell);
  const info = rowInfoForGridRow(g, s, r);
  const inRow = info.leftToRight ? c : g.cols - 1 - c;
  return (info.workRow - 1) * g.cols + inRow;
}

export function cellAtWorkIndex(g: Pick<Grid, 'rows' | 'cols'>, s: WorkSettings, workIndex: number): number {
  const workRow = Math.floor(workIndex / g.cols) + 1;
  const inRow = workIndex % g.cols;
  const info = rowInfoForWorkRow(g, s, workRow);
  const c = info.leftToRight ? inRow : g.cols - 1 - inRow;
  return info.gridRow * g.cols + c;
}

export interface ColorRun {
  colorId: string | null;
  length: number;
}

export interface PositionInfo {
  cell: number;
  gridRow: number;
  gridCol: number;
  /** número da carreira no sentido de trabalho (1-based) */
  workRow: number;
  totalRows: number;
  leftToRight: boolean;
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
export function positionInfo(g: Grid, s: WorkSettings, cell: number): PositionInfo {
  const gridRow = rowOf(g, cell);
  const gridCol = colOf(g, cell);
  const info = rowInfoForGridRow(g, s, gridRow);
  const order = rowCellsInWorkOrder(g, s, gridRow);
  const k = order.indexOf(cell); // 0-based na carreira
  const colors = order.map((i) => g.cells[i] ?? null);

  // divide a carreira em blocos de cor contínuos
  const runs: { colorId: string | null; start: number; length: number }[] = [];
  for (let i = 0; i < colors.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.colorId === colors[i]) last.length++;
    else runs.push({ colorId: colors[i], start: i, length: 1 });
  }
  const runIdx = runs.findIndex((r) => k >= r.start && k < r.start + r.length);
  const run = runs[runIdx];

  return {
    cell,
    gridRow,
    gridCol,
    workRow: info.workRow,
    totalRows: g.rows,
    leftToRight: info.leftToRight,
    stitchInRow: k + 1,
    stitchesInRow: g.cols,
    remainingInRow: g.cols - k - 1,
    colFromLeft: gridCol + 1,
    colFromRight: g.cols - gridCol,
    colorId: run.colorId,
    runLength: run.length,
    positionInRun: k - run.start + 1,
    remainingInRun: run.start + run.length - k - 1,
    runIndex: runIdx + 1,
    runsInRow: runs.length,
    upcomingRuns: runs.slice(runIdx + 1).map((r) => ({ colorId: r.colorId, length: r.length })),
    overallStitch: (info.workRow - 1) * g.cols + k + 1,
    totalStitches: g.rows * g.cols,
  };
}

/** Descrição textual de uma carreira em blocos, ex.: "3 azul, 5 branco, 2 azul". */
export function rowRuns(g: Grid, s: WorkSettings, gridRow: number): ColorRun[] {
  const order = rowCellsInWorkOrder(g, s, gridRow);
  const runs: ColorRun[] = [];
  for (const i of order) {
    const c = g.cells[i] ?? null;
    const last = runs[runs.length - 1];
    if (last && last.colorId === c) last.length++;
    else runs.push({ colorId: c, length: 1 });
  }
  return runs;
}

/** Marca como feitas todas as células da ordem de trabalho até `cell` (inclusive). */
export function markUpTo(g: Grid, s: WorkSettings, cell: number): Grid {
  const end = workIndexOf(g, s, cell);
  const arr = g.done.split('');
  for (let w = 0; w <= end; w++) arr[cellAtWorkIndex(g, s, w)] = '1';
  for (let w = end + 1; w < g.rows * g.cols; w++) arr[cellAtWorkIndex(g, s, w)] = '0';
  return { ...g, done: arr.join('') };
}

/** Próxima célula na ordem de trabalho (ou null se acabou). */
export function nextCell(g: Grid, s: WorkSettings, cell: number | null | undefined, steps = 1): number | null {
  const start = cell == null ? -1 : workIndexOf(g, s, cell);
  const w = start + steps;
  if (w < 0) return null;
  if (w >= g.rows * g.cols) return null;
  return cellAtWorkIndex(g, s, w);
}

/** Primeira célula ainda não feita na ordem de trabalho. */
export function firstPendingCell(g: Grid, s: WorkSettings): number | null {
  for (let w = 0; w < g.rows * g.cols; w++) {
    const c = cellAtWorkIndex(g, s, w);
    if (!isDone(g, c)) return c;
  }
  return null;
}

/** Substitui todas as ocorrências de uma cor por outra (mesclar cores). */
export function replaceColor(g: Grid, fromId: string, toId: string | null): Grid {
  return { ...g, cells: g.cells.map((c) => (c === fromId ? toId : c)) };
}

/** Contagem de pontos por cor e de blocos (cada bloco = um início de fio/troca de cor). */
export function colorStats(g: Grid, s: WorkSettings): Map<string, { stitches: number; segments: number }> {
  const stats = new Map<string, { stitches: number; segments: number }>();
  for (let r = 0; r < g.rows; r++) {
    for (const run of rowRuns(g, s, r)) {
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
export function advanceTarget(g: Grid, s: WorkSettings, last: number | null | undefined, kind: AdvanceKind): number | null {
  if (kind === 'stitch') return nextCell(g, s, last);
  const start = nextCell(g, s, last); // primeiro ponto ainda não feito depois do último
  if (start == null) return null;
  const p = positionInfo(g, s, start);
  if (kind === 'color') return nextCell(g, s, start, p.remainingInRun);
  return nextCell(g, s, start, p.remainingInRow);
}

/** Células na ordem de trabalho depois de `from` (exclusivo) até `to` (inclusivo). */
export function cellsBetween(g: Grid, s: WorkSettings, from: number | null | undefined, to: number): number[] {
  const a = from == null ? 0 : workIndexOf(g, s, from) + 1;
  const b = workIndexOf(g, s, to);
  const out: number[] = [];
  for (let w = a; w <= b; w++) out.push(cellAtWorkIndex(g, s, w));
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
