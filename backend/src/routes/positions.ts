import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';
import { supabase } from '../db';

const router = express.Router();

// GET /api/positions - Get all user positions
router.get('/', requireAuth, loadUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        *,
        wallet:wallets(*)
      `)
      .in('wallet_id', supabase.from('wallets').select('id').eq('user_id', req.user.id));

    if (error) throw error;
    res.json({ positions: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
