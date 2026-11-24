import { applyImport, BACKUP_FORMAT, backupFileName, buildBackup, findConflicts, mergeYarns, parseBackup, yarnsUsedBy } from '../backup';
import { PROJECTS_VERSION } from '../migrate';
import { DEFAULT_YARN } from '../yarn';
import type { Project, Yarn } from '../types';

const anne: Yarn = { id: 'y1', name: 'Anne 500', metersPerSkein: 500, gramsPerSkein: 145 };
const cisne: Yarn = { id: 'y2', name: 'Cisne', metersPerSkein: 100 };
const outra: Yarn = { id: 'y3', name: 'Outra', metersPerSkein: 80 };

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Almofada',
  createdAt: 1,
  updatedAt: 2,
  sources: [{ id: 's1', uri: 'file:///aparelho/x.jpg', name: 'x.jpg', kind: 'image', mimeType: 'image/jpeg' }],
  grid: { rows: 1, cols: 3, cells: ['a', 'b', null] },
  palette: [
    { id: 'a', name: 'Azul', hex: '#0000FF' },
    { id: 'b', name: 'Branco', hex: '#FFFFFF' },
  ],
  work: { startCorner: 'top-left', mode: 'same-direction' },
  yarn: { ...DEFAULT_YARN, defaultYarnId: 'y2', colorYarns: { a: 'y1' }, stock: { a: { amount: 2, unit: 'skeins' } } },
  progress: 2,
  shelf: { status: 'doing', startedAt: 10, finishedAt: null },
  diary: [{ id: 'd1', date: 20, text: 'Para a vovó' }],
  referenceUrl: 'https://exemplo.com/receita',
  photo: { uri: 'file:///aparelho/peca.jpg', width: 100, height: 80 },
  ...over,
});

