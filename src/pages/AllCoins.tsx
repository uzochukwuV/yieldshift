import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpDown, Loader2 } from 'lucide-react';
import { getCoins, type SideShiftCoin } from '../services/sideshift';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

export function AllCoinsTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'networks'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: coins, isLoading } = useQuery({
    queryKey: ['sideshift-coins'],
    queryFn: getCoins,
    staleTime: 5 * 60 * 1000,
  });

  const filteredAndSortedCoins = coins
    ?.filter((coin) => !coin.deprecated)
    .filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.coin.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? a.networks.length - b.networks.length
          : b.networks.length - a.networks.length;
      }
    });

  const handleSort = (column: 'name' | 'networks') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search coins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="gap-1 hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Coin
                  <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('networks')}
                  className="gap-1 hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Networks
                  <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCoins?.map((coin, index) => (
              <TableRow key={coin.coin} className="hover:bg-muted/30">
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{coin.name}</TableCell>
                <TableCell>
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                    {coin.coin.toUpperCase()}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {coin.networks.slice(0, 3).map((network) => (
                      <Badge key={network} variant="secondary" className="text-xs">
                        {network}
                      </Badge>
                    ))}
                    {coin.networks.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{coin.networks.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {coin.depositOffline !== false && (
                      <Badge variant="destructive" className="text-xs">
                        Deposit Offline
                      </Badge>
                    )}
                    {coin.settleOffline !== false && (
                      <Badge variant="destructive" className="text-xs">
                        Settle Offline
                      </Badge>
                    )}
                    {coin.depositOffline === false && coin.settleOffline === false && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredAndSortedCoins?.length || 0} of {coins?.filter((c) => !c.deprecated).length || 0} coins
      </p>
    </div>
  );
}
