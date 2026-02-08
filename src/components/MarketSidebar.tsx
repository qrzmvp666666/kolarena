import React, { useMemo } from 'react';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { useBinanceSymbols } from '@/hooks/useBinanceSymbols';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MarketSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketSidebar = ({ currentSymbol, onSelectSymbol }: MarketSidebarProps) => {
  const { symbols: binanceSymbols, loading } = useBinanceSymbols();

  // Derive Binance-format symbol list for WebSocket subscription
  const wsSymbols = useMemo(() => binanceSymbols.map(s => s.binanceSymbol), [binanceSymbols]);

  const { prices, priceChanges } = useBinanceWebSocket(wsSymbols);

  return (
    <div className="w-[300px] bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="h-[60px] flex items-center px-4 border-b border-border shrink-0">
        <h2 className="text-sm text-foreground font-semibold">Markets</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {loading && binanceSymbols.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading...</div>
          ) : (
            binanceSymbols.map((sym) => {
              const binanceSym = sym.binanceSymbol;
              const data = prices[binanceSym];
              const change = priceChanges[binanceSym];
              const price = data?.price;

              const changeAmount = data?.change24h || 0;
              const prevPrice = (price || 0) - changeAmount;
              const percentChange = prevPrice !== 0 ? (changeAmount / prevPrice) * 100 : 0;
              const isPositive = changeAmount >= 0;

              // Flash Logic
              const flashDirection = change?.direction || 'none';

              // Price Text Color Logic
              let priceColorClass = "text-foreground";
              if (flashDirection === 'up') priceColorClass = "text-[#26a69a]";
              if (flashDirection === 'down') priceColorClass = "text-[#ef5350]";

              // Badge Background/Text Logic
              let badgeClass = isPositive
                ? "bg-[#26a69a]/10 text-[#26a69a]"
                : "bg-[#ef5350]/10 text-[#ef5350]";

              if (flashDirection === 'up') {
                badgeClass = "bg-[#26a69a]/30 text-[#26a69a]";
              } else if (flashDirection === 'down') {
                badgeClass = "bg-[#ef5350]/30 text-[#ef5350]";
              }

              return (
                <button
                  key={binanceSym}
                  onClick={() => onSelectSymbol(binanceSym)}
                  className={cn(
                    "flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors border-l-2",
                    currentSymbol === binanceSym
                      ? "bg-muted border-l-primary"
                      : "border-l-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 shrink-0 bg-transparent">
                      <AvatarImage src={sym.icon_url || ''} alt={sym.base} className="object-contain" />
                      <AvatarFallback>{sym.base.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-foreground">{sym.base}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{sym.quote}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("text-sm font-mono font-medium transition-colors duration-300 tracking-tight", priceColorClass)}>
                      {price ? `\$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </span>
                    <span className={cn("text-xs font-mono font-medium px-1.5 py-0.5 rounded transition-colors duration-300", badgeClass)}>
                      {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