const roundTrip = (text: string) => {
  const r = parseBackup(text);
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('exportar', () => {
  test('ida e volta devolve o mesmo projeto (grid, paleta, progresso, sentido, linha e estoque)', () => {
    const p = project();
    const r = roundTrip(JSON.stringify(buildBackup([p], [anne, cisne], 1000)));
    const { sources: _s, photo: _photo, ...rest } = p;
    expect(r.projects).toEqual([{ ...rest, sources: [] }]);
    expect(r.yarns).toEqual([anne, cisne]);
  });

  test('o arquivo diz o formato e a versão dos projetos', () => {
    const b = buildBackup([project()], [], 1000);
    expect(b).toMatchObject({ app: 'fio-da-meada', format: BACKUP_FORMAT, projectsVersion: PROJECTS_VERSION, exportedAt: 1000 });
  });

  test('os arquivos de origem (imagens e PDF) e a foto da peça não vão no arquivo: só servem no aparelho de origem', () => {
    const p = buildBackup([project()], [], 1).projects[0];
    expect(p.sources).toEqual([]);
    expect(p).not.toHaveProperty('photo');
  });

  test('o ajuste "Sou canhota" não vai junto', () => {
    expect(JSON.stringify(buildBackup([project()], [anne], 1))).not.toMatch(/leftHanded/);
  });

  test('um projeto leva só as linhas que ele usa', () => {
    expect(yarnsUsedBy([project()], [anne, cisne, outra])).toEqual([anne, cisne]);
    expect(yarnsUsedBy([project({ yarn: { ...DEFAULT_YARN } })], [anne])).toEqual([]);
  });

  test('nome do arquivo: o do projeto (sem acentos nem símbolos) ou "backup", com a data', () => {
    const now = Date.UTC(2026, 10, 23, 12);
    expect(backupFileName([project({ name: 'Almofada coração / 2' })], now)).toBe('fio-da-meada-almofada-coracao-2-2026-11-23.json');
    expect(backupFileName([project(), project({ id: 'p2' })], now)).toBe('fio-da-meada-backup-2026-11-23.json');
    expect(backupFileName([project({ name: '***' })], now)).toBe('fio-da-meada-projeto-2026-11-23.json');
  });
});

describe('importar: arquivos rejeitados com mensagem clara', () => {
  const error = (text: string) => {
    const r = parseBackup(text);
    if (r.ok) throw new Error('deveria rejeitar');
    return r.error;
  };
  const valid = () => buildBackup([project()], [anne], 1) as unknown as Record<string, unknown>;

  test('não é JSON', () => {
    expect(error('%PDF-1.4 …')).toMatch(/não é um backup do Fio da Meada/);
  });

  test('JSON de outro app', () => {
    expect(error(JSON.stringify({ hello: 'world' }))).toMatch(/não é um backup do Fio da Meada/);
  });

  test('versão mais nova do formato ou dos projetos', () => {
    expect(error(JSON.stringify({ ...valid(), format: BACKUP_FORMAT + 1 }))).toMatch(/versão mais nova/);
    expect(error(JSON.stringify({ ...valid(), projectsVersion: PROJECTS_VERSION + 1 }))).toMatch(/versão mais nova/);
  });

  test('projeto corrompido rejeita o arquivo inteiro', () => {
    const broken = { ...project(), grid: { rows: 2, cols: 3, cells: ['a'] } };
    expect(error(JSON.stringify({ ...valid(), projects: [broken] }))).toMatch(/corrompido/);
    expect(error(JSON.stringify({ ...valid(), projects: [{ ...project(), name: 5 }] }))).toMatch(/corrompido/);
    expect(error(JSON.stringify({ ...valid(), projects: [{ ...project(), palette: [{ id: 'a' }] }] }))).toMatch(/corrompido/);
    expect(error(JSON.stringify({ ...valid(), projects: 'x' }))).toMatch(/corrompido/);
    expect(error(JSON.stringify({ ...valid(), projects: [{ ...project(), shelf: { status: 'lendo' } }] }))).toMatch(/corrompido/);
    expect(error(JSON.stringify({ ...valid(), projects: [{ ...project(), diary: [{ id: 1 }] }] }))).toMatch(/corrompido/);
  });

  test('arquivo sem projetos', () => {
    expect(error(JSON.stringify({ ...valid(), projects: [] }))).toMatch(/nenhum projeto/);
  });

  test('linhas inválidas são descartadas, sem rejeitar o arquivo', () => {
    const r = roundTrip(JSON.stringify({ ...valid(), yarns: [anne, { id: 'z', name: '', metersPerSkein: 0 }] }));
    expect(r.yarns).toEqual([anne]);
  });
});

describe('importar: versão antiga do formato', () => {
  test('backup feito quando o app se chamava Cropartner continua aceito', () => {
    const old = { ...buildBackup([project()], [anne], 1), app: 'cropartner' };
    expect(roundTrip(JSON.stringify(old)).projects[0].name).toBe('Almofada');
  });

  test('projetos salvos numa versão anterior passam pela migração', () => {
    const v3 = {
      ...project(),
      yarn: { gridStitchId: 'pb', stitchTypes: DEFAULT_YARN.stitchTypes, wastePercent: 15, tailPerColorChangeCm: 15, metersPerSkein: 100, gramsPerSkein: 50 },
    };
    const r = roundTrip(JSON.stringify({ app: 'cropartner', format: 1, projectsVersion: 3, exportedAt: 1, projects: [v3] }));
    expect(r.projects[0].yarn).toEqual({ gridStitchId: 'pb', stitchTypes: DEFAULT_YARN.stitchTypes, wastePercent: 15, tailPerColorChangeCm: 15, defaultYarnId: null, colorYarns: {}, stock: {} });
    expect(r.projects[0].shelf).toEqual({ status: 'doing', startedAt: null, finishedAt: null });
    expect(r.yarns).toEqual([]);
  });
});

describe('importar: projetos que já existem', () => {
  const mine = { p1: project({ name: 'Minha almofada', progress: 1 }) };
  const incoming = [project(), project({ id: 'p9', name: 'Manta' })];
  let n = 0;
  const newId = () => `novo${++n}`;

  test('acha os conflitos de id', () => {
    expect(findConflicts(mine, incoming).map((p) => p.id)).toEqual(['p1']);
  });

  test('projeto novo entra; o que já existe não é sobrescrito sem escolha', () => {
    const out = applyImport(mine, incoming, {}, newId, 50);
    expect(out.p1).toBe(mine.p1);
    expect(out.p9).toMatchObject({ name: 'Manta', updatedAt: 50 });
  });

  test('substituir', () => {
    expect(applyImport(mine, incoming, { p1: 'replace' }, newId, 50).p1).toMatchObject({ name: 'Almofada', progress: 2 });
  });

  test('manter os dois: o importado ganha outro id e "(importado)" no nome', () => {
    const out = applyImport(mine, incoming, { p1: 'keep-both' }, () => 'pX', 50);
    expect(out.p1).toBe(mine.p1);
    expect(out.pX).toMatchObject({ id: 'pX', name: 'Almofada (importado)', progress: 2 });
  });

  test('não importar', () => {
    const out = applyImport(mine, incoming, { p1: 'skip' }, newId, 50);
    expect(out.p1).toBe(mine.p1);
    expect(Object.keys(out).sort()).toEqual(['p1', 'p9']);
  });

  test('o original não é alterado', () => {
    applyImport(mine, incoming, { p1: 'replace' }, newId, 50);
    expect(Object.keys(mine)).toEqual(['p1']);
    expect(mine.p1.name).toBe('Minha almofada');
  });
});

describe('importar: linhas cadastradas', () => {
  test('linhas novas entram; as que já existem (mesmo id) ficam como estão', () => {
    const local = [{ ...anne, name: 'Anne (minha)' }];
    expect(mergeYarns(local, [anne, cisne])).toEqual([local[0], cisne]);
  });
});
