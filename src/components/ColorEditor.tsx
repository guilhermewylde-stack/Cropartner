import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isValidHex, normalizeHex, SWATCHES, colorName } from '../lib/colors';
import type { PaletteColor } from '../lib/types';
import { Button, Field, Muted, Row, Title } from './ui';
import { colors, space } from '../theme';

interface Props {
  visible: boolean;
  color: PaletteColor | null; // null = nova cor
  palette: PaletteColor[];
  usage?: number;
  onClose: () => void;
  onSave: (c: { name: string; hex: string }) => void;
  onMerge?: (intoId: string) => void;
  onDelete?: () => void;
}

/** Editar uma cor: troca o hex (todas as células mudam juntas), renomeia ou mescla com outra cor. */
export function ColorEditor({ visible, color, palette, usage, onClose, onSave, onMerge, onDelete }: Props) {
  const [hex, setHex] = useState(color?.hex ?? '#C2577A');
  const [name, setName] = useState(color?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    setHex(color?.hex ?? '#C2577A');
    setName(color?.name ?? '');
    setNameTouched(!!color);
  }, [color, visible]);

  const valid = isValidHex(hex);
  const preview = valid ? normalizeHex(hex) : '#FFFFFF';
  const pick = (h: string) => {
    setHex(h);
    if (!nameTouched) setName(colorName(h));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ gap: space.md }}>
            <Title>{color ? 'Editar cor' : 'Nova cor'}</Title>
            {usage != null && <Muted>{usage} pontos usam esta cor</Muted>}
            <Row>
              <View style={[s.preview, { backgroundColor: preview }]} />
              <Field label="Hex" value={hex} onChangeText={setHex} autoCapitalize="characters" autoCorrect={false} />
              <Field
                label="Nome"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameTouched(true);
                }}
              />
            </Row>
            <View style={s.swatches}>
              {SWATCHES.map((h) => (
                <Pressable key={h} onPress={() => pick(h)} style={[s.swatch, { backgroundColor: h }, preview === h && s.swatchActive]} accessibilityLabel={colorName(h)} />
              ))}
            </View>
            <Button title="Salvar" disabled={!valid} onPress={() => onSave({ hex: normalizeHex(hex), name: name.trim() || colorName(hex) })} />
            {color && onMerge && palette.length > 1 && (
              <View style={{ gap: space.sm }}>
                <Text style={s.section}>Mesclar com outra cor</Text>
                <Muted>Todos os pontos desta cor passam a usar a cor escolhida.</Muted>
                <Row>
                  {palette
                    .filter((p) => p.id !== color.id)
                    .map((p) => (
                      <Pressable key={p.id} onPress={() => onMerge(p.id)} style={s.mergeChip}>
                        <View style={[s.dot, { backgroundColor: p.hex }]} />
                        <Text>{p.name}</Text>
                      </Pressable>
                    ))}
                </Row>
              </View>
            )}
            {color && onDelete && <Button title="Excluir cor (células ficam vazias)" variant="ghost" onPress={onDelete} />}
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, padding: space.lg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  preview: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-end' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border },
  swatchActive: { borderWidth: 3, borderColor: colors.text },
  section: { fontWeight: '700', color: colors.text },
  mergeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
});
