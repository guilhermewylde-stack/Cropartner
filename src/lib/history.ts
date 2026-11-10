/** Histórico para "Desfazer": guarda o estado de antes de cada ação. Imutável. */
export interface History<T> {
  readonly past: readonly T[];
}

export const emptyHistory = <T>(): History<T> => ({ past: [] });

export const canUndo = <T>(h: History<T>) => h.past.length > 0;

/** Registra o estado atual antes de uma ação, mantendo só as últimas `limit` ações. */
export function record<T>(h: History<T>, stateBefore: T, limit = 50): History<T> {
  return { past: [...h.past, stateBefore].slice(-limit) };
}

/** Devolve o estado anterior à última ação e o histórico sem ela (null se não há o que desfazer). */
export function undo<T>(h: History<T>): { history: History<T>; state: T } | null {
  if (!canUndo(h)) return null;
  return { history: { past: h.past.slice(0, -1) }, state: h.past[h.past.length - 1] };
}
