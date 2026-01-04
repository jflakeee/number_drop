/**
 * Achievement System Service
 * Tracks player achievements and rewards
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  condition: AchievementCondition;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  target?: number;
}

export interface AchievementCondition {
  type: 'block_value' | 'score' | 'combo' | 'games_played' | 'total_merges' | 'consecutive_days';
  value: number;
}

export interface AchievementUnlock {
  achievement: Achievement;
  isNew: boolean;
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  // Block value achievements
  {
    id: 'first_merge',
    name: '첫 병합',
    description: '처음으로 블록을 병합하세요',
    icon: '🎯',
    reward: 10,
    condition: { type: 'total_merges', value: 1 },
    target: 1,
  },
  {
    id: 'block_512',
    name: '512 달성',
    description: '512 블록을 만드세요',
    icon: '🥉',
    reward: 30,
    condition: { type: 'block_value', value: 512 },
  },
  {
    id: 'block_1024',
    name: '1024 달성',
    description: '1024 블록을 만드세요',
    icon: '🥈',
    reward: 50,
    condition: { type: 'block_value', value: 1024 },
  },
  {
    id: 'block_2048',
    name: '2048 달성',
    description: '2048 블록을 만드세요',
    icon: '🥇',
    reward: 100,
    condition: { type: 'block_value', value: 2048 },
  },
  {
    id: 'block_4096',
    name: '4096 달성',
    description: '4096 블록을 만드세요',
    icon: '💎',
    reward: 500,
    condition: { type: 'block_value', value: 4096 },
  },
  {
    id: 'block_8192',
    name: '8192 달성',
    description: '8192 블록을 만드세요',
    icon: '👑',
    reward: 1000,
    condition: { type: 'block_value', value: 8192 },
  },
  // Combo achievements
  {
    id: 'combo_3',
    name: '3콤보',
    description: '3콤보를 달성하세요',
    icon: '🔥',
    reward: 20,
    condition: { type: 'combo', value: 3 },
  },
  {
    id: 'combo_5',
    name: '5콤보',
    description: '5콤보를 달성하세요',
    icon: '🔥',
    reward: 50,
    condition: { type: 'combo', value: 5 },
  },
  {
    id: 'combo_10',
    name: '10콤보',
    description: '10콤보를 달성하세요',
    icon: '🔥🔥',
    reward: 200,
    condition: { type: 'combo', value: 10 },
  },
  // Score achievements
  {
    id: 'score_1000',
    name: '1,000점',
    description: '1,000점을 달성하세요',
    icon: '📈',
    reward: 20,
    condition: { type: 'score', value: 1000 },
  },
  {
    id: 'score_10000',
    name: '10,000점',
    description: '10,000점을 달성하세요',
    icon: '📈',
    reward: 100,
    condition: { type: 'score', value: 10000 },
  },
  {
    id: 'score_50000',
    name: '50,000점',
    description: '50,000점을 달성하세요',
    icon: '📈📈',
    reward: 300,
    condition: { type: 'score', value: 50000 },
  },
  {
    id: 'score_100000',
    name: '100,000점',
    description: '100,000점을 달성하세요',
    icon: '📈📈',
    reward: 500,
    condition: { type: 'score', value: 100000 },
  },
  // Games played achievements
  {
    id: 'games_10',
    name: '10게임 플레이',
    description: '10게임을 플레이하세요',
    icon: '🎮',
    reward: 30,
    condition: { type: 'games_played', value: 10 },
    target: 10,
  },
  {
    id: 'games_50',
    name: '50게임 플레이',
    description: '50게임을 플레이하세요',
    icon: '🎮',
    reward: 100,
    condition: { type: 'games_played', value: 50 },
    target: 50,
  },
  {
    id: 'games_100',
    name: '100게임 플레이',
    description: '100게임을 플레이하세요',
    icon: '🎮🎮',
    reward: 300,
    condition: { type: 'games_played', value: 100 },
    target: 100,
  },
  // Merge achievements
  {
    id: 'merges_100',
    name: '100번 병합',
    description: '총 100번 병합하세요',
    icon: '🔄',
    reward: 50,
    condition: { type: 'total_merges', value: 100 },
    target: 100,
  },
  {
    id: 'merges_1000',
    name: '1,000번 병합',
    description: '총 1,000번 병합하세요',
    icon: '🔄🔄',
    reward: 200,
    condition: { type: 'total_merges', value: 1000 },
    target: 1000,
  },
  // Consecutive days
  {
    id: 'days_3',
    name: '3일 연속',
    description: '3일 연속으로 접속하세요',
    icon: '⭐',
    reward: 50,
    condition: { type: 'consecutive_days', value: 3 },
    target: 3,
  },
  {
    id: 'days_7',
    name: '7일 연속',
    description: '7일 연속으로 접속하세요',
    icon: '⭐⭐',
    reward: 300,
    condition: { type: 'consecutive_days', value: 7 },
    target: 7,
  },
];

const STORAGE_KEY = 'numberdrop_achievements';

class AchievementService {
  private achievements: Achievement[] = [];
  private listeners: ((unlock: AchievementUnlock) => void)[] = [];

  constructor() {
    this.loadAchievements();
  }

  private loadAchievements(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    const unlockedMap: Record<string, { unlockedAt: number }> = saved ? JSON.parse(saved) : {};

    this.achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      unlocked: !!unlockedMap[def.id],
      unlockedAt: unlockedMap[def.id]?.unlockedAt,
    }));
  }

  private saveAchievements(): void {
    const unlockedMap: Record<string, { unlockedAt: number }> = {};
    this.achievements.forEach(a => {
      if (a.unlocked && a.unlockedAt) {
        unlockedMap[a.id] = { unlockedAt: a.unlockedAt };
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedMap));
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  getTotalCount(): number {
    return this.achievements.length;
  }

  onUnlock(callback: (unlock: AchievementUnlock) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyUnlock(achievement: Achievement): void {
    this.listeners.forEach(l => l({ achievement, isNew: true }));
  }

  private unlock(achievementId: string): Achievement | null {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      this.saveAchievements();
      this.notifyUnlock(achievement);
      return achievement;
    }
    return null;
  }

  // Check achievements based on game events
  checkBlockValue(value: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'block_value' && value >= a.condition.value)
      .forEach(a => {
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    return unlocked;
  }

  checkScore(score: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'score' && score >= a.condition.value)
      .forEach(a => {
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    return unlocked;
  }

  checkCombo(combo: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'combo' && combo >= a.condition.value)
      .forEach(a => {
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    return unlocked;
  }

  checkGamesPlayed(count: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'games_played' && count >= a.condition.value)
      .forEach(a => {
        a.progress = count;
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    // Update progress for non-unlocked achievements
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'games_played')
      .forEach(a => {
        a.progress = count;
      });
    return unlocked;
  }

  checkTotalMerges(count: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'total_merges' && count >= a.condition.value)
      .forEach(a => {
        a.progress = count;
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    // Update progress for non-unlocked achievements
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'total_merges')
      .forEach(a => {
        a.progress = count;
      });
    return unlocked;
  }

  checkConsecutiveDays(days: number): Achievement[] {
    const unlocked: Achievement[] = [];
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'consecutive_days' && days >= a.condition.value)
      .forEach(a => {
        a.progress = days;
        const u = this.unlock(a.id);
        if (u) unlocked.push(u);
      });
    // Update progress for non-unlocked achievements
    this.achievements
      .filter(a => !a.unlocked && a.condition.type === 'consecutive_days')
      .forEach(a => {
        a.progress = days;
      });
    return unlocked;
  }

  // Get total rewards earned
  getTotalRewardsEarned(): number {
    return this.achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.reward, 0);
  }
}

// Singleton instance
export const achievementService = new AchievementService();
