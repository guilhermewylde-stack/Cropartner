import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';
import { toByteArray } from 'base64-js';
import { cropToPixels, sampleGridFromRGBA, type CropFractions } from '../sampling';

export async function imageSize(uri: string): Promise<{ width: number; height: number }> {
  const ref = await ImageManipulator.manipulate(uri).renderAsync();
  return { width: ref.width, height: ref.height };
}

export interface ReadGridOptions {
  rows: number;
  cols: number;
  crop: CropFractions;
  maxColors: number;
}

/** Erro com uma mensagem que pode ser mostrada direto para a usuária. */
export class ImageReadError extends Error {}

const CANT_OPEN = 'Não consegui abrir esta imagem. Tente outro arquivo (PNG ou JPG) ou tire um print do gráfico.';

/**
 * Lê o grid de uma imagem: recorta a área do gráfico, redimensiona para alguns pixels
 * por célula e amostra o centro de cada célula.
 */
export async function readGridFromImage(uri: string, opts: ReadGridOptions) {
  let rgba: Uint8Array;
  let width: number;
  let height: number;
  try {
    const size = await imageSize(uri);
    const rect = cropToPixels(opts.crop, size.width, size.height);
    const perCell = Math.max(3, Math.min(12, Math.floor(1600 / Math.max(opts.rows, opts.cols))));
    const ref = await ImageManipulator.manipulate(uri)
      .crop(rect)
      .resize({ width: opts.cols * perCell, height: opts.rows * perCell })
      .renderAsync();
    const png = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
    if (!png.base64) throw new Error('sem dados');
    const bytes = toByteArray(png.base64);
    const decoded = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    width = decoded.width;
    height = decoded.height;
  } catch {
    throw new ImageReadError(CANT_OPEN);
  }
  return sampleGridFromRGBA(rgba, width, height, { rows: opts.rows, cols: opts.cols, maxColors: opts.maxColors });
}
