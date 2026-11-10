import { defaultStartCorner, resolveWork, straightRows, workOrderFor } from '../workOrder';
import type { StartCorner, WorkMode } from '../types';

// grid 2 linhas × 3 colunas, índices row-major com a linha 0 no topo:
//   0 1 2
//   3 4 5
const dims = { rows: 2, cols: 3 };
const sequence = (startCorner: StartCorner, mode: WorkMode) => {
  const order = straightRows(dims, { startCorner, mode });
  return Array.from({ length: order.totalStitches }, (_, w) => order.cellAt(w));
};

describe('carreiras retas: 4 cantos × 2 modos', () => {
  test.each<[StartCorner, WorkMode, number[]]>([
    ['bottom-right', 'flat', [5, 4, 3, 0, 1, 2]],
    ['bottom-right', 'same-direction', [5, 4, 3, 2, 1, 0]],
    ['bottom-left', 'flat', [3, 4, 5, 2, 1, 0]],
    ['bottom-left', 'same-direction', [3, 4, 5, 0, 1, 2]],
    ['top-right', 'flat', [2, 1, 0, 3, 4, 5]],
    ['top-right', 'same-direction', [2, 1, 0, 5, 4, 3]],
    ['top-left', 'flat', [0, 1, 2, 5, 4, 3]],
    ['top-left', 'same-direction', [0, 1, 2, 3, 4, 5]],
  ])('%s, %s', (corner, mode, expected) => {
    expect(sequence(corner, mode)).toEqual(expected);
  });

  test('célula ⇄ índice de trabalho são inversos em todas as combinações', () => {
    const corners: StartCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    const modes: WorkMode[] = ['flat', 'same-direction'];
    for (const startCorner of corners) {
      for (const mode of modes) {
        const order = straightRows({ rows: 3, cols: 4 }, { startCorner, mode });
        for (let w = 0; w < order.totalStitches; w++) expect(order.workIndexOf(order.cellAt(w))).toBe(w);
      }
    }
  });
});

describe('carreiras', () => {
  const order = straightRows(dims, { startCorner: 'bottom-right', mode: 'flat' });

  test('totais', () => {
    expect(order.totalRows).toBe(2);
    expect(order.totalStitches).toBe(6);
  });

  test('carreira 1 vai da direita para a esquerda; a 2 volta', () => {
    expect(order.row(1)).toEqual({ workRow: 1, direction: 'rtl', startIndex: 0, cells: [5, 4, 3] });
    expect(order.row(2)).toEqual({ workRow: 2, direction: 'ltr', startIndex: 3, cells: [0, 1, 2] });
  });

  test('no mesmo sentido, toda carreira tem a mesma direção', () => {
    const same = straightRows(dims, { startCorner: 'bottom-right', mode: 'same-direction' });
    expect(same.row(1).direction).toBe('rtl');
    expect(same.row(2).direction).toBe('rtl');
  });

  test('carreira de uma célula', () => {
    expect(order.rowOf(4).workRow).toBe(1);
    expect(order.rowOf(0).workRow).toBe(2);
  });

  test('fora do gráfico é erro, não um valor silencioso', () => {
    expect(() => order.row(0)).toThrow(RangeError);
    expect(() => order.row(3)).toThrow(RangeError);
    expect(() => order.cellAt(6)).toThrow(RangeError);
    expect(() => order.cellAt(-1)).toThrow(RangeError);
    expect(() => order.workIndexOf(6)).toThrow(RangeError);
  });
});

describe('"Sou canhota"', () => {
  test('destra começa embaixo à direita; canhota, embaixo à esquerda', () => {
    expect(defaultStartCorner(false)).toBe('bottom-right');
    expect(defaultStartCorner(true)).toBe('bottom-left');
  });

  test('o ajuste global define o canto de projetos sem canto próprio', () => {
    expect(resolveWork({ mode: 'flat' }, { leftHanded: true })).toEqual({ startCorner: 'bottom-left', mode: 'flat' });
    expect(resolveWork({ mode: 'same-direction' }, { leftHanded: false })).toEqual({ startCorner: 'bottom-right', mode: 'same-direction' });
    expect(resolveWork({ mode: 'flat', startCorner: null }, { leftHanded: true }).startCorner).toBe('bottom-left');
  });

  test('um canto escolhido no projeto vence o ajuste global', () => {
    expect(resolveWork({ mode: 'flat', startCorner: 'top-left' }, { leftHanded: true }).startCorner).toBe('top-left');
  });

  test('canhota: carreira 1 começa embaixo à esquerda e segue para a direita', () => {
    const order = workOrderFor(dims, { mode: 'flat' }, { leftHanded: true });
    expect(order.row(1)).toMatchObject({ direction: 'ltr', cells: [3, 4, 5] });
    expect(order.row(2)).toMatchObject({ direction: 'rtl', cells: [2, 1, 0] });
  });

  test('só muda o sentido: as mesmas células, em outra ordem (não espelha o desenho)', () => {
    const right = workOrderFor(dims, { mode: 'flat' }, { leftHanded: false });
    const left = workOrderFor(dims, { mode: 'flat' }, { leftHanded: true });
    // cada carreira continua sendo a mesma linha do gráfico, só percorrida ao contrário
    for (let w = 1; w <= 2; w++) expect([...left.row(w).cells].reverse()).toEqual(right.row(w).cells);
  });
});
