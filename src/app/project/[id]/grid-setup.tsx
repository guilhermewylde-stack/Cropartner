import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Line, Rect } from 'react-native-svg';
import { useProject, useProjects } from '../../../store/projects';
import { Button, Card, Muted, NumberField, Row, Segmented, styles, Title } from '../../../components/ui';
import { GridView } from '../../../components/GridView';
import { createGrid } from '../../../lib/grid';
import { makePaletteColor } from '../../../lib/colors';
import { FULL_IMAGE, type CropFractions } from '../../../lib/sampling';
import { imageForAI, imageSize, readGridFromImage } from '../../../lib/native/imageGrid';
import { readBase64 } from '../../../lib/native/files';
import { getApiKey } from '../../../lib/native/settings';
import { transcribeGrid, type AISource } from '../../../lib/ai';
import { gridFromTranscription } from '../../../lib/transcribed';
import type { Grid, PaletteColor, SourceFile } from '../../../lib/types';
import { colors, space } from '../../../theme';

type Method = 'blank' | 'image' | 'ai';

export default function GridSetup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const hint = project?.gridHint ?? null;
  const images = project?.sources.filter((s) => s.kind === 'image') ?? [];
  const all = project?.sources ?? [];

  const [method, setMethod] = useState<Method>(hint || images.length ? (images.length ? 'image' : 'ai') : 'blank');
  const [rows, setRows] = useState(hint?.rows ?? 30);
  const [cols, setCols] = useState(hint?.cols ?? 30);
  const [maxColors, setMaxColors] = useState(Math.max(2, hint?.colors.length ?? 6));
  const [sourceId, setSourceId] = useState<string | null>(hint?.sourceId ?? images[0]?.id ?? all[0]?.id ?? null);
  const [page, setPage] = useState(hint?.page ?? 1);
  const [crop, setCrop] = useState<CropFractions>(hint?.bbox ?? FULL_IMAGE);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ grid: Grid; palette: PaletteColor[] } | null>(null);

  const source = all.find((s) => s.id === sourceId) ?? null;
  const imageSources = method === 'image' ? images : all;

  useEffect(() => {
    // ao trocar de método, garante uma fonte compatível
    if (method === 'image' && source && source.kind !== 'image') setSourceId(images[0]?.id ?? null);
    setPreview(null);
  }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  const save = (grid: Grid, palette: PaletteColor[]) => {
    const doSave = () => {
      update(project.id, { grid, palette, lastCell: null });
      router.replace(`/project/${project.id}/grid`);
    };
    if (project.grid) {
      Alert.alert('Substituir grid?', 'O grid atual e o progresso marcado serão substituídos.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Substituir', style: 'destructive', onPress: doSave },
      ]);
    } else doSave();
  };

  const createBlank = () => {
    const base = makePaletteColor('#FFFFFF', 'Fundo');
    save(createGrid(rows, cols, base.id), [base]);
  };

  const readFromImage = async () => {
    if (!source || source.kind !== 'image') return;
    setBusy(true);
    try {
      setPreview(await readGridFromImage(source.uri, { rows, cols, crop, maxColors }));
    } catch (e) {
      Alert.alert('Não foi possível ler a imagem', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const transcribe = async () => {
    if (!source) return;
    setBusy(true);
    try {
      const key = await getApiKey();
      const ai: AISource =
        source.kind === 'pdf'
          ? { kind: 'pdf', mediaType: 'application/pdf', base64: await readBase64(source.uri), name: source.name }
          : { kind: 'image', name: source.name, ...(await imageForAI(source, 2400)) };
      const t = await transcribeGrid(key, ai, { rows, cols, page: source.kind === 'pdf' ? page : null });
      setPreview(gridFromTranscription(t, rows, cols));
    } catch (e) {
      Alert.alert('Não foi possível transcrever', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Segmented
        value={method}
        onChange={setMethod}
        options={[
          { value: 'blank', label: 'Em branco' },
          { value: 'image', label: 'Da imagem' },
          { value: 'ai', label: 'Transcrever (IA)' },
        ]}
      />
      {hint && (
        <Card>
          <Muted>
            A IA encontrou um gráfico de {hint.cols} colunas × {hint.rows} linhas
            {hint.colors.length ? ` com ${hint.colors.length} cores` : ''}. Os campos abaixo já foram preenchidos — confira antes de ler.
          </Muted>
        </Card>
      )}

      <Card>
        <Title>Tamanho</Title>
        <Row>
          <NumberField label="Colunas (pontos por carreira)" value={cols} onChange={setCols} min={1} max={500} integer />
          <NumberField label="Linhas (carreiras)" value={rows} onChange={setRows} min={1} max={500} integer />
        </Row>
        {method === 'image' && <NumberField label="Máximo de cores" value={maxColors} onChange={setMaxColors} min={1} max={30} integer />}
      </Card>

      {method === 'blank' && (
        <Card>
          <Muted>Cria um grid vazio (fundo branco). Depois é só pintar as células e escolher as cores no modo “Pintar”.</Muted>
          <Button title="Criar grid em branco" onPress={createBlank} />
        </Card>
      )}

      {method !== 'blank' && (
        <Card>
          <Title>Arquivo do gráfico</Title>
          {imageSources.length === 0 ? (
            <Muted>
              {method === 'image'
                ? 'Importe uma imagem do gráfico na tela do projeto. Para PDFs, use “Transcrever (IA)” ou importe um print da página.'
                : 'Importe a imagem ou o PDF do gráfico na tela do projeto.'}
            </Muted>
          ) : (
            <ScrollView horizontal contentContainerStyle={{ gap: space.sm }}>
              {imageSources.map((s) => (
                <Pressable key={s.id} onPress={() => setSourceId(s.id)} style={[st.thumb, s.id === sourceId && st.thumbActive]}>
                  {s.kind === 'image' ? (
                    <Image source={{ uri: s.uri }} style={st.thumbImg} />
                  ) : (
                    <View style={[st.thumbImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>PDF</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
          {method === 'ai' && source?.kind === 'pdf' && <NumberField label="Página do PDF" value={page} onChange={setPage} min={1} integer />}
        </Card>
      )}

      {method === 'image' && source?.kind === 'image' && (
        <Card>
          <Title>Área do gráfico</Title>
          <Muted>Ajuste as margens (em %) para que o retângulo cubra só os quadradinhos — sem números e legendas. As linhas mostram onde cada célula será lida.</Muted>
          <CropPreview source={source} crop={crop} rows={rows} cols={cols} />
          <Row>
            <NumberField label="Esquerda %" value={pct(crop.left)} onChange={(v) => setCrop({ ...crop, left: v / 100 })} min={0} max={100} />
            <NumberField label="Direita %" value={pct(1 - crop.right)} onChange={(v) => setCrop({ ...crop, right: 1 - v / 100 })} min={0} max={100} />
          </Row>
          <Row>
            <NumberField label="Topo %" value={pct(crop.top)} onChange={(v) => setCrop({ ...crop, top: v / 100 })} min={0} max={100} />
            <NumberField label="Base %" value={pct(1 - crop.bottom)} onChange={(v) => setCrop({ ...crop, bottom: 1 - v / 100 })} min={0} max={100} />
          </Row>
          <Button title="Ler grid da imagem" onPress={readFromImage} loading={busy} />
        </Card>
      )}

      {method === 'ai' && (
        <Card>
          <Muted>
            A IA lê o gráfico célula por célula. Funciona com PDF e imagem; é mais lento e recomendado para gráficos de até ~60×60. Confira o resultado
            antes de usar.
          </Muted>
          <Button title="Transcrever gráfico com IA" onPress={transcribe} loading={busy} disabled={!source} />
        </Card>
      )}

      {preview && (
        <Card>
          <Title>Resultado</Title>
          <Muted>{preview.palette.length} cores detectadas. Você poderá trocar e mesclar cores depois.</Muted>
          <View style={{ height: 320, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
            <GridView grid={preview.grid} palette={preview.palette} work={project.work} cellSize={Math.max(4, Math.min(14, Math.floor(300 / Math.max(rows, cols))))} showDone={false} />
          </View>
          <Row>
            {preview.palette.map((p) => (
              <View key={p.id} style={[st.dot, { backgroundColor: p.hex }]} />
            ))}
          </Row>
          <Button title="Usar este grid" onPress={() => save(preview.grid, preview.palette)} />
        </Card>
      )}
    </ScrollView>
  );
}

const pct = (v: number) => Math.round(v * 1000) / 10;

function CropPreview({ source, crop, rows, cols }: { source: SourceFile; crop: CropFractions; rows: number; cols: number }) {
  const { width: screenW } = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(source.width && source.height ? { width: source.width, height: source.height } : null);
  useEffect(() => {
    if (!size) imageSize(source.uri).then(setSize).catch(() => setSize({ width: 1, height: 1 }));
  }, [source.uri]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = screenW - 64;
  const h = size ? (w * size.height) / size.width : w;
  const r = {
    x: crop.left * w,
    y: crop.top * h,
    w: (crop.right - crop.left) * w,
    h: (crop.bottom - crop.top) * h,
  };
  const lines = useMemo(() => {
    const out: React.ReactElement[] = [];
    // desenha no máximo ~60 linhas por eixo para não poluir
    const stepC = Math.max(1, Math.ceil(cols / 60));
    const stepR = Math.max(1, Math.ceil(rows / 60));
    for (let c = stepC; c < cols; c += stepC) out.push(<Line key={`c${c}`} x1={r.x + (c * r.w) / cols} x2={r.x + (c * r.w) / cols} y1={r.y} y2={r.y + r.h} stroke="#E53935" strokeWidth={0.5} />);
    for (let k = stepR; k < rows; k += stepR) out.push(<Line key={`r${k}`} y1={r.y + (k * r.h) / rows} y2={r.y + (k * r.h) / rows} x1={r.x} x2={r.x + r.w} stroke="#E53935" strokeWidth={0.5} />);
    return out;
  }, [r.x, r.y, r.w, r.h, rows, cols]);
  return (
    <View style={{ width: w, height: h }}>
      <Image source={{ uri: source.uri }} style={{ width: w, height: h }} resizeMode="stretch" />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="#E53935" strokeWidth={2} />
        {lines}
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  thumb: { borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.primary },
  thumbImg: { width: 80, height: 80, borderRadius: 6, backgroundColor: colors.border },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border },
});
