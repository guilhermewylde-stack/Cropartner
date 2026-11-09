import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useProject, useProjects } from '../../../store/projects';
import { Button, Card, Field, Muted, Row, styles, Title } from '../../../components/ui';
import { deleteSourceFile, pickDocuments, pickImages, takePhoto, toAISources } from '../../../lib/native/files';
import { imageForAI } from '../../../lib/native/imageGrid';
import { analyzeRecipe } from '../../../lib/ai';
import { getApiKey } from '../../../lib/native/settings';
import { countDone } from '../../../lib/grid';
import type { SourceFile } from '../../../lib/types';
import { colors, space } from '../../../theme';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const [reading, setReading] = useState(false);

  if (!project) return <Muted style={{ padding: 16 }}>Projeto não encontrado.</Muted>;

  const addSources = async (fn: (pid: string) => Promise<SourceFile[]>) => {
    try {
      const added = await fn(project.id);
      if (added.length) update(project.id, (p) => ({ sources: [...p.sources, ...added] }));
    } catch (e) {
      Alert.alert('Não foi possível importar', (e as Error).message);
    }
  };

  const removeSource = (s: SourceFile) =>
    Alert.alert('Remover arquivo', s.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          deleteSourceFile(s);
          update(project.id, (p) => ({ sources: p.sources.filter((x) => x.id !== s.id) }));
        },
      },
    ]);

  const readRecipe = async () => {
    if (!project.sources.length) return Alert.alert('Importe a receita', 'Adicione imagens ou PDFs da receita primeiro.');
    setReading(true);
    try {
      const key = await getApiKey();
      const ai = await toAISources(project.sources, imageForAI);
      const result = await analyzeRecipe(key, ai);
      const hint = result.grid
        ? {
            sourceId: project.sources[result.grid.sourceIndex].id,
            page: result.grid.page,
            rows: result.grid.rows,
            cols: result.grid.cols,
            bbox: result.grid.bbox,
            colors: result.grid.colors,
          }
        : null;
      update(project.id, (p) => ({
        recipe: result.recipe,
        recipeText: result.recipeText,
        gridHint: hint,
        name: p.name === 'Novo projeto' && result.recipe.title ? result.recipe.title : p.name,
      }));
      if (hint && !project.grid) {
        Alert.alert('Gráfico encontrado', `Encontrei um gráfico de ${hint.cols} × ${hint.rows}. Quer montar o grid agora?`, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Montar grid', onPress: () => router.push(`/project/${project.id}/grid-setup`) },
        ]);
      } else if (!hint && !project.grid) {
        Alert.alert('Receita lida', 'Não encontrei um gráfico em grade. Se quiser, você pode criar um grid para este projeto.', [
          { text: 'Ver receita', onPress: () => router.push(`/project/${project.id}/recipe`) },
          { text: 'Criar grid', onPress: () => router.push(`/project/${project.id}/grid-setup`) },
        ]);
      } else {
        router.push(`/project/${project.id}/recipe`);
      }
    } catch (e) {
      Alert.alert('Não foi possível ler a receita', (e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const total = project.grid ? project.grid.rows * project.grid.cols : 0;
  const done = project.grid ? countDone(project.grid) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: project.name }} />
      <Card>
        <Field label="Nome do projeto" value={project.name} onChangeText={(name) => update(project.id, { name })} />
      </Card>

      <Card>
        <Title>Receita (imagens e PDF)</Title>
        <Row>
          <Button small title="Arquivos / PDF" onPress={() => addSources(pickDocuments)} />
          <Button small variant="secondary" title="Galeria" onPress={() => addSources(pickImages)} />
          <Button small variant="secondary" title="Câmera" onPress={() => addSources(takePhoto)} />
        </Row>
        {project.sources.length === 0 ? (
          <Muted>Nenhum arquivo importado.</Muted>
        ) : (
          <ScrollView horizontal contentContainerStyle={{ gap: space.sm }}>
            {project.sources.map((s) => (
              <Pressable key={s.id} onLongPress={() => removeSource(s)} style={st.thumb}>
                {s.kind === 'image' ? (
                  <Image source={{ uri: s.uri }} style={st.thumbImg} resizeMode="cover" />
                ) : (
                  <View style={[st.thumbImg, st.pdf]}>
                    <Text style={{ fontWeight: '700', color: colors.primary }}>PDF</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={st.thumbName}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {project.sources.length > 0 && <Muted>Segure um arquivo para remover.</Muted>}
        <Button title={project.recipe ? 'Ler receita novamente com IA' : 'Ler receita com IA'} onPress={readRecipe} loading={reading} disabled={!project.sources.length} />
      </Card>

      <Card>
        <Title>Ferramentas</Title>
        <Button
          variant="secondary"
          title={project.recipe ? `Receita: ${project.recipe.steps.length} etapas` : 'Receita (texto)'}
          onPress={() => router.push(`/project/${project.id}/recipe`)}
        />
        {project.grid ? (
          <>
            <Button title={`Abrir grid ${project.grid.cols}×${project.grid.rows} — ${total ? Math.round((done / total) * 100) : 0}% feito`} onPress={() => router.push(`/project/${project.id}/grid`)} />
            <Button small variant="ghost" title="Recriar grid" onPress={() => router.push(`/project/${project.id}/grid-setup`)} />
          </>
        ) : (
          <Button title={project.gridHint ? 'Montar grid do gráfico encontrado' : 'Criar grid'} onPress={() => router.push(`/project/${project.id}/grid-setup`)} />
        )}
        <Button variant="secondary" title="Cálculo de linha" onPress={() => router.push(`/project/${project.id}/yarn`)} />
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  thumb: { width: 96, gap: 4 },
  thumbImg: { width: 96, height: 96, borderRadius: 8, backgroundColor: colors.border },
  pdf: { alignItems: 'center', justifyContent: 'center' },
  thumbName: { fontSize: 12, color: colors.muted },
});
