import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import {
  Crown,
  Sparkles,
  Zap,
  Building2,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Settings
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { apiClient } from '../services/api';
import type { SubscriptionStatusResponse } from '../types/api';

const tierIcons = {
  free: Sparkles,
  starter: Zap,
  professional: Crown,
  institutional: Building2,
};

const tierColors = {
  free: 'from-gray-500 to-gray-600',
  starter: 'from-blue-500 to-purple-600',
  professional: 'from-purple-500 to-pink-600',
  institutional: 'from-orange-500 to-red-600',
};

export default function Account() {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();

  // Set token getter for API client
  useEffect(() => {
    if (isSignedIn) {
      apiClient.setTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  // Fetch subscription status
  const { data, isLoading, error } = useQuery<SubscriptionStatusResponse>({
    queryKey: ['subscription-status'],
    queryFn: () => apiClient.getSubscriptionStatus(),
    enabled: isSignedIn,
    retry: false,
  });

  const handleUpgrade = async (plan: 'starter' | 'professional') => {
    try {
      const { url } = await apiClient.createCheckoutSession(plan);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await apiClient.createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8">Please sign in to view your account.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Error Loading Account</h1>
          <p className="text-muted-foreground mb-8">
            {error instanceof Error ? error.message : 'Failed to load subscription data'}
          </p>
        </div>
      </div>
    );
  }

  const { user, subscription, features, usage } = data;
  const TierIcon = tierIcons[user.subscription_tier];
  const tierColor = tierColors[user.subscription_tier];

  const rebalancePercentage = features.max_rebalances_per_month
    ? (usage.rebalances_this_month / features.max_rebalances_per_month) * 100
    : 0;

  const walletPercentage = features.max_wallets
    ? (usage.wallets_connected / features.max_wallets) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your subscription and account preferences
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - User & Subscription Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${tierColor}`}>
                    <TierIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{clerkUser?.firstName || user.email}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge className={`bg-gradient-to-r ${tierColor} text-white px-4 py-1 text-sm`}>
                    {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}
                  </Badge>
                </div>
              </Card>
            </motion.div>

            {/* Subscription Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Subscription</h3>
                  </div>
                  {subscription && (
                    <Badge
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {subscription.status === 'active' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {subscription.status}
                    </Badge>
                  )}
                </div>

                {subscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plan</p>
                        <p className="font-semibold capitalize">{subscription.plan}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <p className="font-semibold capitalize">{subscription.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Period</p>
                        <p className="text-sm">
                          {new Date(subscription.current_period_start).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Renews</p>
                        <p className="text-sm">
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleManageSubscription}
                      className="w-full"
                      variant="outline"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      You're on the free plan. Upgrade to unlock AI-powered features!
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => handleUpgrade('starter')}>
                        Upgrade to Starter
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleUpgrade('professional')} variant="outline">
                        View Professional
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Usage Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Usage This Month</h3>

                <div className="space-y-6">
                  {/* Rebalances */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Auto-Rebalances</span>
                      <span className="text-sm text-muted-foreground">
                        {usage.rebalances_this_month} / {features.max_rebalances_per_month ?? '∞'}
                      </span>
                    </div>
                    <Progress value={rebalancePercentage} className="h-2" />
                    {!features.auto_rebalancing && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Upgrade to Starter or higher to enable auto-rebalancing
                      </p>
                    )}
                  </div>

                  {/* Wallets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Connected Wallets</span>
                      <span className="text-sm text-muted-foreground">
                        {usage.wallets_connected} / {features.max_wallets ?? '∞'}
                      </span>
                    </div>
                    <Progress value={walletPercentage} className="h-2" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Features */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Features</h3>
                <div className="space-y-3">
                  <FeatureItem
                    enabled={features.ai_recommendations}
                    label="AI Recommendations"
                  />
                  <FeatureItem
                    enabled={features.auto_rebalancing}
                    label="Auto-Rebalancing"
                  />
                  <FeatureItem
                    enabled={features.custom_strategies}
                    label="Custom Strategies"
                  />
                  <FeatureItem
                    enabled={features.priority_support}
                    label="Priority Support"
                  />
                  <FeatureItem
                    enabled={features.api_access}
                    label="API Access"
                  />
                </div>

                {user.subscription_tier === 'free' && (
                  <Button
                    onClick={() => handleUpgrade('starter')}
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Unlock All Features
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </Card>
            </motion.div>

            {/* Account Created */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Member Since</h3>
                </div>
                <p className="text-2xl font-bold">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-400" />
      )}
      <span className={`text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
