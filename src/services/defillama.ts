import axios from 'axios';
import {getCoins} from "./sideshift"
const DEFILLAMA_BASE_URL = 'https://yields.llama.fi';

export interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number | null;
  rewardTokens: string[] | null;
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
  poolMeta: string | null;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[] | null;
  il7d: number | null;
}

export interface DefiLlamaResponse {
  status: string;
  data: DefiLlamaPool[];
}

export interface YieldToken {
  symbol: string;
  chain: string;
  project: string;
  totalApy: number;
  apyBase: number;
  apyReward: number;
  tvlUsd: number;
  pool: string;
  ssId?: string;
  ssNetwork?: string;
  stablecoin: boolean;
  ilRisk: string;
}

// Map DefiLlama symbols to SideShift coin IDs
export let YIELD_TOKEN_MAP: Record<string, { id: string; chain: string; network: string }> = {
  'STETH': { id: 'steth', chain: 'ethereum', network: 'ethereum' },
  'RETH': { id: 'reth', chain: 'ethereum', network: 'ethereum' },
  'CBETH': { id: 'cbeth', chain: 'ethereum', network: 'ethereum' },
  'METH': { id: 'meth', chain: 'ethereum', network: 'ethereum' },
  'SAVAX': { id: 'savax', chain: 'avax', network: 'avax' },
  'JITOSOL': { id: 'jitosol', chain: 'solana', network: 'solana' },
  'BSOL': { id: 'bsol', chain: 'solana', network: 'solana' },
  'MSOL': { id: 'msol', chain: 'solana', network: 'solana' },
  'JITOSOLSTAKE': { id: 'jitosol', chain: 'solana', network: 'solana' },
  'DSOL': { id: 'bsol', chain: 'solana', network: 'solana' },
  'JUPSOL': { id: 'msol', chain: 'solana', network: 'solana' },
};

// Fetch all yield pools from DefiLlama
export async function getYieldPools(): Promise<DefiLlamaPool[]> {
  try {
    const response = await axios.get<DefiLlamaResponse>(`${DEFILLAMA_BASE_URL}/pools`);
    console.log(response)
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch yield pools');
    }
    throw new Error('Failed to fetch yield pools');
  }
}

// Get yield tokens that are supported by SideShift
export async function getSupportedYieldTokens(
  supportedCoinIds: string[],
  minTvl: number = 50000000
): Promise<YieldToken[]> {
  try {
    const [pools, coins] = await Promise.all([getYieldPools(), getCoins()]);
    
    // Create a set of available SideShift coins for faster lookup
    const availableSideShiftCoins = new Set(coins.map(coin => coin.coin.toUpperCase()));
    
    // Process and filter pools
    const yieldTokens = pools
      .map((pool) => {
        // Calculate total APY
        const totalApy = (pool.apyBase || 0) + (pool.apyReward || 0) || pool.apy || 0;

        // Normalize symbol (remove special characters)
        const symbolKey = pool.symbol.toUpperCase().replace(/[^A-Z]/g, '');

        return {
          ...pool,
          totalApy,
          symbolKey,
        };
      })
      .filter((pool) => {
        
        // Filter to only supported tokens with good TVL
        
        // Check if the pool's symbol exists in YIELD_TOKEN_MAP
        const symbolKey = pool.symbol.toUpperCase().replace(/[^A-Z]/g, '');
        const mappedToken = YIELD_TOKEN_MAP[symbolKey];
        
        // Verify the token exists in both DefiLlama and SideShift
        return (
          mappedToken &&
          availableSideShiftCoins.has(mappedToken.id.toUpperCase()) &&
          pool.tvlUsd > minTvl &&
          pool.outlier !== true &&
          pool.totalApy > 0
        );
      })
      .map((pool) => {
        const token = YIELD_TOKEN_MAP[pool.symbolKey];
        return {
          symbol: pool.symbol,
          chain: pool.chain,
          project: pool.project,
          totalApy: pool.totalApy,
          apyBase: pool.apyBase || 0,
          apyReward: pool.apyReward || 0,
          tvlUsd: pool.tvlUsd,
          pool: pool.pool,
          ssId: token.id,
          ssNetwork: token.network,
          stablecoin: pool.stablecoin,
          ilRisk: pool.ilRisk,
        };
      })
      .sort((a, b) => {
        // Sort by APY first, then by TVL
        if (b.totalApy !== a.totalApy) {
          return b.totalApy - a.totalApy;
        }
        return b.tvlUsd - a.tvlUsd;
      });

    // Remove duplicates (keep highest APY for each ssId)
    const uniqueTokens = new Map<string, YieldToken>();
    yieldTokens.forEach((token) => {
      if (token.ssId) {
        const existing = uniqueTokens.get(token.ssId);
        if (!existing || token.totalApy > existing.totalApy) {
          uniqueTokens.set(token.ssId, token);
        }
      }
    });

    return Array.from(uniqueTokens.values());
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch supported yield tokens');
    }
    throw new Error('Failed to fetch supported yield tokens');
  }
}

// Format APY for display
export function formatApy(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

// Format TVL for display
export function formatTvl(tvl: number): string {
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(2)}B`;
  } else if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(1)}M`;
  } else if (tvl >= 1e3) {
    return `$${(tvl / 1e3).toFixed(1)}K`;
  }
  return `$${tvl.toFixed(0)}`;
}
