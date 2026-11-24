import { isValidHex } from './colors';
import { migrateProjectsState, migrateSettingsState, PROJECTS_VERSION } from './migrate';
import type { Project, Yarn } from './types';

/**
 * Backup por arquivo (sem nuvem). O arquivo é JSON:
 * `{ app: 'fio-da-meada', format, projectsVersion, exportedAt, projects: Project[], yarns: Yarn[] }`.
 * - `format` é a versão do envelope; `projectsVersion` é a versão do formato de `Project` (ver `migrate.ts`),
 *   e projetos antigos passam pela mesma migração do armazenamento local.
 * - Os arquivos de origem (imagens/PDF) **não** vão no arquivo: o grid já tem tudo para crochetar, e eles
 *   deixariam o arquivo pesado demais para mandar pelo WhatsApp. O projeto importado chega sem eles.
 * - Ajustes do aparelho ("Sou canhota") não vão junto. As linhas cadastradas usadas pelos projetos vão.
 */
export const BACKUP_FORMAT = 1;

/** Marca do arquivo. Backups feitos quando o app se chamava Cropartner têm `app: 'cropartner'` e continuam aceitos. */
const APP_MARKS = ['fio-da-meada', 'cropartner'];

export interface BackupFile {
  app: 'fio-da-meada';
  format: number;
  projectsVersion: number;
  exportedAt: number;
  projects: Project[];
  yarns: Yarn[];
}

export type ParsedBackup = { ok: true; projects: Project[]; yarns: Yarn[]; exportedAt?: number } | { ok: false; error: string };

export function buildBackup(projects: Project[], yarns: Yarn[], now: number): BackupFile {
  return {
    app: 'fio-da-meada',
    format: BACKUP_FORMAT,
    projectsVersion: PROJECTS_VERSION,
    exportedAt: now,
    // arquivos do aparelho (origem e foto da peça) não viajam
    projects: projects.map(({ photo: _photo, ...p }) => ({ ...p, sources: [] })),
    yarns,
  };
}

/** Linhas cadastradas que os projetos usam (a do projeto e as das cores), na ordem do cadastro. */
export function yarnsUsedBy(projects: Project[], yarns: Yarn[]): Yarn[] {
  const used = new Set<string>();
  for (const p of projects) {
    if (p.yarn?.defaultYarnId) used.add(p.yarn.defaultYarnId);
    for (const id of Object.values(p.yarn?.colorYarns ?? {})) used.add(id);
  }
  return yarns.filter((y) => used.has(y.id));
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function backupFileName(projects: Project[], now: number): string {
  const date = new Date(now).toISOString().slice(0, 10);
  const label = projects.length === 1 ? slug(projects[0].name) || 'projeto' : 'backup';
  return `fio-da-meada-${label}-${date}.json`;
}

// ── Importar ────────────────────────────────────────────────────────────────────────────────────

const NOT_BACKUP = 'Este arquivo não é um backup do Fio da Meada.';
const NEWER = 'Este backup foi feito numa versão mais nova do Fio da Meada. Atualize o app para importar.';
const corrupted = (which: string) => `O arquivo está corrompido (${which}). Nada foi importado.`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown, min: number) => isNum(v) && Number.isInteger(v) && v >= min;
const isStr = (v: unknown): v is string => typeof v === 'string';

