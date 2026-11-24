import { profileStats } from '../stats';
import { createGrid } from '../grid';
import { DEFAULT_YARN } from '../yarn';
import type { Project, ShelfInfo } from '../types';

const DAY = 86_400_000;
const now = new Date(2026, 10, 24).getTime();
const lastYear = new Date(2025, 5, 1).getTime();
/** 1 cm por ponto, sem perda e sem pontas */
const yarn = { ...DEFAULT_YARN, stitchTypes: [{ id: 'pb', name: 'pb', cmPerStitch: 100 }], wastePercent: 0, tailPerColorChangeCm: 0 };

function project(id: string, shelf: ShelfInfo, cells: (string | null)[], progress: number, palette = [{ id: 'r', name: 'Vermelho Anne', hex: '#D21E28' }, { id: 'w', name: 'Cru', hex: '#F0E6D2' }]): Project {
  const grid = { ...createGrid(1, cells.length), cells };
  return { id, name: id, createdAt: 0, updatedAt: 0, sources: [], grid, palette, work: { mode: 'same-direction', startCorner: 'top-left' }, yarn, progress, shelf };
}

describe('estatísticas do perfil', () => {
  const doneNow: ShelfInfo = { status: 'done', startedAt: now - 10 * DAY, finishedAt: now - 2 * DAY };
  const doneOld: ShelfInfo = { status: 'done', startedAt: lastYear - 20 * DAY, finishedAt: lastYear };
  const doing: ShelfInfo = { status: 'doing', startedAt: now - DAY, finishedAt: null };
  const want: ShelfInfo = { status: 'want', startedAt: null, finishedAt: null };

  const projects = [
    project('a', doneNow, ['r', 'r', 'w', 'w'], 4),
    project('b', doneOld, ['r', 'r'], 2),
    project('c', doing, ['w', 'w', 'r', 'r'], 2), // feitos: w w (na ordem de trabalho: topo esquerda, sempre →)
    { ...project('d', want, ['r'], 0), grid: undefined },
  ];
  const s = profileStats(projects, [], now, { leftHanded: false });

  test('conta peças feitas no total e no ano, e projetos por estado', () => {
    expect(s.finished).toBe(2);
    expect(s.finishedThisYear).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.wanted).toBe(1);
  });

  test('pontos feitos e metros de linha usados (só o que já foi feito)', () => {
    expect(s.stitchesDone).toBe(8);
    expect(s.metersUsed).toBe(8); // 1 m por ponto
  });

  test('cores mais usadas pelos pontos feitos, juntando tons pelo nome aproximado', () => {
    // vermelho: 2 (a) + 2 (b) = 4; cru (branco/cru): 2 (a) + 2 (c) = 4 → empate fica na ordem do primeiro que apareceu
    expect(s.topColors.map((c) => [c.name, c.stitches])).toEqual([
      ['Vermelho', 4],
      ['Cru', 4],
    ]);
    expect(s.topColors[0].hex).toBe('#D21E28');
  });

  test('tempo médio por peça, só das que têm começo e fim', () => {
    expect(s.averageDaysPerPiece).toBe(14); // (8 + 20) / 2
    const noDates = profileStats([project('x', { status: 'done', startedAt: null, finishedAt: now }, ['r'], 1)], [], now, { leftHanded: false });
    expect(noDates.averageDaysPerPiece).toBeNull();
  });

  test('sem projetos, tudo zerado', () => {
    expect(profileStats([], [], now, { leftHanded: false })).toEqual({
      finished: 0,
      finishedThisYear: 0,
      inProgress: 0,
      wanted: 0,
      stitchesDone: 0,
      metersUsed: 0,
      topColors: [],
      averageDaysPerPiece: null,
    });
  });
});
