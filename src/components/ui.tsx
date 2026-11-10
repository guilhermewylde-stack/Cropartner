import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, space } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.card : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? colors.primaryText : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={[{ flex: 1, minWidth: 90 }, style as object]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

/** Campo numérico que aceita vírgula ou ponto e só confirma valores válidos. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  integer,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  const [text, setText] = React.useState(String(value));
  // se o valor mudar por fora, o texto acompanha (ajuste durante o render, sem efeito)
  const [shown, setShown] = React.useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = () => {
    let v = Number(text.replace(',', '.'));
    if (!Number.isFinite(v)) return setText(String(value));
    if (integer) v = Math.round(v);
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <Field
      label={label}
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      returnKeyType="done"
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && { color: colors.primaryText }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius, overflow: 'hidden', backgroundColor: colors.card },
  segment: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  segmentText: { fontSize: 14, color: colors.text, fontWeight: '500', textAlign: 'center' },
});
