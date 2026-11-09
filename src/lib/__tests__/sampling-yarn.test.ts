import { sampleGridFromRGBA, cropToPixels } from '../sampling';
import { colorName, hexToRgb, rgbToHex } from '../colors';
import { DEFAULT_YARN, estimateFromGrid, estimateFromRecipe, matchStitch, calibrate } from '../yarn';
import { createGrid } from '../grid';

/** Gera uma imagem RGBA de um gráfico 2x3 com linhas pretas de 1px entre as células. */
function chartImage(colors: [number, number, number][][], cell = 10) {
  const rows = colors.length;
  const cols = colors[0].length;
  const w = cols * cell;
  const h = rows * cell;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const line = x % cell === 0 || y % cell === 0;
      const c = line ? [0, 0, 0] : colors[Math.floor(y / cell)][Math.floor(x / cell)];
      const p = (y * w + x) * 4;
      px[p] = c[0];
      px[p + 1] = c[1];
      px[p + 2] = c[2];
      px[p + 3] = 255;
    }
  }
  return { px, w, h };
}

describe('leitura de grid a partir de pixels', () => {
  test('ignora as linhas do grid e reconhece as cores', () => {
    const R: [number, number, number] = [220, 30, 40];
    const W: [number, number, number] = [255, 255, 255];
    const { px, w, h } = chartImage([
      [R, W, R],
      [W, W, R],
    ]);
    const { grid, palette } = sampleGridFromRGBA(px, w, h, { rows: 2, cols: 3, maxColors: 6 });
    expect(palette).toHaveLength(2);
    const byId = new Map(palette.map((p) => [p.id, p.hex]));
    expect(grid.cells.map((c) => byId.get(c!))).toEqual([
      rgbToHex(R),
      rgbToHex(W),
      rgbToHex(R),
      rgbToHex(W),
      rgbToHex(W),
      rgbToHex(R),
    ]);
    // ordenada por uso: branco (3) e vermelho (3) — empate; ambos presentes
    expect(new Set(palette.map((p) => p.name))).toEqual(new Set(['Vermelho', 'Branco']));
  });

  test('recorte em frações vira pixels', () => {
    expect(cropToPixels({ left: 0.1, top: 0.2, right: 0.9, bottom: 1 }, 100, 50)).toEqual({ originX: 10, originY: 10, width: 80, height: 40 });
  });
});

describe('cores', () => {
  test('hex ida e volta', () => {
    expect(rgbToHex(hexToRgb('#a1b2c3'))).toBe('#A1B2C3');
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
  test('nome aproximado', () => {
    expect(colorName('#1A2A80')).toBe('Azul marinho');
  });
});

describe('cálculo de fio', () => {
  test('por cor a partir do grid', () => {
    const g = createGrid(10, 10, 'a');
    g.cells[0] = 'b';
    const palette = [
      { id: 'a', name: 'Azul', hex: '#0000FF' },
      { id: 'b', name: 'Branco', hex: '#FFFFFF' },
    ];
    const y = { ...DEFAULT_YARN, wastePercent: 0, tailPerColorChangeCm: 0, metersPerSkein: 1 };
    const est = estimateFromGrid(g, palette, { startCorner: 'bottom-right', mode: 'flat' }, y);
    // pb = 4 cm por ponto
    expect(est.perColor.find((c) => c.colorId === 'a')!.meters).toBe(3.96);
    expect(est.perColor.find((c) => c.colorId === 'b')!.meters).toBe(0.04);
    expect(est.totalMeters).toBe(4);
    expect(est.totalSkeins).toBe(4);
  });

  test('pontas por troca de cor e margem de perda', () => {
    const g = createGrid(1, 3, 'a');
    g.cells[1] = 'b'; // a b a => 'a' tem 2 blocos
    const palette = [
      { id: 'a', name: 'Azul', hex: '#0000FF' },
      { id: 'b', name: 'Branco', hex: '#FFFFFF' },
    ];
    const y = { ...DEFAULT_YARN, wastePercent: 50, tailPerColorChangeCm: 10 };
    const est = estimateFromGrid(g, palette, { startCorner: 'bottom-right', mode: 'flat' }, y);
    // a: 2 pontos * 4cm * 1.5 + 2 blocos * 10cm = 32cm
    expect(est.perColor.find((c) => c.colorId === 'a')!.meters).toBe(0.32);
  });

  test('associa nomes de pontos da receita', () => {
    const t = DEFAULT_YARN.stitchTypes;
    expect(matchStitch('pb', t)?.id).toBe('pb');
    expect(matchStitch('Ponto alto duplo', t)?.id).toBe('pad');
    expect(matchStitch('ponto alto', t)?.id).toBe('pa');
    expect(matchStitch('sc', t)?.id).toBe('pb');
    expect(matchStitch('correntinhas', t)?.id).toBe('corr');
    expect(matchStitch('xyz', t)).toBeUndefined();
    expect(matchStitch('Correntinha', t)?.id).toBe('corr');
  });

  test('estimativa pela receita', () => {
    const y = { ...DEFAULT_YARN, wastePercent: 0 };
    const r = estimateFromRecipe([{ stitch: 'pa', count: 100 }], y);
    expect(r.totalMeters).toBe(7);
  });

  test('calibração', () => {
    expect(calibrate(10, 42)).toBe(4.2);
  });
});
