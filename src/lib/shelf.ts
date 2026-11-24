import type { DiaryEntry, Project, ShelfInfo, ShelfStatus } from './types';

export const EMPTY_SHELF: ShelfInfo = { status: 'want', startedAt: null, finishedAt: null };

export const STATUS_LABEL: Record<ShelfStatus, string> = { want: 'Quero fazer', doing: 'Em andamento', done: 'Feito' };

/**
 * O que o progresso faz com a estante. O primeiro ponto tira de "quero fazer" (e anota o começo); o último
 * ponto marca "feito" (e anota o fim); desfazer pontos de um projeto feito o reabre. Zerar um projeto feito
 * não decide sozinho: devolve `ask: 'reopen'` para a tela perguntar.
 */
export function progressChange(shelf: ShelfInfo, prev: number, next: number, total: number, now: number): { shelf: ShelfInfo; ask?: 'reopen' } {
  const finished = total > 0 && next >= total;
  if (finished) {
    if (shelf.status === 'done') return { shelf };
    return { shelf: { status: 'done', startedAt: shelf.startedAt ?? now, finishedAt: now } };
  }
  if (shelf.status === 'done') {
    if (next === 0 && prev > 0) return { shelf, ask: 'reopen' };
    if (next < prev) return { shelf: { ...shelf, status: 'doing', finishedAt: null } };
    return { shelf };
  }
  if (shelf.status === 'want' && next > 0) return { shelf: { status: 'doing', startedAt: shelf.startedAt ?? now, finishedAt: null } };
  return { shelf };
}

/** Mudança de estado feita à mão. */
export function setStatus(shelf: ShelfInfo, status: ShelfStatus, now: number): ShelfInfo {
  if (shelf.status === status) return shelf;
  if (status === 'want') return EMPTY_SHELF;
  if (status === 'doing') return { status, startedAt: shelf.startedAt ?? now, finishedAt: null };
  // "feito" à mão: peça antiga registrada não ganha um começo inventado
  return { status, startedAt: shelf.startedAt, finishedAt: shelf.finishedAt ?? now };
}

/** Corrige as datas da estante, com validação. */
export function setShelfDates(shelf: ShelfInfo, dates: { startedAt?: number | null; finishedAt?: number | null }): { shelf: ShelfInfo } | { error: string } {
  if (shelf.status === 'want') return { error: 'Projetos em "quero fazer" não têm datas.' };
  const next = { ...shelf, ...dates };
  if (shelf.status === 'doing' && next.finishedAt != null) return { error: 'Só projetos feitos têm data de término.' };
  if (next.startedAt != null && next.finishedAt != null && next.finishedAt < next.startedAt) return { error: 'A data de término não pode ser antes do começo.' };
  return { shelf: next };
}

/** "05/03/2026" → início do dia no fuso do aparelho; null se não for uma data válida. */
export function parseDateBR(text: string): number | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

export function formatDateBR(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
}

let counter = 0;
const newId = () => {
  counter = (counter + 1) % 1e6;
  return `d${Date.now().toString(36)}${counter.toString(36)}`;
};

/** Nota nova no topo do diário; texto em branco não entra. */
export function addDiaryEntry(diary: DiaryEntry[], text: string, now: number): DiaryEntry[] {
  const t = text.trim();
  if (!t) return diary;
  return [{ id: newId(), date: now, text: t }, ...diary];
}

export const removeDiaryEntry = (diary: DiaryEntry[], id: string): DiaryEntry[] => diary.filter((e) => e.id !== id);

export interface ShelfGroups<T> {
  doing: T[];
  want: T[];
  done: T[];
}

/** Estante por estado: em andamento pelo mais mexido, quero fazer pelo mais novo, feitos pelo término (sem data no fim). */
export function groupShelf<T extends Pick<Project, 'shelf' | 'createdAt' | 'updatedAt'>>(projects: T[]): ShelfGroups<T> {
  const by = (s: ShelfStatus) => projects.filter((p) => (p.shelf ?? EMPTY_SHELF).status === s);
  return {
    doing: by('doing').sort((a, b) => b.updatedAt - a.updatedAt),
    want: by('want').sort((a, b) => b.createdAt - a.createdAt),
    done: by('done').sort((a, b) => (b.shelf.finishedAt ?? -Infinity) - (a.shelf.finishedAt ?? -Infinity)),
  };
}
