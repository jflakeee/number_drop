const STORAGE_PREFIX = 'numberdrop_';

interface GameSave {
  grid: number[][];
  score: number;
  nextValue: number;
  timestamp: number;
}

class StorageServiceClass {
  private getKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  // Game-specific methods
  saveGame(save: GameSave): void {
    this.set('current_game', save);
  }

  loadGame(): GameSave | null {
    return this.get<GameSave | null>('current_game', null);
  }

  clearGame(): void {
    this.remove('current_game');
  }

  hasSavedGame(): boolean {
    return this.loadGame() !== null;
  }

  getBestScore(): number {
    return this.get<number>('best_score', 0);
  }

  setBestScore(score: number): void {
    const current = this.getBestScore();
    if (score > current) {
      this.set('best_score', score);
    }
  }
}

export const StorageService = new StorageServiceClass();
