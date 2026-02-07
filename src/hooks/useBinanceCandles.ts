import { useState, useEffect, useRef } from 'react';
import { fetchKlines, Candle, Interval } from '@/lib/binance';
import { useToast } from '@/hooks/use-toast';

const WS_BASE_URL = 'wss://data-stream.binance.vision/ws';

export function useBinanceCandles(symbol: string, interval: Interval) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  // Load initial history
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchKlines(symbol, interval, 1000)
      .then((data) => {
        if (active) {
          setCandles(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err);
          toast({
            title: "Error fetching chart data",
            description: "Could not load historical data from Binance.",
            variant: "destructive",
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [symbol, interval]);

  // Handle Real-time updates
  useEffect(() => {
    // Determine the stream name: <symbol>@kline_<interval>
    // Binance stream names must be lowercase
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const wsUrl = `${WS_BASE_URL}/${streamName}`;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to Binance WS: ${streamName}`);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.e === 'kline') {
        const k = message.k;
        const candleTime = k.t / 1000; // Convert to seconds for lightweight-charts
        
        const newCandle: Candle = {
          time: candleTime,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
        };

        setCandles((prev) => {
            if (prev.length === 0) return [newCandle];
            
            const lastCandle = prev[prev.length - 1];
            
            // Check if it's the same candle (update) or a new one (append)
            // Note: lightweight-charts times are usually numbers (seconds) or strings
            // We ensure we compare the numeric values.
            if (lastCandle.time === newCandle.time) {
                // Update the last candle
                const updated = [...prev];
                updated[updated.length - 1] = newCandle;
                return updated;
            } else if (newCandle.time > lastCandle.time) {
                // Append new candle
                return [...prev, newCandle];
            }
            
            return prev;
        });
      }
    };

    ws.onerror = (err) => {
      console.error('Binance WS Error:', err);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, interval]);

  return { candles, loading };
}
