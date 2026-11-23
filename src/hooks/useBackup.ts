import { useState } from 'react';
import { useProjects } from '../store/projects';
import { useSettings } from '../store/settings';
import { backupFileName, buildBackup, yarnsUsedBy } from '../lib/backup';
import { shareBackup } from '../lib/native/backupFile';

/** Exportar um projeto (com as linhas que ele usa) ou todos (com todas as linhas cadastradas). */
export function useExportBackup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (ids: string[] | 'all') => {
    const all = Object.values(useProjects.getState().projects).sort((a, b) => b.updatedAt - a.updatedAt);
    const projects = ids === 'all' ? all : all.filter((p) => ids.includes(p.id));
    if (!projects.length) return;
    const yarns = useSettings.getState().yarns;
    const now = Date.now();
    const file = buildBackup(projects, ids === 'all' ? yarns : yarnsUsedBy(projects, yarns), now);
    setBusy(true);
    setError(null);
    try {
      await shareBackup(backupFileName(projects, now), JSON.stringify(file));
    } catch (e) {
      setError((e as Error).message || 'Não foi possível exportar.');
    } finally {
      setBusy(false);
    }
  };

  return { exportProjects: run, busy, error };
}
