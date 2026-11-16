import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useProject, useProjects } from '../../../store/projects';
import { Button, Card, Muted, NumberField, Row, Segmented, styles, Title } from '../../../components/ui';
import { GridView } from '../../../components/GridView';
import { CropEditor } from '../../../components/CropEditor';
import { PdfPagePicker } from '../../../components/PdfPagePicker';
import { createGrid } from '../../../lib/grid';
import { resolveWork, straightRows } from '../../../lib/workOrder';
import { useSettings } from '../../../store/settings';
import { makePaletteColor } from '../../../lib/colors';
import { FULL_IMAGE, type CropFractions } from '../../../lib/sampling';
import { imageSize, readGridFromImage } from '../../../lib/native/imageGrid';
import { pickImageFiles, pickImages, pickPdfFiles } from '../../../lib/native/files';
import type { Grid, PaletteColor, SourceFile } from '../../../lib/types';
import { colors, space } from '../../../theme';

type Method = 'blank' | 'image' | 'pdf';

export default function GridSetup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const leftHanded = useSettings((s) => s.leftHanded);
  const win = useWindowDimensions();
  const images = project?.sources.filter((s) => s.kind === 'image') ?? [];

  const pdfs = project?.sources.filter((s) => s.kind === 'pdf') ?? [];

  const [method, setMethod] = useState<Method>(images.length ? 'image' : pdfs.length ? 'pdf' : 'blank');
  const [pdfId, setPdfId] = useState<string | null>(pdfs[0]?.id ?? null);
  const [rows, setRows] = useState(30);
  const [cols, setCols] = useState(30);
  const [maxColors, setMaxColors] = useState(6);
  const [sourceId, setSourceId] = useState<string | null>(images[0]?.id ?? null);
  const [crop, setCrop] = useState<CropFractions>(FULL_IMAGE);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ grid: Grid; palette: PaletteColor[] } | null>(null);

  const source = images.find((s) => s.id === sourceId) ?? null;
  const pdf = pdfs.find((s) => s.id === pdfId) ?? null;

  if (!project) return null;

  const save = (grid: Grid, palette: PaletteColor[]) => {
    const doSave = () => {
      update(project.id, { grid, palette, progress: 0 });
      router.replace(`/project/${project.id}/grid`);
    };
    if (project.grid) {
      const lost = project.progress > 0 ? `O grid atual e o progresso marcado (${project.progress} pontos) serão perdidos.` : 'O grid atual será substituído.';
      Alert.alert('Substituir grid?', lost, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Substituir', style: 'destructive', onPress: doSave },
      ]);
    } else doSave();
  };

  const createBlank = () => {
    const base = makePaletteColor('#FFFFFF', 'Fundo');
    save(createGrid(rows, cols, base.id), [base]);
  };

  const selectSource = (sid: string) => {
    if (sid === sourceId) return;
    setSourceId(sid);
    setCrop(FULL_IMAGE);
    setError(null);
  };

  const importImages = async (pick: (pid: string) => Promise<SourceFile[]>) => {
    try {
      const added = (await pick(project.id)).filter((s) => s.kind === 'image');
      if (!added.length) return;
      update(project.id, (p) => ({ sources: [...p.sources, ...added] }));
      selectSource(added[added.length - 1].id);
    } catch (e) {
      Alert.alert('Não foi possível importar', (e as Error).message);
    }
  };

  const importPdf = async () => {
    try {
      const added = (await pickPdfFiles(project.id)).filter((s) => s.kind === 'pdf');
      if (!added.length) return;
      update(project.id, (p) => ({ sources: [...p.sources, ...added] }));
      setPdfId(added[added.length - 1].id);
    } catch (e) {
      Alert.alert('Não foi possível importar', (e as Error).message);
    }
  };

  // a página escolhida vira uma imagem do projeto e segue o fluxo "Da imagem"
  const usePdfPage = (image: SourceFile) => {
    update(project.id, (p) => ({ sources: [...p.sources, image] }));
    selectSource(image.id);
    setMethod('image');
  };

  const readFromImage = async () => {
    if (!source) return;
    setBusy(true);
    setError(null);
    try {
      setPreview(await readGridFromImage(source.uri, { rows, cols, crop, maxColors }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // prévia: só o resultado, com a opção de voltar ao ajuste (que fica como estava)
  if (preview) {
    const fit = fitPreview(preview.grid, win.width - 2 * (space.lg + space.lg + 1) - 2);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <Title>Prévia do grid</Title>
          <Muted>
            {preview.grid.cols} colunas × {preview.grid.rows} carreiras · {preview.palette.length} {preview.palette.length === 1 ? 'cor' : 'cores'}. Você poderá corrigir células e trocar cores depois.
          </Muted>
          <View style={[st.previewBox, { height: fit.height }]}>
            <GridView grid={preview.grid} palette={preview.palette} order={straightRows(preview.grid, resolveWork(project.work, { leftHanded }))} cellSize={fit.cellSize} />
          </View>
          <Row>
            {preview.palette.map((p) => (
              <View key={p.id} style={st.chip}>
                <View style={[st.dot, { backgroundColor: p.hex }]} />
                <Text style={st.chipText}>{p.name}</Text>
              </View>
            ))}
          </Row>
          <Button title="Usar este grid" onPress={() => save(preview.grid, preview.palette)} />
          <Button variant="secondary" title="Voltar e ajustar" onPress={() => setPreview(null)} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled={!dragging}>
      <Segmented
        value={method}
        onChange={setMethod}
        options={[
          { value: 'blank', label: 'Em branco' },
          { value: 'image', label: 'Da imagem' },
          { value: 'pdf', label: 'Do PDF' },
        ]}
      />

      {method === 'pdf' && (
        <Card>
          <Title>PDF da receita</Title>
          {pdfs.length === 0 && <Muted>Escolha o PDF nos Arquivos. Depois é só tocar na página do gráfico: ela vira uma imagem e você marca a área do gráfico.</Muted>}
          {pdfs.length > 1 && (
            <Row>
              {pdfs.map((s) => (
                <Pressable key={s.id} onPress={() => setPdfId(s.id)} style={[st.chip, s.id === pdfId && st.chipActive]}>
                  <Text style={st.chipText} numberOfLines={1}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </Row>
          )}
          {pdfs.length === 1 && pdf && <Text style={st.chipText}>{pdf.name}</Text>}
          {pdf && <PdfPagePicker key={pdf.id} pdf={pdf} projectId={project.id} onPicked={usePdfPage} />}
          <Row>
            <Button small variant={pdfs.length ? 'secondary' : 'primary'} title={pdfs.length ? 'Outro PDF' : 'Escolher PDF'} onPress={importPdf} />
          </Row>
        </Card>
      )}

      {method === 'image' && (
        <Card>
          <Title>Imagem do gráfico</Title>
          {images.length === 0 ? (
            <Muted>Escolha um print ou uma imagem salva do gráfico.</Muted>
          ) : (
            <ScrollView horizontal contentContainerStyle={{ gap: space.sm }}>
              {images.map((s) => (
                <Pressable key={s.id} onPress={() => selectSource(s.id)} style={[st.thumb, s.id === sourceId && st.thumbActive]}>
                  <Image source={{ uri: s.uri }} style={st.thumbImg} />
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Row>
            <Button small variant={images.length ? 'secondary' : 'primary'} title="Galeria" onPress={() => importImages(pickImages)} />
            <Button small variant="secondary" title="Arquivos" onPress={() => importImages(pickImageFiles)} />
          </Row>
        </Card>
      )}

      {(method === 'blank' || (method === 'image' && source)) && (
        <Card>
          <Title>Tamanho</Title>
          <Row>
            <NumberField label="Colunas (pontos por carreira)" value={cols} onChange={setCols} min={1} max={500} integer />
            <NumberField label="Linhas (carreiras)" value={rows} onChange={setRows} min={1} max={500} integer />
          </Row>
          {method === 'image' && <NumberField label="Máximo de cores" value={maxColors} onChange={setMaxColors} min={1} max={30} integer />}
        </Card>
      )}

      {method === 'blank' && (
        <Card>
          <Muted>Cria um grid vazio (fundo branco). Depois é só pintar as células e escolher as cores no modo “Pintar”.</Muted>
          <Button title="Criar grid em branco" onPress={createBlank} />
        </Card>
      )}

      {method === 'image' && source && (
        <Card>
          <Title>Área do gráfico</Title>
          <Muted>Arraste os cantos e as bordas até a moldura cobrir só os quadradinhos, sem números nem legenda. Cada quadrado da grade deve cair em cima de um quadradinho do gráfico.</Muted>
          <CropStage key={source.id} source={source} crop={crop} onChange={setCrop} rows={rows} cols={cols} onDragging={setDragging} />
          <Row>
            <Button small variant="ghost" title="Imagem inteira" onPress={() => setCrop(FULL_IMAGE)} />
          </Row>
          {error && <Text style={st.error}>{error}</Text>}
          <Button title="Ler grid da imagem" onPress={readFromImage} loading={busy} />
        </Card>
      )}
    </ScrollView>
  );
}

/** Tamanho da célula para o grid caber na largura do cartão (o GridView tem margens com os números). */
function fitPreview(grid: Grid, available: number) {
  let cellSize = Math.floor(available / (grid.cols + 2.8));
  if (cellSize * 1.4 < 22) cellSize = Math.floor((available - 44) / grid.cols);
  cellSize = Math.max(4, Math.min(24, cellSize));
  const gutter = Math.max(22, Math.round(cellSize * 1.4));
  return { cellSize, height: Math.min(440, grid.rows * cellSize + 2 * gutter + 2) };
}

/** Descobre o tamanho da imagem e a encaixa na tela, mantendo a proporção. */
function CropStage({
  source,
  ...editor
}: {
  source: SourceFile;
  crop: CropFractions;
  onChange: (c: CropFractions) => void;
  rows: number;
  cols: number;
  onDragging: (d: boolean) => void;
}) {
  const win = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(source.width && source.height ? { width: source.width, height: source.height } : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!size) imageSize(source.uri).then(setSize).catch(() => setFailed(true));
  }, [source.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <Text style={st.error}>Não consegui abrir esta imagem. Tente outro arquivo (PNG ou JPG) ou tire um print do gráfico.</Text>;
  if (!size) return <Muted>Abrindo a imagem…</Muted>;

  // margem lateral para as alças dos cantos não ficarem coladas na borda do cartão
  const maxW = win.width - 2 * (space.lg + space.lg + 1) - 2 * HANDLE_MARGIN;
  const maxH = Math.max(220, win.height * 0.55);
  const scale = Math.min(maxW / size.width, maxH / size.height);
  return (
    <View style={{ alignItems: 'center', paddingVertical: HANDLE_MARGIN }}>
      <CropEditor uri={source.uri} width={Math.round(size.width * scale)} height={Math.round(size.height * scale)} {...editor} />
    </View>
  );
}

const HANDLE_MARGIN = 10;

const st = StyleSheet.create({
  thumb: { borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.primary },
  thumbImg: { width: 80, height: 80, borderRadius: 6, backgroundColor: colors.border },
  previewBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, borderWidth: 2 },
  chipText: { fontSize: 13, color: colors.text },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: 14 },
});
