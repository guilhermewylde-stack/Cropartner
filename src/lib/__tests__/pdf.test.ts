import { chunkBase64, pageImageName, pdfErrorMessage, renderScale, RENDER_LIMITS } from '../pdf';

const A4 = { width: 595, height: 842 };

const rendered = (page: { width: number; height: number }, scale: number) => ({
  width: Math.floor(page.width * scale),
  height: Math.floor(page.height * scale),
});

describe('renderScale', () => {
  it('leva o lado maior de uma página A4 até o alvo', () => {
    const out = rendered(A4, renderScale(A4));
    expect(out.height).toBeGreaterThanOrEqual(RENDER_LIMITS.targetSide - 1);
    expect(out.height).toBeLessThanOrEqual(RENDER_LIMITS.targetSide);
  });

  it('dá pelo menos 8 pixels por célula a um gráfico de 100 colunas que ocupa metade da largura da página', () => {
    const out = rendered(A4, renderScale(A4));
    expect(out.width / 2 / 100).toBeGreaterThanOrEqual(8);
  });

  it('funciona igual para página deitada', () => {
    const landscape = { width: 842, height: 595 };
    expect(renderScale(landscape)).toBeCloseTo(renderScale(A4));
  });

  it('reduz páginas enormes em vez de ampliar', () => {
    const poster = { width: 6000, height: 9000 };
    const scale = renderScale(poster);
    expect(scale).toBeLessThan(1);
    expect(rendered(poster, scale).height).toBeLessThanOrEqual(RENDER_LIMITS.targetSide);
  });

  it('nunca passa do limite de pixels, mesmo com um alvo maior', () => {
    const limits = { targetSide: 4000, maxSide: 4096, maxPixels: 4_000_000 };
    const square = { width: 500, height: 500 };
    const out = rendered(square, renderScale(square, limits));
    expect(out.width * out.height).toBeLessThanOrEqual(limits.maxPixels);
    // usa quase todo o limite
    expect(out.width * out.height).toBeGreaterThan(limits.maxPixels * 0.98);
  });

  it('nunca passa do lado máximo', () => {
    const limits = { targetSide: 5000, maxSide: 3000, maxPixels: 100_000_000 };
    const strip = { width: 100, height: 1000 };
    expect(rendered(strip, renderScale(strip, limits)).height).toBeLessThanOrEqual(3000);
  });

  it('serve para miniaturas: alvo pequeno', () => {
    const out = rendered(A4, renderScale(A4, { ...RENDER_LIMITS, targetSide: 240 }));
    expect(out.height).toBeGreaterThanOrEqual(239);
    expect(out.height).toBeLessThanOrEqual(240);
  });

  it('devolve 1 quando o tamanho da página não é válido', () => {
    expect(renderScale({ width: 0, height: 842 })).toBe(1);
    expect(renderScale({ width: NaN, height: 842 })).toBe(1);
    expect(renderScale({ width: -5, height: 10 })).toBe(1);
  });
});

describe('chunkBase64', () => {
  it('devolve pedaços que, juntos, são o texto original', () => {
    const b64 = 'QUJDREVGR0hJSktMTU5PUA==';
    const chunks = chunkBase64(b64, 8);
    expect(chunks.join('')).toBe(b64);
    expect(chunks.length).toBe(3);
  });

  it('cada pedaço pode ser decodificado sozinho (tamanho múltiplo de 4)', () => {
    const b64 = btoa('um texto qualquer com mais de dez letras');
    const chunks = chunkBase64(b64, 10); // 10 não é múltiplo de 4: arredonda para baixo
    const decoded = chunks.map((c) => atob(c)).join('');
    expect(decoded).toBe('um texto qualquer com mais de dez letras');
    for (const c of chunks.slice(0, -1)) expect(c.length % 4).toBe(0);
  });

  it('texto vazio não gera pedaços', () => {
    expect(chunkBase64('', 8)).toEqual([]);
  });
});

describe('pdfErrorMessage', () => {
  it('explica o PDF protegido por senha', () => {
    expect(pdfErrorMessage('PasswordException')).toMatch(/senha/i);
  });

  it('explica o PDF corrompido ou que não é PDF', () => {
    expect(pdfErrorMessage('InvalidPDFException')).toMatch(/danificado|não é um PDF/i);
    expect(pdfErrorMessage('MissingPDFException')).toMatch(/danificado|não é um PDF/i);
  });

  it('tem uma mensagem própria para quando o tempo acaba', () => {
    expect(pdfErrorMessage('Timeout')).toMatch(/demor/i);
  });

  it('tem uma mensagem própria para quando o renderizador é encerrado por falta de memória', () => {
    expect(pdfErrorMessage('Crashed')).toMatch(/pesado/i);
  });

  it('tem uma mensagem genérica, sem termos técnicos, para o resto', () => {
    const msg = pdfErrorMessage('UnknownErrorException');
    expect(msg).toMatch(/PDF/);
    expect(msg).not.toMatch(/Exception/);
    expect(pdfErrorMessage(undefined)).toBe(msg);
  });
});

describe('pageImageName', () => {
  it('junta o nome do PDF (sem extensão) e a página', () => {
    expect(pageImageName('Receita Girafa.pdf', 3)).toBe('Receita Girafa — pág. 3.jpg');
    expect(pageImageName('grafico.PDF', 12)).toBe('grafico — pág. 12.jpg');
  });

  it('aguenta nome sem extensão', () => {
    expect(pageImageName('documento', 1)).toBe('documento — pág. 1.jpg');
  });
});
