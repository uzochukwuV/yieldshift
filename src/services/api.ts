import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API client with authentication
class ApiClient {
  private client: AxiosInstance;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use(
      async (config) => {
        if (this.getToken) {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Set the token getter function (called with Clerk's getToken)
  setTokenGetter(getter: () => Promise<string | null>) {
    this.getToken = getter;
  }

  // Auth endpoints
  async getCurrentUser() {
    const { data } = await this.client.get('/api/auth/me');
    return data;
  }

  // Subscription endpoints
  async createCheckoutSession(plan: 'starter' | 'professional') {
    const { data } = await this.client.post('/api/subscriptions/checkout', { plan });
    return data;
  }

  async createPortalSession() {
    const { data } = await this.client.post('/api/subscriptions/portal');
    return data;
  }

  async getSubscriptionStatus() {
    const { data } = await this.client.get('/api/subscriptions/status');
    return data;
  }

  // Wallet endpoints
  async getWallets() {
    const { data } = await this.client.get('/api/wallets');
    return data;
  }

  async connectWallet(address: string, chain: string) {
    const { data } = await this.client.post('/api/wallets', { address, chain });
    return data;
  }

  // Position endpoints
  async getPositions() {
    const { data } = await this.client.get('/api/positions');
    return data;
  }

  // Recommendation endpoints
  async getRecommendations() {
    const { data } = await this.client.get('/api/recommendations');
    return data;
  }

  async generateRecommendations() {
    const { data } = await this.client.post('/api/recommendations/generate');
    return data;
  }

  async executeRecommendation(id: string, walletAddress: string) {
    const { data } = await this.client.post(`/api/recommendations/${id}/execute`, {
      wallet_address: walletAddress,
    });
    return data;
  }

  async simulateRecommendation(id: string) {
    const { data } = await this.client.post(`/api/recommendations/${id}/simulate`);
    return data;
  }

  async batchExecuteRecommendations(ids: string[], walletAddress: string) {
    const { data } = await this.client.post('/api/recommendations/batch-execute', {
      recommendation_ids: ids,
      wallet_address: walletAddress,
    });
    return data;
  }

  // Wallet endpoints (enhanced)
  async connectWallet(address: string, chain: string, nickname?: string) {
    const { data } = await this.client.post('/api/wallets', { address, chain, nickname });
    return data;
  }

  async scanWallet(walletId: string) {
    const { data } = await this.client.post(`/api/wallets/${walletId}/scan`);
    return data;
  }

  async getWalletPositions(walletId: string) {
    const { data } = await this.client.get(`/api/wallets/${walletId}/positions`);
    return data;
  }
}

export const apiClient = new ApiClient();
