import { positionInfo } from './grid';
import type { Grid } from './types';
import type { WorkOrder } from './workOrder';

/**
 * Progresso = quantos pontos já foram feitos, contados na ordem de trabalho (0 = nada feito).
 * Guardar a contagem, e não as células, mantém o progresso coerente se o sentido de trabalho mudar.
 */
export type Progress = number;

export type AdvanceKind = 'stitch' | 'color' | 'row';

/** Traz um progresso salvo para dentro do gráfico (grid redimensionado, dado corrompido...). */
export function clampProgress(order: WorkOrder, done: Progress): Progress {
  if (!Number.isFinite(done)) return 0;
  return Math.max(0, Math.min(order.totalStitches, Math.floor(done)));
}

/** "Feito até aqui": o progresso depois de tocar numa célula. */
export const markedThrough = (order: WorkOrder, cell: number): Progress => order.workIndexOf(cell) + 1;

export const isFinished = (order: WorkOrder, done: Progress) => done >= order.totalStitches;

export const isCellDone = (order: WorkOrder, done: Progress, cell: number) => order.workIndexOf(cell) < done;

/** Célula do último ponto feito (null se nada foi feito). */
export const lastDoneCell = (order: WorkOrder, done: Progress): number | null => (done > 0 ? order.cellAt(done - 1) : null);

/** Célula do próximo ponto a fazer (null se o gráfico acabou). */
export const nextCellToWork = (order: WorkOrder, done: Progress): number | null => (isFinished(order, done) ? null : order.cellAt(done));

/**
 * Avança a partir do próximo ponto a fazer:
 * - stitch: um ponto
 * - color: até o fim do bloco de cor (se o bloco atual já acabou, faz o seguinte inteiro)
 * - row: até o fim da carreira (se a carreira já acabou, faz a seguinte inteira)
 * No fim do gráfico, devolve o mesmo progresso.
 */
export function advance(g: Grid, order: WorkOrder, done: Progress, kind: AdvanceKind): Progress {
  const next = nextCellToWork(order, done);
  if (next == null) return done;
  if (kind === 'stitch') return done + 1;
  const p = positionInfo(g, order, next);
  return done + 1 + (kind === 'color' ? p.remainingInRun : p.remainingInRow);
}

/** Desfaz um ponto. */
export const stepBack = (done: Progress): Progress => Math.max(0, done - 1);
