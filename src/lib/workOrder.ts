import type { ProjectWork, StartCorner, WorkSettings } from './types';

/**
 * Sentido em que uma carreira é trabalhada, visto no gráfico.
 * Carreiras retas só usam estes dois; o C2C (diagonal) acrescentará os seus.
 */
export type RowDirection = 'ltr' | 'rtl';

export interface WorkRow {
  /** número da carreira (1 = primeira trabalhada) */
  workRow: number;
  direction: RowDirection;
  /** índice de trabalho (0-based) do primeiro ponto da carreira */
  startIndex: number;
  /** células do grid, na ordem em que são trabalhadas */
  cells: number[];
}

/**
 * Ordem de trabalho: a única coisa que a posição, o progresso e o cálculo de linha sabem sobre
 * "em que ordem os pontos são feitos". Trocar a técnica (ex.: C2C) é trocar a implementação.
 */
export interface WorkOrder {
  readonly totalRows: number;
  readonly totalStitches: number;
  /** célula do grid → posição (0-based) na ordem de trabalho */
  workIndexOf(cell: number): number;
  /** posição (0-based) na ordem de trabalho → célula do grid */
  cellAt(workIndex: number): number;
  /** carreira pelo número (1-based) */
  row(workRow: number): WorkRow;
  /** carreira que contém a célula */
  rowOf(cell: number): WorkRow;
}

export interface GridDims {
  rows: number;
  cols: number;
}

export interface WorkPrefs {
  /** ajuste global "Sou canhota" */
  leftHanded: boolean;
}

/** Destras começam embaixo à direita; canhotas, embaixo à esquerda. O desenho não é espelhado. */
export const defaultStartCorner = (leftHanded: boolean): StartCorner => (leftHanded ? 'bottom-left' : 'bottom-right');

/** Junta o que o projeto escolheu com o ajuste global do aparelho. */
export function resolveWork(work: ProjectWork, prefs: WorkPrefs): WorkSettings {
  return { startCorner: work.startCorner ?? defaultStartCorner(prefs.leftHanded), mode: work.mode };
}

/** Carreiras retas (tapestry/pixel): canto inicial + ida e volta ou sempre no mesmo sentido. */
export function straightRows({ rows, cols }: GridDims, s: WorkSettings): WorkOrder {
  const fromBottom = s.startCorner.startsWith('bottom');
  const startsRight = s.startCorner.endsWith('right');
  const total = rows * cols;

  const check = (value: number, max: number, what: string) => {
    if (!Number.isInteger(value) || value < 0 || value >= max) throw new RangeError(`${what} fora do gráfico: ${value}`);
  };
  // rowIndex: carreira 0-based na ordem de trabalho
  const isRtl = (rowIndex: number) => (s.mode === 'flat' && rowIndex % 2 === 1 ? !startsRight : startsRight);
  const gridRowOf = (rowIndex: number) => (fromBottom ? rows - 1 - rowIndex : rowIndex);

  const buildRow = (rowIndex: number): WorkRow => {
    const rtl = isRtl(rowIndex);
    const base = gridRowOf(rowIndex) * cols;
    const cells = Array.from({ length: cols }, (_, k) => base + (rtl ? cols - 1 - k : k));
    return { workRow: rowIndex + 1, direction: rtl ? 'rtl' : 'ltr', startIndex: rowIndex * cols, cells };
  };

  const order: WorkOrder = {
    totalRows: rows,
    totalStitches: total,
    workIndexOf(cell) {
      check(cell, total, 'Célula');
      const gridRow = Math.floor(cell / cols);
      const col = cell % cols;
      const rowIndex = fromBottom ? rows - 1 - gridRow : gridRow;
      return rowIndex * cols + (isRtl(rowIndex) ? cols - 1 - col : col);
    },
    cellAt(workIndex) {
      check(workIndex, total, 'Ponto');
      const rowIndex = Math.floor(workIndex / cols);
      const k = workIndex % cols;
      return gridRowOf(rowIndex) * cols + (isRtl(rowIndex) ? cols - 1 - k : k);
    },
    row(workRow) {
      check(workRow - 1, rows, 'Carreira');
      return buildRow(workRow - 1);
    },
    rowOf(cell) {
      return buildRow(Math.floor(order.workIndexOf(cell) / cols));
    },
  };
  return order;
}

/**
 * Ordem de trabalho de um projeto. É o ponto de troca de técnica: hoje sempre carreiras retas;
 * quando o projeto puder ser C2C, a escolha acontece aqui.
 */
export function workOrderFor(dims: GridDims, work: ProjectWork, prefs: WorkPrefs): WorkOrder {
  return straightRows(dims, resolveWork(work, prefs));
}
