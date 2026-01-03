const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export interface SubmitScoreResult {
  rank: number;
  isNewBest: boolean;
}

class LeaderboardService {
  private userId: string;
  private username: string;

  constructor() {
    this.userId = this.getOrCreateUserId();
    this.username = this.getUsername();
  }

  private getOrCreateUserId(): string {
    let userId = localStorage.getItem('numberdrop_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('numberdrop_user_id', userId);
    }
    return userId;
  }

  private getUsername(): string {
    return localStorage.getItem('numberdrop_username') || 'Player';
  }

  setUsername(username: string): void {
    this.username = username;
    localStorage.setItem('numberdrop_username', username);
  }

  getStoredUsername(): string {
    return this.username;
  }

  getUserId(): string {
    return this.userId;
  }

  async getTopScores(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/top?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async getUserRank(): Promise<number | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/rank/${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch rank');
      const data = await response.json();
      return data.rank;
    } catch (error) {
      console.error('Error fetching rank:', error);
      return null;
    }
  }

  async submitScore(score: number): Promise<SubmitScoreResult | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          username: this.username,
          score,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit score');
      return await response.json();
    } catch (error) {
      console.error('Error submitting score:', error);
      return null;
    }
  }

  async getRankForScore(score: number): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard/rank-for-score?score=${score}`);
      if (!response.ok) throw new Error('Failed to fetch rank for score');
      const data = await response.json();
      return data.rank || 0;
    } catch (error) {
      // Fallback: estimate rank based on cached leaderboard
      console.warn('Error fetching rank for score, using estimate:', error);
      return this.estimateRank(score);
    }
  }

  private estimateRank(score: number): number {
    // Simple estimation based on score tiers
    // This is a fallback when API is not available
    if (score >= 100000) return Math.max(1, Math.floor(100000 / score * 10));
    if (score >= 50000) return Math.floor(100 + (100000 - score) / 500);
    if (score >= 20000) return Math.floor(200 + (50000 - score) / 300);
    if (score >= 10000) return Math.floor(300 + (20000 - score) / 100);
    if (score >= 5000) return Math.floor(400 + (10000 - score) / 50);
    if (score >= 1000) return Math.floor(500 + (5000 - score) / 10);
    return Math.floor(1000 + (1000 - score));
  }
}

// Singleton instance
export const leaderboardService = new LeaderboardService();
