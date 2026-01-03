import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  score: number;
  bestScore: number;
  isPlaying: boolean;
  isPaused: boolean;
  settings: GameSettings;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  resetScore: () => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
}

interface GameSettings {
  chainMerge: boolean;
  showHint: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
}

const defaultSettings: GameSettings = {
  chainMerge: true,
  showHint: false,
  difficulty: 'normal',
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      score: 0,
      bestScore: 0,
      isPlaying: false,
      isPaused: false,
      settings: defaultSettings,

      setScore: (score) =>
        set((state) => ({
          score,
          bestScore: Math.max(score, state.bestScore),
        })),

      addScore: (points) =>
        set((state) => ({
          score: state.score + points,
          bestScore: Math.max(state.score + points, state.bestScore),
        })),

      resetScore: () => set({ score: 0 }),

      setPlaying: (isPlaying) => set({ isPlaying }),

      setPaused: (isPaused) => set({ isPaused }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'numberdrop-game-storage',
      partialize: (state) => ({
        bestScore: state.bestScore,
        settings: state.settings,
      }),
    }
  )
);
