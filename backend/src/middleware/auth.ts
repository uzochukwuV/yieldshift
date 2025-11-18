import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { getUserByClerkId, createUser } from '../db';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Clerk authentication middleware
export const requireAuth = ClerkExpressRequireAuth();

// Get or create user in our database
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let user = await getUserByClerkId(clerkId);

    // Create user if doesn't exist
    if (!user) {
      const email = req.auth?.sessionClaims?.email as string;
      if (!email) {
        return res.status(400).json({ error: 'Email not found in session' });
      }
      user = await createUser(clerkId, email);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error loading user:', error);
    res.status(500).json({ error: 'Failed to load user' });
  }
}

// Check subscription tier middleware
export function requirePlan(minPlan: 'free' | 'starter' | 'professional' | 'institutional') {
  const planHierarchy = {
    free: 0,
    starter: 1,
    professional: 2,
    institutional: 3,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userPlanLevel = planHierarchy[user.subscription_tier as keyof typeof planHierarchy] || 0;
    const requiredLevel = planHierarchy[minPlan];

    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Upgrade required',
        required_plan: minPlan,
        current_plan: user.subscription_tier,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }

    next();
  };
}

// Check rebalance limit for the month
export async function checkRebalanceLimit(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Unlimited for professional/institutional
  if (['professional', 'institutional'].includes(user.subscription_tier)) {
    return next();
  }

  // Starter gets 4 per month
  if (user.subscription_tier === 'starter') {
    const { supabase } = require('../db');
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

    const { data, error } = await supabase
      .from('rebalance_history')
      .select('count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking rebalance limit:', error);
      return res.status(500).json({ error: 'Failed to check limit' });
    }

    const count = data?.count || 0;
    if (count >= 4) {
      return res.status(403).json({
        error: 'Monthly rebalance limit reached',
        limit: 4,
        used: count,
        message: 'Upgrade to Professional for unlimited rebalancing',
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }
  }

  // Free tier has no rebalancing
  if (user.subscription_tier === 'free') {
    return res.status(403).json({
      error: 'Rebalancing requires subscription',
      message: 'Upgrade to Starter or higher for auto-rebalancing',
      upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
    });
  }

  next();
}
