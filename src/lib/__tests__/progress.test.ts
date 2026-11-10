import { advance, clampProgress, isCellDone, isFinished, lastDoneCell, markedThrough, nextCellToWork, stepBack } from '../progress';
import { createGrid, idx } from '../grid';
import { straightRows, workOrderFor } from '../workOrder';
import type { Grid } from '../types';

function gridFrom(rows: string[]): Grid {
  const g = createGrid(rows.length, rows[0].length);
  rows.forEach((line, r) => line.split('').forEach((ch, c) => (g.cells[idx(g, r, c)] = ch === '.' ? null : ch)));
  return g;
}

// destra, ida e volta. Carreira 1 (de baixo, da direita p/ a esquerda): A A B B B
// carreira 2 (da esquerda p/ a direita): C C C C C
const g = gridFrom(['CCCCC', 'BBBAA']);
const order = straightRows(g, { startCorner: 'bottom-right', mode: 'flat' });

describe('marcar até aqui', () => {
  test('tocar numa célula conta todos os pontos até ela, na ordem de trabalho', () => {
    expect(markedThrough(order, idx(g, 1, 4))).toBe(1);
    expect(markedThrough(order, idx(g, 1, 3))).toBe(2);
    expect(markedThrough(order, idx(g, 0, 1))).toBe(7); // carreira 1 inteira + 2 da carreira 2
  });

  test('tocar numa célula anterior desmarca o que vinha depois', () => {
    const done = markedThrough(order, idx(g, 0, 1));
    expect(isCellDone(order, done, idx(g, 0, 1))).toBe(true);
    expect(isCellDone(order, done, idx(g, 0, 2))).toBe(false);
    const back = markedThrough(order, idx(g, 1, 3));
    expect(isCellDone(order, back, idx(g, 0, 1))).toBe(false);
    expect(isCellDone(order, back, idx(g, 1, 4))).toBe(true);
  });
});

describe('avançar', () => {
  test('+1 ponto', () => {
    expect(advance(g, order, 0, 'stitch')).toBe(1);
    expect(advance(g, order, 4, 'stitch')).toBe(5);
  });

  test('até o fim da cor: termina o bloco atual', () => {
    expect(advance(g, order, 0, 'color')).toBe(2); // os 2 A
    expect(advance(g, order, 1, 'color')).toBe(2); // no meio do bloco A
    expect(advance(g, order, 3, 'color')).toBe(5); // no meio do bloco B
  });

  test('até o fim da cor: no fim de um bloco, faz o bloco seguinte', () => {
    expect(advance(g, order, 2, 'color')).toBe(5); // bloco B
  });

  test('até o fim da cor: no fim da carreira, atravessa para a seguinte', () => {
    expect(advance(g, order, 5, 'color')).toBe(10); // bloco C da carreira 2
  });

  test('um bloco de cor termina no fim da carreira, mesmo que a carreira seguinte comece com a mesma cor', () => {
    const same = gridFrom(['AAA', 'AAA']);
    const o = straightRows(same, { startCorner: 'bottom-right', mode: 'flat' });
    expect(advance(same, o, 0, 'color')).toBe(3);
    expect(advance(same, o, 3, 'color')).toBe(6);
  });

  test('fim da carreira', () => {
    expect(advance(g, order, 0, 'row')).toBe(5);
    expect(advance(g, order, 3, 'row')).toBe(5);
    expect(advance(g, order, 5, 'row')).toBe(10); // já no fim: faz a carreira seguinte
  });

  test('no fim do gráfico, avançar não faz nada', () => {
    expect(isFinished(order, 10)).toBe(true);
    expect(isFinished(order, 9)).toBe(false);
    expect(advance(g, order, 10, 'stitch')).toBe(10);
    expect(advance(g, order, 10, 'color')).toBe(10);
    expect(advance(g, order, 10, 'row')).toBe(10);
  });
});

describe('voltar', () => {
  test('−1 ponto', () => {
    expect(stepBack(3)).toBe(2);
  });
  test('não passa do início', () => {
    expect(stepBack(0)).toBe(0);
  });
});

describe('onde estou', () => {
  test('último ponto feito e próximo a fazer', () => {
    expect(lastDoneCell(order, 0)).toBeNull();
    expect(nextCellToWork(order, 0)).toBe(idx(g, 1, 4));
    expect(lastDoneCell(order, 2)).toBe(idx(g, 1, 3));
    expect(nextCellToWork(order, 2)).toBe(idx(g, 1, 2));
    expect(lastDoneCell(order, 10)).toBe(idx(g, 0, 4));
    expect(nextCellToWork(order, 10)).toBeNull();
  });

  test('progresso salvo fora do gráfico é trazido para dentro', () => {
    expect(clampProgress(order, 99)).toBe(10);
    expect(clampProgress(order, -3)).toBe(0);
    expect(clampProgress(order, Number.NaN)).toBe(0);
    expect(clampProgress(order, 2.7)).toBe(2);
  });
});

describe('canhota', () => {
  const left = workOrderFor(g, { mode: 'flat' }, { leftHanded: true });

  test('o mesmo número de pontos feitos vale, só que a partir da esquerda', () => {
    // carreira 1 da esquerda p/ a direita: B B B A A
    expect(lastDoneCell(left, 2)).toBe(idx(g, 1, 1));
    expect(isCellDone(left, 2, idx(g, 1, 0))).toBe(true);
    expect(isCellDone(left, 2, idx(g, 1, 4))).toBe(false);
  });

  test('até o fim da cor segue o sentido da canhota', () => {
    expect(advance(g, left, 0, 'color')).toBe(3); // os 3 B
    expect(advance(g, left, 3, 'color')).toBe(5); // os 2 A
  });
});
