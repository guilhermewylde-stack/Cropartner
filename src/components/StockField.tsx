import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { YarnStock } from '../lib/types';
import { colors } from '../theme';

/**
 * "Tenho: [2] novelos | m". Vazio = não informado. Confirma ao sair do campo; trocar a unidade
 * confirma na hora. Quem usa remonta com `key` por cor.
 */
export function StockField({ stock, defaultUnit, onChange, label }: { stock?: YarnStock; defaultUnit: YarnStock['unit']; onChange: (s: YarnStock | null) => void; label: string }) {
  const [text, setText] = useState(stock ? String(stock.amount).replace('.', ',') : '');
  const [unit, setUnit] = useState<YarnStock['unit']>(stock?.unit ?? defaultUnit);

  const commit = (u = unit) => {
    if (text.trim() === '') return onChange(null);
    const amount = Number(text.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      setText(stock ? String(stock.amount).replace('.', ',') : '');
      return;
    }
    if (amount !== stock?.amount || u !== stock?.unit) onChange({ amount, unit: u });
  };

  return (
    <View style={st.row}>
      <Text style={st.label}>Tenho</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => commit()}
        onSubmitEditing={() => commit()}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholder="?"
        placeholderTextColor={colors.muted}
        style={st.input}
        accessibilityLabel={label}
      />
      {(['skeins', 'meters'] as const).map((u) => (
        <Pressable
          key={u}
          onPress={() => {
            setUnit(u);
            commit(u);
          }}
          style={[st.unit, unit === u && st.unitActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: unit === u }}
        >
          <Text style={[st.unitText, unit === u && { color: colors.primaryText }]}>{u === 'skeins' ? 'novelos' : 'm'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: colors.muted, fontSize: 14 },
  input: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16, color: colors.text, backgroundColor: '#fff', textAlign: 'center' },
  unit: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  unitActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
