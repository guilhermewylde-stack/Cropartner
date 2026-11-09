import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useProject, useProjects } from '../../../store/projects';
import { Card, Muted, Segmented, styles, Title } from '../../../components/ui';
import { colors, space } from '../../../theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const update = useProjects((s) => s.updateProject);
  const [tab, setTab] = useState<'steps' | 'text'>(project?.recipe ? 'steps' : 'text');
  if (!project) return null;
  const r = project.recipe;

  const toggleStep = (i: number) =>
    update(project.id, (p) => ({
      recipe: p.recipe && { ...p.recipe, steps: p.recipe.steps.map((s, k) => (k === i ? { ...s, done: !s.done } : s)) },
    }));

  const doneCount = r?.steps.filter((s) => s.done).length ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'steps', label: 'Passo a passo' },
          { value: 'text', label: 'Texto da receita' },
        ]}
      />
      {tab === 'steps' &&
        (r ? (
          <>
            <Card>
              <Title>{r.title}</Title>
              {!!r.summary && <Muted>{r.summary}</Muted>}
              <Info label="Agulha" value={r.hookSize} />
              <Info label="Fio" value={r.yarnWeight} />
              <Info label="Amostra" value={r.gauge} />
              <Info label="Tamanho final" value={r.finishedSize} />
              <Info label="Fio indicado" value={r.statedYarn} />
              {r.materials.length > 0 && <Info label="Materiais" value={r.materials.join(' · ')} />}
            </Card>
            {r.abbreviations.length > 0 && (
              <Card>
                <Title>Abreviações</Title>
                {r.abbreviations.map((a) => (
                  <Text key={a.abbr} style={st.text}>
                    <Text style={{ fontWeight: '700' }}>{a.abbr}</Text> — {a.meaning}
                  </Text>
                ))}
              </Card>
            )}
            <Card>
              <Title>
                Etapas ({doneCount}/{r.steps.length})
              </Title>
              <Muted>Toque numa etapa para marcar como feita.</Muted>
              {r.steps.map((s, i) => (
                <Pressable key={i} onPress={() => toggleStep(i)} style={[st.step, s.done && st.stepDone]}>
                  <View style={[st.check, s.done && st.checkOn]}>{s.done && <Text style={{ color: '#fff' }}>✓</Text>}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.stepLabel, s.done && st.strike]}>
                      {s.label}
                      {s.stitchCount ? ` (${s.stitchCount} pts)` : ''}
                    </Text>
                    <Text style={[st.text, s.done && st.strike]}>{s.instructions}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
            {!!r.notes && (
              <Card>
                <Title>Observações</Title>
                <Text style={st.text}>{r.notes}</Text>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <Muted>A receita ainda não foi lida. Importe imagens/PDF na tela do projeto e toque em “Ler receita com IA”, ou digite o texto na aba ao lado.</Muted>
          </Card>
        ))}
      {tab === 'text' && (
        <Card>
          <Muted>Você pode corrigir ou digitar a receita aqui.</Muted>
          <TextInput
            multiline
            value={project.recipeText ?? ''}
            onChangeText={(t) => update(project.id, { recipeText: t })}
            placeholder="Cole ou digite a receita…"
            placeholderTextColor={colors.muted}
            style={st.textarea}
            textAlignVertical="top"
          />
        </Card>
      )}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Text style={st.text}>
      <Text style={{ fontWeight: '700' }}>{label}: </Text>
      {value}
    </Text>
  );
}

const st = StyleSheet.create({
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  step: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  stepDone: { opacity: 0.55 },
  stepLabel: { fontWeight: '700', color: colors.text, fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkOn: { backgroundColor: colors.primary },
  textarea: { minHeight: 320, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
});
