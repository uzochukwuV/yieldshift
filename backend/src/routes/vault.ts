import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';
import { supabase } from '../db';
import { ethers } from 'ethers';

const router = express.Router();

// Vault contract address (will be set after deployment)
const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || '';

// Base RPC URL
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Vault ABI (minimal for reading)
const VAULT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function getUserDeposits(address user) view returns (uint256)',
  'function getUserBalance(address user) view returns (uint256)',
  'function getUserYield(address user) view returns (uint256)',
  'function getVaultStats() view returns (uint256 totalAssets, uint256 totalShares, uint256 totalDeposited, uint256 totalYieldEarned, uint256 sharePrice)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

// Get vault contract instance
function getVaultContract() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  return new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
}

// GET /api/vault/stats - Get global vault statistics
router.get('/stats', async (req, res) => {
  try {
    if (!VAULT_ADDRESS) {
      return res.status(503).json({ error: 'Vault not deployed yet' });
    }

    const vault = getVaultContract();
    const stats = await vault.getVaultStats();

    res.json({
      totalAssets: ethers.formatUnits(stats.totalAssets, 6), // USDC has 6 decimals
      totalShares: ethers.formatEther(stats.totalShares),
      totalDeposited: ethers.formatUnits(stats.totalDeposited, 6),
      totalYieldEarned: ethers.formatUnits(stats.totalYieldEarned, 6),
      sharePrice: ethers.formatEther(stats.sharePrice),
      vaultAddress: VAULT_ADDRESS,
    });
  } catch (error: any) {
    console.error('Error fetching vault stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/user/:address - Get user's vault position
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    if (!VAULT_ADDRESS) {
      return res.status(503).json({ error: 'Vault not deployed yet' });
    }

    const vault = getVaultContract();

    // Get user's position
    const [shares, deposited, balance, yieldEarned] = await Promise.all([
      vault.balanceOf(address),
      vault.getUserDeposits(address),
      vault.getUserBalance(address),
      vault.getUserYield(address),
    ]);

    // Calculate APY (if user has deposits)
    let estimatedAPY = 0;
    if (deposited > 0n && yieldEarned > 0n) {
      // Simple APY calculation (actual APY would need time-weighted)
      const returnPercent = (Number(yieldEarned) / Number(deposited)) * 100;
      estimatedAPY = returnPercent; // Annualized would need deposit timestamp
    }

    res.json({
      address,
      shares: ethers.formatEther(shares),
      deposited: ethers.formatUnits(deposited, 6),
      currentBalance: ethers.formatUnits(balance, 6),
      yieldEarned: ethers.formatUnits(yieldEarned, 6),
      estimatedAPY,
    });
  } catch (error: any) {
    console.error('Error fetching user vault position:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vault/track-deposit - Track a user deposit (called after transaction)
router.post('/track-deposit', requireAuth, loadUser, async (req, res) => {
  try {
    const { tx_hash, amount, shares } = req.body;

    if (!tx_hash || !amount) {
      return res.status(400).json({ error: 'tx_hash and amount required' });
    }

    // Save deposit record
    const { data, error } = await supabase
      .from('vault_deposits')
      .insert({
        user_id: req.user.id,
        tx_hash,
        amount,
        shares: shares || '0',
        status: 'pending',
        chain: 'base',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ deposit: data });
  } catch (error: any) {
    console.error('Error tracking deposit:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/deposits - Get user's vault deposit history
router.get('/deposits', requireAuth, loadUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vault_deposits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ deposits: data || [] });
  } catch (error: any) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vault/update-deposit-status - Update deposit status (webhook/cron)
router.post('/update-deposit-status', async (req, res) => {
  try {
    const { tx_hash, status } = req.body;

    if (!tx_hash || !status) {
      return res.status(400).json({ error: 'tx_hash and status required' });
    }

    const { error } = await supabase
      .from('vault_deposits')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tx_hash', tx_hash);

    if (error) throw error;

    res.json({ message: 'Deposit status updated' });
  } catch (error: any) {
    console.error('Error updating deposit status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/apy - Get current vault APY
router.get('/apy', async (req, res) => {
  try {
    if (!VAULT_ADDRESS) {
      return res.status(503).json({ error: 'Vault not deployed yet' });
    }

    // For now, return estimated APY from Aave
    // In production, calculate from actual vault performance
    const estimatedAPY = 4.5; // 4.5% (fetch from Aave API in production)

    res.json({
      currentAPY: estimatedAPY,
      source: 'Aave V3 USDC',
      chain: 'base',
    });
  } catch (error: any) {
    console.error('Error fetching APY:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/contract-info - Get vault contract information
router.get('/contract-info', async (req, res) => {
  try {
    if (!VAULT_ADDRESS) {
      return res.status(503).json({ error: 'Vault not deployed yet' });
    }

    const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

    res.json({
      vaultAddress: VAULT_ADDRESS,
      vaultName: 'YieldShift USDC Vault',
      vaultSymbol: 'ysUSDC',
      underlyingAsset: USDC_BASE,
      underlyingSymbol: 'USDC',
      chain: 'base',
      chainId: 8453,
      blockExplorer: `https://basescan.org/address/${VAULT_ADDRESS}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
