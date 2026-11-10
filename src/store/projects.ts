import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Project } from '../lib/types';
import { DEFAULT_YARN } from '../lib/yarn';
import { migrateProjectsState, PROJECTS_VERSION } from '../lib/migrate';

/** Grava no AsyncStorage com debounce: marcar pontos gera muitas atualizações seguidas. */
function debouncedStorage(delay = 400): StateStorage {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => {
      const t = timers.get(name);
      if (t) clearTimeout(t);
      timers.set(
        name,
        setTimeout(() => {
          timers.delete(name);
          void AsyncStorage.setItem(name, value);
        }, delay),
      );
    },
    removeItem: (name) => AsyncStorage.removeItem(name),
  };
}

interface ProjectsState {
  projects: Record<string, Project>;
  hydrated: boolean;
  createProject: (name: string) => Project;
  updateProject: (id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) => void;
  deleteProject: (id: string) => void;
}

const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useProjects = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: {},
      hydrated: false,
      createProject: (name) => {
        const now = Date.now();
        const p: Project = {
          id: uid(),
          name: name.trim() || 'Novo projeto',
          createdAt: now,
          updatedAt: now,
          sources: [],
          palette: [],
          work: { mode: 'flat' },
          yarn: DEFAULT_YARN,
          lastCell: null,
        };
        set({ projects: { ...get().projects, [p.id]: p } });
        return p;
      },
      updateProject: (id, patch) => {
        const cur = get().projects[id];
        if (!cur) return;
        const delta = typeof patch === 'function' ? patch(cur) : patch;
        set({ projects: { ...get().projects, [id]: { ...cur, ...delta, updatedAt: Date.now() } } });
      },
      deleteProject: (id) => {
        const next = { ...get().projects };
        delete next[id];
        set({ projects: next });
      },
    }),
    {
      name: 'cropartner-projects',
      version: PROJECTS_VERSION,
      migrate: (persisted, version) => migrateProjectsState(persisted, version),
      storage: createJSONStorage(() => debouncedStorage()),
      partialize: (s) => ({ projects: s.projects }),
      onRehydrateStorage: () => () => useProjects.setState({ hydrated: true }),
    },
  ),
);

export const useProject = (id: string | undefined) => useProjects((s) => (id ? s.projects[id] : undefined));
