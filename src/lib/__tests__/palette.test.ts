import { addColor, mergeColors, removeColor, shades, updateColor } from '../palette';
import { colorUsage, createGrid, idx, lineCells, paintCells } from '../grid';
import type { Grid, PaletteColor } from '../types';

function gridFrom(rows: string[]): Grid {
  // cada caractere é um id de cor; '.' = vazio
  const g = createGrid(rows.length, rows[0].length);
  rows.forEach((line, r) => line.split('').forEach((ch, c) => (g.cells[idx(g, r, c)] = ch === '.' ? null : ch)));
  return g;
}

const palette: PaletteColor[] = [
  { id: 'A', name: 'Azul', hex: '#285AC8' },
  { id: 'B', name: 'Branco', hex: '#FFFFFF' },
];

describe('pincel', () => {
  test('pinta as células tocadas com a cor escolhida', () => {
    const g = paintCells(gridFrom(['AAA', 'AAA']), [0, 4], 'B');
    expect(g.cells).toEqual(['B', 'A', 'A', 'A', 'B', 'A']);
  });

  test('pintar com "vazio" apaga a célula', () => {
    expect(paintCells(gridFrom(['AB']), [1], null).cells).toEqual(['A', null]);
  });

  test('não muda nada (mesmo objeto) quando as células já têm a cor', () => {
    const g = gridFrom(['AB']);
    expect(paintCells(g, [0], 'A')).toBe(g);
  });

  test('ignora células fora do grid e não altera o original', () => {
    const g = gridFrom(['AB']);
    const out = paintCells(g, [-1, 1, 2], 'A');
    expect(out.cells).toEqual(['A', 'A']);
    expect(g.cells).toEqual(['A', 'B']);
  });
});

describe('arrasto do pincel', () => {
  const g = createGrid(4, 5);

  test('um toque só dá a própria célula', () => {
    expect(lineCells(g, 7, 7)).toEqual([7]);
  });

  test('liga duas células da mesma linha sem deixar buracos', () => {
    expect(lineCells(g, idx(g, 1, 0), idx(g, 1, 4))).toEqual([5, 6, 7, 8, 9]);
  });

  test('liga na vertical e de trás para a frente', () => {
    expect(lineCells(g, idx(g, 3, 2), idx(g, 0, 2))).toEqual([17, 12, 7, 2]);
  });

  test('na diagonal passa por uma célula de cada linha', () => {
    expect(lineCells(g, idx(g, 0, 0), idx(g, 3, 3))).toEqual([0, 6, 12, 18]);
  });

  test('num arrasto rápido e inclinado, começa e termina nas células tocadas', () => {
    const cells = lineCells(g, idx(g, 0, 0), idx(g, 1, 4));
    expect(cells[0]).toBe(0);
    expect(cells[cells.length - 1]).toBe(9);
    expect(cells).toHaveLength(5);
  });
});

describe('uso por cor', () => {
  test('conta as células de cada cor, sem contar as vazias', () => {
    const u = colorUsage(gridFrom(['AAB', '.B.']));
    expect(u.get('A')).toBe(2);
    expect(u.get('B')).toBe(2);
    expect(u.size).toBe(2);
  });
});

describe('paleta', () => {
  test('adicionar cor põe no fim e devolve a cor criada', () => {
    const { palette: p, color } = addColor(palette, { hex: '#d21e28', name: 'Vermelho Anne 3500' });
    expect(p).toHaveLength(3);
    expect(p[2]).toBe(color);
    expect(color).toMatchObject({ name: 'Vermelho Anne 3500', hex: '#D21E28' });
    expect(palette).toHaveLength(2);
  });

  test('cor nova sem nome ganha um nome aproximado', () => {
    expect(addColor(palette, { hex: '#D21E28', name: '  ' }).color.name).toBe('Vermelho');
  });

  test('nomes repetidos ganham um número', () => {
    const one = addColor(palette, { hex: '#285AC8', name: 'Azul' });
    expect(one.color.name).toBe('Azul 2');
    expect(addColor(one.palette, { hex: '#285AC8', name: 'azul' }).color.name).toBe('azul 3');
  });

  test('trocar o tom mantém o id (o grid inteiro muda junto) e o nome', () => {
    const p = updateColor(palette, 'A', { hex: '#14235a' });
    expect(p[0]).toEqual({ id: 'A', name: 'Azul', hex: '#14235A' });
    expect(p[1]).toBe(palette[1]);
  });

  test('renomear não esbarra no próprio nome, mas não repete o de outra cor', () => {
    expect(updateColor(palette, 'A', { name: 'Azul' })[0].name).toBe('Azul');
    expect(updateColor(palette, 'A', { name: 'Azul Anne 2500' })[0].name).toBe('Azul Anne 2500');
    expect(updateColor(palette, 'A', { name: 'Branco' })[0].name).toBe('Branco 2');
  });

  test('nome em branco ou hex inválido não são aplicados', () => {
    expect(updateColor(palette, 'A', { name: ' ', hex: 'xyz' })[0]).toEqual(palette[0]);
  });
});

describe('mesclar e excluir', () => {
  const art = { grid: gridFrom(['AAB', '.BA']), palette };

  test('mesclar passa as células para a cor de destino e tira a origem da paleta', () => {
    const out = mergeColors(art, 'A', 'B');
    expect(out.grid.cells).toEqual(['B', 'B', 'B', null, 'B', 'B']);
    expect(out.palette.map((c) => c.id)).toEqual(['B']);
  });

  test('mesclar uma cor com ela mesma ou com uma que não existe não faz nada', () => {
    expect(mergeColors(art, 'A', 'A')).toBe(art);
    expect(mergeColors(art, 'A', 'Z')).toBe(art);
    expect(mergeColors(art, 'Z', 'A')).toBe(art);
  });

  test('excluir esvazia as células da cor e tira a cor da paleta', () => {
    const out = removeColor(art, 'A');
    expect(out.grid.cells).toEqual([null, null, 'B', null, 'B', null]);
    expect(out.palette.map((c) => c.id)).toEqual(['B']);
  });

  test('o original não é alterado', () => {
    removeColor(art, 'A');
    mergeColors(art, 'A', 'B');
    expect(art.grid.cells).toEqual(['A', 'A', 'B', null, 'B', 'A']);
    expect(art.palette).toHaveLength(2);
  });
});

describe('tons', () => {
  test('dá variações do mais claro ao mais escuro, com a cor atual no meio', () => {
    const t = shades('#285AC8', 7);
    expect(t).toHaveLength(7);
    expect(t[3]).toBe('#285AC8');
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    for (let i = 1; i < t.length; i++) expect(lum(t[i])).toBeLessThan(lum(t[i - 1]));
  });

  test('não repete tons nas pontas (branco e preto)', () => {
    expect(new Set(shades('#FFFFFF', 7)).size).toBe(shades('#FFFFFF', 7).length);
    expect(new Set(shades('#000000', 7)).size).toBe(shades('#000000', 7).length);
  });
});
