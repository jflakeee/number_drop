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
}

// Singleton instance
export const leaderboardService = new LeaderboardService();
