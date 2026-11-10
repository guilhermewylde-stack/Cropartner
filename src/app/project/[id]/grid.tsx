import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProject, useProjects } from '../../../store/projects';
import { GridView } from '../../../components/GridView';
import { ColorEditor } from '../../../components/ColorEditor';
import { Button, Muted, Row, Segmented, Title } from '../../../components/ui';
import { floodFill, positionInfo, replaceColor } from '../../../lib/grid';
import { advance, clampProgress, isFinished, lastDoneCell, markedThrough, nextCellToWork, stepBack, type AdvanceKind } from '../../../lib/progress';
import { canUndo, emptyHistory, record, undo as undoHistory } from '../../../lib/history';
import { makePaletteColor, textColorOn } from '../../../lib/colors';
import type { Grid, PaletteColor, Project, ProjectWork, StartCorner, WorkMode } from '../../../lib/types';
import type { WorkOrder } from '../../../lib/workOrder';
import { defaultStartCorner } from '../../../lib/workOrder';
import { useWorkOrder } from '../../../hooks/useWorkOrder';
import { useSettings } from '../../../store/settings';
import { colors, space } from '../../../theme';

type Mode = 'progress' | 'paint';
type PaintTool = 'brush' | 'bucket';

export default function GridScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('progress');
  const [tool, setTool] = useState<PaintTool>('brush');
  const [cellSize, setCellSize] = useState(18);
  const [activeColor, setActiveColor] = useState<string | null>(project?.palette[0]?.id ?? null);
  const [editing, setEditing] = useState<PaletteColor | 'new' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState(() => emptyHistory<Snapshot>());
  const usage = useMemoUsage(project?.grid);
  const order = useWorkOrder(project);
  useKeepAwake(); // mãos ocupadas: a tela não apaga enquanto o grid está aberto

  if (!project || !project.grid || !order) {
    return (
      <View style={{ padding: space.lg, gap: space.md }}>
        <Muted>Este projeto ainda não tem grid.</Muted>
        <Button title="Criar grid" onPress={() => router.replace(`/project/${id}/grid-setup`)} />
      </View>
    );
  }
  const grid = project.grid;

  const done = clampProgress(order, project.progress ?? 0);
  const finished = isFinished(order, done);

  const commit = (patch: Partial<Snapshot>) => {
    setHistory((h) => record(h, { grid, palette: project.palette, progress: done }));
    update(project.id, patch);
  };

  const undo = () => {
    const step = undoHistory(history);
    if (!step) return;
    setHistory(step.history);
    update(project.id, step.state);
  };

  const setProgress = (progress: number) => {
    if (progress !== done) commit({ progress });
  };

  const onCellPress = (cell: number) => {
    if (mode === 'progress') return setProgress(markedThrough(order, cell));
    if (tool === 'bucket') commit({ grid: floodFill(grid, cell, activeColor) });
    else if (grid.cells[cell] !== activeColor) {
      const cells = [...grid.cells];
      cells[cell] = activeColor;
      commit({ grid: { ...grid, cells } });
    }
  };

  const go = (kind: AdvanceKind) => setProgress(advance(grid, order, done, kind));

  // o que o botão grande vai fazer: quantos pontos, de que cor
  const nextCell = nextCellToWork(order, done);
  const nextRun = nextCell == null ? null : positionInfo(grid, order, nextCell);
  const nextColor = nextRun?.colorId ? project.palette.find((c) => c.id === nextRun.colorId) : undefined;
  const nextCount = nextRun ? nextRun.remainingInRun + 1 : 0;

  const saveColor = (c: { name: string; hex: string }) => {
    if (editing === 'new') {
      const nc = makePaletteColor(c.hex, c.name);
      commit({ palette: [...project.palette, nc] });
      setActiveColor(nc.id);
    } else if (editing) {
      commit({ palette: project.palette.map((p) => (p.id === editing.id ? { ...p, ...c } : p)) });
    }
    setEditing(null);
  };

  const mergeColor = (intoId: string) => {
    if (!editing || editing === 'new') return;
    commit({ grid: replaceColor(grid, editing.id, intoId), palette: project.palette.filter((p) => p.id !== editing.id) });
    if (activeColor === editing.id) setActiveColor(intoId);
    setEditing(null);
  };

  const deleteColor = () => {
    if (!editing || editing === 'new') return;
    commit({ grid: replaceColor(grid, editing.id, null), palette: project.palette.filter((p) => p.id !== editing.id) });
    setEditing(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: project.name }} />
      <View style={st.toolbar}>
        <View style={{ flex: 1 }}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'progress', label: 'Progresso' },
              { value: 'paint', label: 'Pintar / cores' },
            ]}
          />
        </View>
        <IconBtn label="−" onPress={() => setCellSize((s) => Math.max(4, Math.round(s / 1.25)))} />
        <IconBtn label="+" onPress={() => setCellSize((s) => Math.min(48, Math.round(s * 1.25)))} />
        <IconBtn label="⚙" onPress={() => setShowSettings(true)} />
      </View>

      <View style={{ flex: 1 }}>
        <GridView grid={grid} palette={project.palette} order={order} cellSize={cellSize} done={mode === 'progress' ? done : 0} currentCell={mode === 'progress' ? (lastDoneCell(order, done) ?? nextCell) : null} onCellPress={onCellPress} />
      </View>

      <View style={[st.panel, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {mode === 'progress' ? (
          <>
            <PositionPanel grid={grid} palette={project.palette} order={order} done={done} />
            <View style={st.secondary}>
              <Button small variant="ghost" title="Desfazer" onPress={undo} disabled={!canUndo(history)} style={[st.secondaryBtn, { flex: 1.1 }]} />
              <Button small variant="secondary" title="−1" onPress={() => setProgress(stepBack(done))} disabled={done === 0} style={[st.secondaryBtn, { flex: 0.7 }]} />
              <Button small variant="secondary" title="+1" onPress={() => go('stitch')} disabled={finished} style={[st.secondaryBtn, { flex: 0.7 }]} />
              <Button small variant="secondary" title="Fim da carreira" onPress={() => go('row')} disabled={finished} style={[st.secondaryBtn, { flex: 1.8 }]} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Até o fim da cor"
              onPress={() => go('color')}
              disabled={finished}
              style={({ pressed }) => [st.main, finished && st.mainDone, pressed && { opacity: 0.8 }]}
            >
              {finished ? (
                <Text style={st.mainTitle}>Gráfico concluído 🎉</Text>
              ) : (
                <>
                  <Text style={st.mainTitle}>Até o fim da cor</Text>
                  <View style={st.mainHint}>
                    <View style={[st.mainSwatch, { backgroundColor: nextColor?.hex ?? '#fff' }]} />
                    <Text style={st.mainSub}>
                      +{nextCount} {nextColor?.name ?? 'vazio'}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <ScrollView horizontal contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
              {project.palette.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setActiveColor(p.id)}
                  onLongPress={() => setEditing(p)}
                  style={[st.chip, { backgroundColor: p.hex }, activeColor === p.id && st.chipActive]}
                >
                  <Text style={{ color: textColorOn(p.hex), fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={{ color: textColorOn(p.hex), fontSize: 11 }}>{usage.get(p.id) ?? 0}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setActiveColor(null)} style={[st.chip, { backgroundColor: '#fff' }, activeColor === null && st.chipActive]}>
                <Text style={{ fontSize: 12 }}>Vazio</Text>
              </Pressable>
              <Pressable onPress={() => setEditing('new')} style={[st.chip, st.addChip]}>
                <Text style={{ fontSize: 20, color: colors.primary }}>＋</Text>
              </Pressable>
            </ScrollView>
            <Muted>Toque numa cor para pintar. Segure uma cor para trocar o tom (muda no grid inteiro), renomear ou mesclar.</Muted>
            <Row>
              <View style={{ flex: 1 }}>
                <Segmented
                  value={tool}
                  onChange={setTool}
                  options={[
                    { value: 'brush', label: 'Pincel' },
                    { value: 'bucket', label: 'Balde' },
                  ]}
                />
              </View>
              <Button small variant="ghost" title="Desfazer" onPress={undo} disabled={!canUndo(history)} />
            </Row>
          </>
        )}
      </View>

      <ColorEditor
        key={editing == null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        visible={editing != null}
        color={editing === 'new' ? null : editing}
        palette={project.palette}
        usage={editing && editing !== 'new' ? usage.get(editing.id) ?? 0 : undefined}
        onClose={() => setEditing(null)}
        onSave={saveColor}
        onMerge={mergeColor}
        onDelete={deleteColor}
      />

      <WorkSettingsModal
        visible={showSettings}
        project={project}
        onClose={() => setShowSettings(false)}
        onChange={(work) => update(project.id, { work })}
        onReset={() => {
          setProgress(0);
          setShowSettings(false);
        }}
      />
    </View>
  );
}

type Snapshot = Pick<Project, 'grid' | 'palette' | 'progress'>;

function useMemoUsage(grid: Grid | undefined) {
  const cells = grid?.cells;
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells ?? []) if (c) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [cells]);
}

const ARROW = { ltr: '→', rtl: '←' } as const;

/**
 * Painel compacto: onde está o último ponto feito, para não precisar contar no meio da carreira.
 * Todos os números vêm de `positionInfo`.
 */
function PositionPanel({ grid, palette, order, done }: { grid: Grid; palette: PaletteColor[]; order: WorkOrder; done: number }) {
  const byId = new Map(palette.map((c) => [c.id, c]));
  const nameOf = (cid: string | null) => (cid ? byId.get(cid)?.name ?? '?' : 'vazio');
  const hexOf = (cid: string | null) => (cid ? byId.get(cid)?.hex : undefined) ?? '#fff';
  const percent = order.totalStitches ? Math.round((done / order.totalStitches) * 100) : 0;
  const last = lastDoneCell(order, done);

  if (last == null) {
    // nada feito ainda: por onde começar
    const first = positionInfo(grid, order, order.cellAt(0));
    return (
      <View style={st.pos}>
        <View style={st.posTop}>
          <Text style={st.posRow}>
            Carreira 1 de {first.totalRows} <Text style={st.posArrow}>{ARROW[first.direction]}</Text>
          </Text>
          <Text style={st.posPct}>0%</Text>
        </View>
        <Text style={st.posStitch}>Comece {first.direction === 'rtl' ? 'pela direita' : 'pela esquerda'}</Text>
        <View style={st.posColor}>
          <View style={[st.swatch, { backgroundColor: hexOf(first.colorId) }]} />
          <Text style={st.posColorText} numberOfLines={1}>
            <Text style={st.bold}>
              {first.runLength} {nameOf(first.colorId)}
            </Text>
            {first.nextRun ? ` → depois ${first.nextRun.inNextRow ? '(carreira 2) ' : ''}${first.nextRun.length} ${nameOf(first.nextRun.colorId)}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  const p = positionInfo(grid, order, last);
  return (
    <View style={st.pos}>
      <View style={st.posTop}>
        <Text style={st.posRow}>
          Carreira {p.workRow} de {p.totalRows} <Text style={st.posArrow}>{ARROW[p.direction]}</Text>
        </Text>
        <Text style={st.posPct}>
          {done}/{order.totalStitches} · {percent}%
        </Text>
      </View>
      <Text style={st.posStitch}>
        Ponto {p.stitchInRow} de {p.stitchesInRow}
        <Text style={st.posRest}> · faltam {p.remainingInRow}</Text>
      </Text>
      <View style={st.posColor}>
        <View style={[st.swatch, { backgroundColor: hexOf(p.colorId) }]} />
        <Text style={st.posColorText} numberOfLines={2}>
          <Text style={st.bold}>{nameOf(p.colorId)}</Text>: ponto {p.positionInRun} de {p.runLength} do bloco · faltam {p.remainingInRun}
          {p.nextRun ? (
            <Text style={st.posRest}>
              {' → depois '}
              {p.nextRun.inNextRow ? `(carreira ${p.workRow + 1}) ` : ''}
              <Text style={st.bold}>
                {p.nextRun.length} {nameOf(p.nextRun.colorId)}
              </Text>
            </Text>
          ) : (
            <Text style={st.posRest}> · último bloco do gráfico</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

function WorkSettingsModal({
  visible,
  project,
  onClose,
  onChange,
  onReset,
}: {
  visible: boolean;
  project: Project;
  onClose: () => void;
  onChange: (w: ProjectWork) => void;
  onReset: () => void;
}) {
  const leftHanded = useSettings((s) => s.leftHanded);
  const work = project.work;
  const auto = defaultStartCorner(leftHanded);
  const custom = work.startCorner != null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={st.sheet}>
          <Title>Sentido de trabalho</Title>
          <Muted>Define a ordem dos pontos usada no progresso e na contagem da posição.</Muted>
          <Text style={st.label}>Carreiras</Text>
          <Segmented<WorkMode>
            value={work.mode}
            onChange={(mode) => onChange({ ...work, mode })}
            options={[
              { value: 'flat', label: 'Ida e volta' },
              { value: 'same-direction', label: 'Sempre no mesmo sentido' },
            ]}
          />
          <Text style={st.label}>Onde começa a carreira 1</Text>
          <Segmented<'auto' | 'custom'>
            value={custom ? 'custom' : 'auto'}
            onChange={(v) => onChange({ ...work, startCorner: v === 'auto' ? null : auto })}
            options={[
              { value: 'auto', label: `Padrão (${leftHanded ? 'embaixo à esquerda' : 'embaixo à direita'})` },
              { value: 'custom', label: 'Outro canto' },
            ]}
          />
          {custom ? (
            <Segmented<StartCorner>
              value={work.startCorner ?? auto}
              onChange={(startCorner) => onChange({ ...work, startCorner })}
              options={[
                { value: 'bottom-right', label: 'Baixo dir.' },
                { value: 'bottom-left', label: 'Baixo esq.' },
                { value: 'top-right', label: 'Topo dir.' },
                { value: 'top-left', label: 'Topo esq.' },
              ]}
            />
          ) : (
            <Muted>O padrão segue o ajuste “Sou canhota” (em Ajustes, na tela inicial).</Muted>
          )}
          <Button
            variant="ghost"
            title="Zerar progresso"
            onPress={() =>
              Alert.alert('Zerar progresso', 'Desmarcar todos os pontos feitos?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Zerar', style: 'destructive', onPress: onReset },
              ])
            }
          />
          <Button title="Fechar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function IconBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.iconBtn} hitSlop={6} accessibilityRole="button">
      <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  panel: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  pos: { gap: 2 },
  posTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  posRow: { fontSize: 16, fontWeight: '700', color: colors.text },
  posArrow: { fontSize: 20, color: colors.accent, fontWeight: '800' },
  posPct: { fontSize: 13, color: colors.muted },
  posStitch: { fontSize: 22, fontWeight: '800', color: colors.text },
  posRest: { fontSize: 14, fontWeight: '400', color: colors.muted },
  posColor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posColorText: { flex: 1, fontSize: 15, color: colors.text },
  bold: { fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: space.sm },
  secondaryBtn: { flex: 1, minHeight: 44, paddingHorizontal: 6 },
  main: { minHeight: 68, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2 },
  mainDone: { backgroundColor: colors.accent },
  mainTitle: { color: colors.primaryText, fontSize: 22, fontWeight: '700' },
  mainHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mainSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  mainSub: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
  swatch: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  chip: { minWidth: 64, height: 48, borderRadius: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chipActive: { borderWidth: 3, borderColor: colors.text },
  addChip: { backgroundColor: '#fff', borderStyle: 'dashed', borderColor: colors.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, padding: space.lg, gap: space.md, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  label: { fontWeight: '600', color: colors.text },
});
