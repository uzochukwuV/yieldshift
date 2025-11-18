import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, BarChart3, ListOrdered, Sparkles, Wallet, Scale, User, LogOut, Settings, Zap } from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Navbar() {
  const location = useLocation();
  const { isSignedIn } = useAuth();

  return (
    <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              YieldShift
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button
                variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>

            <Link to="/portfolio">
              <Button
                variant={location.pathname === '/portfolio' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Portfolio</span>
              </Button>
            </Link>

            <Link to="/recommendations">
              <Button
                variant={location.pathname === '/recommendations' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
              </Button>
            </Link>

            <Link to="/compare">
              <Button
                variant={location.pathname === '/compare' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
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
                size="sm"
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Swap</span>
              </Button>
            </Link>

            {/* User Menu */}
            <div className="ml-2 border-l border-border pl-2">
              {isSignedIn ? (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8',
                    },
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="Account Settings"
                      labelIcon={<Settings className="w-4 h-4" />}
                      href="/account"
                    />
                  </UserButton.MenuItems>
                </UserButton>
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
