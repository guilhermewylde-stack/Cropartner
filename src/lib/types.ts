/** Uma cor da paleta do projeto. As células do grid referenciam a cor pelo id. */
export interface PaletteColor {
  id: string;
  name: string;
  hex: string; // "#RRGGBB"
}

/**
 * Grid do gráfico. `cells` é row-major com a linha 0 no topo (como o gráfico é desenhado).
 * Cada célula guarda o id da cor (ou null = vazia / sem ponto).
 * `done` é uma string de '0'/'1' do mesmo tamanho (compacta para salvar).
 */
export interface Grid {
  rows: number;
  cols: number;
  cells: (string | null)[];
  done: string;
}

export type StartCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/**
 * flat: trabalho em carreiras de ida e volta (cada carreira inverte o sentido).
 * same-direction: toda carreira no mesmo sentido (ex.: trabalho em tubo/espiral, ou cortando o fio).
 */
export type WorkMode = 'flat' | 'same-direction';

export interface WorkSettings {
  startCorner: StartCorner;
  mode: WorkMode;
}

export interface StitchType {
  id: string;
  name: string; // ex.: "Ponto baixo (pb)"
  cmPerStitch: number; // consumo de fio por ponto, em cm
}

export interface YarnSettings {
  /** tipo de ponto usado em cada célula do grid */
  gridStitchId: string;
  stitchTypes: StitchType[];
  /** margem de perda (%), ex.: 15 */
  wastePercent: number;
  /** fio extra por troca de cor (cm), para arremates/pontas */
  tailPerColorChangeCm: number;
  /** metros por novelo */
  metersPerSkein: number;
  /** gramas por novelo (opcional, só para exibir) */
  gramsPerSkein?: number;
}

export interface RecipeStep {
  label: string; // "Carreira 1", "Volta 3", "Montagem"...
  instructions: string;
  stitchCount?: number | null;
  done?: boolean;
}

export interface RecipeStitchCount {
  stitch: string; // nome/abreviação do ponto como aparece na receita
  count: number;
}

export interface ParsedRecipe {
  title: string;
  summary?: string;
  materials: string[];
  hookSize?: string | null;
  yarnWeight?: string | null;
  gauge?: string | null;
  finishedSize?: string | null;
  abbreviations: { abbr: string; meaning: string }[];
  steps: RecipeStep[];
  stitchCounts: RecipeStitchCount[];
  statedYarn?: string | null; // quantidade de fio informada pela receita, se houver
  notes?: string | null;
  hasGrid: boolean;
}

export interface SourceFile {
  id: string;
  uri: string; // cópia local no diretório do app
  name: string;
  kind: 'image' | 'pdf';
  mimeType: string;
  width?: number;
  height?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sources: SourceFile[];
  recipe?: ParsedRecipe;
  recipeText?: string;
  grid?: Grid;
  palette: PaletteColor[];
  work: WorkSettings;
  yarn: YarnSettings;
  /** sugestão de grid encontrada pela IA (linhas, colunas, área na imagem) */
  gridHint?: {
    sourceId: string;
    page?: number | null;
    rows: number;
    cols: number;
    bbox: { left: number; top: number; right: number; bottom: number };
    colors: { hex: string; name: string }[];
  } | null;
  /** índice (row-major) da última célula selecionada no modo progresso */
  lastCell?: number | null;
}
