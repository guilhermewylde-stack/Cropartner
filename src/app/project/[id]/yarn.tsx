import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useProject, useProjects } from '../../../store/projects';
import { Button, Card, Muted, NumberField, Row, styles, Title } from '../../../components/ui';
import { calibrate, estimateFromGrid } from '../../../lib/yarn';
import { useWorkOrder } from '../../../hooks/useWorkOrder';
import type { YarnSettings } from '../../../lib/types';
import { colors, space } from '../../../theme';

const fmt = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export default function YarnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const [calStitches, setCalStitches] = useState(10);
  const [calCm, setCalCm] = useState(40);
  const [calTarget, setCalTarget] = useState<string | null>(null);

  const y = project?.yarn;
  const order = useWorkOrder(project);
  const gridEst = project?.grid && order && y ? estimateFromGrid(project.grid, project.palette, order, y) : null;
  if (!project || !y) return null;

  const setYarn = (patch: Partial<YarnSettings>) => update(project.id, { yarn: { ...y, ...patch } });
  const setCm = (stitchId: string, cm: number) => setYarn({ stitchTypes: y.stitchTypes.map((s) => (s.id === stitchId ? { ...s, cmPerStitch: cm } : s)) });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {gridEst && (
        <Card>
          <Title>Pelo grid</Title>
          <Muted>
            Cada célula = 1 {y.stitchTypes.find((s) => s.id === y.gridStitchId)?.name ?? 'ponto'}. Inclui {y.wastePercent}% de margem e {y.tailPerColorChangeCm} cm de ponta por
            bloco de cor.
          </Muted>
          {gridEst.perColor.map((c) => (
            <View key={c.colorId} style={st.line}>
              <View style={[st.swatch, { backgroundColor: c.hex }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{c.name}</Text>
                <Muted>
                  {c.stitches} pontos · {c.segments} blocos
                </Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.value}>{fmt(c.meters)} m</Text>
                <Muted>
                  {fmt(c.skeins, 2)} novelo(s){c.grams != null ? ` · ${fmt(c.grams, 0)} g` : ''}
                </Muted>
              </View>
            </View>
          ))}
          <View style={[st.line, st.total]}>
            <Text style={[st.name, { flex: 1 }]}>Total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.value}>{fmt(gridEst.totalMeters)} m</Text>
              <Muted>
                {fmt(gridEst.totalSkeins, 2)} novelo(s){gridEst.totalGrams != null ? ` · ${fmt(gridEst.totalGrams, 0)} g` : ''}
              </Muted>
            </View>
          </View>
          <Muted>Compre novelos inteiros por cor (arredonde para cima).</Muted>
        </Card>
      )}

      {!gridEst && (
        <Card>
          <Muted>Crie um grid para calcular a linha necessária.</Muted>
        </Card>
      )}

      <Card>
        <Title>Fio e novelo</Title>
        <Row>
          <NumberField label="Metros por novelo" value={y.metersPerSkein} onChange={(v) => setYarn({ metersPerSkein: v })} min={1} />
          <NumberField label="Gramas por novelo" value={y.gramsPerSkein ?? 0} onChange={(v) => setYarn({ gramsPerSkein: v || undefined })} min={0} />
        </Row>
        <Row>
          <NumberField label="Margem de perda (%)" value={y.wastePercent} onChange={(v) => setYarn({ wastePercent: v })} min={0} max={200} />
          <NumberField label="Ponta por bloco de cor (cm)" value={y.tailPerColorChangeCm} onChange={(v) => setYarn({ tailPerColorChangeCm: v })} min={0} />
        </Row>
      </Card>

      <Card>
        <Title>Consumo por ponto</Title>
        <Muted>Toque em um ponto para usá-lo nas células do grid. Os valores são estimativas para fio médio — calibre com a sua linha e agulha.</Muted>
        {y.stitchTypes.map((s) => (
          <View key={s.id} style={st.stitchRow}>
            <View style={{ flex: 1.4 }}>
              <Button
                small
                variant={y.gridStitchId === s.id ? 'primary' : 'secondary'}
                title={s.name + (y.gridStitchId === s.id ? ' · grid' : '')}
                onPress={() => setYarn({ gridStitchId: s.id })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField label="cm/ponto" value={s.cmPerStitch} onChange={(v) => setCm(s.id, v)} min={0.1} />
            </View>
            <Button small variant="ghost" title="Calibrar" onPress={() => setCalTarget(s.id)} />
          </View>
        ))}
        {calTarget && (
          <View style={st.calibrate}>
            <Text style={st.name}>Calibrar: {y.stitchTypes.find((s) => s.id === calTarget)?.name}</Text>
            <Muted>Marque o fio, faça alguns pontos, desmanche e meça quanto fio foi usado.</Muted>
            <Row>
              <NumberField label="Pontos feitos" value={calStitches} onChange={setCalStitches} min={1} integer />
              <NumberField label="Fio usado (cm)" value={calCm} onChange={setCalCm} min={0.1} />
            </Row>
            <Row>
              <Button
                small
                title={`Usar ${fmt(calibrate(calStitches, calCm))} cm/ponto`}
                onPress={() => {
                  setCm(calTarget, calibrate(calStitches, calCm));
                  setCalTarget(null);
                }}
              />
              <Button small variant="ghost" title="Cancelar" onPress={() => setCalTarget(null)} />
            </Row>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  total: { borderTopWidth: 2, borderTopColor: colors.text },
  swatch: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  name: { fontWeight: '600', color: colors.text, fontSize: 15 },
  value: { fontWeight: '700', color: colors.text, fontSize: 16 },
  stitchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  calibrate: { gap: space.sm, padding: space.md, backgroundColor: colors.bg, borderRadius: 8 },
});
