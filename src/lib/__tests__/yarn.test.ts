import { addYarn, applyCalibration, calibrate, DEFAULT_YARN, estimateFromGrid, removeYarn, setColorYarn, updateYarn, yarnForColor, yarnInputError } from '../yarn';
import { straightRows } from '../workOrder';
import { createGrid, idx } from '../grid';
import type { Grid, PaletteColor, Yarn, YarnSettings } from '../types';

function gridFrom(rows: string[]): Grid {
  const g = createGrid(rows.length, rows[0].length);
  rows.forEach((line, r) => line.split('').forEach((ch, c) => (g.cells[idx(g, r, c)] = ch === '.' ? null : ch)));
  return g;
}
const order = (g: Grid) => straightRows(g, { startCorner: 'bottom-right', mode: 'flat' });

const palette: PaletteColor[] = [
  { id: 'a', name: 'Azul', hex: '#0000FF' },
  { id: 'b', name: 'Branco', hex: '#FFFFFF' },
];
const anne: Yarn = { id: 'anne', name: 'Anne 500', metersPerSkein: 500, gramsPerSkein: 145 };
const cisne: Yarn = { id: 'cisne', name: 'Cisne', metersPerSkein: 100 }; // sem gramas
/** 1 cm por ponto, sem perda e sem pontas: as contas ficam fáceis de conferir */
const plain: YarnSettings = {
  ...DEFAULT_YARN,
  stitchTypes: [{ id: 'pb', name: 'Ponto baixo (pb)', cmPerStitch: 1 }],
  gridStitchId: 'pb',
  wastePercent: 0,
  tailPerColorChangeCm: 0,
};

describe('consumo por cor', () => {
  test('pontos × cm por ponto, em metros', () => {
    const g = createGrid(10, 10, 'a');
    g.cells[0] = 'b';
    const est = estimateFromGrid(g, palette, order(g), { ...plain, stitchTypes: [{ id: 'pb', name: 'pb', cmPerStitch: 4 }] }, []);
    expect(est.perColor.find((c) => c.colorId === 'a')!.meters).toBe(3.96);
    expect(est.perColor.find((c) => c.colorId === 'b')!.meters).toBe(0.04);
    expect(est.totalMeters).toBe(4);
  });

  test('margem de perda sobre os pontos e uma ponta por bloco de cor', () => {
    const g = gridFrom(['aba']); // 'a' tem 2 blocos
    const est = estimateFromGrid(g, palette, order(g), { ...plain, stitchTypes: [{ id: 'pb', name: 'pb', cmPerStitch: 4 }], wastePercent: 50, tailPerColorChangeCm: 10 }, []);
    // a: 2 pontos × 4 cm × 1,5 + 2 blocos × 10 cm = 32 cm
    expect(est.perColor.find((c) => c.colorId === 'a')).toMatchObject({ stitches: 2, segments: 2, meters: 0.32 });
  });

  test('cores da paleta que não aparecem no grid ficam fora da lista; a mais usada vem primeiro', () => {
    const g = gridFrom(['bbbbaa']);
    const est = estimateFromGrid(g, [...palette, { id: 'c', name: 'Cru', hex: '#EEE' }], order(g), plain, []);
    expect(est.perColor.map((c) => c.colorId)).toEqual(['b', 'a']);
  });

  test('usa o ponto escolhido para as células do grid', () => {
    const g = gridFrom(['aaaa']);
    const y = { ...plain, stitchTypes: [plain.stitchTypes[0], { id: 'pa', name: 'Ponto alto', cmPerStitch: 10 }], gridStitchId: 'pa' };
    expect(estimateFromGrid(g, palette, order(g), y, []).totalMeters).toBe(0.4);
  });
});

