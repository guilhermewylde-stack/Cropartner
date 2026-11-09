import Anthropic from '@anthropic-ai/sdk';
import type { ParsedRecipe } from './types';
import type { CropFractions } from './sampling';

/**
 * Leitura de receitas com o Claude (visão + PDF).
 * A chave da API fica no aparelho (SecureStore) e é enviada direto para a API da Anthropic.
 */
export const MODEL = 'claude-opus-5-5';

export interface AISource {
  kind: 'image' | 'pdf';
  mediaType: string; // image/jpeg | image/png | image/webp | image/gif | application/pdf
  base64: string;
  name: string;
}

export interface GridHint {
  sourceIndex: number; // qual arquivo contém o gráfico
  page?: number | null; // página do PDF (1-based), se for PDF
  rows: number;
  cols: number;
  /** área do gráfico (sem legendas/números) em frações da imagem */
  bbox: CropFractions;
  colors: { hex: string; name: string }[];
}

export interface RecipeAnalysis {
  recipe: ParsedRecipe;
  recipeText: string;
  grid: GridHint | null;
}

const nullable = (type: string) => ({ type: [type, 'null'] });

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recipe', 'recipeText', 'grid'],
  properties: {
    recipeText: { type: 'string', description: 'Transcrição completa e fiel do texto da receita.' },
    recipe: {
      type: 'object',
      additionalProperties: false,
      required: [
        'title', 'summary', 'materials', 'hookSize', 'yarnWeight', 'gauge', 'finishedSize',
        'abbreviations', 'steps', 'stitchCounts', 'statedYarn', 'notes', 'hasGrid',
      ],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        materials: { type: 'array', items: { type: 'string' } },
        hookSize: nullable('string'),
        yarnWeight: nullable('string'),
        gauge: nullable('string'),
        finishedSize: nullable('string'),
        abbreviations: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['abbr', 'meaning'],
            properties: { abbr: { type: 'string' }, meaning: { type: 'string' } },
          },
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'instructions', 'stitchCount'],
            properties: {
              label: { type: 'string' },
              instructions: { type: 'string' },
              stitchCount: nullable('integer'),
            },
          },
        },
        stitchCounts: {
          type: 'array',
          description: 'Total de pontos de cada tipo somando a receita inteira (inclui repetições).',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['stitch', 'count'],
            properties: { stitch: { type: 'string' }, count: { type: 'integer' } },
          },
        },
        statedYarn: nullable('string'),
        notes: nullable('string'),
        hasGrid: { type: 'boolean' },
      },
    },
    grid: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['sourceIndex', 'page', 'rows', 'cols', 'bbox', 'colors'],
          properties: {
            sourceIndex: { type: 'integer' },
            page: nullable('integer'),
            rows: { type: 'integer' },
            cols: { type: 'integer' },
            bbox: {
              type: 'object',
              additionalProperties: false,
              required: ['left', 'top', 'right', 'bottom'],
              properties: {
                left: { type: 'number' },
                top: { type: 'number' },
                right: { type: 'number' },
                bottom: { type: 'number' },
              },
            },
            colors: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['hex', 'name'],
                properties: { hex: { type: 'string' }, name: { type: 'string' } },
              },
            },
          },
        },
      ],
    },
  },
} as const;

const SYSTEM = `Você é especialista em crochê e lê receitas (em português, inglês ou espanhol) a partir de fotos e PDFs.
Extraia a receita para um app que acompanha a execução. Responda sempre em português do Brasil.
- recipeText: transcreva o texto da receita fielmente, mantendo as abreviações originais.
- steps: uma entrada por carreira/volta/etapa, na ordem de execução. Se a receita disser "carreiras 3 a 10: repita...", gere uma entrada com esse rótulo. stitchCount = total de pontos ao final da carreira, quando informado ou dedutível; senão null.
- stitchCounts: soma aproximada de cada tipo de ponto na receita inteira (considere repetições e o número de carreiras). Use as abreviações da receita (ex.: "pb", "pa", "corr"). Se não for possível estimar, deixe vazio.
- statedYarn: quantidade de fio que a própria receita indica (ex.: "2 novelos de 100 g"), ou null.
- hasGrid: true se algum arquivo tiver um gráfico em grade (cada quadradinho = um ponto, como em tapestry, C2C, filet ou pixel art).
- grid: se hasGrid, descreva o gráfico principal: sourceIndex (índice 0-based do arquivo na ordem enviada), page (página do PDF, 1-based, ou null para imagem), rows e cols (conte com cuidado os quadradinhos; use os números das bordas do gráfico se existirem), bbox = retângulo apenas da área dos quadradinhos (sem números, legenda ou margens), em frações 0..1 da largura e altura da imagem/página, e colors = as cores usadas no gráfico em hex com nomes em português. Se não houver gráfico, grid = null.
Não invente informações que não estejam nos arquivos; use null quando faltar.`;

