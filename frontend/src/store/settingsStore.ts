import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Audio
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;

  // Gameplay
  chainMerge: boolean;
  showHint: boolean;
  difficulty: 'easy' | 'normal' | 'hard';

  // Device
  vibrationEnabled: boolean;

  // Actions
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleVibration: () => void;
  toggleChainMerge: () => void;
  toggleHint: () => void;
  setDifficulty: (difficulty: 'easy' | 'normal' | 'hard') => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.8,
      musicVolume: 0.5,
      chainMerge: true,
      showHint: false,
      difficulty: 'normal',
      vibrationEnabled: true,

      // Actions
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
      toggleChainMerge: () => set((state) => ({ chainMerge: !state.chainMerge })),
      toggleHint: () => set((state) => ({ showHint: !state.showHint })),
      setDifficulty: (difficulty) => set({ difficulty }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
    }),
    {
      name: 'numberdrop-settings',
    }
  )
);
