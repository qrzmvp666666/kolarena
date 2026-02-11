import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BinanceSymbol {
  /** Optional DB id for stable ordering */
  id?: number;
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
  /** Market type: spot or futures */
  marketType: 'spot' | 'futures';
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
        // cast data to include market_type
        const mapped: BinanceSymbol[] = (data as { id?: number; symbol: string; icon_url: string | null; market_type: 'spot' | 'futures' }[]).map((row) => {
          // Handle both BTC/USDT and BTCUSDT formats
          let base = row.symbol;
          let quote = 'USDT';

          if (row.symbol.includes('/')) {
            const parts = row.symbol.split('/');
            base = parts[0];
            quote = parts[1];
          } else {
             // Basic parsing for standard pairs ending in USDT
             // Improvements can be made if other quotes (BTC, ETH, BUSD) are introduced
             if (row.symbol.endsWith('USDT')) {
               base = row.symbol.replace('USDT', '');
               quote = 'USDT';
             }
          }

          return {
            id: row.id,
            symbol: row.symbol,
            icon_url: row.icon_url,
            binanceSymbol: toBinanceFormat(row.symbol),
            base: base,
            quote: quote,
            marketType: row.market_type
          };
        });
        const sorted = [...mapped].sort((a, b) => {
          if (typeof a.id === 'number' && typeof b.id === 'number') {
            return a.id - b.id;
          }
          if (typeof a.id === 'number') return -1;
          if (typeof b.id === 'number') return 1;
          return a.symbol.localeCompare(b.symbol);
        });
        setSymbols(sorted);
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
