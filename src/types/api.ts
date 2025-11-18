export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'institutional';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface User {
  id: string;
  email: string;
  clerk_id: string;
  subscription_tier: SubscriptionTier;
  risk_tolerance: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: 'starter' | 'professional' | 'institutional';
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  nickname: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  wallet_id: string;
  protocol: string;
  pool_id: string;
  asset: string;
  balance: string;
  apy: number;
  tvl_usd: number;
  last_synced: string;
}

export interface Recommendation {
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
  status: 'pending' | 'executed' | 'rejected';
  created_at: string;
}

export interface SubscriptionStatusResponse {
  user: User;
  subscription: Subscription | null;
  features: {
    ai_recommendations: boolean;
    auto_rebalancing: boolean;
    max_rebalances_per_month: number | null; // null = unlimited
    max_wallets: number | null; // null = unlimited
    custom_strategies: boolean;
    priority_support: boolean;
    api_access: boolean;
  };
  usage: {
    rebalances_this_month: number;
    wallets_connected: number;
  };
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}
