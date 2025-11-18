import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';
import { supabase } from '../db';

const router = express.Router();

// GET /api/wallets - Get user's wallets
router.get('/', requireAuth, loadUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ wallets: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallets - Connect new wallet
router.post('/', requireAuth, loadUser, async (req, res) => {
  try {
    const { address, chain, label } = req.body;

    // TODO: Verify wallet ownership via signature

    const { data, error} = await supabase
      .from('wallets')
      .insert({
        user_id: req.user.id,
        address,
        chain,
        label: label || `Wallet ${chain}`,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Start background sync of positions
    res.json({ wallet: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
