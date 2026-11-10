import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Line, Rect } from 'react-native-svg';
import { useProject, useProjects } from '../../../store/projects';
import { Button, Card, Muted, NumberField, Row, Segmented, styles, Title } from '../../../components/ui';
import { GridView } from '../../../components/GridView';
import { createGrid } from '../../../lib/grid';
import { resolveWork, straightRows } from '../../../lib/workOrder';
import { useSettings } from '../../../store/settings';
import { makePaletteColor } from '../../../lib/colors';
import { FULL_IMAGE, type CropFractions } from '../../../lib/sampling';
import { imageSize, readGridFromImage } from '../../../lib/native/imageGrid';
import type { Grid, PaletteColor, SourceFile } from '../../../lib/types';
import { colors, space } from '../../../theme';

type Method = 'blank' | 'image';

export default function GridSetup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const leftHanded = useSettings((s) => s.leftHanded);
  const images = project?.sources.filter((s) => s.kind === 'image') ?? [];

  const [method, setMethod] = useState<Method>(images.length ? 'image' : 'blank');
  const [rows, setRows] = useState(30);
  const [cols, setCols] = useState(30);
  const [maxColors, setMaxColors] = useState(6);
  const [sourceId, setSourceId] = useState<string | null>(images[0]?.id ?? null);
  const [crop, setCrop] = useState<CropFractions>(FULL_IMAGE);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ grid: Grid; palette: PaletteColor[] } | null>(null);

  const source = images.find((s) => s.id === sourceId) ?? null;

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
    if (!source) return;
    setBusy(true);
    try {
      setPreview(await readGridFromImage(source.uri, { rows, cols, crop, maxColors }));
    } catch (e) {
      Alert.alert('Não foi possível ler a imagem', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Segmented
        value={method}
        onChange={(m) => {
          setMethod(m);
          setPreview(null);
        }}
        options={[
          { value: 'blank', label: 'Em branco' },
          { value: 'image', label: 'Da imagem' },
        ]}
      />
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
          {images.length === 0 ? (
            <Muted>Importe uma imagem do gráfico na tela do projeto. Para PDFs, por enquanto, importe um print da página.</Muted>
          ) : (
            <ScrollView horizontal contentContainerStyle={{ gap: space.sm }}>
              {images.map((s) => (
                <Pressable key={s.id} onPress={() => setSourceId(s.id)} style={[st.thumb, s.id === sourceId && st.thumbActive]}>
                  <Image source={{ uri: s.uri }} style={st.thumbImg} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Card>
      )}

      {method === 'image' && source && (
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

      {preview && (
        <Card>
          <Title>Resultado</Title>
          <Muted>{preview.palette.length} cores detectadas. Você poderá trocar e mesclar cores depois.</Muted>
          <View style={{ height: 320, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
            <GridView grid={preview.grid} palette={preview.palette} order={straightRows(preview.grid, resolveWork(project.work, { leftHanded }))} cellSize={Math.max(4, Math.min(14, Math.floor(300 / Math.max(rows, cols))))} showDone={false} />
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
