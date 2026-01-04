/**
 * Statistics Service
 * Tracks player game statistics
 */

export interface GameStatistics {
  totalGames: number;
  totalScore: number;
  bestScore: number;
  highestBlock: number;
  totalMerges: number;
  totalPlayTimeMs: number;
  maxCombo: number;
  gamesPerDay: Record<string, number>;
  scoresPerDay: Record<string, number>;
  lastPlayedAt: number;
  consecutiveDays: number;
  lastDayPlayed: string;
}

const STORAGE_KEY = 'numberdrop_statistics';
const DEFAULT_STATS: GameStatistics = {
  totalGames: 0,
  totalScore: 0,
  bestScore: 0,
  highestBlock: 2,
  totalMerges: 0,
  totalPlayTimeMs: 0,
  maxCombo: 0,
  gamesPerDay: {},
  scoresPerDay: {},
  lastPlayedAt: 0,
  consecutiveDays: 0,
  lastDayPlayed: '',
};

class StatisticsService {
  private stats: GameStatistics;
  private sessionStartTime: number = 0;

  constructor() {
    this.stats = this.loadStats();
    this.checkConsecutiveDays();
  }

  private loadStats(): GameStatistics {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_STATS, ...JSON.parse(saved) };
    }
    return { ...DEFAULT_STATS };
  }

  private saveStats(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
  }

  private getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private checkConsecutiveDays(): void {
    const today = this.getTodayKey();
    const lastDay = this.stats.lastDayPlayed;

    if (!lastDay) {
      // First time playing
      this.stats.consecutiveDays = 1;
      this.stats.lastDayPlayed = today;
    } else if (lastDay === today) {
      // Already played today, no change
    } else {
      // Check if yesterday
      const lastDate = new Date(lastDay);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        this.stats.consecutiveDays++;
        this.stats.lastDayPlayed = today;
      } else {
        // Streak broken
        this.stats.consecutiveDays = 1;
        this.stats.lastDayPlayed = today;
      }
    }
    this.saveStats();
  }

  getStats(): GameStatistics {
    return { ...this.stats };
  }

  // Session tracking
  startSession(): void {
    this.sessionStartTime = Date.now();
    this.checkConsecutiveDays();
  }

  endSession(): void {
    if (this.sessionStartTime > 0) {
      const sessionTime = Date.now() - this.sessionStartTime;
      this.stats.totalPlayTimeMs += sessionTime;
      this.sessionStartTime = 0;
      this.saveStats();
    }
  }

  // Game tracking
  recordGameStart(): void {
    const today = this.getTodayKey();
    this.stats.totalGames++;
    this.stats.gamesPerDay[today] = (this.stats.gamesPerDay[today] || 0) + 1;
    this.stats.lastPlayedAt = Date.now();
    this.saveStats();
  }

  recordGameEnd(score: number): void {
    const today = this.getTodayKey();
    this.stats.totalScore += score;
    this.stats.scoresPerDay[today] = (this.stats.scoresPerDay[today] || 0) + score;

    if (score > this.stats.bestScore) {
      this.stats.bestScore = score;
    }

    this.saveStats();
  }

  recordMerge(resultValue: number): void {
    this.stats.totalMerges++;

    if (resultValue > this.stats.highestBlock) {
      this.stats.highestBlock = resultValue;
    }

    this.saveStats();
  }

  recordCombo(combo: number): void {
    if (combo > this.stats.maxCombo) {
      this.stats.maxCombo = combo;
    }
    this.saveStats();
  }

  // Computed statistics
  getAverageScore(): number {
    if (this.stats.totalGames === 0) return 0;
    return Math.round(this.stats.totalScore / this.stats.totalGames);
  }

  getFormattedPlayTime(): string {
    const totalSeconds = Math.floor(this.stats.totalPlayTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  }

  getRecentDaysData(days: number = 7): { date: string; games: number; score: number }[] {
    const result: { date: string; games: number; score: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      result.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        games: this.stats.gamesPerDay[key] || 0,
        score: this.stats.scoresPerDay[key] || 0,
      });
    }

    return result;
  }

  getConsecutiveDays(): number {
    return this.stats.consecutiveDays;
  }

  getTotalGames(): number {
    return this.stats.totalGames;
  }

  getTotalMerges(): number {
    return this.stats.totalMerges;
  }

  // Reset statistics (for debugging or user request)
  resetStats(): void {
    this.stats = { ...DEFAULT_STATS };
    this.saveStats();
  }
}

// Singleton instance
export const statisticsService = new StatisticsService();
