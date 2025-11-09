import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, BarChart3, ListOrdered } from 'lucide-react';
import { Button } from './ui/button';

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">YieldShift</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            
            <Link to="/orders">
              <Button
                variant={location.pathname === '/orders' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <ListOrdered className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
              </Button>
            </Link>

            <Link to="/swap">
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Swap</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
