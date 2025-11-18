import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';

const router = express.Router();

// GET /api/auth/me - Get current user
router.get('/me', requireAuth, loadUser, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
