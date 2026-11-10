import type { Project } from './types';

/** Versão do formato dos projetos salvos no aparelho. */
export const PROJECTS_VERSION = 3;

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

/** Traz o estado salvo por qualquer versão anterior para o formato atual. */
export function migrateProjectsState(persisted: unknown, fromVersion: number): ProjectsData {
  if (!isRecord(persisted) || !isRecord(persisted.projects)) return { projects: {} };
  const projects: Record<string, Project> = {};
  for (const [id, raw] of Object.entries(persisted.projects)) {
    if (!isRecord(raw)) continue;
    let project = raw;
    if (fromVersion < 2) project = v1ToV2(project);
    if (fromVersion < 3) project = v2ToV3(project);
    projects[id] = project as unknown as Project;
  }
  return { projects };
}