/** Confere o formato de um projeto já migrado. Devolve o motivo, ou null se está bom. */
function projectProblem(p: Record<string, unknown>): string | null {
  if (!isStr(p.id) || !p.id) return 'sem id';
  if (!isStr(p.name)) return 'sem nome';
  if (!Array.isArray(p.palette) || !p.palette.every((c) => isRecord(c) && isStr(c.id) && isStr(c.name) && isStr(c.hex) && isValidHex(c.hex))) return 'paleta';
  if (p.grid !== undefined) {
    const g = p.grid;
    if (!isRecord(g) || !isInt(g.rows, 1) || !isInt(g.cols, 1)) return 'grid';
    if (!Array.isArray(g.cells) || g.cells.length !== (g.rows as number) * (g.cols as number) || !g.cells.every((c) => c === null || isStr(c))) return 'grid';
  }
  if (!isInt(p.progress, 0)) return 'progresso';
  const w = p.work;
  if (!isRecord(w) || (w.mode !== 'flat' && w.mode !== 'same-direction')) return 'sentido de trabalho';
  if (w.startCorner != null && !['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(w.startCorner as string)) return 'sentido de trabalho';
  const y = p.yarn;
  if (!isRecord(y) || !isStr(y.gridStitchId) || !isNum(y.wastePercent) || !isNum(y.tailPerColorChangeCm)) return 'linha';
  if (!Array.isArray(y.stitchTypes) || !y.stitchTypes.every((s) => isRecord(s) && isStr(s.id) && isStr(s.name) && isNum(s.cmPerStitch))) return 'linha';
  const sh = p.shelf;
  if (!isRecord(sh) || !['want', 'doing', 'done'].includes(sh.status as string)) return 'estante';
  if (![sh.startedAt, sh.finishedAt].every((d) => d === null || isNum(d))) return 'estante';
  if (p.diary !== undefined && (!Array.isArray(p.diary) || !p.diary.every((e) => isRecord(e) && isStr(e.id) && isNum(e.date) && isStr(e.text)))) return 'diário';
  if (p.referenceUrl !== undefined && !isStr(p.referenceUrl)) return 'link de referência';
  if (y.stock !== undefined && (!isRecord(y.stock) || !Object.values(y.stock).every((s) => isRecord(s) && isNum(s.amount) && (s.unit === 'skeins' || s.unit === 'meters')))) return 'estoque';
  return null;
}

/** Lê e valida um arquivo de backup. Nunca lança: arquivo ruim vira uma mensagem pronta para a usuária. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_BACKUP };
  }
  if (!isRecord(raw) || !APP_MARKS.includes(raw.app as string) || !isInt(raw.format, 1) || !isInt(raw.projectsVersion, 1)) return { ok: false, error: NOT_BACKUP };
  if ((raw.format as number) > BACKUP_FORMAT || (raw.projectsVersion as number) > PROJECTS_VERSION) return { ok: false, error: NEWER };
  if (!Array.isArray(raw.projects)) return { ok: false, error: corrupted('lista de projetos') };
  if (raw.projects.length === 0) return { ok: false, error: 'O arquivo não tem nenhum projeto.' };

  // mesma migração do armazenamento local; a chave é a posição, para manter a ordem e os ids repetidos
  const keyed: Record<string, unknown> = {};
  raw.projects.forEach((p, i) => (keyed[String(i)] = p));
  const migrated = migrateProjectsState({ projects: keyed }, raw.projectsVersion as number).projects;
  const projects: Project[] = [];
  for (let i = 0; i < raw.projects.length; i++) {
    const p = migrated[String(i)] as unknown;
    const problem = isRecord(p) ? projectProblem(p) : 'projeto';
    if (problem) {
      const name = isRecord(p) && isStr(p.name) ? `“${p.name}”, ${problem}` : `projeto ${i + 1}, ${problem}`;
      return { ok: false, error: corrupted(name) };
    }
    const proj = p as unknown as Project;
    const { photo: _photo, ...clean } = proj;
    projects.push({ ...clean, sources: [], createdAt: isNum(proj.createdAt) ? proj.createdAt : 0, updatedAt: isNum(proj.updatedAt) ? proj.updatedAt : 0 });
  }
  // linhas inválidas são só descartadas: a mesma limpeza dos ajustes do aparelho
  const yarns = migrateSettingsState({ yarns: raw.yarns }, 2).yarns;
  return { ok: true, projects, yarns, exportedAt: isNum(raw.exportedAt) ? raw.exportedAt : undefined };
}

export type ConflictChoice = 'replace' | 'keep-both' | 'skip';

/** Projetos do arquivo cujo id já existe no aparelho. */
export const findConflicts = (existing: Record<string, Project>, incoming: Project[]): Project[] => incoming.filter((p) => p.id in existing);

/**
 * Junta os projetos importados aos do aparelho. Um id que já existe só é tocado com uma escolha:
 * substituir, manter os dois (o importado ganha outro id e "(importado)" no nome) ou não importar
 * (o padrão).
 */
export function applyImport(existing: Record<string, Project>, incoming: Project[], choices: Record<string, ConflictChoice>, newId: () => string, now: number): Record<string, Project> {
  const out = { ...existing };
  for (const p of incoming) {
    const stamped = { ...p, updatedAt: now };
    if (!(p.id in existing)) out[p.id] = stamped;
    else if (choices[p.id] === 'replace') out[p.id] = stamped;
    else if (choices[p.id] === 'keep-both') {
      const id = newId();
      out[id] = { ...stamped, id, name: `${p.name} (importado)` };
    }
  }
  return out;
}

/** Linhas do arquivo que ainda não estão no cadastro entram; as que já estão (mesmo id) ficam como estão. */
export function mergeYarns(existing: Yarn[], incoming: Yarn[]): Yarn[] {
  const have = new Set(existing.map((y) => y.id));
  return [...existing, ...incoming.filter((y) => !have.has(y.id))];
}
