import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Zap,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { apiClient } from '../services/api';
import { useToast } from '../hooks/use-toast';

interface Recommendation {
  id: string;
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
  status: string;
  created_at: string;
}

export default function Recommendations() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSignedIn) {
      apiClient.setTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  // Fetch recommendations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => apiClient.getRecommendations(),
    enabled: isSignedIn,
    retry: false,
  });

  // Generate recommendations mutation
  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateRecommendations(),
    onSuccess: (data) => {
      toast({
        title: 'Recommendations generated',
        description: `Found ${data.count} optimization opportunities`,
      });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation failed',
        description: error.response?.data?.error || 'Failed to generate recommendations',
        variant: 'destructive',
      });
    },
  });

  // Execute recommendation mutation
  const executeMutation = useMutation({
    mutationFn: ({ id, address }: { id: string; address: string }) =>
      apiClient.executeRecommendation(id, address),
    onSuccess: () => {
      toast({
        title: 'Rebalance initiated',
        description: 'Your funds are being rebalanced. Check orders page for status.',
      });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Execution failed',
        description: error.response?.data?.error || 'Failed to execute rebalance',
        variant: 'destructive',
      });
    },
  });

  const handleExecute = (id: string) => {
    if (!walletAddress) {
      toast({
        title: 'Wallet address required',
        description: 'Please enter your wallet address to execute rebalancing',
        variant: 'destructive',
      });
      return;
    }

    executeMutation.mutate({ id, address: walletAddress });
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRecs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecs(newSelected);
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'bg-green-500';
    if (score <= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    return 'High';
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view AI-powered recommendations.
          </p>
        </div>
      </div>
    );
  }

  const recommendations = data?.recommendations || [];

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-purple-600" />
                AI Recommendations
              </h1>
              <p className="text-muted-foreground">
                AI-powered yield optimization suggestions based on your portfolio
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              {generateMutation.isPending ? 'Generating...' : 'Generate New'}
            </Button>
          </div>

          {/* Info Alert */}
          <Alert className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              Our AI analyzes your current positions and compares them with 1000+ yield opportunities
              to find the best rebalancing strategies. Execute recommendations to automatically
              optimize your portfolio for higher returns.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Wallet Input */}
        {recommendations.length > 0 && (
          <Card className="p-4 mb-6">
            <label className="block text-sm font-medium mb-2">
              Your Wallet Address (for executing swaps)
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background"
            />
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading recommendations...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load recommendations'}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && recommendations.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Recommendations Yet</h2>
            <p className="text-muted-foreground mb-6">
              Generate AI-powered recommendations to optimize your yield
            </p>
            <Button onClick={() => generateMutation.mutate()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Recommendations
            </Button>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec: Recommendation, index: number) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Risk Badge */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(rec.risk_score)}`}></div>
                        <span className="text-xs text-muted-foreground">
                          {getRiskLabel(rec.risk_score)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{rec.asset}</h3>
                          <Badge variant="outline">{rec.to_protocol}</Badge>
                          {!rec.from_protocol && <Badge variant="secondary">New Position</Badge>}
                        </div>

                        {/* APY Change */}
                        <div className="flex items-center gap-4 mb-3">
                          {rec.current_apy !== null ? (
                            <>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Current: </span>
                                <span className="font-medium">{rec.current_apy.toFixed(2)}%</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm">
                                <span className="text-muted-foreground">Target: </span>
                                <span className="font-medium text-green-600">
                                  {rec.target_apy.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium text-green-600">
                                  +{(rec.target_apy - rec.current_apy).toFixed(2)}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm">
                              <span className="text-muted-foreground">APY: </span>
                              <span className="font-medium text-green-600">
                                {rec.target_apy.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Estimated Gains */}
                        <div className="flex items-center gap-6 mb-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>Amount: ${parseFloat(rec.amount).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>Est. Gain: ${rec.net_gain.toFixed(2)}/year</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Reason */}
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>

                        {/* From/To Details */}
                        {rec.from_protocol && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            From: {rec.from_protocol} → To: {rec.to_protocol}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {rec.status === 'pending' ? (
                        <Button
                          onClick={() => handleExecute(rec.id)}
                          disabled={executeMutation.isPending}
                          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <Zap className="h-4 w-4" />
                          {executeMutation.isPending ? 'Executing...' : 'Execute'}
                        </Button>
                      ) : rec.status === 'executed' ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Executed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          {rec.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
