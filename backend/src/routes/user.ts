import { Router } from 'express';

const router = Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // TODO: Implement user service
    res.json({
      userId,
      username: 'Player',
      bestScore: 0,
      totalGames: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update username
router.patch('/:userId/username', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username } = req.body;
    // TODO: Implement update
    res.json({ userId, username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update username' });
  }
});

export { router as userRouter };
