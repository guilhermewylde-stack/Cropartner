import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Ajustes do aparelho: valem para todos os projetos e não viajam com um projeto compartilhado. */
interface SettingsState {
  /** "Sou canhota": a carreira 1 começa embaixo à esquerda. Só muda o sentido; não espelha o desenho. */
  leftHanded: boolean;
  setLeftHanded: (value: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      leftHanded: false,
      setLeftHanded: (leftHanded) => set({ leftHanded }),
    }),
    {
      name: 'cropartner-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ leftHanded: s.leftHanded }),
    },
  ),
);
