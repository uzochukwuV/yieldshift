import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from 'langchain/prompts';
import { JsonOutputParser } from 'langchain/output_parsers';
import axios from 'axios';
import { supabase } from '../db';

// Use Groq for free, fast LLM inference (compatible with OpenAI API)
const model = new ChatOpenAI({
  modelName: 'mixtral-8x7b-32768', // Groq's fast model
  temperature: 0.3,
  openAIApiKey: process.env.GROQ_API_KEY,
  configuration: {
    baseURL: 'https://api.groq.com/openai/v1',
  },
});

// Fallback to OpenAI if Groq key not provided
const modelFallback = process.env.GROQ_API_KEY ? model : new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.3,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  ilRisk?: string;
  exposure?: string;
  poolMeta?: string;
}

interface UserPosition {
  id: string;
  protocol: string;
  pool_id: string;
  asset: string;
  balance: string;
  apy: number;
  tvl_usd: number;
}

interface RecommendationOutput {
  recommendations: Array<{
    from_pool_id: string | null;
    from_protocol: string | null;
    to_pool_id: string;
    to_protocol: string;
    asset: string;
    amount: string;
    current_apy: number | null;
    target_apy: number;
    net_gain: number;
    risk_score: number;
    reason: string;
  }>;
}

// Prompt template for AI recommendation generation
const recommendationPrompt = PromptTemplate.fromTemplate(`
You are a DeFi yield optimization expert. Analyze the user's current positions and available yield opportunities to generate optimal rebalancing recommendations.

User Risk Tolerance: {riskTolerance}/100 (0 = very conservative, 100 = very aggressive)

Current Positions:
{currentPositions}

Top Available Yield Opportunities:
{availableYields}

Market Context:
- Consider gas fees for rebalancing (higher amounts = more worth it)
- Consider impermanent loss risk
- Consider protocol security and TVL
- Consider yield sustainability (base APY vs reward APY)
- Higher risk tolerance = willing to accept IL risk and new protocols
- Lower risk tolerance = prefer established protocols, stable yields

Generate up to 5 rebalancing recommendations following these rules:
1. Only recommend moving funds if APY improvement is significant (>2% for conservative, >1% for aggressive)
2. Match asset types (don't recommend swapping ETH to USDC unless explicitly profitable)
3. Consider risk score: Low risk (1-3), Medium risk (4-6), High risk (7-10)
4. Calculate estimated annual net gain in USD
5. Provide clear reasoning for each recommendation

Output as JSON array with this exact structure:
{{
  "recommendations": [
    {{
      "from_pool_id": "current-pool-id or null for new deposit",
      "from_protocol": "current-protocol or null",
      "to_pool_id": "target-pool-id",
      "to_protocol": "target-protocol-name",
      "asset": "asset-symbol",
      "amount": "amount-to-move",
      "current_apy": current APY as number or null,
      "target_apy": target APY as number,
      "net_gain": estimated-annual-gain-usd as number,
      "risk_score": 1-10 integer,
      "reason": "brief explanation of why this is recommended"
    }}
  ]
}}

Only return valid JSON, no other text.
`);

// Fetch top yield opportunities from DefiLlama
export async function fetchTopYields(
  minTvl = 1_000_000,
  limit = 50
): Promise<YieldPool[]> {
  try {
    const response = await axios.get('https://yields.llama.fi/pools');
    const pools: YieldPool[] = response.data.data;

    // Filter and sort
    const filtered = pools
      .filter(p =>
        p.tvlUsd >= minTvl &&
        p.apy > 0 &&
        p.apy < 1000 && // Filter out unrealistic APYs
        p.symbol &&
        p.project
      )
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Error fetching yields from DefiLlama:', error);
    return [];
  }
}

// Get user's current positions
export async function getUserPositions(userId: string): Promise<UserPosition[]> {
  const { data, error } = await supabase
    .from('positions')
    .select(`
      id,
      protocol,
      pool_id,
      asset,
      balance,
      apy,
      tvl_usd
    `)
    .eq('wallet_id', userId)
    .order('balance', { ascending: false });

  if (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }

  return data || [];
}