describe('novelos e gramas pela linha de cada cor', () => {
  // 'a': 250 pontos de 1 cm = 2,5 m; 'b': 150 pontos = 1,5 m
  const g = createGrid(1, 400, 'a');
  for (let i = 250; i < 400; i++) g.cells[i] = 'b';

  test('cor sem linha própria usa a linha padrão do projeto', () => {
    const y = { ...plain, defaultYarnId: 'cisne', colorYarns: {} };
    expect(yarnForColor(y, [anne, cisne], 'a')).toBe(cisne);
  });

  test('cor com linha própria usa a dela', () => {
    const y = { ...plain, defaultYarnId: 'cisne', colorYarns: { a: 'anne' } };
    expect(yarnForColor(y, [anne, cisne], 'a')).toBe(anne);
    expect(yarnForColor(y, [anne, cisne], 'b')).toBe(cisne);
  });

  test('linha excluída do cadastro cai na padrão; sem padrão, a cor fica sem linha', () => {
    expect(yarnForColor({ ...plain, defaultYarnId: 'cisne', colorYarns: { a: 'sumiu' } }, [cisne], 'a')).toBe(cisne);
    expect(yarnForColor({ ...plain, defaultYarnId: 'sumiu', colorYarns: {} }, [cisne], 'a')).toBeUndefined();
    expect(yarnForColor({ ...plain, defaultYarnId: null }, [cisne], 'a')).toBeUndefined();
  });

  test('novelos arredondados para cima na compra e gramas pelo peso do novelo', () => {
    const y = { ...plain, defaultYarnId: 'cisne', colorYarns: { a: 'anne' } };
    const tiny = { ...anne, metersPerSkein: 1 }; // 2,5 m → 2,5 novelos → compra 3
    const est = estimateFromGrid(g, palette, order(g), y, [tiny, { ...cisne, metersPerSkein: 1.5 }]);
    const a = est.perColor.find((c) => c.colorId === 'a')!;
    expect(a).toMatchObject({ meters: 2.5, skeins: 2.5, skeinsToBuy: 3, grams: 362.5 });
    expect(a.yarn?.id).toBe('anne');
    const b = est.perColor.find((c) => c.colorId === 'b')!;
    expect(b).toMatchObject({ meters: 1.5, skeins: 1, skeinsToBuy: 1 }); // exatamente 1 novelo: não compra 2
    expect(b.grams).toBeUndefined(); // linha sem peso cadastrado
    expect(est.totalSkeinsToBuy).toBe(4); // novelos não se dividem entre cores
    expect(est.totalGrams).toBe(362.5);
    expect(est.colorsWithoutYarn).toBe(0);
  });

  test('sem linha associada, mostra só os metros e conta as cores sem linha', () => {
    const est = estimateFromGrid(g, palette, order(g), { ...plain, defaultYarnId: null }, []);
    expect(est.perColor[0].skeins).toBeUndefined();
    expect(est.perColor[0].skeinsToBuy).toBeUndefined();
    expect(est.perColor[0].grams).toBeUndefined();
    expect(est.totalSkeinsToBuy).toBe(0);
    expect(est.totalGrams).toBeUndefined();
    expect(est.colorsWithoutYarn).toBe(2);
    expect(est.totalMeters).toBe(4);
  });

  test('associar e desassociar a linha de uma cor', () => {
    const y1 = setColorYarn(plain, 'a', 'anne');
    expect(y1.colorYarns).toEqual({ a: 'anne' });
    const y2 = setColorYarn(y1, 'a', null); // volta a usar a linha do projeto
    expect(y2.colorYarns).toEqual({});
    expect(plain.colorYarns ?? {}).toEqual({});
  });
});

describe('calibração', () => {
  test('cm por ponto a partir de "fiz N pontos e gastei X cm"', () => {
    expect(calibrate(10, 42)).toBe(4.2);
    expect(calibrate(0, 42)).toBe(0);
  });

  test('aplicar a calibração muda só o ponto escolhido', () => {
    const y = applyCalibration(DEFAULT_YARN, 'pb', 20, 90);
    expect(y.stitchTypes.find((s) => s.id === 'pb')!.cmPerStitch).toBe(4.5);
    expect(y.stitchTypes.find((s) => s.id === 'pa')!.cmPerStitch).toBe(DEFAULT_YARN.stitchTypes.find((s) => s.id === 'pa')!.cmPerStitch);
  });

  test('medida inválida não altera nada', () => {
    expect(applyCalibration(DEFAULT_YARN, 'pb', 0, 90)).toBe(DEFAULT_YARN);
    expect(applyCalibration(DEFAULT_YARN, 'pb', 10, 0)).toBe(DEFAULT_YARN);
    expect(applyCalibration(DEFAULT_YARN, 'nao-existe', 10, 40)).toBe(DEFAULT_YARN);
  });
});

describe('linhas cadastradas', () => {
  test('cadastrar: nome sem espaços nas pontas, gramas opcionais', () => {
    const { yarns, yarn } = addYarn([cisne], { name: '  Anne 500 ', metersPerSkein: 500, gramsPerSkein: 0 });
    expect(yarns).toHaveLength(2);
    expect(yarns[1]).toBe(yarn);
    expect(yarn).toMatchObject({ name: 'Anne 500', metersPerSkein: 500 });
    expect(yarn.gramsPerSkein).toBeUndefined();
    expect(yarn.id).not.toBe(cisne.id);
  });

  test('editar mantém o id; excluir tira do cadastro', () => {
    const edited = updateYarn([anne, cisne], 'cisne', { name: 'Cisne Eco', metersPerSkein: 120, gramsPerSkein: 50 });
    expect(edited[1]).toEqual({ id: 'cisne', name: 'Cisne Eco', metersPerSkein: 120, gramsPerSkein: 50 });
    expect(edited[0]).toBe(anne);
    expect(removeYarn(edited, 'anne').map((y) => y.id)).toEqual(['cisne']);
  });

  test('valida nome e metros por novelo', () => {
    expect(yarnInputError({ name: ' ', metersPerSkein: 100 })).toMatch(/nome/i);
    expect(yarnInputError({ name: 'Cisne', metersPerSkein: 0 })).toMatch(/metros/i);
    expect(yarnInputError({ name: 'Cisne', metersPerSkein: 100, gramsPerSkein: -1 })).toMatch(/gramas/i);
    expect(yarnInputError({ name: 'Cisne', metersPerSkein: 100 })).toBeNull();
  });
});
