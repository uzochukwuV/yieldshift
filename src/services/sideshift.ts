import axios from 'axios';

const SIDESHIFT_BASE_URL = 'https://sideshift.ai/api/v2';
const AFFILIATE_ID = import.meta.env.VITE_SIDESHIFT_AFFILIATE_ID || '';
const API_KEY = import.meta.env.VITE_SIDESHIFT_API_KEY || '';

export interface SideShiftCoin {
  coin: string;
  name: string;
  networks: string[];
  hasMemo: boolean;
  deprecated?: boolean;
  fixedOnly: string[] | boolean;
  variableOnly: string[] | boolean;
  depositOffline: string[] | boolean;
  settleOffline: string[] | boolean;
  networksWithMemo?: string[];
  tokenDetails?: {
    network: {
      contractAddress: string;
      decimals: number;
    };
  };
}

export interface SideShiftPair {
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  min: string;
  max: string;
  rate: string;
  hasMemo: boolean;
}

export interface SideShiftQuote {
  id?: string;
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  affiliateId: string;
  expiresAt?: string;
  error?: { code: string; message: string };
}

export interface SideShiftOrder {
  id: string;
  depositAddress: {
    address: string;
    memo?: string;
  };
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  settleAddress: string;
  depositAmount: string;
  settleAmount: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  error?: { code: string; message: string };
}

export interface SideShiftOrderStatus {
  id: string;
  status: string;
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAddress: {
    address: string;
    memo: string | null;
  };
  settleAddress: {
    address: string;
    memo: string | null;
  };
  depositAmount: string | null;
  settleAmount: string | null;
  depositHash: string | null;
  settleHash: string | null;
  createdAt: string;
  updatedAt: string;
  error?: { code: string; message: string };
}

// Get all supported coins
export async function getCoins(): Promise<SideShiftCoin[]> {
  try {
    const response = await axios.get<SideShiftCoin[]>(`${SIDESHIFT_BASE_URL}/coins`, {
      headers: {
        'x-sideshift-secret': API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch coins');
    }
    throw new Error('Failed to fetch coins');
  }
}

// Get trading pair information
export async function getPair(
  fromCoin: string,
  toCoin: string,
  amount?: string
): Promise<SideShiftPair> {
  try {
    const params = new URLSearchParams();
    if (AFFILIATE_ID) params.append('affiliateId', AFFILIATE_ID);
    if (amount) params.append('amount', amount);

    const response = await axios.get<SideShiftPair>(
      `${SIDESHIFT_BASE_URL}/pair/${fromCoin}/${toCoin}?${params.toString()}`,
      {
        headers: {
          'x-sideshift-secret': API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch pair');
    }
    throw new Error('Failed to fetch pair');
  }
}

// Create a quote for fixed rate
export async function createQuote(params: {
  depositCoin: string;
  depositNetwork: string;
  settleCoin: string;
  settleNetwork: string;
  depositAmount: string;
  affiliateId?: string;
}): Promise<SideShiftQuote> {
  const { depositCoin, depositNetwork, settleCoin, settleNetwork, depositAmount, affiliateId } = params;
  try {
    const response = await axios.post<SideShiftQuote>(
      `${SIDESHIFT_BASE_URL}/quotes`,
      {
        depositCoin,
        depositNetwork,
        settleCoin,
        settleNetwork,
        depositAmount,
        affiliateId: affiliateId || AFFILIATE_ID,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-sideshift-secret': API_KEY,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to create quote');
    }
    throw new Error('Failed to create quote');
  }
}

// Create a fixed shift order
export async function createOrder(params: {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
  affiliateId?: string;
}): Promise<SideShiftOrder> {
  const { quoteId, settleAddress, refundAddress, affiliateId } = params;
  try {
    const response = await axios.post<SideShiftOrder>(
      `${SIDESHIFT_BASE_URL}/shifts/fixed`,
      {
        quoteId,
        settleAddress,
        refundAddress,
        affiliateId: affiliateId || AFFILIATE_ID,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-sideshift-secret': API_KEY,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to create shift');
    }
    throw new Error('Failed to create shift');
  }
}

// Create a variable shift order
export async function createVariableShift(
  depositCoin: string,
  depositNetwork: string,
  settleCoin: string,
  settleNetwork: string,
  settleAddress: string,
  refundAddress?: string
): Promise<SideShiftOrder> {
  try {
    const response = await axios.post<SideShiftOrder>(
      `${SIDESHIFT_BASE_URL}/shifts/variable`,
      {
        depositCoin,
        depositNetwork,
        settleCoin,
        settleNetwork,
        settleAddress,
        refundAddress,
        affiliateId: AFFILIATE_ID,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-sideshift-secret': API_KEY,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to create shift');
    }
    throw new Error('Failed to create shift');
  }
}

// Get order status
export async function getOrderStatus(orderId: string): Promise<SideShiftOrderStatus> {
  try {
    const response = await axios.get<SideShiftOrderStatus>(
      `${SIDESHIFT_BASE_URL}/shifts/${orderId}`,
      {
        headers: {
          'Accept': 'application/json',
          'x-sideshift-secret': API_KEY,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get order status');
    }
    throw new Error('Failed to get order status');
  }
}

// Get multiple orders status
export async function getBulkShifts(orderIds: string[]): Promise<SideShiftOrderStatus[]> {
  try {
    const response = await axios.get<SideShiftOrderStatus[]>(
      `${SIDESHIFT_BASE_URL}/shifts?ids=${orderIds.join(',')}`,
      {
        headers: {
          'Accept': 'application/json',
          'x-sideshift-secret': API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error?.message || 'Failed to get bulk shifts');
    }
    throw new Error('Failed to get bulk shifts');
  }
}
