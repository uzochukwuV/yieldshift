import express from 'express';
import { requireAuth, loadUser, requirePlan, checkRebalanceLimit } from '../middleware/auth';
import { supabase } from '../db';

const router = express.Router();

// GET /api/recommendations - Get AI recommendations (Starter+)
router.get('/', requireAuth, loadUser, requirePlan('starter'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .order('net_gain', { ascending: false });

    if (error) throw error;
    res.json({ recommendations: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recommendations/generate - Generate new recommendations (Starter+)
router.post('/generate', requireAuth, loadUser, requirePlan('starter'), async (req, res) => {
  try {
    // TODO: Implement AI recommendation generation
    // This would call the AI service to analyze portfolio and find better yields

    res.json({ message: 'Recommendations generated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recommendations/:id/execute - Execute rebalance (Starter+)
router.post('/:id/execute', requireAuth, loadUser, checkRebalanceLimit, async (req, res) => {
  try {
    const { id } = req.params;

    // Get recommendation
    const { data: rec, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (recError || !rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (rec.status !== 'pending') {
      return res.status(400).json({ error: 'Recommendation already processed' });
    }

    // TODO: Implement rebalancing logic
    // 1. Unstake from current position
    // 2. Swap via SideShift
    // 3. Stake in new position
    // 4. Update database

    // Update rebalance count for the month
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    await supabase.from('rebalance_history').upsert({
      user_id: req.user.id,
      month: currentMonth,
      count: supabase.rpc('increment', { row_id: `${req.user.id}-${currentMonth}` }),
    });

    res.json({ message: 'Rebalance executed', recommendation: rec });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
