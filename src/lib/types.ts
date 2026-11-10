/** Uma cor da paleta do projeto. As células do grid referenciam a cor pelo id. */
export interface PaletteColor {
  id: string;
  name: string;
  hex: string; // "#RRGGBB"
}

/**
 * Grid do gráfico. `cells` é row-major com a linha 0 no topo (como o gráfico é desenhado).
 * Cada célula guarda o id da cor (ou null = vazia / sem ponto).
 */
export interface Grid {
  rows: number;
  cols: number;
  cells: (string | null)[];
}

export type StartCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/**
 * flat: trabalho em carreiras de ida e volta (cada carreira inverte o sentido).
 * same-direction: toda carreira no mesmo sentido (ex.: trabalho em tubo/espiral, ou cortando o fio).
 */
export type WorkMode = 'flat' | 'same-direction';

/** Sentido de trabalho já resolvido (canto inicial definido). */
export interface WorkSettings {
  startCorner: StartCorner;
  mode: WorkMode;
}

/**
 * O que o projeto guarda sobre o sentido de trabalho. Sem `startCorner`, o canto inicial segue o
 * ajuste global "Sou canhota" (embaixo à direita para destras, embaixo à esquerda para canhotas).
 */
export interface ProjectWork {
  startCorner?: StartCorner | null;
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
  grid?: Grid;
  palette: PaletteColor[];
  work: ProjectWork;
  yarn: YarnSettings;
  /** pontos já feitos, contados na ordem de trabalho (ver `lib/progress.ts`) */
  progress: number;
}
