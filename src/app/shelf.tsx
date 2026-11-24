import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useProjects } from '../store/projects';
import { Card, Muted, Segmented, styles } from '../components/ui';
import { EMPTY_SHELF, formatDateBR, groupShelf, STATUS_LABEL } from '../lib/shelf';
import type { Project, ShelfStatus } from '../lib/types';
import { colors, space } from '../theme';

const EMPTY_TEXT: Record<ShelfStatus, string> = {
  doing: 'Nada em andamento. Marque o primeiro ponto de um projeto para ele aparecer aqui.',
  want: 'Guarde aqui as ideias: crie um projeto só com nome, foto ou link e deixe em “quero fazer”.',
  done: 'Quando terminar uma peça, ela aparece aqui com a foto.',
};

const percent = (p: Project) => {
  const total = p.grid ? p.grid.rows * p.grid.cols : 0;
  return total ? Math.round((Math.min(p.progress, total) / total) * 100) : 0;
};

/** Estante: projetos por estado, com foto (ou as cores do gráfico). */
export default function ShelfScreen() {
  const projects = useProjects((s) => s.projects);
  const groups = useMemo(() => groupShelf(Object.values(projects)), [projects]);
  const [tab, setTab] = useState<ShelfStatus>(() => (groups.doing.length ? 'doing' : groups.want.length ? 'want' : 'done'));
  const list = groups[tab];

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={list}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <Segmented<ShelfStatus>
          value={tab}
          onChange={setTab}
          options={(['doing', 'want', 'done'] as const).map((value) => ({ value, label: `${value === 'done' ? 'Feitos' : STATUS_LABEL[value]} (${groups[value].length})` }))}
        />
      }
      ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space.lg }}>{EMPTY_TEXT[tab]}</Muted>}
      renderItem={({ item }) => <ShelfItem project={item} />}
    />
  );
}

function ShelfItem({ project: p }: { project: Project }) {
  const shelf = p.shelf ?? EMPTY_SHELF;
  const pct = percent(p);
  return (
    <Pressable onPress={() => router.push(`/project/${p.id}`)} accessibilityRole="button" accessibilityLabel={p.name}>
      <Card style={st.item}>
        {p.photo ? (
          <Image source={{ uri: p.photo.uri }} style={st.thumb} resizeMode="cover" />
        ) : (
          <View style={[st.thumb, st.swatches]}>
            {(p.palette.length ? p.palette.slice(0, 4) : [{ id: 'x', hex: colors.border }]).map((c) => (
              <View key={c.id} style={{ flex: 1, backgroundColor: c.hex }} />
            ))}
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.name} numberOfLines={2}>
            {p.name}
          </Text>
          {shelf.status === 'doing' && p.grid && (
            <>
              <View style={st.bar}>
                <View style={[st.barFill, { width: `${pct}%` }]} />
              </View>
              <Muted>
                {pct}% feito{shelf.startedAt ? ` · desde ${formatDateBR(shelf.startedAt)}` : ''}
              </Muted>
            </>
          )}
          {shelf.status === 'done' && <Muted>{shelf.finishedAt ? `Terminado em ${formatDateBR(shelf.finishedAt)}` : 'Feito'}</Muted>}
          {shelf.status === 'want' && <Muted>{p.grid ? `Grid ${p.grid.cols}×${p.grid.rows} pronto` : p.referenceUrl ? 'Com link de referência' : 'Ideia'}</Muted>}
        </View>
      </Card>
    </Pressable>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border, overflow: 'hidden' },
  swatches: { flexDirection: 'row' },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary },
});
