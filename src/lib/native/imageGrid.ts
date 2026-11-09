import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';
import { toByteArray } from 'base64-js';
import { cropToPixels, sampleGridFromRGBA, type CropFractions } from '../sampling';
import type { SourceFile } from '../types';

export async function imageSize(uri: string): Promise<{ width: number; height: number }> {
  const ref = await ImageManipulator.manipulate(uri).renderAsync();
  return { width: ref.width, height: ref.height };
}

/** Reduz a imagem (lado maior <= maxSide) e devolve JPEG em base64 para envio à IA. */
export async function imageForAI(s: SourceFile, maxSide = 1600): Promise<{ base64: string; mediaType: string }> {
  const { width, height } = s.width && s.height ? { width: s.width, height: s.height } : await imageSize(s.uri);
  const ctx = ImageManipulator.manipulate(s.uri);
  if (Math.max(width, height) > maxSide) {
    if (width >= height) ctx.resize({ width: maxSide });
    else ctx.resize({ height: maxSide });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  return { base64: out.base64 ?? '', mediaType: 'image/jpeg' };
}

export interface ReadGridOptions {
  rows: number;
  cols: number;
  crop: CropFractions;
  maxColors: number;
}

/**
 * Lê o grid de uma imagem: recorta a área do gráfico, redimensiona para alguns pixels
 * por célula e amostra o centro de cada célula.
 */
export async function readGridFromImage(uri: string, opts: ReadGridOptions) {
  const size = await imageSize(uri);
  const rect = cropToPixels(opts.crop, size.width, size.height);
  const perCell = Math.max(3, Math.min(12, Math.floor(1600 / Math.max(opts.rows, opts.cols))));
  const ref = await ImageManipulator.manipulate(uri)
    .crop(rect)
    .resize({ width: opts.cols * perCell, height: opts.rows * perCell })
    .renderAsync();
  const png = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
  const bytes = toByteArray(png.base64 ?? '');
  const decoded = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  return sampleGridFromRGBA(rgba, decoded.width, decoded.height, { rows: opts.rows, cols: opts.cols, maxColors: opts.maxColors });
}
