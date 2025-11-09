import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink, Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getOrderStatus, type SideShiftOrderStatus } from '../services/sideshift';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Navbar } from '../components/Navbar';

export default function Orders() {
  const [orderId, setOrderId] = useState('');
  const [searchedOrderId, setSearchedOrderId] = useState('');

  const handleSearch = () => {
    if (orderId.trim()) {
      setSearchedOrderId(orderId.trim());
    }
  };

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-status', searchedOrderId],
    queryFn: () => getOrderStatus(searchedOrderId),
    enabled: !!searchedOrderId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const status = data.status.toLowerCase();
      if (status === 'settled' || status === 'refunded' || status === 'expired') {
        return false;
      }
      return 10000;
    },
  });

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'settled':
        return <CheckCircle2 className="h-5 w-5 text-accent" />;
      case 'refunded':
      case 'expired':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-primary" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">Track Your Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your swap orders in real-time
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Search */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="orderId" className="text-sm font-medium text-foreground">
                Order ID
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="orderId"
                  placeholder="Enter your order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!orderId.trim() || isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Search</span>
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Failed to fetch order'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

        {/* Order Details */}
        {order && (
          <div className="mt-6 space-y-6">
            {/* Status Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Order Status</h2>
                    <p className="text-sm text-muted-foreground">ID: {order.id}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(order.status)} className="text-sm">
                  {order.status.toUpperCase()}
                </Badge>
              </div>
            </Card>

            {/* Swap Details */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Swap Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {order.depositAmount || '—'} {order.depositCoin.toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.depositNetwork}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="mt-1 text-lg font-semibold text-accent">
                      {order.settleAmount || '—'} {order.settleCoin.toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.settleNetwork}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Deposit Address</span>
                    <span className="font-mono text-sm text-foreground">
                      {order.depositAddress.address.substring(0, 10)}...
                      {order.depositAddress.address.substring(order.depositAddress.address.length - 10)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Receive Address</span>
                    <span className="font-mono text-sm text-foreground">
                      {order.settleAddress.address.substring(0, 10)}...
                      {order.settleAddress.address.substring(order.settleAddress.address.length - 10)}
                    </span>
                  </div>

                  {order.depositHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deposit Transaction</span>
                      <span className="font-mono text-sm text-foreground">
                        {order.depositHash.substring(0, 10)}...
                        {order.depositHash.substring(order.depositHash.length - 10)}
                      </span>
                    </div>
                  )}

                  {order.settleHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Settlement Transaction</span>
                      <span className="font-mono text-sm text-foreground">
                        {order.settleHash.substring(0, 10)}...
                        {order.settleHash.substring(order.settleHash.length - 10)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Order Created</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {order.depositHash && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Deposit Received</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {order.settleHash && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Swap Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => refetch()}
              >
                Refresh Status
              </Button>
              <Button
                className="flex-1"
                onClick={() => window.open(`https://sideshift.ai/orders/${order.id}`, '_blank')}
              >
                View on SideShift
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
