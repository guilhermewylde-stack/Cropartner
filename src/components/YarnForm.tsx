import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { yarnInputError, type YarnInput } from '../lib/yarn';
import type { Yarn } from '../lib/types';
import { Button, Field, Row } from './ui';
import { colors, space } from '../theme';

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** "500 m · 145 g por novelo" */
export const yarnSummary = (y: Yarn) => `${fmt(y.metersPerSkein)} m${y.gramsPerSkein ? ` · ${fmt(y.gramsPerSkein)} g` : ''} por novelo`;

const num = (t: string) => (t.trim() === '' ? undefined : Number(t.replace(',', '.')));

/** Formulário de uma linha cadastrada (nome, metros e gramas por novelo). Quem usa remonta com `key`. */
export function YarnForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: YarnInput; submitLabel: string; onSubmit: (y: YarnInput) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [meters, setMeters] = useState(initial ? String(initial.metersPerSkein) : '');
  const [grams, setGrams] = useState(initial?.gramsPerSkein ? String(initial.gramsPerSkein) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const input: YarnInput = { name, metersPerSkein: num(meters) ?? 0, gramsPerSkein: num(grams) };
    const err = yarnInputError(input);
    setError(err);
    if (!err) onSubmit(input);
  };

  return (
    <View style={{ gap: space.sm }}>
      <Field label="Nome (ex.: Anne 500)" value={name} onChangeText={setName} />
      <Row>
        <Field label="Metros por novelo" value={meters} onChangeText={setMeters} keyboardType="decimal-pad" />
        <Field label="Gramas por novelo" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" placeholder="opcional" />
      </Row>
      {error && <Text style={st.error}>{error}</Text>}
      <Row>
        <Button small title={submitLabel} onPress={submit} style={{ flex: 1 }} />
        {onCancel && <Button small variant="ghost" title="Cancelar" onPress={onCancel} />}
      </Row>
    </View>
  );
}

const st = StyleSheet.create({
  error: { color: colors.danger, fontWeight: '600' },
});
