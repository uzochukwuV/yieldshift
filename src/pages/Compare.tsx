import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, ArrowUpRight } from 'lucide-react';
import { getCoins } from '../services/sideshift';
import { getSupportedYieldTokens, formatApy, formatTvl, type YieldToken } from '../services/defillama';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Navbar } from '../components/Navbar';

const getRiskLevel = (token: YieldToken): { level: string; color: string } => {
  // Simple risk scoring based on IL risk and TVL
  const hasILRisk = token.ilRisk === 'yes';
  const lowTVL = token.tvlUsd < 100_000_000;

  if (hasILRisk && lowTVL) {
    return { level: 'High', color: 'bg-red-500' };
  } else if (hasILRisk || lowTVL) {
    return { level: 'Medium', color: 'bg-yellow-500' };
  } else {
    return { level: 'Low', color: 'bg-green-500' };
  }
};

export default function Compare() {
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());

  const { data: coins, isLoading: coinsLoading } = useQuery({
    queryKey: ['sideshift-coins'],
    queryFn: getCoins,
    staleTime: 5 * 60 * 1000,
  });

  const { data: yieldTokens, isLoading: yieldsLoading } = useQuery({
    queryKey: ['yield-tokens', coins],
    queryFn: async () => {
      if (!coins) return [];
      const supportedIds = coins.map((c) => c.coin);
      return getSupportedYieldTokens(supportedIds);
    },
    enabled: !!coins,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = coinsLoading || yieldsLoading;

  const handleToggleToken = (tokenId: string) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId);
    } else {
      if (newSelected.size < 4) {
        newSelected.add(tokenId);
      }
    }
    setSelectedTokens(newSelected);
  };

  const comparedTokens = yieldTokens?.filter((t) => selectedTokens.has(t.ssId!)) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <header className="border-b border-border bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-foreground">Compare Yields</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Select up to 4 opportunities to compare side-by-side
            </p>
          </motion.div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Comparison Cards */}
        {comparedTokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {comparedTokens.map((token) => {
                const risk = getRiskLevel(token);
                return (
                  <Card key={token.ssId} className="relative overflow-hidden p-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 w-6 p-0"
                      onClick={() => handleToggleToken(token.ssId!)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 font-bold text-lg">
                      {token.symbol.substring(0, 2)}
                    </div>

                    <h3 className="mb-1 text-xl font-bold">{token.symbol}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">{token.project}</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">APY</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {formatApy(token.totalApy)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">TVL</span>
                        <span className="font-semibold">{formatTvl(token.tvlUsd)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Chain</span>
                        <Badge variant="secondary">{token.chain}</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk</span>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${risk.color}`} />
                          <span className="text-sm font-medium">{risk.level}</span>
                        </div>
                      </div>

                      {token.apyReward > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Base APY</span>
                            <span className="text-sm">{formatApy(token.apyBase)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Reward APY</span>
                            <span className="text-sm">{formatApy(token.apyReward)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <Button className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Swap & Earn
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                );
              })}
            </div>

            {/* Comparison Table */}
            <Card className="mt-6 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {comparedTokens.map((token) => (
                      <TableHead key={token.ssId} className="text-center">
                        {token.symbol}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total APY</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        <span className="font-bold text-green-600">
                          {formatApy(token.totalApy)}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">TVL</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        {formatTvl(token.tvlUsd)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Risk Level</TableCell>
                    {comparedTokens.map((token) => {
                      const risk = getRiskLevel(token);
                      return (
                        <TableCell key={token.ssId} className="text-center">
                          <Badge variant={risk.level === 'Low' ? 'default' : risk.level === 'High' ? 'destructive' : 'secondary'}>
                            {risk.level}
                          </Badge>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Chain</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        <Badge variant="outline">{token.chain}</Badge>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Protocol</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        {token.project}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Stablecoin</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        {token.stablecoin ? '✅' : '❌'}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">IL Risk</TableCell>
                    {comparedTokens.map((token) => (
                      <TableCell key={token.ssId} className="text-center">
                        {token.ilRisk === 'yes' ? '⚠️ Yes' : '✅ No'}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}

        {/* All Opportunities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold">
                {comparedTokens.length > 0
                  ? `Select ${4 - comparedTokens.length} more to compare (max 4)`
                  : 'Select opportunities to compare'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Click checkboxes to add/remove from comparison
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead className="text-right">APY</TableHead>
                    <TableHead className="text-right">TVL</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldTokens?.map((token) => {
                    const risk = getRiskLevel(token);
                    const isSelected = selectedTokens.has(token.ssId!);
                    const isDisabled = !isSelected && selectedTokens.size >= 4;

                    return (
                      <TableRow
                        key={token.pool}
                        className={`${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''} hover:bg-muted/50`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={() => handleToggleToken(token.ssId!)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 font-semibold">
                              {token.symbol.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold">{token.symbol}</p>
                              <p className="text-xs text-muted-foreground">{token.ssId?.toUpperCase()}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{token.chain}</Badge>
                        </TableCell>
                        <TableCell>{token.project}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-green-600">
                            {formatApy(token.totalApy)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatTvl(token.tvlUsd)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className={`h-2 w-2 rounded-full ${risk.color}`} />
                            <span className="text-sm">{risk.level}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
