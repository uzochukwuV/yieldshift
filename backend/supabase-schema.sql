-- YieldShift Pro Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  clerk_id VARCHAR UNIQUE,
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'institutional')),
  risk_tolerance INTEGER DEFAULT 50 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR NOT NULL,
  chain VARCHAR NOT NULL,
  label VARCHAR,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, address, chain)
);

-- Positions table (current holdings)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  protocol VARCHAR NOT NULL,
  token VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  entry_apy DECIMAL,
  current_apy DECIMAL,
  tvl_usd DECIMAL,
  entered_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_position_id UUID REFERENCES positions(id),
  to_protocol VARCHAR NOT NULL,
  to_token VARCHAR NOT NULL,
  expected_apy DECIMAL NOT NULL,
  expected_gain_annual DECIMAL,
  gas_cost_estimate DECIMAL,
  net_gain DECIMAL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'expired', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  type VARCHAR NOT NULL CHECK (type IN ('swap', 'stake', 'unstake', 'rebalance')),
  from_token VARCHAR,
  to_token VARCHAR,
  amount DECIMAL,
  tx_hash VARCHAR,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR UNIQUE,
  plan VARCHAR NOT NULL CHECK (plan IN ('starter', 'professional', 'institutional')),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rebalance history table
CREATE TABLE IF NOT EXISTS rebalance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_wallet_id ON positions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_rebalance_history_user_month ON rebalance_history(user_id, month);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can insert own wallets" ON wallets
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Add similar policies for other tables as needed

-- Seed data (optional - for development)
-- INSERT INTO users (email, clerk_id, subscription_tier) VALUES
--   ('demo@yieldshift.com', 'demo_user_123', 'professional');
