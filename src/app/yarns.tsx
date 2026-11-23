import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../store/settings';
import { Button, Card, Muted, Row, styles, Title } from '../components/ui';
import { YarnForm, yarnSummary } from '../components/YarnForm';
import { colors, space } from '../theme';

/** Minhas linhas: cadastro global, reutilizado por todos os projetos. */
export default function YarnsScreen() {
  const yarns = useSettings((s) => s.yarns);
  const add = useSettings((s) => s.addYarn);
  const edit = useSettings((s) => s.updateYarn);
  const remove = useSettings((s) => s.removeYarn);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Title>Nova linha</Title>
        <Muted>Copie do rótulo do novelo. Vale para todos os projetos.</Muted>
        <YarnForm
          key={formKey}
          submitLabel="Cadastrar linha"
          onSubmit={(y) => {
            add(y);
            setFormKey((k) => k + 1);
          }}
        />
      </Card>

      <Card>
        <Title>Minhas linhas</Title>
        {yarns.length === 0 && <Muted>Nenhuma linha cadastrada ainda.</Muted>}
        {yarns.map((y) =>
          editing === y.id ? (
            <View key={y.id} style={[st.item, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <YarnForm
                initial={y}
                submitLabel="Salvar"
                onSubmit={(input) => {
                  edit(y.id, input);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </View>
          ) : (
            <View key={y.id} style={st.item}>
              <Pressable onPress={() => setEditing(y.id)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Editar ${y.name}`}>
                <Text style={st.name}>{y.name}</Text>
                <Muted>{yarnSummary(y)}</Muted>
              </Pressable>
              {confirming === y.id ? (
                <Row>
                  <Button small variant="danger" title="Excluir" onPress={() => remove(y.id)} />
                  <Button small variant="ghost" title="Manter" onPress={() => setConfirming(null)} />
                </Row>
              ) : (
                <Row>
                  <Button small variant="secondary" title="Editar" onPress={() => setEditing(y.id)} />
                  <Button small variant="ghost" title="Excluir" onPress={() => setConfirming(y.id)} />
                </Row>
              )}
            </View>
          ),
        )}
        {yarns.length > 0 && <Muted>Excluir uma linha não muda os gráficos: as cores que usavam essa linha passam a usar a linha padrão do projeto.</Muted>}
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
});
