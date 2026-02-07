// src/lib/binance.ts

export const INTERVALS = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
} as const;

export type Interval = keyof typeof INTERVALS;

export interface Candle {
  time: number; // Unix timestamp in seconds for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Binance API response format for Kline
// [Open Time, Open, High, Low, Close, Volume, Close Time, Quote Asset Volume, Number of Trades, Taker Buy Base Asset Volume, Taker Buy Quote Asset Volume, Ignore]
type BinanceKline = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote Asset Volume
  number, // Number of Trades
  string, // Taker Buy Base Asset Volume
  string, // Taker Buy Quote Asset Volume
  string  // Ignore
];

/**
 * Fetch historical klines from Binance API (via local proxy)
 * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
 * @param interval Chart interval (e.g., '1m', '1h')
 * @param limit Number of candles to fetch (default 1000)
 */
export async function fetchKlines(
  symbol: string,
  interval: Interval = '15m',
  limit: number = 1000
): Promise<Candle[]> {
  try {
    // Determine the base URL
    // In development, we use the proxy '/api'.
    // In production, you might need a real backend or a different proxy strategy 
    // because calling binance.com directly from browser usually hits CORS.
    // Assuming Vite proxy is active for '/api'.
    const url = `/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data: BinanceKline[] = await response.json();

    return data.map((k) => ({
      time: k[0] / 1000, // lightweight-charts expects seconds (UTCTimestamp) or business day string
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error('Failed to fetch klines:', error);
    return [];
  }
}
