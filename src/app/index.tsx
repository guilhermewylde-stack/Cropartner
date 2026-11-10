import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useProjects } from '../store/projects';
import { Button, Card, Field, Muted, Row, styles, Title } from '../components/ui';
import { countDone } from '../lib/grid';
import { deleteProjectFiles } from '../lib/native/files';
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
          <Card>
            <Title>Novo projeto</Title>
            <Row>
              <Field label="Nome" placeholder="Ex.: Manta de corações" value={name} onChangeText={setName} onSubmitEditing={create} />
            </Row>
            <Button title="Criar projeto" onPress={create} />
          </Card>
        }
        ListEmptyComponent={hydrated ? <Muted style={{ textAlign: 'center', marginTop: space.lg }}>Nenhum projeto ainda.</Muted> : undefined}
        renderItem={({ item }) => {
          const total = item.grid ? item.grid.rows * item.grid.cols : 0;
          const done = item.grid ? countDone(item.grid) : 0;
          return (
            <Pressable onPress={() => router.push(`/project/${item.id}`)} onLongPress={() => confirmDelete(item.id, item.name)}>
              <Card>
                <Title>{item.name}</Title>
                <Muted>
                  {item.sources.length} arquivo(s)
                  {item.grid ? ` · grid ${item.grid.cols}×${item.grid.rows} · ${total ? Math.round((done / total) * 100) : 0}% feito` : ''}
                </Muted>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={list.length ? <Muted style={{ textAlign: 'center' }}>Segure um projeto para excluir.</Muted> : undefined}
      />
    </View>
  );
}
