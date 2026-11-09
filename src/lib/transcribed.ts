import { makePaletteColor, uniqueNames } from './colors';
import type { Grid, PaletteColor } from './types';

/** Converte a transcrição em letras para um Grid, normalizando linhas curtas/longas. */
export function gridFromTranscription(t: { colors: { letter: string; hex: string; name: string }[]; rows: string[] }, rows: number, cols: number): { grid: Grid; palette: PaletteColor[] } {
  const palette = uniqueNames(t.colors.map((c) => makePaletteColor(c.hex, c.name)));
  const byLetter = new Map(t.colors.map((c, i) => [c.letter.trim().charAt(0), palette[i].id]));
  const cells: (string | null)[] = [];
  for (let r = 0; r < rows; r++) {
    const line = (t.rows[r] ?? '').replace(/\s+/g, '');
    for (let c = 0; c < cols; c++) {
      const ch = line.charAt(c);
      cells.push(byLetter.get(ch) ?? null);
    }
  }
  return { grid: { rows, cols, cells, done: '0'.repeat(rows * cols) }, palette };
}
