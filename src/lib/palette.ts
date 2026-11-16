import { colorName, hexToRgb, isValidHex, makePaletteColor, normalizeHex, rgbToHex, type RGB } from './colors';
import { replaceColor } from './grid';
import type { Grid, PaletteColor } from './types';

/** O que o editor de cores altera: o desenho e a paleta. O progresso fica de fora, de propósito. */
export interface Artwork {
  grid: Grid;
  palette: PaletteColor[];
}

/** Nome livre na paleta: "Azul", "Azul 2", "Azul 3"… (sem diferenciar maiúsculas). */
function freeName(palette: PaletteColor[], name: string, exceptId?: string): string {
  const taken = new Set(palette.filter((c) => c.id !== exceptId).map((c) => c.name.trim().toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** Adiciona uma cor ao fim da paleta. Sem nome, usa um nome aproximado pelo tom. */
export function addColor(palette: PaletteColor[], input: { hex: string; name?: string }): { palette: PaletteColor[]; color: PaletteColor } {
  const hex = normalizeHex(input.hex);
  const color = makePaletteColor(hex, freeName(palette, input.name?.trim() || colorName(hex)));
  return { palette: [...palette, color], color };
}

/**
 * Troca o tom e/ou o nome de uma cor. O id não muda, então todas as células acompanham.
 * Nome em branco e hex inválido são ignorados; nome repetido ganha um número.
 */
export function updateColor(palette: PaletteColor[], id: string, patch: { hex?: string; name?: string }): PaletteColor[] {
  return palette.map((c) => {
    if (c.id !== id) return c;
    const name = patch.name?.trim();
    return {
      ...c,
      hex: patch.hex != null && isValidHex(patch.hex) ? normalizeHex(patch.hex) : c.hex,
      name: name ? freeName(palette, name, id) : c.name,
    };
  });
}

/** Mesclar: as células de `fromId` passam para `intoId` e `fromId` sai da paleta. */
export function mergeColors(art: Artwork, fromId: string, intoId: string): Artwork {
  const has = (id: string) => art.palette.some((c) => c.id === id);
  if (fromId === intoId || !has(fromId) || !has(intoId)) return art;
  return { grid: replaceColor(art.grid, fromId, intoId), palette: art.palette.filter((c) => c.id !== fromId) };
}

/** Excluir: as células da cor ficam vazias e a cor sai da paleta. */
export function removeColor(art: Artwork, id: string): Artwork {
  return { grid: replaceColor(art.grid, id, null), palette: art.palette.filter((c) => c.id !== id) };
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * Tons da mesma cor, do mais claro ao mais escuro, com a cor atual no meio — para acertar o tom da
 * linha de verdade sem digitar hex. Nas pontas (branco/preto) os tons repetidos são descartados.
 */
export function shades(hex: string, count = 7): string[] {
  const base = hexToRgb(hex);
  const half = Math.floor(count / 2);
  const out: string[] = [];
  for (let i = -half; i <= half; i++) {
    const t = Math.abs(i) / (half + 1);
    out.push(rgbToHex(i < 0 ? mix(base, [255, 255, 255], t) : mix(base, [0, 0, 0], t)));
  }
  return [...new Set(out)];
}
