import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useProjects } from '../store/projects';
import { Button, Card, Field, Muted, Row, styles, Title } from '../components/ui';
import { deleteProjectFiles } from '../lib/native/files';
import { EMPTY_SHELF, STATUS_LABEL } from '../lib/shelf';
import { colors, space } from '../theme';

export default function Home() {
  const projects = useProjects((s) => s.projects);
  const hydrated = useProjects((s) => s.hydrated);
  const createProject = useProjects((s) => s.createProject);
  const deleteProject = useProjects((s) => s.deleteProject);
  const [name, setName] = useState('');
  const list = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);

  const create = () => {
    const p = createProject(name);
    setName('');
    router.push(`/project/${p.id}`);
  };

  const confirmDelete = (id: string, title: string) =>
    Alert.alert('Excluir projeto', `Excluir "${title}" e os arquivos importados?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteProjectFiles(id);
          deleteProject(id);
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={10}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Ajustes</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={list}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
          <Row>
            <Button title="Estante" variant="secondary" onPress={() => router.push('/shelf')} style={{ flex: 1 }} />
            <Button title="Meu perfil" variant="secondary" onPress={() => router.push('/profile')} style={{ flex: 1 }} />
          </Row>
          <Card>
            <Title>Novo projeto</Title>
            <Row>
              <Field label="Nome" placeholder="Ex.: Manta de corações" value={name} onChangeText={setName} onSubmitEditing={create} />
            </Row>
            <Button title="Criar projeto" onPress={create} />
          </Card>
          </View>
        }
        ListEmptyComponent={hydrated ? <Muted style={{ textAlign: 'center', marginTop: space.lg }}>Nenhum projeto ainda.</Muted> : undefined}
        renderItem={({ item }) => {
          const total = item.grid ? item.grid.rows * item.grid.cols : 0;
          const done = item.grid ? Math.min(item.progress ?? 0, total) : 0;
          return (
            <Pressable onPress={() => router.push(`/project/${item.id}`)} onLongPress={() => confirmDelete(item.id, item.name)}>
              <Card>
                <Title>{item.name}</Title>
                <Muted>
                  {STATUS_LABEL[(item.shelf ?? EMPTY_SHELF).status]} · {item.sources.length} arquivo(s)
                  {item.grid ? ` · grid ${item.grid.cols}×${item.grid.rows} · ${total ? Math.round((done / total) * 100) : 0}% feito` : ''}
                </Muted>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: space.sm }}>
            {list.length > 0 && <Muted style={{ textAlign: 'center' }}>Segure um projeto para excluir.</Muted>}
            <Button variant="ghost" title="Backup e compartilhar" onPress={() => router.push('/backup')} />
          </View>
        }
      />
    </View>
  );
}
