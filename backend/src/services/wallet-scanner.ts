import { ethers } from 'ethers';
import axios from 'axios';
import { supabase } from '../db';

// ERC20 ABI for token balance checks
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Known DeFi protocol contract addresses (simplified examples)
const KNOWN_PROTOCOLS = {
  ethereum: {
    aave: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    compound: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    uniswap: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  polygon: {
    aave: '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf',
  },
};

interface WalletPosition {
  protocol: string;
  pool_id: string;
  asset: string;
  balance: string;
  apy: number;
  tvl_usd: number;
  chain: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
  chain: string;
}

// Get RPC provider for a chain
function getProvider(chain: string): ethers.JsonRpcProvider {
  const rpcUrls: Record<string, string> = {
    ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    polygon: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
    avalanche: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
  };

  const rpcUrl = rpcUrls[chain.toLowerCase()] || rpcUrls.ethereum;
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Scan wallet using Alchemy API (if available)
async function scanWithAlchemy(
  address: string,
  chain: string = 'ethereum'
): Promise<TokenBalance[]> {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    console.log('Alchemy API key not provided, falling back to RPC');
    return scanWithRPC(address, chain);
  }

  try {
    const networkMap: Record<string, string> = {
      ethereum: 'eth-mainnet',
      polygon: 'polygon-mainnet',
      arbitrum: 'arb-mainnet',
    };

    const network = networkMap[chain.toLowerCase()] || 'eth-mainnet';
    const url = `https://${network}.g.alchemy.com/v2/${alchemyKey}`;

    // Get token balances using Alchemy
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenBalances',
      params: [address],
    });

    const balances: TokenBalance[] = [];

    if (response.data.result && response.data.result.tokenBalances) {
      for (const token of response.data.result.tokenBalances) {
        if (token.tokenBalance && token.tokenBalance !== '0x0') {
          // Get token metadata
          const metadata = await axios.post(url, {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenMetadata',
            params: [token.contractAddress],
          });

          if (metadata.data.result) {
            const decimals = metadata.data.result.decimals || 18;
            const balance = ethers.formatUnits(token.tokenBalance, decimals);

            balances.push({
              address: token.contractAddress,
              symbol: metadata.data.result.symbol || 'UNKNOWN',
              balance,
              decimals,
              chain,
            });
          }
        }
      }
    }

    return balances;
  } catch (error) {
    console.error('Error scanning with Alchemy:', error);
    return scanWithRPC(address, chain);
  }
}

