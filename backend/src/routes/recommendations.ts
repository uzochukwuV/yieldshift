import express from 'express';
import { requireAuth, loadUser, requirePlan, checkRebalanceLimit } from '../middleware/auth';
import { supabase } from '../db';
import {
  generateRecommendations,
  saveRecommendations,
} from '../services/ai-recommendations';
import {
  executeRebalance,
  simulateRebalance,
  batchExecuteRebalances,
} from '../services/rebalancing';

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
    const user = req.user;

    // Clear old pending recommendations
    await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // Generate AI recommendations
    const result = await generateRecommendations(user.id, user.risk_tolerance);

    // Save to database
    const saved = await saveRecommendations(user.id, result.recommendations);

    res.json({
      message: 'Recommendations generated successfully',
      count: saved.length,
      recommendations: saved,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: error.message || 'Failed to generate recommendations' });
  }
});

// POST /api/recommendations/:id/execute - Execute rebalance (Starter+)
router.post('/:id/execute', requireAuth, loadUser, checkRebalanceLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

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

    // Execute rebalancing
    const result = await executeRebalance(id, wallet_address);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      message: 'Rebalance initiated successfully',
      order: result.order,
      recommendation: rec,
    });
  } catch (error: any) {
    console.error('Error executing rebalance:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recommendations/:id/simulate - Simulate rebalance (Starter+)
router.post('/:id/simulate', requireAuth, loadUser, requirePlan('starter'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify recommendation belongs to user
    const { data: rec } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const simulation = await simulateRebalance(id);
    res.json(simulation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recommendations/batch-execute - Execute multiple recommendations (Professional+)
router.post('/batch-execute', requireAuth, loadUser, requirePlan('professional'), async (req, res) => {
  try {
    const { recommendation_ids, wallet_address } = req.body;

    if (!Array.isArray(recommendation_ids) || recommendation_ids.length === 0) {
      return res.status(400).json({ error: 'recommendation_ids array is required' });
    }

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    const result = await batchExecuteRebalances(recommendation_ids, wallet_address);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
