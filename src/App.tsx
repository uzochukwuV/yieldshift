import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Swap from './pages/Swap';
import Portfolio from './pages/Portfolio';
import Compare from './pages/Compare';
import Pricing from './pages/Pricing';
import Account from './pages/Account';

const queryClient = new QueryClient();

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const App = () => (
  <ClerkProvider publishableKey={clerkPubKey}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
