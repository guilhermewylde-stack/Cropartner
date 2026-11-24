import { colorName } from './colors';
import { workOrderFor } from './workOrder';
import { estimateFromGrid, estimateRemaining } from './yarn';
import { EMPTY_SHELF } from './shelf';
import type { Project, Yarn } from './types';

const DAY = 86_400_000;

export interface ColorTotal {
  /** nome aproximado do tom ("Vermelho"), que junta cores parecidas de projetos diferentes */
  name: string;
  /** cor de quem mais contribuiu para o total */
  hex: string;
  stitches: number;
}

export interface ProfileStats {
  finished: number;
  finishedThisYear: number;
  inProgress: number;
  wanted: number;
  stitchesDone: number;
  metersUsed: number;
  /** até 5 cores, da mais usada para a menos usada (pelos pontos feitos) */
  topColors: ColorTotal[];
  /** média de dias entre começo e fim das peças feitas que têm as duas datas */
  averageDaysPerPiece: number | null;
}

/** Números do perfil, só com o que já foi crochetado. */
export function profileStats(projects: Project[], yarns: Yarn[], now: number, opts: { leftHanded: boolean }): ProfileStats {
  const year = new Date(now).getFullYear();
  let stitchesDone = 0;
  let meters = 0;
  const colors = new Map<string, { hex: string; stitches: number; best: number; perHex: Map<string, number> }>();
  const durations: number[] = [];

  for (const p of projects) {
    const shelf = p.shelf ?? EMPTY_SHELF;
    if (shelf.status === 'done' && shelf.startedAt != null && shelf.finishedAt != null) durations.push((shelf.finishedAt - shelf.startedAt) / DAY);
    if (!p.grid) continue;
    const order = workOrderFor(p.grid, p.work, opts);
    const done = Math.max(0, Math.min(p.progress ?? 0, order.totalStitches));
    if (done === 0) continue;
    stitchesDone += done;
    meters += estimateFromGrid(p.grid, p.palette, order, p.yarn, yarns).totalMeters - estimateRemaining(p.grid, p.palette, order, p.yarn, yarns, done).totalMeters;

    const hexOf = new Map(p.palette.map((c) => [c.id, c.hex]));
    for (let i = 0; i < done; i++) {
      const hex = hexOf.get(p.grid.cells[order.cellAt(i)] ?? '');
      if (!hex) continue;
      const name = colorName(hex);
      const entry = colors.get(name) ?? { hex, stitches: 0, best: 0, perHex: new Map<string, number>() };
      entry.stitches++;
      const n = (entry.perHex.get(hex) ?? 0) + 1;
      entry.perHex.set(hex, n);
      if (n > entry.best) {
        entry.best = n;
        entry.hex = hex;
      }
      colors.set(name, entry);
    }
  }

  const count = (s: string) => projects.filter((p) => (p.shelf ?? EMPTY_SHELF).status === s).length;
  return {
    finished: count('done'),
    finishedThisYear: projects.filter((p) => p.shelf?.status === 'done' && p.shelf.finishedAt != null && new Date(p.shelf.finishedAt).getFullYear() === year).length,
    inProgress: count('doing'),
    wanted: count('want'),
    stitchesDone,
    metersUsed: Math.round(meters * 100) / 100,
    // sort estável: empate fica na ordem em que a cor apareceu
    topColors: [...colors.entries()]
      .map(([name, c]) => ({ name, hex: c.hex, stitches: c.stitches }))
      .sort((a, b) => b.stitches - a.stitches)
      .slice(0, 5),
    averageDaysPerPiece: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
  };
}
