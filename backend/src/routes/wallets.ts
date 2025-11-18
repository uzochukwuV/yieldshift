import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';
import { supabase } from '../db';
import {
  scanWallet,
  savePositions,
  inferPositionsFromBalances,
  scanWithDeBank,
} from '../services/wallet-scanner';

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
    const { address, chain, nickname } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    // Check wallet limit based on subscription tier
    const { data: existingWallets } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', req.user.id);

    const walletCount = existingWallets?.length || 0;
    const maxWallets = req.user.subscription_tier === 'free' ? 1 :
                       req.user.subscription_tier === 'starter' ? 1 :
                       req.user.subscription_tier === 'professional' ? 5 : 999;

    if (walletCount >= maxWallets) {
      return res.status(403).json({
        error: 'Wallet limit reached',
        current: walletCount,
        max: maxWallets,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', address.toLowerCase())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Wallet already connected' });
    }

    // Insert wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        user_id: req.user.id,
        address: address.toLowerCase(),
        chain: chain || 'ethereum',
        nickname: nickname || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Start background sync of positions
    scanWallet(wallet.id, wallet.address, wallet.chain)
      .then(async ({ tokens, positions }) => {
        // If no positions found via protocol scanning, infer from token balances
        if (positions.length === 0 && tokens.length > 0) {
          positions = await inferPositionsFromBalances(tokens);
        }

        // Save positions to database
        if (positions.length > 0) {
          await savePositions(wallet.id, positions);
          console.log(`Synced ${positions.length} positions for wallet ${wallet.id}`);
        }
      })
      .catch(err => {
        console.error('Error syncing wallet positions:', err);
      });

    res.json({
      wallet,
      message: 'Wallet connected. Scanning positions in background...',
    });
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallets/:id/scan - Manually trigger wallet scan
router.post('/:id/scan', requireAuth, loadUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Scan wallet
    const { tokens, positions } = await scanWallet(wallet.id, wallet.address, wallet.chain);

    // Try DeBank for better position detection
    let debankPositions = [];
    try {
      debankPositions = await scanWithDeBank(wallet.address);
    } catch (err) {
      console.log('DeBank scan failed, using fallback');
    }

    const allPositions = debankPositions.length > 0 ? debankPositions : positions;
    const finalPositions = allPositions.length === 0 && tokens.length > 0
      ? await inferPositionsFromBalances(tokens)
      : allPositions;

    // Save positions
    await savePositions(wallet.id, finalPositions);

    res.json({
      tokens,
      positions: finalPositions,
      message: `Found ${tokens.length} tokens and ${finalPositions.length} positions`,
    });
  } catch (error: any) {
    console.error('Error scanning wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallets/:id/positions - Get wallet positions
router.get('/:id/positions', requireAuth, loadUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify wallet belongs to user
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get positions
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('wallet_id', id)
      .order('balance', { ascending: false });

    if (error) throw error;

    res.json({ positions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
