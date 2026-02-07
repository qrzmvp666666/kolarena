import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { TradingChart, ChartSignal } from '@/components/TradingChart';
import Danmaku from '@/components/Danmaku';
import { useBinanceCandles } from '@/hooks/useBinanceCandles';
import { INTERVALS, Interval } from '@/lib/binance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketSidebar } from '@/components/MarketSidebar';
import Sidebar from '@/components/Sidebar';
import TickerBar from '@/components/TickerBar';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { addDays, subDays, subMonths, subQuarters, subYears, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Filter, Users } from 'lucide-react';

interface SignalRow {
  id: string;
  entry_price: number;
  entry_time: string;
  direction: 'long' | 'short';
  symbol: string;
  status: string;
  kol_avatar_url: string;
  kol_name: string;
  kol_id?: string;
}

// Helper to get seconds for interval
const getIntervalSeconds = (interval: Interval): number => {
  const unit = interval.slice(-1);
  const value = parseInt(interval.slice(0, -1));
  switch(unit) {
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900; // 15m default
  }
};

const ChartPage = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('15m');
  const [chartSignals, setChartSignals] = useState<ChartSignal[]>([]);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  
  // Filters State
  const [selectedKols, setSelectedKols] = useState<Set<string>>(new Set());
  const [availableKols, setAvailableKols] = useState<{name: string, id: string, avatar: string}[]>([]); 
  const hasInitializedSelection = React.useRef(false);

  const { candles, loading } = useBinanceCandles(symbol, interval);
  const [rawSignals, setRawSignals] = useState<SignalRow[]>([]);

  // 1. Fetch Data
  useEffect(() => {
    const fetchSignals = async () => {
        try {
            console.log('Fetching signals for:', symbol);
            // Fetch more to support longer timeframes
            const [activeRes, closedRes] = await Promise.all([
              supabase.rpc('get_signals', { p_status: 'active', p_limit: 500 }),
              supabase.rpc('get_signals', { p_status: 'closed', p_limit: 500 })
            ]);

            const allData = [
                ...(activeRes.data || []),
                ...(closedRes.data || [])
            ] as SignalRow[];

            // Filter by current symbol
            const relevantSignals = allData.filter(s => 
                s.symbol.replace('/','').toUpperCase() === symbol.toUpperCase()
            );
            
            setRawSignals(relevantSignals);

            // Populate Available KOLs
            const kols = new Map<string, {name: string, id: string, avatar: string}>();
            relevantSignals.forEach(s => {
                if (!kols.has(s.kol_name)) { // Using name as key for simplicity since ID not transparently available in types yet
                    kols.set(s.kol_name, { 
                        name: s.kol_name, 
                        id: s.kol_id || s.kol_name, // Fallback
                        avatar: s.kol_avatar_url 
                    });
                }
            });
            const kolArray = Array.from(kols.values());
            setAvailableKols(kolArray);
            
            // Auto Select All on first load for this symbol
            if (!hasInitializedSelection.current && kolArray.length > 0) {
                 setSelectedKols(new Set(kolArray.map(k => k.name)));
                 hasInitializedSelection.current = true;
            }

        } catch (err) {
            console.error('Failed to fetch signals for chart:', err);
        }
    };

    fetchSignals();
    
    // Realtime subscription
    const channel = supabase
      .channel('chart-signals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => { fetchSignals(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [symbol]);

  // 2. Reset selection on symbol change
  useEffect(() => {
     setSelectedKols(new Set());
     hasInitializedSelection.current = false;
  }, [symbol]);

  // 3. Filter & Map Signals
  useEffect(() => {
     let filtered = rawSignals;

     // KOL Filter
     // Only filter based on selection. If selection is empty, it returns nothing, which is correct (unchecking all).
     // Wait, if initialization hasn't happened yet, we might want to start empty anyway.
     filtered = filtered.filter(s => selectedKols.has(s.kol_name));

     // Map to Chart Format
     const intervalSeconds = getIntervalSeconds(interval);
     const mapped: ChartSignal[] = filtered.map(s => {
        const rawTime = Math.floor(new Date(s.entry_time).getTime() / 1000);
        const snappedTime = Math.floor(rawTime / intervalSeconds) * intervalSeconds;
        
        return {
            id: s.id,
            type: s.direction,
            price: s.entry_price,
            time: snappedTime, 
            avatarUrl: s.kol_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.kol_name}`,
            kolName: s.kol_name,
            status: s.status as 'active' | 'closed' | 'cancelled'
        };
     });

     setChartSignals(mapped);

  }, [rawSignals, selectedKols, interval]);


  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {danmakuEnabled && <Danmaku />}
      <TopNav danmakuEnabled={danmakuEnabled} onToggleDanmaku={() => setDanmakuEnabled(!danmakuEnabled)} />
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
            <div className="h-[60px] flex items-center justify-between px-4 border-b border-border bg-card shrink-0 gap-4">
                <div className="flex items-center gap-4 min-w-[200px]">
                     <h1 className="text-xl font-bold text-foreground tracking-wide">
                        {symbol.replace('USDT', '')}/USDT
                        <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Perp</span>
                     </h1>
                </div>

                {/* Filters Region */}
                <div className="flex items-center gap-3 flex-1 justify-center">
                    
                    {/* KOL Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 border-dashed gap-2 text-xs">
                                <Users className="w-3.5 h-3.5" />
                                KOL 筛选
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b">
                                    <Label className="text-xs font-medium text-muted-foreground">Select KOL</Label>
                                    <div className="flex gap-2">
                                        <button 
                                            className="text-[10px] text-primary hover:underline"
                                            onClick={() => setSelectedKols(new Set(availableKols.map(k => k.name)))}
                                        >Select All</button>
                                        <button 
                                            className="text-[10px] text-muted-foreground hover:underline"
                                            onClick={() => setSelectedKols(new Set())}
                                        >Clear</button>
                                    </div>
                                </div>
                                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                    {availableKols.map(kol => (
                                        <div key={kol.name} 
                                             className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer transition-colors"
                                             onClick={() => {
                                                const newSet = new Set(selectedKols);
                                                if (newSet.has(kol.name)) newSet.delete(kol.name);
                                                else newSet.add(kol.name);
                                                setSelectedKols(newSet);
                                             }}
                                        >
                                            <Checkbox 
                                                checked={selectedKols.has(kol.name)} 
                                                onCheckedChange={() => {}} 
                                                className="h-3.5 w-3.5"
                                            />
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={kol.avatar} />
                                                <AvatarFallback>{kol.name.substring(0,1)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs truncate font-medium">{kol.name}</span>
                                        </div>
                                    ))}
                                    {availableKols.length === 0 && (
                                        <div className="text-[10px] text-muted-foreground p-2 text-center">
                                            暂无 KOL 信号
                                        </div>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>

                <div className="flex items-center gap-2 min-w-[200px] justify-end">
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
                        signals={chartSignals}
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
