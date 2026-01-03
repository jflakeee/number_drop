import { Router } from 'express';

const router = Router();

// Verify purchase
router.post('/verify', async (req, res) => {
  try {
    const { userId, productId, purchaseToken, platform } = req.body;

    if (!userId || !productId || !purchaseToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // TODO: Verify with Google Play / App Store
    // For now, return success
    res.json({
      success: true,
      purchase: {
        userId,
        productId,
        platform,
        purchasedAt: new Date().toISOString(),
        expiresAt: productId.includes('trial')
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

// Get user purchases
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // TODO: Implement purchase history
    res.json({ purchases: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Check ad removal status
router.get('/ad-removal/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // TODO: Check if user has active ad removal
    res.json({
      hasAdRemoval: false,
      type: null,
      expiresAt: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check ad removal status' });
  }
});

export { router as purchaseRouter };
