import React, { useState } from 'react';
import TopNav from '@/components/TopNav';
import { TradingChart } from '@/components/TradingChart';
import { useBinanceCandles } from '@/hooks/useBinanceCandles';
import { INTERVALS, Interval } from '@/lib/binance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketSidebar } from '@/components/MarketSidebar';
import Sidebar from '@/components/Sidebar';
import TickerBar from '@/components/TickerBar';

const ChartPage = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('15m');
  
  const { candles, loading } = useBinanceCandles(symbol, interval);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TopNav />
      <TickerBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <MarketSidebar 
            currentSymbol={symbol} 
            onSelectSymbol={setSymbol} 
        />

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-4">
                     <h1 className="text-xl font-bold text-foreground tracking-wide">
                        {symbol.replace('USDT', '')}/USDT
                        <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Perp</span>
                     </h1>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Timeframe</span>
                    <div className="flex bg-muted rounded p-1">
                        {Object.keys(INTERVALS).map((i) => (
                            <button
                                key={i}
                                onClick={() => setInterval(i as Interval)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                                    interval === i 
                                    ? 'bg-background text-foreground shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                            >
                                {i}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative bg-card min-h-0">
                 <Card className="w-full h-full border-none rounded-none bg-transparent shadow-none">
                    <CardContent className="p-0 h-full">
                        <TradingChart 
                        data={candles} 
                        isLoading={loading}
                        // Ensure chart takes full height
                        // We might need to adjust TradingChart CSS to be h-full
                        colors={{
                            backgroundColor: 'transparent',
                            textColor: '#d1d4dc',
                            upColor: '#26a69a',
                            downColor: '#ef5350',
                            wickUpColor: '#26a69a',
                            wickDownColor: '#ef5350',
                        }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[350px] border-l border-border bg-card hidden md:block">
            <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default ChartPage;
