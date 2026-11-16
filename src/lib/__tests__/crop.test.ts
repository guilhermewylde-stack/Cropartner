import { dragCrop, hitCropHandle, MIN_CROP } from '../crop';
import { FULL_IMAGE, type CropFractions } from '../sampling';

const BOX: CropFractions = { left: 0.2, top: 0.3, right: 0.8, bottom: 0.9 };

/** compara com tolerância de ponto flutuante */
const expectCrop = (got: CropFractions, want: CropFractions) => {
  expect(got.left).toBeCloseTo(want.left, 6);
  expect(got.top).toBeCloseTo(want.top, 6);
  expect(got.right).toBeCloseTo(want.right, 6);
  expect(got.bottom).toBeCloseTo(want.bottom, 6);
};

describe('arrastar o recorte', () => {
  test('uma borda move só o lado dela', () => {
    expectCrop(dragCrop(BOX, 'left', 0.1, 0.5), { ...BOX, left: 0.3 });
    expectCrop(dragCrop(BOX, 'right', -0.1, 0.5), { ...BOX, right: 0.7 });
    expectCrop(dragCrop(BOX, 'top', 0.5, -0.1), { ...BOX, top: 0.2 });
    expectCrop(dragCrop(BOX, 'bottom', 0.5, -0.1), { ...BOX, bottom: 0.8 });
  });

  test('um canto move os dois lados dele', () => {
    expectCrop(dragCrop(BOX, 'top-left', 0.1, 0.1), { ...BOX, left: 0.3, top: 0.4 });
    expectCrop(dragCrop(BOX, 'top-right', -0.1, 0.1), { ...BOX, right: 0.7, top: 0.4 });
    expectCrop(dragCrop(BOX, 'bottom-left', 0.1, -0.1), { ...BOX, left: 0.3, bottom: 0.8 });
    expectCrop(dragCrop(BOX, 'bottom-right', 0.1, 0.05), { ...BOX, right: 0.9, bottom: 0.95 });
  });

  test('não sai da imagem', () => {
    expectCrop(dragCrop(BOX, 'top-left', -1, -1), { ...BOX, left: 0, top: 0 });
    expectCrop(dragCrop(BOX, 'bottom-right', 1, 1), { ...BOX, right: 1, bottom: 1 });
  });

  test('respeita o tamanho mínimo e nunca inverte', () => {
    expectCrop(dragCrop(BOX, 'left', 0.9, 0), { ...BOX, left: 0.8 - MIN_CROP });
    expectCrop(dragCrop(BOX, 'right', -0.9, 0), { ...BOX, right: 0.2 + MIN_CROP });
    expectCrop(dragCrop(BOX, 'top', 0, 0.9), { ...BOX, top: 0.9 - MIN_CROP });
    expectCrop(dragCrop(BOX, 'bottom', 0, -0.9), { ...BOX, bottom: 0.3 + MIN_CROP });
    expectCrop(dragCrop(BOX, 'left', 0.9, 0, 0.2), { ...BOX, left: 0.6 });
  });

  test('arrastar por dentro move o recorte inteiro sem mudar o tamanho', () => {
    expectCrop(dragCrop(BOX, 'move', 0.1, -0.1), { left: 0.3, top: 0.2, right: 0.9, bottom: 0.8 });
  });

  test('mover para na borda da imagem mantendo o tamanho', () => {
    expectCrop(dragCrop(BOX, 'move', 1, 1), { left: 0.4, top: 0.4, right: 1, bottom: 1 });
    expectCrop(dragCrop(BOX, 'move', -1, -1), { left: 0, top: 0, right: 0.6, bottom: 0.6 });
  });

  test('não altera o recorte recebido', () => {
    const start = { ...BOX };
    dragCrop(start, 'top-left', 0.1, 0.1);
    expect(start).toEqual(BOX);
  });
});

describe('qual alça o toque pega', () => {
  const tol = 0.05;

  test('perto de um canto pega o canto', () => {
    expect(hitCropHandle(BOX, 0.22, 0.28, tol, tol)).toBe('top-left');
    expect(hitCropHandle(BOX, 0.79, 0.31, tol, tol)).toBe('top-right');
    expect(hitCropHandle(BOX, 0.18, 0.92, tol, tol)).toBe('bottom-left');
    expect(hitCropHandle(BOX, 0.83, 0.88, tol, tol)).toBe('bottom-right');
  });

  test('perto de uma borda, longe dos cantos, pega a borda', () => {
    expect(hitCropHandle(BOX, 0.21, 0.6, tol, tol)).toBe('left');
    expect(hitCropHandle(BOX, 0.78, 0.6, tol, tol)).toBe('right');
    expect(hitCropHandle(BOX, 0.5, 0.33, tol, tol)).toBe('top');
    expect(hitCropHandle(BOX, 0.5, 0.93, tol, tol)).toBe('bottom');
  });

  test('no meio do recorte move tudo', () => {
    expect(hitCropHandle(BOX, 0.5, 0.6, tol, tol)).toBe('move');
  });

  test('fora do recorte não pega nada', () => {
    expect(hitCropHandle(BOX, 0.05, 0.05, tol, tol)).toBeNull();
    expect(hitCropHandle(BOX, 0.5, 0.1, tol, tol)).toBeNull();
  });

  test('com a imagem inteira selecionada, os cantos continuam alcançáveis', () => {
    expect(hitCropHandle(FULL_IMAGE, 0.01, 0.02, tol, tol)).toBe('top-left');
    expect(hitCropHandle(FULL_IMAGE, 0.99, 0.99, tol, tol)).toBe('bottom-right');
    expect(hitCropHandle(FULL_IMAGE, 0.5, 0.01, tol, tol)).toBe('top');
  });

  test('num recorte pequeno, o canto mais próximo do toque ganha', () => {
    const small: CropFractions = { left: 0.5, top: 0.5, right: 0.56, bottom: 0.56 };
    expect(hitCropHandle(small, 0.51, 0.51, tol, tol)).toBe('top-left');
    expect(hitCropHandle(small, 0.555, 0.555, tol, tol)).toBe('bottom-right');
  });
});
