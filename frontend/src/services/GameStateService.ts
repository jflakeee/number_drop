// Game state persistence service using localStorage

interface BlockState {
  col: number;
  row: number;
  value: number;
}

interface SavedGameState {
  blocks: BlockState[];
  score: number;
  bestScore: number;
  coins: number;
  nextValue: number;
  savedAt: number;
}

const STORAGE_KEY = 'numberdrop-saved-game';

class GameStateServiceClass {
  // Save the current game state
  saveGame(state: SavedGameState): void {
    try {
      const data = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, data);
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  // Load the saved game state
  loadGame(): SavedGameState | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const state = JSON.parse(data) as SavedGameState;

      // Validate the saved state
      if (!state.blocks || typeof state.score !== 'number') {
        console.warn('Invalid saved game state');
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  // Check if a saved game exists
  hasSavedGame(): boolean {
    const state = this.loadGame();
    return state !== null && state.blocks.length > 0;
  }

  // Clear the saved game
  clearSavedGame(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Saved game cleared');
    } catch (error) {
      console.error('Failed to clear saved game:', error);
    }
  }

  // Get saved game info for display (without loading full state)
  getSavedGameInfo(): { score: number; savedAt: Date } | null {
    const state = this.loadGame();
    if (!state) return null;

    return {
      score: state.score,
      savedAt: new Date(state.savedAt),
    };
  }
}

export const gameStateService = new GameStateServiceClass();
export type { SavedGameState, BlockState };
