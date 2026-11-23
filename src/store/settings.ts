import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Yarn } from '../lib/types';
import { addYarn, removeYarn, updateYarn, type YarnInput } from '../lib/yarn';
import { migrateSettingsState, SETTINGS_VERSION } from '../lib/migrate';

/** Ajustes do aparelho: valem para todos os projetos e não viajam com um projeto compartilhado. */
interface SettingsState {
  /** "Sou canhota": a carreira 1 começa embaixo à esquerda. Só muda o sentido; não espelha o desenho. */
  leftHanded: boolean;
  setLeftHanded: (value: boolean) => void;
  /** linhas cadastradas pela usuária (sem catálogo de marcas) */
  yarns: Yarn[];
  addYarn: (input: YarnInput) => Yarn;
  updateYarn: (id: string, input: YarnInput) => void;
  removeYarn: (id: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      leftHanded: false,
      setLeftHanded: (leftHanded) => set({ leftHanded }),
      yarns: [],
      addYarn: (input) => {
        const out = addYarn(get().yarns, input);
        set({ yarns: out.yarns });
        return out.yarn;
      },
      updateYarn: (id, input) => set({ yarns: updateYarn(get().yarns, id, input) }),
      removeYarn: (id) => set({ yarns: removeYarn(get().yarns, id) }),
    }),
    {
      name: 'cropartner-settings',
      version: SETTINGS_VERSION,
      migrate: (persisted, version) => migrateSettingsState(persisted, version),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ leftHanded: s.leftHanded, yarns: s.yarns }),
    },
  ),
);
