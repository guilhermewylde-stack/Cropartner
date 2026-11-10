import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSettings } from '../store/settings';
import { Card, Muted, styles } from '../components/ui';
import { colors, space } from '../theme';

export default function Settings() {
  const leftHanded = useSettings((s) => s.leftHanded);
  const setLeftHanded = useSettings((s) => s.setLeftHanded);

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
    </ScrollView>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { fontSize: 18, fontWeight: '700', color: colors.text },
});
