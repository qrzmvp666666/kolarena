import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BinanceSymbol {
  /** DB format, e.g. "BTC/USDT" */
  symbol: string;
  /** Icon URL, e.g. "/crypto/btc.svg" */
  icon_url: string | null;
  /** Binance API format, e.g. "BTCUSDT" */
  binanceSymbol: string;
  /** Display base, e.g. "BTC" */
  base: string;
  /** Display quote, e.g. "USDT" */
  quote: string;
}

/**
 * Convert DB symbol (BTC/USDT) to Binance API format (BTCUSDT)
 */
const toBinanceFormat = (symbol: string): string => symbol.replace('/', '');

/**
 * Shared hook: fetch Binance exchange symbols from Supabase RPC
 * + realtime subscription for live updates on exchanges / symbols / exchange_symbols
 */
export const useBinanceSymbols = () => {
  const [symbols, setSymbols] = useState<BinanceSymbol[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSymbols = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_binance_symbols');
      if (error) throw error;
      if (data) {
        const mapped: BinanceSymbol[] = (data as { symbol: string; icon_url: string | null }[]).map((row) => {
          const parts = row.symbol.split('/');
          return {
            symbol: row.symbol,
            icon_url: row.icon_url,
            binanceSymbol: toBinanceFormat(row.symbol),
            base: parts[0] || row.symbol,
            quote: parts[1] || 'USDT',
          };
        });
        setSymbols(mapped);
      }
    } catch (err) {
      console.error('useBinanceSymbols: Error fetching symbols:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSymbols();

    // Realtime: subscribe to all three related tables
    const channel = supabase
      .channel('binance-symbols-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exchanges' }, () => fetchSymbols())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'symbols' }, () => fetchSymbols())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_symbols' }, () => fetchSymbols())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSymbols]);

  return { symbols, loading };
};
