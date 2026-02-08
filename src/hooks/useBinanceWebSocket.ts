import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface PriceChange {
  direction: 'up' | 'down' | 'none';
  timestamp: number;
}

interface UseBinanceWebSocketReturn {
  prices: Record<string, TickerData>;
  priceChanges: Record<string, PriceChange>;
  isConnected: boolean;
  isFallback: boolean;
}

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT'];
const WS_URL = 'wss://stream.binance.com:9443/stream';
const HTTP_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const THROTTLE_DELAY = 1000; // 1秒节流
const PING_INTERVAL = 20000; // 20秒心跳

export const useBinanceWebSocket = (externalSymbols?: string[]): UseBinanceWebSocketReturn => {
  const SYMBOLS = externalSymbols && externalSymbols.length > 0 ? externalSymbols : DEFAULT_SYMBOLS;
  // Stable key to detect symbol list changes
  const symbolsKey = SYMBOLS.join(',');

  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<string, TickerData>>({});
  const [priceChanges, setPriceChanges] = useState<Record<string, PriceChange>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackIntervalRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const throttleTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingUpdatesRef = useRef<Record<string, TickerData>>({});
  const symbolsRef = useRef(SYMBOLS);
  symbolsRef.current = SYMBOLS;
  const lastUpdateRef = useRef<number>(0);

  // 节流更新价格
  const throttledUpdatePrice = useCallback((symbol: string, newData: TickerData) => {
    // 保存待更新的数据
    pendingUpdatesRef.current[symbol] = newData;

    // 如果已有定时器，直接返回
    if (throttleTimersRef.current[symbol]) {
      return;
    }

    // 设置节流定时器
    throttleTimersRef.current[symbol] = setTimeout(() => {
      const data = pendingUpdatesRef.current[symbol];
      if (data) {
        setPrices(prev => {
          const oldPrice = prev[symbol]?.price;
          const newPrice = data.price;

          // 检测价格变化方向
          if (oldPrice && newPrice !== oldPrice) {
            setPriceChanges(prevChanges => ({
              ...prevChanges,
              [symbol]: {
                direction: newPrice > oldPrice ? 'up' : 'down',
                timestamp: Date.now(),
              },
            }));

            // 300ms后清除变化状态
            setTimeout(() => {
              setPriceChanges(prevChanges => ({
                ...prevChanges,
                [symbol]: { direction: 'none', timestamp: Date.now() },
              }));
            }, 300);
          }

          lastUpdateRef.current = Date.now();
          return { ...prev, [symbol]: data };
        });

        delete pendingUpdatesRef.current[symbol];
      }
      delete throttleTimersRef.current[symbol];
    }, THROTTLE_DELAY);
  }, []);

  // 停止HTTP轮询
  const stopHttpFallback = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = undefined;
    }
    setIsFallback(false);
  }, []);

  // WebSocket连接
  const connectWebSocket = useCallback(() => {
    try {
      // 构建组合流URL
      const currentSymbols = symbolsRef.current;
      const streams = currentSymbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/');
      const wsUrl = `${WS_URL}?streams=${streams}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Binance WebSocket connected');
        setIsConnected(true);
        stopHttpFallback();
        reconnectAttemptsRef.current = 0;

        // 启动心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ method: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // 处理pong响应
          if (message.result === null) return;

          const { stream, data } = message;
          if (!stream || !data) return;

          const symbol = stream.split('@')[0].toUpperCase();
          
          // 解析miniTicker数据
          const tickerData: TickerData = {
            symbol,
            price: parseFloat(data.c), // 最新价格
            change24h: parseFloat(data.c) - parseFloat(data.o), // 24h变化
            high24h: parseFloat(data.h), // 24h最高
            low24h: parseFloat(data.l), // 24h最低
            volume24h: parseFloat(data.v), // 24h成交量
          };

          throttledUpdatePrice(symbol, tickerData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);

        // 清除心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // 尝试重连
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else {
          console.log('⚠️ Max reconnect attempts reached, switching to HTTP fallback');
          startHttpFallback();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      startHttpFallback();
    }
  }, [throttledUpdatePrice, stopHttpFallback, toast]);

  // HTTP备用方案
  const startHttpFallback = useCallback(() => {
    if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    
    setIsFallback(true);

    const fetchPrices = async () => {
      try {
        const symbolsParam = symbolsRef.current.map(s => `"${s}"`).join(',');
        const response = await fetch(`${HTTP_API_URL}?symbols=[${symbolsParam}]`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        data.forEach((ticker: any) => {
          const tickerData: TickerData = {
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChange),
            high24h: parseFloat(ticker.highPrice),
            low24h: parseFloat(ticker.lowPrice),
            volume24h: parseFloat(ticker.volume),
          };

          throttledUpdatePrice(ticker.symbol, tickerData);
        });
      } catch (error) {
        console.error('HTTP fallback error:', error);
      }
    };

    // 立即获取一次
    fetchPrices();

    // 每2秒轮询
    fallbackIntervalRef.current = setInterval(fetchPrices, 2000);
  }, [throttledUpdatePrice]);

  // 如果长时间没有更新，自动切换到 HTTP 轮询
  useEffect(() => {
    const staleCheck = setInterval(() => {
      const last = lastUpdateRef.current;
      if (last === 0) return;
      const staleMs = Date.now() - last;
      if (staleMs > 12000 && !isFallback) {
        startHttpFallback();
      }
    }, 4000);

    return () => clearInterval(staleCheck);
  }, [isFallback, startHttpFallback]);

  // 初始化连接 — symbolsKey 变化时重新连接
  useEffect(() => {
    connectWebSocket();

    // 清理函数
    return () => {
      if (wsRef.current) {
        // Prevent onclose logic from running during cleanup
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      // 清除所有节流定时器
      Object.values(throttleTimersRef.current).forEach(timer => clearTimeout(timer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return {
    prices,
    priceChanges,
    isConnected,
    isFallback,
  };
};
