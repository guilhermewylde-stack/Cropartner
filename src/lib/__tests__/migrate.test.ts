import { migrateProjectsState, PROJECTS_VERSION } from '../migrate';

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
  test('a versão atual é 2', () => {
    expect(PROJECTS_VERSION).toBe(2);
  });

  test('projeto do protótipo perde os dados de IA e mantém grid e progresso', () => {
    const out = migrateProjectsState({ projects: { p1: prototypeProject() } }, 1);
    const p = out.projects.p1;
    expect(p).not.toHaveProperty('recipe');
    expect(p).not.toHaveProperty('recipeText');
    expect(p).not.toHaveProperty('gridHint');
    expect(p.grid).toEqual({ rows: 1, cols: 2, cells: ['a', null], done: '10' });
    expect(p.lastCell).toBe(1);
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

  test('estado já na versão atual não é alterado', () => {
    const state = { projects: { p1: prototypeProject({ work: { startCorner: 'bottom-right', mode: 'flat' } }) } };
    expect(migrateProjectsState(state, 2).projects.p1.work).toEqual({ startCorner: 'bottom-right', mode: 'flat' });
  });

  test('estado ausente ou corrompido vira uma lista vazia', () => {
    expect(migrateProjectsState(undefined, 1)).toEqual({ projects: {} });
    expect(migrateProjectsState('lixo', 1)).toEqual({ projects: {} });
    expect(migrateProjectsState({ projects: null }, 1)).toEqual({ projects: {} });
  });
});