// Fallback: Scan wallet using direct RPC calls
async function scanWithRPC(
  address: string,
  chain: string = 'ethereum'
): Promise<TokenBalance[]> {
  const provider = getProvider(chain);
  const balances: TokenBalance[] = [];

  // Get native token balance
  try {
    const nativeBalance = await provider.getBalance(address);
    const nativeSymbol = chain === 'ethereum' ? 'ETH' :
                         chain === 'polygon' ? 'MATIC' :
                         chain === 'arbitrum' ? 'ETH' : 'AVAX';

    balances.push({
      address: 'native',
      symbol: nativeSymbol,
      balance: ethers.formatEther(nativeBalance),
      decimals: 18,
      chain,
    });
  } catch (error) {
    console.error('Error getting native balance:', error);
  }

  // Check common token addresses (you would expand this list)
  const commonTokens: Record<string, Array<{ address: string; symbol: string }>> = {
    ethereum: [
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC' },
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
      { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI' },
      { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC' },
      { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', symbol: 'wstETH' },
    ],
    polygon: [
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC' },
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT' },
    ],
  };

  const tokens = commonTokens[chain.toLowerCase()] || [];

  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();

      if (balance > 0n) {
        balances.push({
          address: token.address,
          symbol: token.symbol,
          balance: ethers.formatUnits(balance, decimals),
          decimals,
          chain,
        });
      }
    } catch (error) {
      console.error(`Error checking token ${token.symbol}:`, error);
    }
  }

  return balances;
}

// Scan using DefiLlama API for protocol positions
async function scanProtocolPositions(
  address: string
): Promise<WalletPosition[]> {
  try {
    // DefiLlama's Yields API can be used to find where tokens are deposited
    const response = await axios.get('https://yields.llama.fi/pools');
    const allPools = response.data.data;

    // This is a simplified example - in production you'd query specific protocols
    // or use APIs like Zapper, DeBank, or direct protocol queries

    const positions: WalletPosition[] = [];

    // For now, we'll return empty and rely on user manually adding positions
    // or integrate with specific protocol APIs

    return positions;
  } catch (error) {
    console.error('Error scanning protocol positions:', error);
    return [];
  }
}

// Main wallet scanning function
export async function scanWallet(
  walletId: string,
  address: string,
  chain: string = 'ethereum'
): Promise<{ tokens: TokenBalance[]; positions: WalletPosition[] }> {
  console.log(`Scanning wallet ${address} on ${chain}...`);

  // Get token balances
  const tokens = await scanWithAlchemy(address, chain);

  // Get protocol positions
  const positions = await scanProtocolPositions(address);

  console.log(`Found ${tokens.length} tokens and ${positions.length} positions`);

  return { tokens, positions };
}

// Save positions to database
export async function savePositions(
  walletId: string,
  positions: WalletPosition[]
) {
  // Delete old positions
  await supabase
    .from('positions')
    .delete()
    .eq('wallet_id', walletId);

  // Insert new positions
  if (positions.length > 0) {
    const toInsert = positions.map(p => ({
      wallet_id: walletId,
      protocol: p.protocol,
      pool_id: p.pool_id,
      asset: p.asset,
      balance: p.balance,
      apy: p.apy,
      tvl_usd: p.tvl_usd,
    }));

    const { error } = await supabase
      .from('positions')
      .insert(toInsert);

    if (error) {
      console.error('Error saving positions:', error);
      throw new Error('Failed to save positions');
    }
  }
}

// Enhanced position detection using DeBank API (free tier)
export async function scanWithDeBank(address: string): Promise<WalletPosition[]> {
  try {
    // DeBank provides free API for portfolio positions
    // Note: You need to sign up for API key at https://open.debank.com/
    const debankKey = process.env.DEBANK_API_KEY;

    if (!debankKey) {
      console.log('DeBank API key not provided');
      return [];
    }

    const response = await axios.get(
      `https://pro-openapi.debank.com/v1/user/complex_protocol_list`,
      {
        params: { id: address.toLowerCase() },
        headers: { 'AccessKey': debankKey },
      }
    );

    const positions: WalletPosition[] = [];

    if (response.data && Array.isArray(response.data)) {
      for (const protocol of response.data) {
        for (const portfolioItem of protocol.portfolio_item_list || []) {
          if (portfolioItem.stats?.asset_usd_value > 0) {
            positions.push({
              protocol: protocol.name,
              pool_id: portfolioItem.pool?.id || 'unknown',
              asset: portfolioItem.detail?.supply_token_list?.[0]?.symbol || 'UNKNOWN',
              balance: portfolioItem.stats.asset_usd_value.toString(),
              apy: (portfolioItem.pool?.apy || 0) * 100,
              tvl_usd: portfolioItem.pool?.tvl || 0,
              chain: protocol.chain,
            });
          }
        }
      }
    }

    return positions;
  } catch (error) {
    console.error('Error scanning with DeBank:', error);
    return [];
  }
}

// Get simplified position from token balances + yield data
export async function inferPositionsFromBalances(
  tokens: TokenBalance[]
): Promise<WalletPosition[]> {
  try {
    // Fetch current yields
    const yieldsResponse = await axios.get('https://yields.llama.fi/pools');
    const pools = yieldsResponse.data.data;

    const positions: WalletPosition[] = [];

    for (const token of tokens) {
      const balance = parseFloat(token.balance);
      if (balance > 0.01) { // Ignore dust
        // Find relevant pools for this token
        const relevantPools = pools.filter((p: any) =>
          p.symbol?.includes(token.symbol) && p.tvlUsd > 100000
        );

        if (relevantPools.length > 0) {
          // Use highest APY pool as reference
          const topPool = relevantPools.sort((a: any, b: any) => b.apy - a.apy)[0];

          positions.push({
            protocol: topPool.project,
            pool_id: topPool.pool,
            asset: token.symbol,
            balance: token.balance,
            apy: topPool.apy,
            tvl_usd: topPool.tvlUsd,
            chain: token.chain,
          });
        }
      }
    }

    return positions;
  } catch (error) {
    console.error('Error inferring positions:', error);
    return [];
  }
}
