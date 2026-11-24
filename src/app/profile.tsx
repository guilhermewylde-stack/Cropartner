import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useProjects } from '../store/projects';
import { useSettings } from '../store/settings';
import { Card, Muted, styles, Title } from '../components/ui';
import { profileStats } from '../lib/stats';
import { colors, space } from '../theme';

const fmt = (v: number, d = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });

/** Meu perfil (no aparelho): o que já foi crochetado. A conta e o perfil público vêm na Social 2. */
export default function ProfileScreen() {
  const projects = useProjects((s) => s.projects);
  const yarns = useSettings((s) => s.yarns);
  const leftHanded = useSettings((s) => s.leftHanded);
  const [now] = useState(() => Date.now());
  const s = useMemo(() => profileStats(Object.values(projects), yarns, now, { leftHanded }), [projects, yarns, leftHanded, now]);
  const maxColor = s.topColors[0]?.stitches ?? 1;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={st.grid}>
        <Stat value={fmt(s.finished)} label={s.finished === 1 ? 'peça feita' : 'peças feitas'} highlight />
        <Stat value={fmt(s.finishedThisYear)} label={`em ${new Date(now).getFullYear()}`} />
        <Stat value={fmt(s.inProgress)} label="em andamento" />
        <Stat value={fmt(s.wanted)} label="quero fazer" />
        <Stat value={fmt(s.stitchesDone)} label="pontos feitos" />
        <Stat value={`${fmt(s.metersUsed, s.metersUsed < 10 ? 1 : 0)} m`} label="de linha" />
      </View>
      <Card>
        <Title>Tempo por peça</Title>
        <Muted>
          {s.averageDaysPerPiece == null
            ? 'Aparece quando uma peça feita tiver as datas de começo e fim.'
            : `Em média ${fmt(s.averageDaysPerPiece)} ${s.averageDaysPerPiece === 1 ? 'dia' : 'dias'} do primeiro ao último ponto.`}
        </Muted>
      </Card>
      <Card>
        <Title>Cores favoritas</Title>
        {s.topColors.length === 0 && <Muted>Aparecem conforme você marca pontos no grid.</Muted>}
        {s.topColors.map((c) => (
          <View key={c.name} style={st.colorRow}>
            <View style={[st.swatch, { backgroundColor: c.hex }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Row2 left={c.name} right={`${fmt(c.stitches)} pontos`} />
              <View style={st.bar}>
                <View style={[st.barFill, { width: `${Math.max(4, (c.stitches / maxColor) * 100)}%`, backgroundColor: c.hex }]} />
              </View>
            </View>
          </View>
        ))}
      </Card>
      <Muted style={{ textAlign: 'center' }}>Contas e perfil para as amigas chegam na próxima etapa.</Muted>
    </ScrollView>
  );
}

function Stat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <View style={[st.stat, highlight && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={[st.statValue, highlight && { color: colors.primaryText }]}>{value}</Text>
      <Text style={[st.statLabel, highlight && { color: colors.primaryText }]}>{label}</Text>
    </View>
  );
}

function Row2({ left, right }: { left: string; right: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontWeight: '600', color: colors.text }}>{left}</Text>
      <Muted>{right}</Muted>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { flexBasis: '31%', flexGrow: 1, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  swatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6 },
});
