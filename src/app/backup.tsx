import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useProjects, uid } from '../store/projects';
import { useSettings } from '../store/settings';
import { Button, Card, Muted, Segmented, styles, Title } from '../components/ui';
import { applyImport, findConflicts, mergeYarns, parseBackup, type ConflictChoice, type ParsedBackup } from '../lib/backup';
import { pickBackupText } from '../lib/native/backupFile';
import { useExportBackup } from '../hooks/useBackup';
import type { Project } from '../lib/types';
import { colors, space } from '../theme';

const percent = (p: Project) => {
  const total = p.grid ? p.grid.rows * p.grid.cols : 0;
  return total ? Math.round((Math.min(p.progress, total) / total) * 100) : 0;
};

/** Backup por arquivo: exportar um ou todos os projetos e importar de volta (ou no aparelho de outra pessoa). */
export default function BackupScreen() {
  const projects = useProjects((s) => s.projects);
  const setProjects = useProjects((s) => s.setProjects);
  const setYarns = useSettings((s) => s.setYarns);
  const { exportProjects, busy, error: exportError } = useExportBackup();
  const [loaded, setLoaded] = useState<ParsedBackup | null>(null);
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  const [done, setDone] = useState<string | null>(null);
  const list = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);

  const pick = async () => {
    setDone(null);
    try {
      const text = await pickBackupText();
      if (text == null) return;
      const parsed = parseBackup(text);
      setLoaded(parsed);
      // nada é sobrescrito sem escolha: o padrão de um conflito é manter os dois
      if (parsed.ok) setChoices(Object.fromEntries(findConflicts(projects, parsed.projects).map((p) => [p.id, 'keep-both' as const])));
    } catch {
      setLoaded({ ok: false, error: 'Não foi possível ler o arquivo.' });
    }
  };

  const confirm = () => {
    if (!loaded?.ok) return;
    const current = useProjects.getState().projects;
    const next = applyImport(current, loaded.projects, choices, uid, Date.now());
    const count = Object.keys(next).length - Object.keys(current).length + Object.values(choices).filter((c) => c === 'replace').length;
    setProjects(next);
    setYarns(mergeYarns(useSettings.getState().yarns, loaded.yarns));
    setLoaded(null);
    setDone(count === 1 ? '1 projeto importado.' : `${count} projetos importados.`);
  };

  const importCount = loaded?.ok ? loaded.projects.filter((p) => !(p.id in projects) || choices[p.id] !== 'skip').length : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Title>Exportar</Title>
        <Muted>Gera um arquivo para guardar no iCloud Drive ou mandar por WhatsApp/AirDrop. Leva grid, cores, progresso, sentido, linhas e estoque — não leva as imagens/PDF de origem nem o ajuste “Sou canhota”.</Muted>
        <Button title={`Exportar todos os projetos (${list.length})`} onPress={() => exportProjects('all')} disabled={!list.length} loading={busy} />
        {list.map((p) => (
          <View key={p.id} style={st.item}>
            <View style={{ flex: 1 }}>
              <Text style={st.name} numberOfLines={1}>
                {p.name}
              </Text>
              <Muted>{p.grid ? `grid ${p.grid.cols}×${p.grid.rows} · ${percent(p)}% feito` : 'sem grid'}</Muted>
            </View>
            <Button small variant="secondary" title="Compartilhar" onPress={() => exportProjects([p.id])} disabled={busy} />
          </View>
        ))}
        {exportError && <Text style={st.error}>{exportError}</Text>}
      </Card>

      <Card>
        <Title>Importar</Title>
        <Muted>Escolha um arquivo .json exportado pelo Fio da Meada (deste ou de outro aparelho).</Muted>
        <Button title="Escolher arquivo" variant={loaded?.ok ? 'secondary' : 'primary'} onPress={pick} />
        {loaded && !loaded.ok && (
          <View style={st.errorBox}>
            <Text style={st.error}>{loaded.error}</Text>
            <Muted>Seus projetos não foram alterados.</Muted>
          </View>
        )}
        {loaded?.ok && (
          <View style={{ gap: space.sm }}>
            <Text style={st.name}>
              {loaded.projects.length === 1 ? '1 projeto' : `${loaded.projects.length} projetos`} no arquivo
              {loaded.exportedAt ? ` (exportado em ${new Date(loaded.exportedAt).toLocaleDateString('pt-BR')})` : ''}
              {loaded.yarns.length ? ` · ${loaded.yarns.length === 1 ? '1 linha' : `${loaded.yarns.length} linhas`}` : ''}
            </Text>
            {loaded.projects.map((p) => {
              const conflict = p.id in projects;
              return (
                <View key={p.id} style={[st.item, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <Text style={st.name}>{p.name}</Text>
                  <Muted>{p.grid ? `grid ${p.grid.cols}×${p.grid.rows} · ${percent(p)}% feito` : 'sem grid'}</Muted>
                  {conflict && (
                    <>
                      <Text style={st.warn}>Já existe neste aparelho como “{projects[p.id].name}” ({percent(projects[p.id])}% feito).</Text>
                      <Segmented<ConflictChoice>
                        value={choices[p.id] ?? 'keep-both'}
                        onChange={(c) => setChoices((x) => ({ ...x, [p.id]: c }))}
                        options={[
                          { value: 'keep-both', label: 'Manter os dois' },
                          { value: 'replace', label: 'Substituir' },
                          { value: 'skip', label: 'Não importar' },
                        ]}
                      />
                    </>
                  )}
                </View>
              );
            })}
            <Button title={importCount === 1 ? 'Importar 1 projeto' : `Importar ${importCount} projetos`} onPress={confirm} disabled={importCount === 0} />
            <Button small variant="ghost" title="Cancelar" onPress={() => setLoaded(null)} />
          </View>
        )}
        {done && (
          <View style={st.okBox}>
            <Text style={st.ok}>{done}</Text>
            <Button small variant="secondary" title="Ver projetos" onPress={() => router.dismissTo('/')} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  name: { fontWeight: '700', fontSize: 15, color: colors.text },
  warn: { color: colors.danger, fontWeight: '600' },
  error: { color: colors.danger, fontWeight: '700' },
  errorBox: { gap: 4, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, backgroundColor: '#fff' },
  okBox: { gap: space.sm, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, backgroundColor: '#fff' },
  ok: { color: colors.accent, fontWeight: '700' },
});