export class MissingApiKeyError extends Error {
  constructor() {
    super('Configure a chave da API da Anthropic nas Configurações para ler receitas automaticamente.');
  }
}

export async function analyzeRecipe(apiKey: string | null, sources: AISource[]): Promise<RecipeAnalysis> {
  if (!apiKey) throw new MissingApiKeyError();
  // O app roda no aparelho do próprio usuário com a chave dele.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  sources.forEach((s, i) => {
    content.push({ type: 'text', text: `Arquivo ${i}: ${s.name}` });
    if (s.kind === 'pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: s.base64 } });
    } else {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: s.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: s.base64 },
      });
    }
  });
  content.push({ type: 'text', text: 'Leia a receita de crochê acima e preencha o JSON.' });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('O modelo não conseguiu processar estes arquivos. Tente outra imagem ou PDF.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('A receita é longa demais para ler de uma vez. Tente importar menos páginas.');
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const parsed = JSON.parse(text) as RecipeAnalysis;
  return sanitize(parsed, sources.length);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function sanitize(a: RecipeAnalysis, nSources: number): RecipeAnalysis {
  const grid = a.grid;
  if (grid) {
    const ok = grid.rows > 0 && grid.cols > 0 && grid.rows <= 500 && grid.cols <= 500 && grid.sourceIndex >= 0 && grid.sourceIndex < nSources;
    if (!ok) return { ...a, grid: null };
    grid.bbox = {
      left: clamp01(grid.bbox.left),
      top: clamp01(grid.bbox.top),
      right: clamp01(grid.bbox.right),
      bottom: clamp01(grid.bbox.bottom),
    };
    if (grid.bbox.right - grid.bbox.left < 0.05 || grid.bbox.bottom - grid.bbox.top < 0.05) {
      grid.bbox = { left: 0, top: 0, right: 1, bottom: 1 };
    }
  }
  return a;
}

const GRID_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['colors', 'rows'],
  properties: {
    colors: {
      type: 'array',
      description: 'Legenda: cada cor recebe uma letra (A, B, C...).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['letter', 'hex', 'name'],
        properties: { letter: { type: 'string' }, hex: { type: 'string' }, name: { type: 'string' } },
      },
    },
    rows: {
      type: 'array',
      description: 'Uma string por linha do gráfico, de cima para baixo; um caractere por quadradinho, da esquerda para a direita. Use "." para quadradinho vazio.',
      items: { type: 'string' },
    },
  },
} as const;

export interface TranscribedGrid {
  colors: { letter: string; hex: string; name: string }[];
  rows: string[];
}

/**
 * Transcreve célula a célula um gráfico (útil para PDFs, que não podem ser amostrados por pixel
 * no aparelho, ou quando a leitura por pixels ficou ruim). Mais lento e indicado para gráficos até ~60x60.
 */
export async function transcribeGrid(apiKey: string | null, source: AISource, hint: { rows: number; cols: number; page?: number | null }): Promise<TranscribedGrid> {
  if (!apiKey) throw new MissingApiKeyError();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const media: Anthropic.Beta.BetaContentBlockParam =
    source.kind === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: source.base64 } }
      : {
          type: 'image',
          source: { type: 'base64', media_type: source.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: source.base64 },
        };
  const where = source.kind === 'pdf' && hint.page ? ` na página ${hint.page}` : '';
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: GRID_SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      {
        role: 'user',
        content: [
          media,
          {
            type: 'text',
            text: `Transcreva o gráfico de crochê em grade${where}. Ele tem ${hint.rows} linhas e ${hint.cols} colunas. Gere exatamente ${hint.rows} strings com exatamente ${hint.cols} caracteres cada, de cima para baixo e da esquerda para a direita, usando uma letra por cor da legenda. Confira a contagem de cada linha usando os números das bordas, se houver.`,
          },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') throw new Error('O modelo não conseguiu transcrever este gráfico.');
  if (response.stop_reason === 'max_tokens') throw new Error('Gráfico grande demais para transcrever. Use a leitura por imagem.');
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return JSON.parse(text) as TranscribedGrid;
}
