import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProject, useProjects } from '../../../store/projects';
import { GridView } from '../../../components/GridView';
import { ColorEditor } from '../../../components/ColorEditor';
import { Button, Muted, Row, Segmented, Title } from '../../../components/ui';
import {
  advanceTarget,
  cellsBetween,
  countDone,
  floodFill,
  isDone,
  markUpTo,
  nextCell,
  positionInfo,
  replaceColor,
  setDone,
  type AdvanceKind,
} from '../../../lib/grid';
import { makePaletteColor, textColorOn } from '../../../lib/colors';
import type { Grid, PaletteColor, Project, ProjectWork, StartCorner, WorkMode } from '../../../lib/types';
import type { WorkOrder } from '../../../lib/workOrder';
import { defaultStartCorner } from '../../../lib/workOrder';
import { useWorkOrder } from '../../../hooks/useWorkOrder';
import { useSettings } from '../../../store/settings';
import { colors, space } from '../../../theme';

type Mode = 'progress' | 'paint';
type TapAction = 'upto' | 'toggle' | 'select';
type PaintTool = 'brush' | 'bucket';

export default function GridScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('progress');
  const [tapAction, setTapAction] = useState<TapAction>('upto');
  const [tool, setTool] = useState<PaintTool>('brush');
  const [cellSize, setCellSize] = useState(18);
  const [activeColor, setActiveColor] = useState<string | null>(project?.palette[0]?.id ?? null);
  const [editing, setEditing] = useState<PaletteColor | 'new' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const history = useRef<{ grid: Grid; lastCell: number | null | undefined; palette: PaletteColor[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const usage = useMemoUsage(project?.grid);
  const order = useWorkOrder(project);

  if (!project || !project.grid || !order) {
    return (
      <View style={{ padding: space.lg, gap: space.md }}>
        <Muted>Este projeto ainda não tem grid.</Muted>
        <Button title="Criar grid" onPress={() => router.replace(`/project/${id}/grid-setup`)} />
      </View>
    );
  }
  const grid = project.grid;

  const commit = (patch: Partial<Project>) => {
    history.current.push({ grid, lastCell: project.lastCell, palette: project.palette });
    if (history.current.length > 50) history.current.shift();
    setCanUndo(true);
    update(project.id, patch);
  };

  const undo = () => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) update(project.id, { grid: prev.grid, lastCell: prev.lastCell, palette: prev.palette });
  };

  const onCellPress = (cell: number) => {
    if (mode === 'paint') {
      if (tool === 'bucket') commit({ grid: floodFill(grid, cell, activeColor) });
      else if (grid.cells[cell] !== activeColor) {
        const cells = [...grid.cells];
        cells[cell] = activeColor;
        commit({ grid: { ...grid, cells } });
      }
      return;
    }
    if (tapAction === 'select') return update(project.id, { lastCell: cell });
    if (tapAction === 'toggle') {
      const value = !isDone(grid, cell);
      return commit({ grid: setDone(grid, [cell], value), lastCell: cell });
    }
    commit({ grid: markUpTo(grid, order, cell), lastCell: cell });
  };

  const advance = (kind: AdvanceKind) => {
    const target = advanceTarget(grid, order, project.lastCell, kind);
    if (target == null) return Alert.alert('Fim do gráfico', 'Todos os pontos foram feitos. 🎉');
    commit({ grid: setDone(grid, cellsBetween(order, project.lastCell, target), true), lastCell: target });
  };

  const back = () => {
    if (project.lastCell == null) return;
    commit({ grid: setDone(grid, [project.lastCell], false), lastCell: nextCell(order, project.lastCell, -1) });
  };

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

  const total = grid.rows * grid.cols;
  const done = countDone(grid);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <GridView grid={grid} palette={project.palette} order={order} cellSize={cellSize} lastCell={mode === 'progress' ? project.lastCell : null} onCellPress={onCellPress} showDone={mode === 'progress'} />
      </View>

      <View style={[st.panel, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {mode === 'progress' ? (
          <>
            <PositionPanel project={project} order={order} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Muted>
                {done}/{total} pontos ({total ? Math.round((done / total) * 100) : 0}%)
              </Muted>
              <Button small variant="ghost" title="Desfazer" onPress={undo} disabled={!canUndo} />
            </Row>
            <Row>
              <Button small variant="secondary" title="−1" onPress={back} disabled={project.lastCell == null} />
              <Button small title="+1 ponto" onPress={() => advance('stitch')} style={{ flex: 1 }} />
              <Button small variant="secondary" title="Fim da cor" onPress={() => advance('color')} />
              <Button small variant="secondary" title="Fim da carreira" onPress={() => advance('row')} />
            </Row>
            <Segmented
              value={tapAction}
              onChange={setTapAction}
              options={[
                { value: 'upto', label: 'Toque: feito até aqui' },
                { value: 'toggle', label: 'Marcar 1' },
                { value: 'select', label: 'Só ver' },
              ]}
            />
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
              <Button small variant="ghost" title="Desfazer" onPress={undo} disabled={!canUndo} />
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
          commit({ grid: { ...grid, done: '0'.repeat(total) }, lastCell: null });
          setShowSettings(false);
        }}
      />
    </View>
  );
}

