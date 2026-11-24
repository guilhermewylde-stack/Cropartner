import type { Project, Yarn } from './types';

/** Versão do formato dos projetos salvos no aparelho. */
export const PROJECTS_VERSION = 6;

export interface ProjectsData {
  projects: Record<string, Project>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * v1 → v2: saem os dados que vinham da IA (receita lida, sugestão de grid) e o canto inicial
 * padrão antigo vira "automático", para acompanhar o ajuste global "Sou canhota".
 */
function v1ToV2(project: Record<string, unknown>): Record<string, unknown> {
  const { recipe: _recipe, recipeText: _recipeText, gridHint: _gridHint, ...rest } = project;
  const work = isRecord(rest.work) ? rest.work : {};
  const mode = work.mode === 'same-direction' ? 'same-direction' : 'flat';
  const keepCorner = typeof work.startCorner === 'string' && work.startCorner !== 'bottom-right';
  return { ...rest, work: keepCorner ? { startCorner: work.startCorner, mode } : { mode } };
}

/**
 * v2 → v3: o progresso deixa de ser guardado por célula (`grid.done`) e passa a ser o número de
 * pontos feitos na ordem de trabalho. Como o progresso era sempre marcado em sequência, basta contar.
 */
function v2ToV3(project: Record<string, unknown>): Record<string, unknown> {
  const { lastCell: _lastCell, ...rest } = project;
  if (!isRecord(rest.grid)) return { ...rest, progress: 0 };
  const { done, ...grid } = rest.grid;
  const progress = typeof done === 'string' ? done.split('1').length - 1 : 0;
  return { ...rest, grid, progress };
}

/**
 * v3 → v4: metros e gramas por novelo saem do projeto e passam a vir das linhas cadastradas (ajuste
 * do aparelho). O projeto guarda só qual linha usa, por padrão e por cor — começa sem nenhuma.
 */
function v3ToV4(project: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(project.yarn)) return project;
  const { metersPerSkein: _m, gramsPerSkein: _g, ...yarn } = project.yarn;
  return { ...project, yarn: { ...yarn, defaultYarnId: null, colorYarns: {} } };
}

/** v4 → v5: o projeto ganha o estoque por cor, vazio. */
function v4ToV5(project: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(project.yarn)) return project;
  return { ...project, yarn: { ...project.yarn, stock: {} } };
}

/**
 * v5 → v6: o projeto ganha lugar na estante e o diário. Sem progresso: "quero fazer"; com progresso:
 * "em andamento"; gráfico concluído: "feito" (término = última alteração). O começo fica em branco: não se sabe.
 */
function v5ToV6(project: Record<string, unknown>): Record<string, unknown> {
  const grid = isRecord(project.grid) ? project.grid : null;
  const total = grid && typeof grid.rows === 'number' && typeof grid.cols === 'number' ? grid.rows * grid.cols : 0;
  const progress = typeof project.progress === 'number' ? project.progress : 0;
  const updatedAt = typeof project.updatedAt === 'number' ? project.updatedAt : null;
  const shelf =
    total > 0 && progress >= total
      ? { status: 'done', startedAt: null, finishedAt: updatedAt }
      : { status: progress > 0 ? 'doing' : 'want', startedAt: null, finishedAt: null };
  return { ...project, shelf, diary: Array.isArray(project.diary) ? project.diary : [] };
}

/** Traz o estado salvo por qualquer versão anterior para o formato atual. */
export function migrateProjectsState(persisted: unknown, fromVersion: number): ProjectsData {
  if (!isRecord(persisted) || !isRecord(persisted.projects)) return { projects: {} };
  const projects: Record<string, Project> = {};
  for (const [id, raw] of Object.entries(persisted.projects)) {
    if (!isRecord(raw)) continue;
    let project = raw;
    if (fromVersion < 2) project = v1ToV2(project);
    if (fromVersion < 3) project = v2ToV3(project);
    if (fromVersion < 4) project = v3ToV4(project);
    if (fromVersion < 5) project = v4ToV5(project);
    if (fromVersion < 6) project = v5ToV6(project);
    projects[id] = project as unknown as Project;
  }
  return { projects };
}

/** Versão dos ajustes do aparelho. */
export const SETTINGS_VERSION = 2;

export interface SettingsData {
  leftHanded: boolean;
  yarns: Yarn[];
}

const isYarn = (v: unknown): v is Yarn =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  v.name.trim() !== '' &&
  typeof v.metersPerSkein === 'number' &&
  v.metersPerSkein > 0 &&
  (v.gramsPerSkein === undefined || typeof v.gramsPerSkein === 'number');

/** v1 → v2: ganha a lista de linhas cadastradas. Valores corrompidos voltam ao padrão. */
export function migrateSettingsState(persisted: unknown, _fromVersion: number): SettingsData {
  const s = isRecord(persisted) ? persisted : {};
  return {
    leftHanded: s.leftHanded === true,
    yarns: Array.isArray(s.yarns) ? s.yarns.filter(isYarn) : [],
  };
}
