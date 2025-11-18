import axios from 'axios';
import { supabase } from '../db';

const SIDESHIFT_API = 'https://sideshift.ai/api/v2';
const SIDESHIFT_API_KEY = process.env.SIDESHIFT_API_KEY;
const SIDESHIFT_AFFILIATE_ID = process.env.SIDESHIFT_AFFILIATE_ID;

interface RebalanceRecommendation {
  id: string;
  user_id: string;
  from_pool_id: string | null;
  to_pool_id: string;
  from_protocol: string | null;
  to_protocol: string;
  asset: string;
  amount: string;
  current_apy: number | null;
  target_apy: number;
  net_gain: number;
  risk_score: number;
  reason: string;
  status: string;
}

interface ShiftQuote {
  id: string;
  depositCoin: string;
  settleCoin: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  expiresAt: string;
}

interface ShiftOrder {
  id: string;
  depositAddress: string;
  depositCoin: string;
  settleCoin: string;
  depositAmount: string;
  settleAmount: string;
  settleAddress: string;
  status: string;
}

// Map asset symbols to SideShift coin IDs
function mapAssetToSideShiftCoin(asset: string): string {
  const mapping: Record<string, string> = {
    'ETH': 'eth',
    'WETH': 'eth',
    'BTC': 'btc',
    'WBTC': 'btc',
    'USDC': 'usdcarbitrum', // Using Arbitrum USDC for lower fees
    'USDT': 'usdttrc20',
    'DAI': 'dai',
    'MATIC': 'matic',
    'AVAX': 'avax',
    'SOL': 'sol',
    'ATOM': 'atom',
    'DOT': 'dot',
    'LINK': 'link',
    'UNI': 'uni',
    'AAVE': 'aave',
    'CRV': 'crv',
  };

  return mapping[asset.toUpperCase()] || asset.toLowerCase();
}

