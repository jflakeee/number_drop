import Redis from 'ioredis';

const LEADERBOARD_KEY = 'numberdrop:leaderboard';
const USER_DATA_KEY = 'numberdrop:user:';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export class LeaderboardService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async getTopScores(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      // Get top scores from sorted set (descending)
      const results = await this.redis.zrevrange(LEADERBOARD_KEY, 0, limit - 1, 'WITHSCORES');

      const entries: LeaderboardEntry[] = [];

      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseInt(results[i + 1], 10);
        const userData = await this.redis.hgetall(`${USER_DATA_KEY}${userId}`);

        entries.push({
          userId,
          username: userData.username || 'Player',
          score,
          rank: Math.floor(i / 2) + 1,
        });
      }

      return entries;
    } catch (error) {
      console.error('Error getting top scores:', error);
      return [];
    }
  }

  async getUserRank(userId: string): Promise<number | null> {
    try {
      const rank = await this.redis.zrevrank(LEADERBOARD_KEY, userId);
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  async submitScore(
    userId: string,
    score: number,
    username?: string
  ): Promise<{ rank: number; isNewBest: boolean }> {
    try {
      // Get current best
      const currentBest = await this.redis.zscore(LEADERBOARD_KEY, userId);
      const isNewBest = currentBest === null || score > parseInt(currentBest, 10);

      if (isNewBest) {
        // Update leaderboard
        await this.redis.zadd(LEADERBOARD_KEY, score, userId);

        // Update user data
        if (username) {
          await this.redis.hset(`${USER_DATA_KEY}${userId}`, 'username', username);
        }
      }

      const rank = await this.getUserRank(userId);

      return {
        rank: rank || 0,
        isNewBest,
      };
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }

  async getRankForScore(score: number): Promise<number> {
    try {
      // Count how many scores are higher than the given score
      const higherCount = await this.redis.zcount(LEADERBOARD_KEY, score + 1, '+inf');
      // Rank is higherCount + 1 (1-indexed)
      return higherCount + 1;
    } catch (error) {
      console.error('Error getting rank for score:', error);
      return 0;
    }
  }

  async getTotalPlayers(): Promise<number> {
    try {
      return await this.redis.zcard(LEADERBOARD_KEY);
    } catch (error) {
      console.error('Error getting total players:', error);
      return 0;
    }
  }
}
