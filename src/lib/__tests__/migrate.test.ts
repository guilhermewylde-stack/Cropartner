import { migrateProjectsState, migrateSettingsState, PROJECTS_VERSION } from '../migrate';

const prototypeProject = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Manta',
  createdAt: 1,
  updatedAt: 2,
  sources: [],
  palette: [{ id: 'a', name: 'Azul', hex: '#0000FF' }],
  grid: { rows: 1, cols: 2, cells: ['a', null], done: '10' },
  work: { startCorner: 'bottom-right', mode: 'flat' },
  yarn: { gridStitchId: 'pb', stitchTypes: [], wastePercent: 15, tailPerColorChangeCm: 15, metersPerSkein: 100 },
  lastCell: 1,
  recipe: { title: 'x', steps: [] },
  recipeText: 'texto',
  gridHint: { rows: 1, cols: 2 },
  ...over,
});

describe('migração dos projetos salvos', () => {
  test('a versão atual é 4', () => {
    expect(PROJECTS_VERSION).toBe(4);
  });

  test('projeto do protótipo perde os dados de IA e mantém grid e progresso', () => {
    const out = migrateProjectsState({ projects: { p1: prototypeProject() } }, 1);
    const p = out.projects.p1;
    expect(p).not.toHaveProperty('recipe');
    expect(p).not.toHaveProperty('recipeText');
    expect(p).not.toHaveProperty('gridHint');
    expect(p.grid).toEqual({ rows: 1, cols: 2, cells: ['a', null] });
    expect(p.progress).toBe(1);
    expect(p.name).toBe('Manta');
  });

  test('o canto padrão antigo vira "automático", para seguir o ajuste "Sou canhota"', () => {
    const out = migrateProjectsState({ projects: { p1: prototypeProject() } }, 1);
    expect(out.projects.p1.work).toEqual({ mode: 'flat' });
  });

  test('um canto escolhido de propósito é preservado', () => {
    const out = migrateProjectsState({ projects: { p1: prototypeProject({ work: { startCorner: 'top-left', mode: 'same-direction' } }) } }, 1);
    expect(out.projects.p1.work).toEqual({ startCorner: 'top-left', mode: 'same-direction' });
  });

  test('v2 → v3: o progresso por célula vira "pontos feitos na ordem de trabalho"', () => {
    const v2 = prototypeProject({ work: { mode: 'flat' }, grid: { rows: 2, cols: 2, cells: ['a', 'a', 'a', 'a'], done: '0111' }, lastCell: 1 });
    const p = migrateProjectsState({ projects: { p1: v2 } }, 2).projects.p1;
    expect(p.progress).toBe(3);
    expect(p.grid).toEqual({ rows: 2, cols: 2, cells: ['a', 'a', 'a', 'a'] });
    expect(p).not.toHaveProperty('lastCell');
    expect(p.work).toEqual({ mode: 'flat' });
  });

  test('projeto sem grid começa com progresso zero', () => {
    const p = migrateProjectsState({ projects: { p1: prototypeProject({ grid: undefined }) } }, 1).projects.p1;
    expect(p.progress).toBe(0);
    expect(p.grid).toBeUndefined();
  });

  test('estado já na versão atual não é alterado', () => {
    const current = { id: 'p1', name: 'Manta', work: { startCorner: 'bottom-right', mode: 'flat' }, grid: { rows: 1, cols: 1, cells: ['a'] }, progress: 1 };
    expect(migrateProjectsState({ projects: { p1: current } }, 4).projects.p1).toEqual(current);
  });

  test('estado ausente ou corrompido vira uma lista vazia', () => {
    expect(migrateProjectsState(undefined, 1)).toEqual({ projects: {} });
    expect(migrateProjectsState('lixo', 1)).toEqual({ projects: {} });
    expect(migrateProjectsState({ projects: null }, 1)).toEqual({ projects: {} });
  });
});

describe('v3 → v4: linhas cadastradas', () => {
  test('metros e gramas por novelo saem do projeto; a linha do projeto e das cores começa vazia', () => {
    const v3 = { id: 'p1', name: 'Manta', progress: 0, yarn: { gridStitchId: 'pb', stitchTypes: [], wastePercent: 15, tailPerColorChangeCm: 15, metersPerSkein: 100, gramsPerSkein: 50 } };
    const p = migrateProjectsState({ projects: { p1: v3 } }, 3).projects.p1;
    expect(p.yarn).toEqual({ gridStitchId: 'pb', stitchTypes: [], wastePercent: 15, tailPerColorChangeCm: 15, defaultYarnId: null, colorYarns: {} });
  });
});

describe('ajustes do aparelho', () => {
  test('v1 → v2 ganha a lista de linhas cadastradas, vazia', () => {
    expect(migrateSettingsState({ leftHanded: true }, 1)).toEqual({ leftHanded: true, yarns: [] });
  });

  test('estado corrompido volta ao padrão', () => {
    expect(migrateSettingsState(null, 1)).toEqual({ leftHanded: false, yarns: [] });
    expect(migrateSettingsState({ leftHanded: 'sim', yarns: 'x' }, 2)).toEqual({ leftHanded: false, yarns: [] });
  });

  test('linhas inválidas são descartadas', () => {
    const yarns = [{ id: 'y1', name: 'Anne', metersPerSkein: 500, gramsPerSkein: 145 }, { id: 'y2', name: '', metersPerSkein: 100 }, 'lixo'];
    expect(migrateSettingsState({ leftHanded: false, yarns }, 2).yarns).toEqual([yarns[0]]);
  });
});
