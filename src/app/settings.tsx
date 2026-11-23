import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSettings } from '../store/settings';
import { Button, Card, Muted, styles, Title } from '../components/ui';
import { colors, space } from '../theme';

export default function Settings() {
  const leftHanded = useSettings((s) => s.leftHanded);
  const setLeftHanded = useSettings((s) => s.setLeftHanded);
  const yarnCount = useSettings((s) => s.yarns.length);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={st.row}>
          <Text style={st.label}>Sou canhota</Text>
          <Switch
            value={leftHanded}
            onValueChange={setLeftHanded}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Sou canhota"
          />
        </View>
        <Muted>
          {leftHanded
            ? 'A carreira 1 começa embaixo à esquerda e segue para a direita.'
            : 'A carreira 1 começa embaixo à direita e segue para a esquerda.'}
        </Muted>
        <Muted>Vale para todos os projetos. Muda só o sentido da contagem — o desenho não é espelhado.</Muted>
      </Card>
      <Card>
        <Title>Minhas linhas</Title>
        <Muted>
          {yarnCount === 0 ? 'Nenhuma linha cadastrada.' : yarnCount === 1 ? '1 linha cadastrada.' : `${yarnCount} linhas cadastradas.`} Usadas no cálculo de novelos e gramas de todos
          os projetos.
        </Muted>
        <Button variant="secondary" title="Gerenciar linhas" onPress={() => router.push('/yarns')} />
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { fontSize: 18, fontWeight: '700', color: colors.text },
});