function useMemoUsage(grid: Grid | undefined) {
  const cells = grid?.cells;
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells ?? []) if (c) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [cells]);
}

/** Mostra onde está o ponto atual, para não precisar contar no meio da carreira. */
function PositionPanel({ project, order }: { project: Project; order: WorkOrder }) {
  const grid = project.grid!;
  const cell = project.lastCell;
  if (cell == null || cell >= grid.cells.length) {
    return <Muted>Toque numa célula (ou em “+1 ponto”) para começar. A posição do ponto atual aparece aqui.</Muted>;
  }
  const p = positionInfo(grid, order, cell);
  const byId = new Map(project.palette.map((c) => [c.id, c]));
  const color = p.colorId ? byId.get(p.colorId) : undefined;
  const nameOf = (cid: string | null) => (cid ? byId.get(cid)?.name ?? '?' : 'vazio');
  const upcoming = p.upcomingRuns.slice(0, 4);
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>
          Carreira {p.workRow}/{p.totalRows}
        </Title>
        <Text style={st.dir}>{p.direction === 'ltr' ? 'esquerda → direita' : 'direita → esquerda'}</Text>
      </Row>
      <Text style={st.big}>
        Ponto {p.stitchInRow} de {p.stitchesInRow}
        <Text style={st.small}> · faltam {p.remainingInRow} na carreira</Text>
      </Text>
      <Row>
        <View style={[st.swatch, { backgroundColor: color?.hex ?? '#fff' }]} />
        <Text style={st.text}>
          <Text style={{ fontWeight: '700' }}>{color?.name ?? 'Vazio'}</Text>: ponto {p.positionInRun} de {p.runLength}
          {p.remainingInRun > 0 ? ` · faltam ${p.remainingInRun}` : ' · último desta cor'}
        </Text>
      </Row>
      {upcoming.length > 0 ? (
        <Text style={st.small}>
          Depois: {upcoming.map((r) => `${r.length} ${nameOf(r.colorId)}`).join(' → ')}
          {p.upcomingRuns.length > upcoming.length ? ' → …' : ''}
        </Text>
      ) : (
        <Text style={st.small}>Último bloco da carreira.</Text>
      )}
      <Text style={st.small}>
        Coluna {p.colFromLeft} pela esquerda / {p.colFromRight} pela direita · bloco {p.runIndex} de {p.runsInRow} · ponto {p.overallStitch} de {p.totalStitches}
      </Text>
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
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  panel: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  big: { fontSize: 20, fontWeight: '700', color: colors.text },
  small: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  text: { fontSize: 15, color: colors.text, flexShrink: 1 },
  dir: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  swatch: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  chip: { minWidth: 64, height: 48, borderRadius: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chipActive: { borderWidth: 3, borderColor: colors.text },
  addChip: { backgroundColor: '#fff', borderStyle: 'dashed', borderColor: colors.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, padding: space.lg, gap: space.md, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  label: { fontWeight: '600', color: colors.text },
});
