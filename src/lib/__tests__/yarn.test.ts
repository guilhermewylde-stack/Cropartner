import { addYarn, applyCalibration, calibrate, DEFAULT_YARN, estimateFromGrid, estimateRemaining, removeYarn, setColorYarn, setStock, stockVerdict, updateYarn, yarnForColor, yarnInputError } from '../yarn';
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

  test('pouquinho de linha ainda é 1 novelo na compra', () => {
    const g1 = gridFrom(['a']);
    const est = estimateFromGrid(g1, palette, order(g1), { ...plain, defaultYarnId: 'anne' }, [anne]);
    expect(est.perColor[0]).toMatchObject({ meters: 0.01, skeinsToBuy: 1 });
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

describe('quanto falta, pelo progresso', () => {
  // carreira 1 (de baixo, da direita p/ a esquerda): b b a a a a  → blocos: b(2) a(4)
  // carreira 2 (da esquerda p/ a direita):            a a a b b b  → blocos: a(3) b(3)
  const g = gridFrom(['aaabbb', 'aaaabb']);
  const o = order(g);
  const y = { ...plain, tailPerColorChangeCm: 100 }; // 1 cm por ponto e 1 m de ponta por bloco: fácil de ler

  test('com o progresso zerado, é igual à lista de compras', () => {
    expect(estimateRemaining(g, palette, o, y, [cisne], 0)).toEqual(estimateFromGrid(g, palette, o, y, [cisne]));
  });

  test('conta só os pontos não feitos e não cobra de novo a ponta de um bloco já começado', () => {
    // feitos: b b a (3 pontos) → o bloco a(4) já começou: falta 3 pontos de a sem ponta
    const r = estimateRemaining(g, palette, o, y, [], 3);
    const a = r.perColor.find((c) => c.colorId === 'a')!;
    const b = r.perColor.find((c) => c.colorId === 'b')!;
    expect(a).toMatchObject({ stitches: 3 + 3, segments: 1 }); // 3 do bloco começado + bloco a(3) da carreira 2
    expect(a.meters).toBe(1.06); // 6 cm + 1 ponta
    expect(b).toMatchObject({ stitches: 3, segments: 1, meters: 1.03 });
  });

  test('bloco ainda não começado conta a ponta, mesmo logo depois do último ponto feito', () => {
    const r = estimateRemaining(g, palette, o, y, [], 2); // feitos: b b; o bloco a(4) começa agora
    expect(r.perColor.find((c) => c.colorId === 'a')).toMatchObject({ stitches: 7, segments: 2 });
  });

  test('cor já terminada continua na lista, com zero', () => {
    const r = estimateRemaining(g, palette, o, y, [], 9); // a termina no 9º ponto
    expect(r.perColor.find((c) => c.colorId === 'a')).toMatchObject({ stitches: 0, segments: 0, meters: 0 });
  });

  test('com tudo feito, não falta nada', () => {
    const r = estimateRemaining(g, palette, o, y, [cisne], 12);
    expect(r.totalMeters).toBe(0);
    expect(r.totalSkeinsToBuy).toBe(0);
    expect(r.perColor.every((c) => c.meters === 0)).toBe(true);
  });
});

describe('vai dar / vai faltar', () => {
  const need = (meters: number, yarn?: Yarn) => ({ colorId: 'a', name: 'Azul', hex: '#00F', stitches: 1, segments: 1, meters, yarn });

  test('sem estoque informado, não há veredito', () => {
    expect(stockVerdict(need(10, cisne), undefined)).toEqual({ status: 'unknown', reason: 'no-stock' });
  });

  test('estoque em metros que sobra', () => {
    expect(stockVerdict(need(10), { amount: 25.5, unit: 'meters' })).toEqual({ status: 'enough', haveMeters: 25.5, leftoverMeters: 15.5 });
  });

  test('exatamente o necessário vai dar, com sobra zero', () => {
    expect(stockVerdict(need(100, cisne), { amount: 1, unit: 'skeins' })).toEqual({ status: 'enough', haveMeters: 100, leftoverMeters: 0 });
  });

  test('estoque em novelos que não dá: quanto falta e quantos novelos comprar', () => {
    // 1,5 novelo de 100 m = 150 m; precisa de 260 m → faltam 110 m → 2 novelos
    expect(stockVerdict(need(260, cisne), { amount: 1.5, unit: 'skeins' })).toEqual({ status: 'short', haveMeters: 150, missingMeters: 110, skeinsToBuy: 2 });
  });

  test('falta pouquinho de um novelo grande: ainda é 1 novelo a comprar', () => {
    const anne500 = { ...anne, metersPerSkein: 500 };
    expect(stockVerdict(need(2.1, anne500), { amount: 2, unit: 'meters' })).toMatchObject({ status: 'short', missingMeters: 0.1, skeinsToBuy: 1 });
  });

  test('faltando, sem linha associada, diz os metros mas não os novelos', () => {
    expect(stockVerdict(need(30), { amount: 10, unit: 'meters' })).toEqual({ status: 'short', haveMeters: 10, missingMeters: 20 });
  });

  test('estoque em novelos sem linha associada: não dá para converter', () => {
    expect(stockVerdict(need(30), { amount: 2, unit: 'skeins' })).toEqual({ status: 'unknown', reason: 'no-yarn' });
  });

  test('informar e apagar o estoque de uma cor', () => {
    const y1 = setStock(plain, 'a', { amount: 2, unit: 'skeins' });
    expect(y1.stock).toEqual({ a: { amount: 2, unit: 'skeins' } });
    expect(setStock(y1, 'a', null).stock).toEqual({});
    expect(plain.stock ?? {}).toEqual({});
  });
});