// Get shift quote from SideShift
export async function getShiftQuote(
  fromAsset: string,
  toAsset: string,
  amount: string
): Promise<ShiftQuote | null> {
  try {
    const depositCoin = mapAssetToSideShiftCoin(fromAsset);
    const settleCoin = mapAssetToSideShiftCoin(toAsset);

    const response = await axios.post(
      `${SIDESHIFT_API}/quotes`,
      {
        depositCoin,
        settleCoin,
        depositAmount: amount,
        affiliateId: SIDESHIFT_AFFILIATE_ID,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(SIDESHIFT_API_KEY && { 'x-sideshift-secret': SIDESHIFT_API_KEY }),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error getting shift quote:', error.response?.data || error.message);
    return null;
  }
}

// Create shift order
export async function createShiftOrder(
  quoteId: string,
  settleAddress: string
): Promise<ShiftOrder | null> {
  try {
    const response = await axios.post(
      `${SIDESHIFT_API}/shifts/fixed`,
      {
        quoteId,
        settleAddress,
        affiliateId: SIDESHIFT_AFFILIATE_ID,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(SIDESHIFT_API_KEY && { 'x-sideshift-secret': SIDESHIFT_API_KEY }),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating shift order:', error.response?.data || error.message);
    return null;
  }
}

// Get shift order status
export async function getShiftStatus(shiftId: string): Promise<ShiftOrder | null> {
  try {
    const response = await axios.get(
      `${SIDESHIFT_API}/shifts/${shiftId}`,
      {
        headers: {
          ...(SIDESHIFT_API_KEY && { 'x-sideshift-secret': SIDESHIFT_API_KEY }),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error getting shift status:', error.response?.data || error.message);
    return null;
  }
}

// Execute a rebalancing recommendation
export async function executeRebalance(
  recommendationId: string,
  userWalletAddress: string
): Promise<{ success: boolean; order?: ShiftOrder; error?: string }> {
  try {
    // Get recommendation details
    const { data: recommendation, error: fetchError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (fetchError || !recommendation) {
      return { success: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'pending') {
      return { success: false, error: 'Recommendation already processed' };
    }

    // For now, we'll assume user wants to convert their asset to the target protocol's asset
    // In a real implementation, you'd need to:
    // 1. Withdraw from current protocol (if applicable)
    // 2. Swap tokens if needed
    // 3. Deposit into target protocol

    // Simplified: Just handle the swap part via SideShift
    const fromAsset = recommendation.asset;
    const toAsset = recommendation.asset; // Same asset, different protocol (no swap needed)

    // If it's the same asset, we can't use SideShift - user needs to manually withdraw/deposit
    if (fromAsset === toAsset && recommendation.from_protocol) {
      // Update status to manual
      await supabase
        .from('recommendations')
        .update({
          status: 'manual_required',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);

      return {
        success: false,
        error: 'Manual rebalancing required - same asset, different protocol. Please withdraw and re-deposit manually.',
      };
    }

    // Get quote from SideShift
    const quote = await getShiftQuote(fromAsset, toAsset, recommendation.amount);

    if (!quote) {
      return { success: false, error: 'Failed to get shift quote' };
    }

    // Create shift order
    const order = await createShiftOrder(quote.id, userWalletAddress);

    if (!order) {
      return { success: false, error: 'Failed to create shift order' };
    }

    // Save execution details
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        shift_id: order.id,
      })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('Error updating recommendation:', updateError);
    }

    // Record in rebalance history
    await supabase
      .from('rebalance_history')
      .insert({
        user_id: recommendation.user_id,
        recommendation_id: recommendationId,
        shift_id: order.id,
        from_protocol: recommendation.from_protocol,
        to_protocol: recommendation.to_protocol,
        asset: recommendation.asset,
        amount: recommendation.amount,
        status: 'pending',
      });

    return { success: true, order };
  } catch (error: any) {
    console.error('Error executing rebalance:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// Batch execute multiple recommendations
export async function batchExecuteRebalances(
  recommendationIds: string[],
  userWalletAddress: string
): Promise<{
  successful: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}> {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const id of recommendationIds) {
    const result = await executeRebalance(id, userWalletAddress);
    results.push({
      id,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { successful, failed, results };
}

// Monitor shift order and update status
export async function monitorShiftOrder(shiftId: string) {
  const status = await getShiftStatus(shiftId);

  if (!status) {
    console.error(`Failed to get status for shift ${shiftId}`);
    return;
  }

  // Update rebalance history
  await supabase
    .from('rebalance_history')
    .update({ status: status.status.toLowerCase() })
    .eq('shift_id', shiftId);

  // If settled, mark recommendation as completed
  if (status.status.toLowerCase() === 'settled') {
    await supabase
      .from('recommendations')
      .update({ status: 'completed' })
      .eq('shift_id', shiftId);
  }

  return status;
}

// Simulate rebalance (for testing without actual execution)
export async function simulateRebalance(
  recommendationId: string
): Promise<{
  estimated_cost: number;
  estimated_gain_annual: number;
  estimated_gain_daily: number;
  breakeven_days: number;
}> {
  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', recommendationId)
    .single();

  if (!recommendation) {
    throw new Error('Recommendation not found');
  }

  const amount = parseFloat(recommendation.amount);
  const apyDiff = recommendation.target_apy - (recommendation.current_apy || 0);

  // Estimate gas costs (simplified)
  const estimatedGasCost = 50; // $50 average for withdraw + swap + deposit

  // Calculate gains
  const annualGain = (amount * apyDiff) / 100;
  const dailyGain = annualGain / 365;
  const breakevenDays = estimatedGasCost / dailyGain;

  return {
    estimated_cost: estimatedGasCost,
    estimated_gain_annual: annualGain,
    estimated_gain_daily: dailyGain,
    breakeven_days: Math.ceil(breakevenDays),
  };
}

// Check if rebalancing is worth it (ROI calculation)
export function isRebalanceWorthwhile(
  amount: number,
  apyDifference: number,
  estimatedCost: number = 50,
  minDaysToBreakeven: number = 30
): boolean {
  const annualGain = (amount * apyDifference) / 100;
  const dailyGain = annualGain / 365;
  const daysToBreakeven = estimatedCost / dailyGain;

  return daysToBreakeven <= minDaysToBreakeven && annualGain > estimatedCost * 2;
}
