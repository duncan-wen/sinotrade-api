import { Quote, SimulatedOrder } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const getQuote = async (symbol: string): Promise<Quote> => {
  const response = await fetch(`${API_BASE_URL}/api/quote/${symbol}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const getKlines = async (
  symbol: string,
  interval: string,
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<any> => { // The openapi spec says the response is `object`, so we use `any` for now.
  const params = new URLSearchParams({ interval });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/klines/${symbol}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const placeOrder = async (order: Omit<SimulatedOrder, 'id' | 'user_id' | 'status' | 'created_at'>): Promise<SimulatedOrder> => {
  const response = await fetch(`${API_BASE_URL}/api/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
