import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { getBulkShifts, type SideShiftOrderStatus } from '../services/sideshift';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Navbar } from '../components/Navbar';

const STORAGE_KEY = 'yieldshift_portfolio_orders';

const getStoredOrderIds = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveOrderIds = (ids: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'settled':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'refunded':
    case 'expired':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'pending':
    case 'processing':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'settled':
      return 'default';
    case 'refunded':
    case 'expired':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function Portfolio() {
  const [orderIds, setOrderIds] = useState<string[]>(getStoredOrderIds());
  const [newOrderId, setNewOrderId] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    data: orders,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['bulk-shifts', orderIds],
    queryFn: () => getBulkShifts(orderIds),
    enabled: orderIds.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Stop refetching if all orders are in final state
      const allFinal = data.every((order) => {
        const status = order.status.toLowerCase();
        return status === 'settled' || status === 'refunded' || status === 'expired';
      });
      return allFinal ? false : 10000; // 10 seconds
    },
  });

  useEffect(() => {
    saveOrderIds(orderIds);
  }, [orderIds]);

  const handleAddOrder = () => {
    const trimmedId = newOrderId.trim();
    if (trimmedId && !orderIds.includes(trimmedId)) {
      setOrderIds([...orderIds, trimmedId]);
      setNewOrderId('');
      setIsAddDialogOpen(false);
    }
  };

  const handleRemoveOrder = (orderId: string) => {
    setOrderIds(orderIds.filter((id) => id !== orderId));
  };

  const stats = {
    total: orders?.length || 0,
    settled: orders?.filter((o) => o.status.toLowerCase() === 'settled').length || 0,
    pending: orders?.filter((o) => {
      const status = o.status.toLowerCase();
      return status === 'pending' || status === 'processing';
    }).length || 0,
    failed: orders?.filter((o) => {
      const status = o.status.toLowerCase();
      return status === 'refunded' || status === 'expired';
    }).length || 0,
  };

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
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-foreground">Portfolio Tracker</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Track all your swap orders in one place
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching || orderIds.length === 0}
              >
                {isRefetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4" />
                <span className="ml-2">Add Order</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats Cards */}
        {orderIds.length > 0 && (
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="mt-2 text-3xl font-bold">{stats.total}</p>
                  </div>
                  <div className="rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="mt-2 text-3xl font-bold text-green-600">{stats.settled}</p>
                  </div>
                  <div className="rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                    <p className="mt-2 text-3xl font-bold text-blue-600">{stats.pending}</p>
                  </div>
                  <div className="rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failed</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                  <div className="rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 p-3">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold">Your Swap Orders</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {orderIds.length === 0
                  ? 'Add order IDs to start tracking your swaps'
                  : 'Auto-refreshes every 10 seconds for pending orders'}
              </p>
            </div>

            {orderIds.length === 0 ? (
              <div className="px-6 pb-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No Orders Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add order IDs from your swaps to track them here
                </p>
                <Button
                  className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Order
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <Badge variant={getStatusVariant(order.status)} className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {order.id.substring(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.depositAmount || '—'} {order.depositCoin.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {order.depositNetwork}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.settleAmount || '—'} {order.settleCoin.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {order.settleNetwork}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {order.depositAmount || '—'} {order.depositCoin.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(`https://sideshift.ai/orders/${order.id}`, '_blank')
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Info Alert */}
        {orderIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6"
          >
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Orders are stored locally in your browser. Clearing your browser data will remove
                this list. Order IDs are automatically refreshed every 10 seconds for pending orders.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </div>

      {/* Add Order Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Order to Portfolio</DialogTitle>
            <DialogDescription>
              Enter the order ID from your swap to track it in your portfolio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="orderId" className="text-sm font-medium">
                Order ID
              </label>
              <Input
                id="orderId"
                placeholder="e.g., f173118220f1461841da"
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOrder()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddOrder}
                disabled={!newOrderId.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Add Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
