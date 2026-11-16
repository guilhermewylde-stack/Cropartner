/**
 * Lógica pura da importação de PDF: escala de renderização, mensagens de erro e
 * preparo dos dados que vão para o renderizador (WebView + pdf.js).
 */

export interface PageSize {
  /** tamanho da página em pontos de PDF (escala 1) */
  width: number;
  height: number;
}

export interface RenderLimits {
  /** tamanho desejado do lado maior, em pixels */
  targetSide: number;
  /** lado máximo que o canvas aguenta */
  maxSide: number;
  /** total máximo de pixels (memória do aparelho; o canvas do iOS para em ~16,7 milhões) */
  maxPixels: number;
}

/**
 * Página inteira: 3000 px no lado maior dá ~10 px por célula num gráfico de 100 colunas
 * que ocupa metade de uma página A4, e fica longe do limite de canvas do iPhone.
 */
export const RENDER_LIMITS: RenderLimits = { targetSide: 3000, maxSide: 4096, maxPixels: 9_000_000 };

/** Miniaturas da escolha de página. */
export const THUMB_LIMITS: RenderLimits = { ...RENDER_LIMITS, targetSide: 320 };

/**
 * Escala em que a página deve ser desenhada: leva o lado maior até o alvo, sem passar do
 * lado máximo nem do total de pixels. A imagem final tem `floor(lado × escala)` pixels.
 */
export function renderScale(page: PageSize, limits: RenderLimits = RENDER_LIMITS): number {
  const { width, height } = page;
  if (!(width > 0) || !(height > 0) || !isFinite(width) || !isFinite(height)) return 1;
  const longSide = Math.max(width, height);
  return Math.min(limits.targetSide / longSide, limits.maxSide / longSide, Math.sqrt(limits.maxPixels / (width * height)));
}

/**
 * Corta o base64 em pedaços que podem ser decodificados um a um (tamanho múltiplo de 4),
 * para mandar um PDF grande ao renderizador sem uma mensagem gigante.
 */
export function chunkBase64(base64: string, size: number): string[] {
  const step = Math.max(4, size - (size % 4));
  const out: string[] = [];
  for (let i = 0; i < base64.length; i += step) out.push(base64.slice(i, i + step));
  return out;
}

/** Mensagem para a usuária a partir do nome do erro do pdf.js (ou dos nossos: `Timeout`). */
export function pdfErrorMessage(name: string | undefined): string {
  switch (name) {
    case 'PasswordException':
      return 'Este PDF é protegido por senha. Abra-o em outro app, salve uma cópia sem senha (ou tire um print da página do gráfico) e importe de novo.';
    case 'InvalidPDFException':
    case 'MissingPDFException':
      return 'Não consegui ler este arquivo: ele está danificado ou não é um PDF. Baixe o PDF de novo ou tire um print da página do gráfico.';
    case 'Crashed':
      return 'Este PDF é pesado demais para abrir aqui. Tire um print da página do gráfico e use “Da imagem”.';
    case 'Timeout':
      return 'O PDF demorou demais para abrir. Tente de novo; se continuar, tire um print da página do gráfico e use “Da imagem”.';
    default:
      return 'Não consegui abrir este PDF. Tente de novo ou tire um print da página do gráfico e use “Da imagem”.';
  }
}

/** Nome da imagem gerada a partir de uma página do PDF. */
export function pageImageName(pdfName: string, page: number): string {
  const base = pdfName.replace(/\.pdf$/i, '');
  return `${base} — pág. ${page}.jpg`;
}