// Generate AI-powered recommendations
export async function generateRecommendations(
  userId: string,
  riskTolerance: number = 50
): Promise<RecommendationOutput> {
  try {
    // Fetch user's current positions
    const currentPositions = await getUserPositions(userId);

    // Fetch top yield opportunities
    const availableYields = await fetchTopYields();

    if (availableYields.length === 0) {
      throw new Error('Failed to fetch yield opportunities');
    }

    // Format data for LLM
    const positionsText = currentPositions.length > 0
      ? currentPositions.map(p =>
          `- ${p.asset} in ${p.protocol}: $${parseFloat(p.balance).toFixed(2)} @ ${p.apy.toFixed(2)}% APY`
        ).join('\n')
      : 'No current positions (user looking to deploy capital)';

    const yieldsText = availableYields.slice(0, 20).map(y =>
      `- ${y.symbol} on ${y.chain} (${y.project}): ${y.apy.toFixed(2)}% APY, TVL: $${(y.tvlUsd / 1_000_000).toFixed(1)}M, IL Risk: ${y.ilRisk || 'unknown'}`
    ).join('\n');

    // Create chain with prompt, model, and parser
    const chain = recommendationPrompt
      .pipe(modelFallback)
      .pipe(new JsonOutputParser());

    // Generate recommendations
    const result = await chain.invoke({
      riskTolerance: riskTolerance.toString(),
      currentPositions: positionsText,
      availableYields: yieldsText,
    });

    // Validate and return
    if (result && result.recommendations && Array.isArray(result.recommendations)) {
      return result as RecommendationOutput;
    }

    // Fallback if LLM doesn't return proper format
    console.warn('LLM returned invalid format, generating fallback recommendations');
    return generateFallbackRecommendations(currentPositions, availableYields, riskTolerance);

  } catch (error) {
    console.error('Error generating AI recommendations:', error);

    // Fallback to rule-based recommendations if AI fails
    const currentPositions = await getUserPositions(userId);
    const availableYields = await fetchTopYields();
    return generateFallbackRecommendations(currentPositions, availableYields, riskTolerance);
  }
}

// Fallback rule-based recommendations if AI fails
function generateFallbackRecommendations(
  currentPositions: UserPosition[],
  availableYields: YieldPool[],
  riskTolerance: number
): RecommendationOutput {
  const recommendations: RecommendationOutput['recommendations'] = [];

  // Filter yields based on risk tolerance
  const maxRisk = riskTolerance > 70 ? 10 : riskTolerance > 40 ? 6 : 3;
  const filteredYields = availableYields.filter(y => {
    const hasILRisk = y.ilRisk === 'yes';
    const lowTVL = y.tvlUsd < 10_000_000;
    const riskScore = (hasILRisk ? 4 : 0) + (lowTVL ? 3 : 0);
    return riskScore <= maxRisk;
  });

  // For each position, find better opportunities
  for (const position of currentPositions) {
    const betterYields = filteredYields.filter(y =>
      y.symbol.includes(position.asset) &&
      y.apy > position.apy + 2 // At least 2% improvement
    );

    if (betterYields.length > 0) {
      const best = betterYields[0];
      const apyDiff = best.apy - position.apy;
      const balance = parseFloat(position.balance);
      const netGain = (balance * apyDiff) / 100;

      recommendations.push({
        from_pool_id: position.pool_id,
        from_protocol: position.protocol,
        to_pool_id: best.pool,
        to_protocol: best.project,
        asset: position.asset,
        amount: position.balance,
        current_apy: position.apy,
        target_apy: best.apy,
        net_gain: netGain,
        risk_score: best.ilRisk === 'yes' ? 6 : 3,
        reason: `Higher APY available: ${best.apy.toFixed(2)}% vs ${position.apy.toFixed(2)}% (+${apyDiff.toFixed(2)}%)`,
      });
    }
  }

  // If user has no positions, suggest top yields for new deposits
  if (currentPositions.length === 0 && filteredYields.length > 0) {
    const topStable = filteredYields.find(y =>
      y.symbol.includes('USDC') || y.symbol.includes('USDT') || y.symbol.includes('DAI')
    );

    if (topStable) {
      recommendations.push({
        from_pool_id: null,
        from_protocol: null,
        to_pool_id: topStable.pool,
        to_protocol: topStable.project,
        asset: topStable.symbol,
        amount: '1000', // Suggested amount
        current_apy: null,
        target_apy: topStable.apy,
        net_gain: 1000 * (topStable.apy / 100),
        risk_score: topStable.ilRisk === 'yes' ? 5 : 2,
        reason: `Top stablecoin yield: ${topStable.apy.toFixed(2)}% on ${topStable.project}`,
      });
    }
  }

  return { recommendations: recommendations.slice(0, 5) };
}

// Save recommendations to database
export async function saveRecommendations(
  userId: string,
  recommendations: RecommendationOutput['recommendations']
) {
  const toInsert = recommendations.map(rec => ({
    user_id: userId,
    from_pool_id: rec.from_pool_id,
    from_protocol: rec.from_protocol,
    to_pool_id: rec.to_pool_id,
    to_protocol: rec.to_protocol,
    asset: rec.asset,
    amount: rec.amount,
    current_apy: rec.current_apy,
    target_apy: rec.target_apy,
    net_gain: rec.net_gain,
    risk_score: rec.risk_score,
    reason: rec.reason,
    status: 'pending',
  }));

  const { data, error } = await supabase
    .from('recommendations')
    .insert(toInsert)
    .select();

  if (error) {
    console.error('Error saving recommendations:', error);
    throw new Error('Failed to save recommendations');
  }

  return data;
}
