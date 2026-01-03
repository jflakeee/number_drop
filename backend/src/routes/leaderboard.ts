import { Router } from 'express';
import { LeaderboardService } from '../services/leaderboard';

const router = Router();
const leaderboardService = new LeaderboardService();

// Get top scores
router.get('/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const scores = await leaderboardService.getTopScores(limit);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/rank/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const rank = await leaderboardService.getUserRank(userId);
    res.json({ rank });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// Submit score
router.post('/submit', async (req, res) => {
  try {
    const { userId, score, username } = req.body;

    if (!userId || !score) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await leaderboardService.submitScore(userId, score, username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

export { router as leaderboardRouter };
