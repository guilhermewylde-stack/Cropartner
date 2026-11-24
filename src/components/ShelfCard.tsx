import React, { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProjects } from '../store/projects';
import { addDiaryEntry, EMPTY_SHELF, formatDateBR, parseDateBR, removeDiaryEntry, setShelfDates, setStatus, STATUS_LABEL } from '../lib/shelf';
import { deleteLocalFile, pickPiecePhoto } from '../lib/native/files';
import type { Project, ShelfStatus } from '../lib/types';
import { Button, Card, Field, Muted, Row, Segmented, Title } from './ui';
import { colors, space } from '../theme';

/** Lugar do projeto na estante: estado, datas, foto da peça, link de referência e diário. */
export function ShelfCard({ project }: { project: Project }) {
  const update = useProjects((s) => s.updateProject);
  const shelf = project.shelf ?? EMPTY_SHELF;
  const diary = project.diary ?? [];
  const [editing, setEditing] = useState<'startedAt' | 'finishedAt' | null>(null);
  const [dateText, setDateText] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const editDate = (which: 'startedAt' | 'finishedAt') => {
    setEditing(which);
    setDateText(shelf[which] != null ? formatDateBR(shelf[which]) : '');
    setDateError(null);
  };
  const saveDate = () => {
    if (!editing) return;
    const ms = dateText.trim() === '' ? null : parseDateBR(dateText);
    if (dateText.trim() !== '' && ms == null) return setDateError('Use o formato DD/MM/AAAA.');
    const r = setShelfDates(shelf, { [editing]: ms });
    if ('error' in r) return setDateError(r.error);
    update(project.id, { shelf: r.shelf });
    setEditing(null);
  };

  const takePhoto = async (from: 'camera' | 'library') => {
    setPhotoError(null);
    try {
      const photo = await pickPiecePhoto(project.id, from);
      if (!photo) return;
      deleteLocalFile(project.photo?.uri);
      update(project.id, { photo });
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  };

  const dateRow = (which: 'startedAt' | 'finishedAt', label: string) =>
    editing === which ? (
      <View style={{ gap: space.xs }}>
        <Row>
          <Field label={label} value={dateText} onChangeText={setDateText} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" autoFocus onSubmitEditing={saveDate} />
          <Button small title="Salvar" onPress={saveDate} style={{ alignSelf: 'flex-end' }} />
          <Button small variant="ghost" title="Cancelar" onPress={() => setEditing(null)} style={{ alignSelf: 'flex-end' }} />
        </Row>
        {dateError && <Text style={st.error}>{dateError}</Text>}
      </View>
    ) : (
      <Pressable onPress={() => editDate(which)} accessibilityRole="button" accessibilityLabel={`Corrigir ${label.toLowerCase()}`} style={st.dateRow}>
        <Muted>{label}</Muted>
        <Text style={st.date}>{formatDateBR(shelf[which])} ✎</Text>
      </Pressable>
    );

  return (
    <Card>
      <Title>Estante</Title>
      <Segmented<ShelfStatus>
        value={shelf.status}
        onChange={(s) => update(project.id, { shelf: setStatus(shelf, s, Date.now()) })}
        options={(['want', 'doing', 'done'] as const).map((value) => ({ value, label: STATUS_LABEL[value] }))}
      />
      {shelf.status === 'want' ? (
        <Muted>Marcar o primeiro ponto no grid passa o projeto para “em andamento”.</Muted>
      ) : (
        <View>
          {dateRow('startedAt', 'Comecei')}
          {shelf.status === 'done' && dateRow('finishedAt', 'Terminei')}
        </View>
      )}

      <Text style={st.section}>Foto da peça</Text>
      {project.photo ? (
        <Image source={{ uri: project.photo.uri }} style={[st.photo, project.photo.width && project.photo.height ? { aspectRatio: project.photo.width / project.photo.height } : null]} resizeMode="cover" accessibilityLabel="Foto da peça" />
      ) : (
        <Muted>{shelf.status === 'done' ? 'Mostre como ficou!' : 'Quando terminar, fotografe a peça pronta.'}</Muted>
      )}
      <Row>
        <Button small variant="secondary" title="Tirar foto" onPress={() => takePhoto('camera')} />
        <Button small variant="secondary" title="Escolher foto" onPress={() => takePhoto('library')} />
        {project.photo && (
          <Button
            small
            variant="ghost"
            title="Remover foto"
            onPress={() => {
              deleteLocalFile(project.photo?.uri);
              update(project.id, { photo: null });
            }}
          />
        )}
      </Row>
      {photoError && <Text style={st.error}>{photoError}</Text>}

      <Text style={st.section}>Link de referência</Text>
      <Field label="Receita, vídeo ou post (opcional)" value={project.referenceUrl ?? ''} onChangeText={(t) => update(project.id, { referenceUrl: t })} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      {/^https?:\/\//i.test(project.referenceUrl ?? '') && <Button small variant="ghost" title="Abrir link" onPress={() => Linking.openURL(project.referenceUrl!)} />}

      <Text style={st.section}>Diário</Text>
      <Field label={shelf.status === 'done' ? 'Como foi? Para quem foi?' : 'Uma nota sobre o projeto'} value={note} onChangeText={setNote} multiline />
      <Button
        small
        title="Anotar"
        disabled={!note.trim()}
        onPress={() => {
          update(project.id, { diary: addDiaryEntry(diary, note, Date.now()) });
          setNote('');
        }}
      />
      {diary.map((e) => (
        <View key={e.id} style={st.entry}>
          <View style={{ flex: 1 }}>
            <Muted>{formatDateBR(e.date)}</Muted>
            <Text style={st.entryText}>{e.text}</Text>
          </View>
          <Pressable onPress={() => update(project.id, { diary: removeDiaryEntry(diary, e.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Apagar nota">
            <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  section: { fontWeight: '700', color: colors.text, marginTop: space.sm },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  date: { fontWeight: '600', color: colors.primary, fontSize: 15 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.border },
  entry: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  entryText: { color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontWeight: '600' },
});
