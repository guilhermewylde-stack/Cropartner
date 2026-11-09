import {
  createGrid,
  idx,
  markUpTo,
  nextCell,
  positionInfo,
  workOrder,
  workIndexOf,
  cellAtWorkIndex,
  colorStats,
  firstPendingCell,
  countDone,
  replaceColor,
} from '../grid';
import type { Grid, WorkSettings } from '../types';

const flatBR: WorkSettings = { startCorner: 'bottom-right', mode: 'flat' };

function gridFrom(rows: string[]): Grid {
  // cada caractere é um id de cor; '.' = vazio
  const g = createGrid(rows.length, rows[0].length);
  rows.forEach((line, r) => line.split('').forEach((ch, c) => (g.cells[idx(g, r, c)] = ch === '.' ? null : ch)));
  return g;
}

describe('ordem de trabalho', () => {
  const g = createGrid(3, 4);

  test('ida e volta começando no canto inferior direito', () => {
    // linha 2 (base) da direita p/ esquerda, linha 1 da esquerda p/ direita, linha 0 da direita p/ esquerda
    expect(workOrder(g, flatBR)).toEqual([11, 10, 9, 8, 4, 5, 6, 7, 3, 2, 1, 0]);
  });

  test('mesmo sentido começando no canto superior esquerdo', () => {
    expect(workOrder(g, { startCorner: 'top-left', mode: 'same-direction' })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test('workIndexOf e cellAtWorkIndex são inversos', () => {
    for (const s of [flatBR, { startCorner: 'top-right', mode: 'flat' } as WorkSettings, { startCorner: 'bottom-left', mode: 'same-direction' } as WorkSettings]) {
      const order = workOrder(g, s);
      order.forEach((cell, w) => {
        expect(workIndexOf(g, s, cell)).toBe(w);
        expect(cellAtWorkIndex(g, s, w)).toBe(cell);
      });
    }
  });
});

describe('posição do ponto', () => {
  // carreira de baixo (carreira 1), lida da direita p/ esquerda: B B A A A A B .
  const g = gridFrom(['AAAAAAAA', '.BAAAABB']);

  test('conta o ponto dentro da carreira e do bloco de cor', () => {
    // célula da coluna 3 (0-based) na linha de baixo
    const p = positionInfo(g, flatBR, idx(g, 1, 3));
    expect(p.workRow).toBe(1);
    expect(p.leftToRight).toBe(false);
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
    const p = positionInfo(g, flatBR, idx(g, 0, 0));
    expect(p.workRow).toBe(2);
    expect(p.leftToRight).toBe(true);
    expect(p.stitchInRow).toBe(1);
    expect(p.runLength).toBe(8);
    expect(p.overallStitch).toBe(9);
  });
});

describe('progresso', () => {
  const g = createGrid(2, 3);

  test('marcar até a célula preenche tudo antes na ordem de trabalho', () => {
    const m = markUpTo(g, flatBR, idx(g, 0, 1)); // carreira 2, ponto 2
    expect(countDone(m)).toBe(5);
    expect(firstPendingCell(m, flatBR)).toBe(idx(g, 0, 2));
    // desmarcar voltando
    const back = markUpTo(m, flatBR, idx(g, 1, 2));
    expect(countDone(back)).toBe(1);
  });

  test('nextCell avança e para no fim', () => {
    expect(nextCell(g, flatBR, null)).toBe(idx(g, 1, 2));
    expect(nextCell(g, flatBR, idx(g, 1, 0))).toBe(idx(g, 0, 0));
    expect(nextCell(g, flatBR, idx(g, 0, 2))).toBeNull();
    expect(nextCell(g, flatBR, idx(g, 0, 0), -1)).toBe(idx(g, 1, 0));
  });
});

describe('cores', () => {
  test('estatísticas contam pontos e blocos por cor', () => {
    const g = gridFrom(['ABA', 'AAA']);
    const s = colorStats(g, flatBR);
    expect(s.get('A')).toEqual({ stitches: 5, segments: 3 });
    expect(s.get('B')).toEqual({ stitches: 1, segments: 1 });
  });

  test('substituir cor', () => {
    const g = replaceColor(gridFrom(['AB']), 'B', 'A');
    expect(g.cells).toEqual(['A', 'A']);
  });
});

import { gridFromTranscription } from '../transcribed';

describe('transcrição', () => {
  test('letras viram células e linhas são normalizadas', () => {
    const { grid, palette } = gridFromTranscription(
      { colors: [{ letter: 'A', hex: '#000000', name: 'Preto' }, { letter: 'B', hex: '#ffffff', name: 'Branco' }], rows: ['AB', 'B'] },
      2,
      2,
    );
    expect(grid.cells).toEqual([palette[0].id, palette[1].id, palette[1].id, null]);
  });
});

import { advanceTarget, cellsBetween, floodFill } from '../grid';

describe('avançar', () => {
  // base (carreira 1, da direita p/ esquerda): A A B B B ; carreira 2 (esq->dir): C C C C C
  const g = gridFrom(['CCCCC', 'BBBAA']);
  test('próximo ponto, fim da cor e fim da carreira', () => {
    expect(advanceTarget(g, flatBR, null, 'stitch')).toBe(idx(g, 1, 4));
    expect(advanceTarget(g, flatBR, null, 'color')).toBe(idx(g, 1, 3)); // fim do bloco A
    expect(advanceTarget(g, flatBR, idx(g, 1, 3), 'color')).toBe(idx(g, 1, 0)); // fim do bloco B
    expect(advanceTarget(g, flatBR, idx(g, 1, 4), 'row')).toBe(idx(g, 1, 0));
    expect(advanceTarget(g, flatBR, idx(g, 1, 0), 'row')).toBe(idx(g, 0, 4));
    expect(advanceTarget(g, flatBR, idx(g, 0, 4), 'stitch')).toBeNull();
  });
  test('células entre dois pontos', () => {
    expect(cellsBetween(g, flatBR, idx(g, 1, 1), idx(g, 0, 1))).toEqual([idx(g, 1, 0), idx(g, 0, 0), idx(g, 0, 1)]);
  });
  test('balde', () => {
    const f = floodFill(gridFrom(['AAB', 'ABB']), 0, 'C');
    expect(f.cells).toEqual(['C', 'C', 'B', 'C', 'B', 'B']);
  });
});
