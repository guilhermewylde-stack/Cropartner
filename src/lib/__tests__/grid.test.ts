import { colorStats, createGrid, floodFill, idx, positionInfo, replaceColor } from '../grid';
import { straightRows } from '../workOrder';
import type { Grid } from '../types';

/** ida e volta começando embaixo à direita (destra) */
const flatBR = (g: Grid) => straightRows(g, { startCorner: 'bottom-right', mode: 'flat' });

function gridFrom(rows: string[]): Grid {
  // cada caractere é um id de cor; '.' = vazio
  const g = createGrid(rows.length, rows[0].length);
  rows.forEach((line, r) => line.split('').forEach((ch, c) => (g.cells[idx(g, r, c)] = ch === '.' ? null : ch)));
  return g;
}

describe('posição do ponto', () => {
  // carreira de baixo (carreira 1), lida da direita p/ esquerda: B B A A A A B .
  const g = gridFrom(['AAAAAAAA', '.BAAAABB']);
  const o = flatBR(g);

  test('conta o ponto dentro da carreira e do bloco de cor', () => {
    // célula da coluna 3 (0-based) na linha de baixo
    const p = positionInfo(g, o, idx(g, 1, 3));
    expect(p.workRow).toBe(1);
    expect(p.direction).toBe('rtl');
    expect(p.stitchInRow).toBe(5); // colunas 7,6,5,4,3
    expect(p.remainingInRow).toBe(3);
    expect(p.colFromLeft).toBe(4);
    expect(p.colFromRight).toBe(5);
    expect(p.colorId).toBe('A');
    expect(p.runLength).toBe(4);
    expect(p.positionInRun).toBe(3);
    expect(p.remainingInRun).toBe(1);
    expect(p.runIndex).toBe(2);
    expect(p.runsInRow).toBe(4);
    expect(p.upcomingRuns).toEqual([
      { colorId: 'B', length: 1 },
      { colorId: null, length: 1 },
    ]);
    expect(p.overallStitch).toBe(5);
  });

  test('segunda carreira inverte o sentido', () => {
    const p = positionInfo(g, o, idx(g, 0, 0));
    expect(p.workRow).toBe(2);
    expect(p.direction).toBe('ltr');
    expect(p.stitchInRow).toBe(1);
    expect(p.runLength).toBe(8);
    expect(p.overallStitch).toBe(9);
  });
});

describe('cores', () => {
  test('estatísticas contam pontos e blocos por cor', () => {
    const g = gridFrom(['ABA', 'AAA']);
    const s = colorStats(g, flatBR(g));
    expect(s.get('A')).toEqual({ stitches: 5, segments: 3 });
    expect(s.get('B')).toEqual({ stitches: 1, segments: 1 });
  });

  test('substituir cor', () => {
    const g = replaceColor(gridFrom(['AB']), 'B', 'A');
    expect(g.cells).toEqual(['A', 'A']);
  });
});

describe('pintar', () => {
  test('balde', () => {
    const f = floodFill(gridFrom(['AAB', 'ABB']), 0, 'C');
    expect(f.cells).toEqual(['C', 'C', 'B', 'C', 'B', 'B']);
  });
});

describe('próxima cor', () => {
  // destra. Carreira 1 (de baixo, da direita p/ a esquerda): A A B B B
  // carreira 2 (da esquerda p/ a direita): C C D D D
  const g = gridFrom(['CCDDD', 'BBBAA']);
  const o = flatBR(g);

  test('no meio da carreira, é o bloco seguinte da mesma carreira', () => {
    const p = positionInfo(g, o, idx(g, 1, 4)); // 1º ponto, bloco A
    expect(p.nextRun).toEqual({ colorId: 'B', length: 3, inNextRow: false });
  });

  test('no último bloco da carreira, é o primeiro bloco da carreira seguinte', () => {
    const p = positionInfo(g, o, idx(g, 1, 1)); // bloco B, o último da carreira 1
    expect(p.upcomingRuns).toEqual([]);
    expect(p.nextRun).toEqual({ colorId: 'C', length: 2, inNextRow: true });
  });

  test('no último bloco da última carreira, não há próxima cor', () => {
    const p = positionInfo(g, o, idx(g, 0, 3));
    expect(p.nextRun).toBeNull();
  });

  test('canhota: a próxima cor segue o sentido dela', () => {
    const left = straightRows(g, { startCorner: 'bottom-left', mode: 'flat' });
    // carreira 1 da esquerda p/ a direita: B B B A A ; carreira 2 volta: D D D C C
    expect(positionInfo(g, left, idx(g, 1, 0)).nextRun).toEqual({ colorId: 'A', length: 2, inNextRow: false });
    expect(positionInfo(g, left, idx(g, 1, 4)).nextRun).toEqual({ colorId: 'D', length: 3, inNextRow: true });
  });
});

describe('bordas da carreira', () => {
  const g = gridFrom(['CCDDD', 'BBBAA']);
  const o = flatBR(g);

  test('primeiro ponto da carreira', () => {
    const p = positionInfo(g, o, idx(g, 1, 4));
    expect(p).toMatchObject({ workRow: 1, totalRows: 2, direction: 'rtl', stitchInRow: 1, stitchesInRow: 5, remainingInRow: 4 });
    expect(p).toMatchObject({ colorId: 'A', positionInRun: 1, runLength: 2, remainingInRun: 1 });
  });

  test('último ponto da carreira', () => {
    const p = positionInfo(g, o, idx(g, 1, 0));
    expect(p).toMatchObject({ stitchInRow: 5, remainingInRow: 0, colorId: 'B', positionInRun: 3, runLength: 3, remainingInRun: 0 });
  });

  test('carreira de uma cor só é um bloco do tamanho da carreira', () => {
    const one = gridFrom(['AAAA']);
    const p = positionInfo(one, flatBR(one), 1);
    expect(p).toMatchObject({ runLength: 4, runsInRow: 1, positionInRun: 3, remainingInRun: 1 });
    expect(p.nextRun).toBeNull();
  });
});
