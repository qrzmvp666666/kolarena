import React from 'react';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// We need to define SYMBOLS somewhere shared, or just duplicate for now if the hook hasn't exported it yet.
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT'];

const cryptoIcons: Record<string, string> = {
  'BTCUSDT': '/crypto/btc.svg',
  'ETHUSDT': '/crypto/eth.svg',
  'SOLUSDT': '/crypto/sol.svg',
  'BNBUSDT': '/crypto/bnb.svg',
  'DOGEUSDT': '/crypto/doge.svg',
  'XRPUSDT': '/crypto/xrp.svg'
};

interface MarketSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketSidebar = ({ currentSymbol, onSelectSymbol }: MarketSidebarProps) => {
  const { prices, priceChanges } = useBinanceWebSocket();

  return (
    <div className="w-[300px] bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm text-foreground font-semibold mb-2">Markets</h2>
        <div className="flex text-xs text-muted-foreground justify-between px-2">
            <span className="pl-8">Pair</span>
            <span>Price / 24h</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {SYMBOLS.map((symbol) => {
            const data = prices[symbol];
            const change = priceChanges[symbol];
            const price = data?.price;
            
            const changeAmount = data?.change24h || 0;
            const prevPrice = (price || 0) - changeAmount;
            const percentChange = prevPrice !== 0 ? (changeAmount / prevPrice) * 100 : 0;
            const isPositive = changeAmount >= 0;
            const directionColor = isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]';
            const iconUrl = cryptoIcons[symbol];

            return (
              <button
                key={symbol}
                onClick={() => onSelectSymbol(symbol)}
                className={cn(
                  "flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors border-l-2",
                  currentSymbol === symbol 
                    ? "bg-muted border-l-primary" 
                    : "border-l-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 p-1 bg-background/50 rounded-full shrink-0">
                    <AvatarImage src={iconUrl} alt={symbol} className="object-contain" />
                    <AvatarFallback>{symbol.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-foreground">{symbol.replace('USDT', '')}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">USDT</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-0.5">
                  <span className={cn("text-sm font-mono font-medium text-foreground tracking-tight")}>
                    {price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </span>
                  <span className={cn("text-xs font-mono font-medium px-1.5 py-0.5 rounded", 
                    isPositive ? "bg-[#26a69a]/10 text-[#26a69a]" : "bg-[#ef5350]/10 text-[#ef5350]"
                  )}>
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
