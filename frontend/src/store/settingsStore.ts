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
  dynamicDrop: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  mergeMultiplier: 1 | 2 | 3 | 4;  // Multiplier when 4+ blocks merge (1=disabled, 2=2x, 3=3x, 4=4x)

  // Device
  vibrationEnabled: boolean;

  // Actions
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleVibration: () => void;
  toggleChainMerge: () => void;
  toggleHint: () => void;
  toggleDynamicDrop: () => void;
  setDifficulty: (difficulty: 'easy' | 'normal' | 'hard') => void;
  setMergeMultiplier: (multiplier: 1 | 2 | 3 | 4) => void;
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
      dynamicDrop: true,
      difficulty: 'normal',
      mergeMultiplier: 2,  // Default 2x for 4+ block merges
      vibrationEnabled: true,

      // Actions
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
      toggleChainMerge: () => set((state) => ({ chainMerge: !state.chainMerge })),
      toggleHint: () => set((state) => ({ showHint: !state.showHint })),
      toggleDynamicDrop: () => set((state) => ({ dynamicDrop: !state.dynamicDrop })),
      setDifficulty: (difficulty) => set({ difficulty }),
      setMergeMultiplier: (mergeMultiplier) => set({ mergeMultiplier }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
    }),
    {
      name: 'numberdrop-settings',
    }
  )
);
