import { sampleGridFromRGBA, cropToPixels } from '../sampling';
import { colorName, hexToRgb, rgbToHex } from '../colors';
import { DEFAULT_YARN, estimateFromGrid, calibrate } from '../yarn';
import { straightRows } from '../workOrder';
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
    const est = estimateFromGrid(g, palette, straightRows(g, { startCorner: 'bottom-right', mode: 'flat' }), y);
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
    const est = estimateFromGrid(g, palette, straightRows(g, { startCorner: 'bottom-right', mode: 'flat' }), y);
    // a: 2 pontos * 4cm * 1.5 + 2 blocos * 10cm = 32cm
    expect(est.perColor.find((c) => c.colorId === 'a')!.meters).toBe(0.32);
  });

  test('calibração', () => {
    expect(calibrate(10, 42)).toBe(4.2);
  });
});

describe('leitura de grid: transparência, limite de cores e recorte', () => {
  const solid = (cells: [number, number, number, number][][], cell = 8) => {
    const rows = cells.length;
    const cols = cells[0].length;
    const w = cols * cell;
    const h = rows * cell;
    const px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) px.set(cells[Math.floor(y / cell)][Math.floor(x / cell)], (y * w + x) * 4);
    return { px, w, h };
  };
  const hexes = (r: ReturnType<typeof sampleGridFromRGBA>) => {
    const byId = new Map(r.palette.map((p) => [p.id, p.hex]));
    return r.grid.cells.map((c) => byId.get(c!));
  };

  test('pixel transparente é lido como branco', () => {
    const { px, w, h } = solid([
      [
        [0, 0, 0, 0],
        [0, 0, 200, 255],
      ],
    ]);
    expect(hexes(sampleGridFromRGBA(px, w, h, { rows: 1, cols: 2, maxColors: 6 }))).toEqual(['#FFFFFF', '#0000C8']);
  });

  test('respeita o número máximo de cores', () => {
    const { px, w, h } = solid([
      [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 0, 255],
        [0, 0, 0, 255],
        [255, 255, 255, 255],
      ],
    ]);
    expect(sampleGridFromRGBA(px, w, h, { rows: 1, cols: 6, maxColors: 6 }).palette).toHaveLength(6);
    const limited = sampleGridFromRGBA(px, w, h, { rows: 1, cols: 6, maxColors: 3 });
    expect(limited.palette).toHaveLength(3);
    expect(new Set(limited.grid.cells).size).toBe(3);
  });

  test('tons quase iguais viram uma cor só', () => {
    const { px, w, h } = solid([
      [
        [220, 30, 40, 255],
        [226, 36, 44, 255],
        [20, 40, 200, 255],
      ],
    ]);
    const r = sampleGridFromRGBA(px, w, h, { rows: 1, cols: 3, maxColors: 6 });
    expect(r.palette).toHaveLength(2);
    expect(r.grid.cells[0]).toBe(r.grid.cells[1]);
    expect(r.grid.cells[2]).not.toBe(r.grid.cells[0]);
  });

  test('a paleta vem da cor mais usada para a menos usada', () => {
    const A: [number, number, number, number] = [255, 255, 255, 255];
    const B: [number, number, number, number] = [200, 0, 0, 255];
    const { px, w, h } = solid([[B, A, A, A]]);
    expect(sampleGridFromRGBA(px, w, h, { rows: 1, cols: 4, maxColors: 6 }).palette.map((p) => p.hex)).toEqual(['#FFFFFF', '#C80000']);
  });

  test('recorte fora dos limites ou invertido é corrigido e nunca fica vazio', () => {
    expect(cropToPixels({ left: -0.5, top: 0, right: 2, bottom: 1 }, 100, 50)).toEqual({ originX: 0, originY: 0, width: 100, height: 50 });
    expect(cropToPixels({ left: 0.9, top: 0.8, right: 0.1, bottom: 0.2 }, 100, 50)).toEqual({ originX: 10, originY: 10, width: 80, height: 30 });
    expect(cropToPixels({ left: 0.5, top: 0.5, right: 0.5, bottom: 0.5 }, 100, 50)).toEqual({ originX: 50, originY: 25, width: 1, height: 1 });
    expect(cropToPixels({ left: 1, top: 1, right: 1, bottom: 1 }, 100, 50)).toEqual({ originX: 99, originY: 49, width: 1, height: 1 });
  });
});
