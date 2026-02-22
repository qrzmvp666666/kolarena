import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import TopNav from '@/components/TopNav';
import { TradingChart, ChartSignal } from '@/components/TradingChart';
import Danmaku from '@/components/Danmaku';
import { useBinanceCandles } from '@/hooks/useBinanceCandles';
import { useBinanceSymbols } from '@/hooks/useBinanceSymbols';
import { INTERVALS, Interval } from '@/lib/binance';
import { Card, CardContent } from '@/components/ui/card';
import { MarketSidebar } from '@/components/MarketSidebar';
import Sidebar from '@/components/Sidebar';
import TickerBar from '@/components/TickerBar';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, X, Plus, RefreshCw, Square, Columns2, Rows2, LayoutGrid, ChevronLeft, ChevronRight, MessageSquare, Activity, History } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { ResponsiveGridLayout, useContainerWidth, type LayoutItem, type ResponsiveLayouts } from 'react-grid-layout';

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
    take_profit?: number | null;
    stop_loss?: number | null;
}

// Helper to get seconds for interval
const getIntervalSeconds = (interval: Interval): number => {
  const unit = interval.slice(-1);
  const value = parseInt(interval.slice(0, -1));
  switch(unit) {
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    default: return 86400; // 1d default
  }
};

type ChartWindowState = {
    id: string;
    symbol: string;
    interval: Interval;
};

type KolOption = { name: string; id: string; avatar: string };

interface ChartWindowProps {
    chartId: string;
    symbol: string;
    interval: Interval;
    selectedKols: Set<string>;
    onAvailableKolsChange: (chartId: string, kols: KolOption[]) => void;
    onAutoSelectAll: (chartId: string, kolNames: string[]) => void;
    hoveredSignalId?: string | null;
    onSignalHover?: (id: string | null) => void;
    selectedDirection?: 'all' | 'long' | 'short';
    selectedTimeRange?: 'all' | '24h' | '3d' | '7d' | '30d';
}

const ChartWindow = ({
    chartId,
    symbol,
    interval,
    selectedKols,
    onAvailableKolsChange,
    onAutoSelectAll,
    hoveredSignalId,
    onSignalHover,
    selectedDirection = 'all',
    selectedTimeRange = 'all',
}: ChartWindowProps) => {
    const { candles, loading } = useBinanceCandles(symbol, interval);
    const [rawSignals, setRawSignals] = useState<SignalRow[]>([]);
    // Removed chartSignals state to use useMemo derived state for instant updates
    // const [chartSignals, setChartSignals] = useState<ChartSignal[]>([]);
    const hasInitializedSelection = React.useRef(false);

    useEffect(() => {
        const fetchSignals = async () => {
            try {
                const [pendingRes, enteredRes, activeRes, closedRes] = await Promise.all([
                    supabase.rpc('get_signals', { p_status: 'pending_entry', p_limit: 500 }),
                    supabase.rpc('get_signals', { p_status: 'entered', p_limit: 500 }),
                    supabase.rpc('get_signals', { p_status: 'active', p_limit: 500 }),
                    supabase.rpc('get_signals', { p_status: 'closed', p_limit: 500 }),
                ]);

                const allDataRaw = [
                    ...(pendingRes.data || []),
                    ...(enteredRes.data || []),
                    ...(activeRes.data || []),
                    ...(closedRes.data || []),
                ] as SignalRow[];

                const uniqueDataMap = new Map<string, SignalRow>();
                allDataRaw.forEach(s => {
                    if (s && s.id) uniqueDataMap.set(s.id, s);
                });
                const allData = Array.from(uniqueDataMap.values());

                const relevantSignals = allData.filter(
                    s => s.symbol.replace('/', '').toUpperCase() === symbol.toUpperCase()
                );

                setRawSignals(relevantSignals);

                const kols = new Map<string, KolOption>();
                relevantSignals.forEach(s => {
                    if (!kols.has(s.kol_name)) {
                        kols.set(s.kol_name, {
                            name: s.kol_name,
                            id: s.kol_id || s.kol_name,
                            avatar: s.kol_avatar_url,
                        });
                    }
                });
                const kolArray = Array.from(kols.values());
                onAvailableKolsChange(chartId, kolArray);
                
                // If new KOLs appear in the updated list that weren't selected before, 
                // we should probably auto-select them if it's the first load OR if we want live updates.
                // However, the current logic only auto-selects on first load (hasInitializedSelection).
                // To support live updates showing new signals from new KOLs:
                if (!hasInitializedSelection.current && kolArray.length > 0) {
                    onAutoSelectAll(chartId, kolArray.map(k => k.name));
                    hasInitializedSelection.current = true;
                }
            } catch (err) {
                console.error('Failed to fetch signals for chart:', err);
            }
        };

        fetchSignals();

        const channel = supabase
            .channel(`chart-signals-realtime-${chartId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'signals' },
                () => {
                    fetchSignals();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chartId, symbol, onAvailableKolsChange, onAutoSelectAll]);

    useEffect(() => {
        hasInitializedSelection.current = false;
    }, [symbol]);

    const chartSignals = useMemo(() => {
        let filtered = rawSignals;
        filtered = filtered.filter(s => selectedKols.has(s.kol_name));
        filtered = filtered.filter(s => s.status !== 'closed' && s.status !== 'cancelled');

        if (selectedDirection !== 'all') {
            filtered = filtered.filter(s => s.direction === selectedDirection);
        }

        if (selectedTimeRange !== 'all') {
            const now = Date.now();
            const timeLimit = selectedTimeRange === '24h' ? 24 * 60 * 60 * 1000 :
                              selectedTimeRange === '3d' ? 3 * 24 * 60 * 60 * 1000 :
                              selectedTimeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                              30 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(s => (now - new Date(s.entry_time).getTime()) <= timeLimit);
        }

        const intervalSeconds = getIntervalSeconds(interval);
        const mapped: ChartSignal[] = filtered.map(s => {
            const rawTime = Math.floor(new Date(s.entry_time).getTime() / 1000);
            const snappedTime = Math.floor(rawTime / intervalSeconds) * intervalSeconds;

            return {
                id: s.id,
                type: s.direction,
                price: s.entry_price,
                time: snappedTime,
                avatarUrl:
                    s.kol_avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.kol_name}`,
                kolName: s.kol_name,
                status: s.status as 'active' | 'closed' | 'cancelled' | 'pending_entry' | 'entered',
                takeProfit: s.take_profit ?? null,
                stopLoss: s.stop_loss ?? null,
            };
        });

        if (candles.length > 0) {
            const minTime = candles[0].time;
            const maxTime = candles[candles.length - 1].time;
            return mapped.filter(s => s.time >= minTime && s.time <= maxTime);
        } else {
            return mapped;
        }
    }, [rawSignals, selectedKols, interval, candles, selectedDirection, selectedTimeRange]);

    return (
        <Card className="w-full h-full border-none rounded-none bg-transparent shadow-none">
            <CardContent className="p-0 h-full">
                <TradingChart
                    data={candles}
                    isLoading={loading}
                    signals={chartSignals}
                    hoveredSignalId={hoveredSignalId}
                    onSignalHover={onSignalHover}
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
    );
};

const ChartPage = () => {
    const { t, language } = useLanguage();
    const [danmakuEnabled, setDanmakuEnabled] = useState(true);
    const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);

    const [charts, setCharts] = useState<ChartWindowState[]>([
        { id: 'chart-1', symbol: 'BTCUSDT', interval: '1h' },
    ]);
    const [activeChartId, setActiveChartId] = useState('chart-1');
    const [layoutPreset, setLayoutPreset] = useState({ rows: 1, cols: 1 });
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTCUSDT']);
    const chartIdCounter = useRef(2);
    const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
    const [rightSidebarTab, setRightSidebarTab] = useState<'comments' | 'pending' | 'history'>('pending');
    const [resetKey, setResetKey] = useState(0);

    const [availableKolsByChart, setAvailableKolsByChart] = useState<
        Record<string, KolOption[]>
    >({});
    
    // Global Set of Selected KOLs (used by ALL charts equally)
    const [globalSelectedKols, setGlobalSelectedKols] = useState<Set<string>>(new Set());
    
    // Global filters for direction and time range
    const [globalSelectedDirection, setGlobalSelectedDirection] = useState<'all' | 'long' | 'short'>('all');
    const [globalSelectedTimeRange, setGlobalSelectedTimeRange] = useState<'all' | '24h' | '3d' | '7d' | '30d'>('3d');
    
    // We still track manual selection flag per chart to avoid auto-select clashing with user intent
    // (though with global selection, we might just need one global flag, but per-chart is safer for loading states)
    const manualKolsSelectionRef = useRef<Record<string, boolean>>({});

    const cols = useMemo(
        () => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }),
        []
    );

    const createLayoutItem = (id: string, x = 0, y = Infinity, w = 6, h = 6): LayoutItem => ({
        i: id,
        x,
        y,
        w,
        h,
        minW: 3,
        minH: 5,
    });

    const buildLayoutsForCharts = useCallback(
        (chartList: ChartWindowState[], preset: { rows: number; cols: number }) => {
            const next: ResponsiveLayouts = {};
            (Object.keys(cols) as Array<keyof typeof cols>).forEach(bp => {
                const totalCols = cols[bp];
                const effectiveCols = Math.max(1, Math.min(preset.cols, totalCols));
                const widthPerCol = Math.max(1, Math.floor(totalCols / effectiveCols));
                const heightPerRow = 6;

                next[bp] = chartList.map((chart, index) => {
                    const colIndex = index % effectiveCols;
                    const rowIndex = Math.floor(index / effectiveCols);
                    return createLayoutItem(
                        chart.id,
                        colIndex * widthPerCol,
                        rowIndex * heightPerRow,
                        widthPerCol,
                        heightPerRow
                    );
                });
            });
            return next;
        },
        [cols]
    );

    const [layouts, setLayouts] = useState<ResponsiveLayouts>(() =>
        buildLayoutsForCharts(
            [{ id: 'chart-1', symbol: 'BTCUSDT', interval: '1h' }],
            { rows: 1, cols: 1 }
        )
    );

    const { width: gridWidth, containerRef: gridContainerRef, mounted: gridMounted } =
        useContainerWidth({ initialWidth: 1280 });
    const [gridHeight, setGridHeight] = useState(0);
    const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof typeof cols>('lg');
    const { symbols: binanceSymbols, loading: symbolsLoading } = useBinanceSymbols();

    const handleExpandSidebar = useCallback((tab?: 'comments' | 'pending' | 'history') => {
        if (tab) setRightSidebarTab(tab);
        setRightSidebarCollapsed(false);
    }, []);

    const handleAvailableKolsChange = useCallback((id: string, kols: KolOption[]) => {
        setAvailableKolsByChart(prev => {
            const existingKols = prev[id] || [];
            
            // Allow this part to read "globalSelectedKols" via closure might be stale? 
            // Actually, handleAvailableKolsChange is created with useCallback [], so it has stale closure over globalSelectedKols.
            // We need to use functional updates or Refs.
            
            // BETTER APPROACH: We just update availableKols here. 
            // The "Auto Select" logic should be separate or handle it carefully.
            
            // Only update state if list actually changed to avoid render loops if references differ but content same
            if (JSON.stringify(existingKols) === JSON.stringify(kols)) return prev;
            return { ...prev, [id]: kols };
        });
        
        // Auto-select logic moved to effect below to access fresh state
    }, []);

    // Effect to handle auto-selection when available KOLs change
    useEffect(() => {
        Object.entries(availableKolsByChart).forEach(([chartId, kols]) => {
             if (manualKolsSelectionRef.current[chartId]) return;
             
             setGlobalSelectedKols(prev => {
                 const next = new Set(prev);
                 let changed = false;
                 kols.forEach(k => {
                     if (!next.has(k.name)) {
                         next.add(k.name);
                         changed = true;
                     }
                 });
                 return changed ? next : prev;
             });
        });
    }, [availableKolsByChart]);

    const handleAutoSelectAll = useCallback((id: string, kolNames: string[]) => {
        setGlobalSelectedKols(prev => {
            const next = new Set(prev);
            kolNames.forEach(n => next.add(n));
            return next;
        });
    }, []);

    const markManualKolsSelection = useCallback((id: string) => {
        manualKolsSelectionRef.current[id] = true;
    }, []);

    const activeChart = charts.find(c => c.id === activeChartId) || charts[0];

    const activeAvailableKols =
        (activeChart && availableKolsByChart[activeChart.id]) || [];
    // activeSelectedKols is just the global set now
    const activeSelectedKols = globalSelectedKols;
    
    const symbolDisplay = selectedSymbols.length === 1
        ? selectedSymbols[0].replace('USDT', '') + '/USDT'
        : (language === 'zh' ? `已选 ${selectedSymbols.length} 个` : `${selectedSymbols.length} selected`);

    useEffect(() => {
        if (!gridContainerRef.current) return;
        const element = gridContainerRef.current;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry?.contentRect) {
                setGridHeight(entry.contentRect.height);
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [gridContainerRef]);

    const updateChart = (chartId: string, updates: Partial<ChartWindowState>) => {
        setCharts(prev =>
            prev.map(chart =>
                chart.id === chartId ? { ...chart, ...updates } : chart
            )
        );
    };

    const syncChartsWithSymbols = useCallback(
        (symbols: string[]) => {
            const uniqueSymbols = Array.from(new Set(symbols));
            if (uniqueSymbols.length === 0) return;

            setCharts(prev => {
                const bySymbol = new Map(prev.map(chart => [chart.symbol, chart]));
                const nextCharts = uniqueSymbols.map(symbol => {
                    const existing = bySymbol.get(symbol);
                    if (existing) return existing;
                    return {
                        id: `chart-${chartIdCounter.current++}`,
                        symbol,
                        interval: activeChart?.interval || '1h',
                    } as ChartWindowState;
                });

                setAvailableKolsByChart(prevAvailable => {
                    const nextAvailable: Record<string, KolOption[]> = {};
                    nextCharts.forEach(chart => {
                        if (prevAvailable[chart.id]) nextAvailable[chart.id] = prevAvailable[chart.id];
                    });
                    return nextAvailable;
                });

                setLayouts(buildLayoutsForCharts(nextCharts, layoutPreset));

                if (!nextCharts.find(chart => chart.id === activeChartId)) {
                    setActiveChartId(nextCharts[0].id);
                }

                return nextCharts;
            });
        },
        [activeChart?.interval, activeChartId, buildLayoutsForCharts, layoutPreset]
    );

    useEffect(() => {
        if (selectedSymbols.length === 0 && binanceSymbols.length > 0) {
            const fallback = binanceSymbols[0].binanceSymbol;
            setSelectedSymbols([fallback]);
            syncChartsWithSymbols([fallback]);
        }
    }, [binanceSymbols, selectedSymbols.length, syncChartsWithSymbols]);

    const handleAddChart = () => {
        const nextSymbol = binanceSymbols.find(
            sym => !selectedSymbols.includes(sym.binanceSymbol)
        )?.binanceSymbol;
        if (!nextSymbol) return;
        const nextSelected = [...selectedSymbols, nextSymbol];
        setSelectedSymbols(nextSelected);
        syncChartsWithSymbols(nextSelected);
    };

    const handleRemoveChart = (chartId: string) => {
        if (charts.length <= 1) return;

        const nextCharts = charts.filter(chart => chart.id !== chartId);
        const nextSymbols = nextCharts.map(chart => chart.symbol);
        if (nextSymbols.length === 0) return;
        setSelectedSymbols(nextSymbols);
        setCharts(nextCharts);
        setLayouts(buildLayoutsForCharts(nextCharts, layoutPreset));
        setAvailableKolsByChart(prev => {
            const next = { ...prev };
            delete next[chartId];
            return next;
        });
        
        // Remove manual selection flag for closed chart
        if (manualKolsSelectionRef.current[chartId]) {
            delete manualKolsSelectionRef.current[chartId];
        }
        
        // No need to clean up selectedKolsByChart as it is global now (or rather gone)

        if (activeChartId === chartId) {
            const remaining = charts.filter(c => c.id !== chartId);
            if (remaining.length > 0) setActiveChartId(remaining[0].id);
        }
    };

    const applyLayoutPreset = (rows: number, colsCount: number) => {
        const preset = {
            rows: Math.max(1, rows),
            cols: Math.max(1, colsCount),
        };
        setLayoutPreset(preset);

        let nextCharts = [...charts];
        const targetCount = preset.rows * preset.cols;

        if (nextCharts.length < targetCount) {
            const baseSymbol = nextCharts[0]?.symbol || 'BTCUSDT';
            for (let i = nextCharts.length; i < targetCount; i++) {
                nextCharts.push({
                    id: `chart-${chartIdCounter.current++}`,
                    symbol: baseSymbol,
                    interval: '1h',
                });
            }
            setCharts(nextCharts);
            
            // Update selectedSymbols to reflect the new chart count/types
            const nextSymbols = nextCharts.map(c => c.symbol);
            setSelectedSymbols(nextSymbols);
        } else if (nextCharts.length > targetCount) {
             nextCharts = nextCharts.slice(0, targetCount);
             setCharts(nextCharts);
             const nextSymbols = nextCharts.map(c => c.symbol);
             setSelectedSymbols(nextSymbols);
        }

        setLayouts(buildLayoutsForCharts(nextCharts, preset));
    };

    const handleResetLayout = () => {
        // Reset to initial single BTCUSDT chart
        const initialChart: ChartWindowState = { id: 'chart-1', symbol: 'BTCUSDT', interval: '1h' };
        const nextCharts = [initialChart];
        const nextSymbols = ['BTCUSDT'];

        setSelectedSymbols(nextSymbols);
        setLayoutPreset({ rows: 1, cols: 1 });
        setCharts(nextCharts);
        setActiveChartId('chart-1');
        chartIdCounter.current = 2;

        // Reset KOL selection & available KOLs (will be re-fetched by chart)
        setAvailableKolsByChart({});
        setGlobalSelectedKols(new Set());
        manualKolsSelectionRef.current = {};

        // Reset sidebar & signal states
        setHoveredSignalId(null);
        setRightSidebarTab('pending');

        // Rebuild layouts
        setLayouts(buildLayoutsForCharts(nextCharts, { rows: 1, cols: 1 }));

        // Increment resetKey to force ChartWindow remount (resets hasInitializedSelection ref)
        setResetKey(prev => prev + 1);
    };

    const effectiveColsForHeight = Math.max(
        1,
        Math.min(layoutPreset.cols, cols[currentBreakpoint])
    );
    const rowsUsed = Math.max(1, Math.ceil(charts.length / effectiveColsForHeight));
    const verticalPadding = 0;
    const verticalMargin = 8;
    const headerHeightPx = 36;
    const minChartHeightPx = 220;
    const minItemHeightPx = minChartHeightPx + headerHeightPx;
    const minRowHeight = Math.ceil(minItemHeightPx / 6);
    const availableHeight = Math.max(
        0,
        gridHeight - verticalPadding - verticalMargin * (rowsUsed - 1)
    );
    const computedRowHeight = availableHeight > 0
        ? (rowsUsed === 1
                ? Math.max(20, Math.floor(availableHeight / 6))
                : Math.max(minRowHeight, Math.floor(availableHeight / (rowsUsed * 6))))
        : Math.max(minRowHeight, 80);
    const gridMargin: [number, number] = rowsUsed === 1 ? [12, 0] : [12, 8];


    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden relative">
            {danmakuEnabled && <Danmaku />}
            <TopNav
                danmakuEnabled={danmakuEnabled}
                onToggleDanmaku={() => setDanmakuEnabled(!danmakuEnabled)}
            />
            <TickerBar showCryptoTicker={false} />

            <div className="flex flex-1 overflow-hidden">
                <MarketSidebar
                    currentSymbol={activeChart?.symbol || 'BTCUSDT'}
                    onSelectSymbol={() => {}}
                />

                <div className="flex-1 flex flex-col bg-background min-w-0">
                    <div className="min-h-[60px] flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 py-2 border-b border-border bg-card shrink-0 gap-3">
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="h-7 gap-2 text-[11px] font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                        disabled={symbolsLoading}
                                    >
                                        {symbolDisplay}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b">
                                            <Label className="text-xs font-medium text-muted-foreground" />
                                            <button
                                                className="text-[10px] text-muted-foreground hover:underline"
                                                onClick={() => {
                                                    if (binanceSymbols.length === 0) return;
                                                    const first = binanceSymbols[0].binanceSymbol;
                                                    setSelectedSymbols([first]);
                                                    syncChartsWithSymbols([first]);
                                                }}
                                            >
                                                {t('chartKeepOne')}
                                            </button>
                                        </div>
                                        <div className="space-y-1 max-h-[260px] overflow-y-auto">
                                            {binanceSymbols.map(sym => {
                                                const checked = selectedSymbols.includes(sym.binanceSymbol);
                                                return (
                                                    <div
                                                        key={sym.binanceSymbol}
                                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            const isLast = checked && selectedSymbols.length === 1;
                                                            if (isLast) return;
                                                            const next = checked
                                                                ? selectedSymbols.filter(s => s !== sym.binanceSymbol)
                                                                : [...selectedSymbols, sym.binanceSymbol];
                                                            setSelectedSymbols(next);
                                                            syncChartsWithSymbols(next);
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => {}}
                                                            className="h-3.5 w-3.5"
                                                        />
                                                        <span className="text-sm font-semibold">
                                                            {sym.base}/{sym.quote}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {binanceSymbols.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground p-2 text-center">
                                                    {t('chartNoPairs')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="h-7 gap-2 text-[11px] font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        {t('chartKolFilter')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                {t('chartSelectKol')}
                                            </Label>
                                            <div className="flex gap-2">
                                                <button
                                                    className="text-[10px] text-primary hover:underline"
                                                    onClick={() => {
                                                        // Global Select All
                                                        Object.keys(availableKolsByChart).forEach(id => markManualKolsSelection(id));
                                                        setGlobalSelectedKols(prev => {
                                                            const next = new Set(prev);
                                                            Object.values(availableKolsByChart).forEach(kols => {
                                                                kols.forEach(k => next.add(k.name));
                                                            });
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {t('chartSelectAll')}
                                                </button>
                                                <button
                                                    className="text-[10px] text-muted-foreground hover:underline"
                                                    onClick={() => {
                                                        // Global Clear
                                                        Object.keys(availableKolsByChart).forEach(id => markManualKolsSelection(id));
                                                        setGlobalSelectedKols(new Set());
                                                    }}
                                                >
                                                    {t('chartClear')}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                            {activeAvailableKols.map(kol => (
                                                <div
                                                    key={kol.name}
                                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        const isSelected = activeSelectedKols.has(kol.name);
                                                        
                                                        // Update manual selection flag for all current charts to prevent auto-select interference
                                                        Object.keys(availableKolsByChart).forEach(id => markManualKolsSelection(id));

                                                        setGlobalSelectedKols(prev => {
                                                            const next = new Set(prev);
                                                            if (isSelected) {
                                                                 next.delete(kol.name);
                                                            } else {
                                                                 next.add(kol.name);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={activeSelectedKols.has(kol.name)}
                                                        onCheckedChange={() => {}}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                    <Avatar className="w-5 h-5">
                                                        <AvatarImage src={kol.avatar} />
                                                        <AvatarFallback>{kol.name.substring(0, 1)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs truncate font-medium">{kol.name}</span>
                                                </div>
                                            ))}
                                            {activeAvailableKols.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground p-2 text-center">
                                                    {t('chartNoKolSignals')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2">
                                <Select value={globalSelectedDirection} onValueChange={(v: any) => setGlobalSelectedDirection(v)}>
                                    <SelectTrigger className="h-7 text-[11px] border-border bg-card text-foreground hover:bg-muted transition-colors w-[90px]">
                                        <SelectValue placeholder={t('filterDirection')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filterDirection')}</SelectItem>
                                        <SelectItem value="long">{t('signalLong')}</SelectItem>
                                        <SelectItem value="short">{t('signalShort')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={globalSelectedTimeRange} onValueChange={(v: any) => setGlobalSelectedTimeRange(v)}>
                                    <SelectTrigger className="h-7 text-[11px] border-border bg-card text-foreground hover:bg-muted transition-colors w-[100px]">
                                        <SelectValue placeholder={t('filterTime')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('filterTime')}</SelectItem>
                                        <SelectItem value="24h">24{t('hours')}</SelectItem>
                                        <SelectItem value="3d">3{t('days')}</SelectItem>
                                        <SelectItem value="7d">7{t('days')}</SelectItem>
                                        <SelectItem value="30d">30{t('days')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                    onClick={handleResetLayout}
                                    aria-label={t('chartResetLayout')}
                                    title={t('chartResetLayout')}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:min-w-[260px] justify-start lg:justify-end">
                            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
                                <button
                                    className={`px-2 py-1 rounded border transition-colors ${
                                        layoutPreset.rows === 1 && layoutPreset.cols === 1
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                    onClick={() => applyLayoutPreset(1, 1)}
                                    aria-label={t('chartLayoutSingle')}
                                    title={t('chartLayoutSingle')}
                                >
                                    <Square className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className={`px-2 py-1 rounded border transition-colors ${
                                        layoutPreset.rows === 1 && layoutPreset.cols === 2
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                    onClick={() => applyLayoutPreset(1, 2)}
                                    aria-label={t('chartLayout1x2')}
                                    title={t('chartLayout1x2')}
                                >
                                    <Columns2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className={`px-2 py-1 rounded border transition-colors ${
                                        layoutPreset.rows === 2 && layoutPreset.cols === 1
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                    onClick={() => applyLayoutPreset(2, 1)}
                                    aria-label={t('chartLayout2x1')}
                                    title={t('chartLayout2x1')}
                                >
                                    <Rows2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className={`px-2 py-1 rounded border transition-colors ${
                                        layoutPreset.rows === 2 && layoutPreset.cols === 2
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                    }`}
                                    onClick={() => applyLayoutPreset(2, 2)}
                                    aria-label={t('chartLayout2x2')}
                                    title={t('chartLayout2x2')}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex-1 relative bg-card min-h-0 overflow-y-auto chart-scrollbar"
                        ref={gridContainerRef}
                    >
                        {gridMounted && (
                            <ResponsiveGridLayout
                                className="h-full"
                                width={gridWidth}
                                layouts={layouts}
                                cols={cols}
                                rowHeight={computedRowHeight}
                                margin={gridMargin}
                                containerPadding={[12, 0]}
                                dragConfig={{ handle: '.chart-drag-handle', cancel: '.chart-interact' }}
                                onBreakpointChange={(bp) => {
                                    const key = (bp || 'lg') as keyof typeof cols;
                                    setCurrentBreakpoint(key);
                                }}
                                onLayoutChange={(_, allLayouts) => setLayouts(allLayouts)}
                            >
                                {charts.map(chart => {
                                    const isActive = chart.id === activeChartId;
                                    return (
                                        <div
                                            key={chart.id}
                                            className={`h-full rounded-lg border ${
                                                isActive
                                                    ? 'border-border'
                                                    : 'border-border'
                                            } bg-background/50 overflow-hidden`}
                                            onMouseDown={() => setActiveChartId(chart.id)}
                                        >
                                            <div className="flex items-center justify-between px-3 py-2 text-xs bg-card border-b border-border chart-drag-handle cursor-move select-none">
                                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                                    {chart.symbol.replace('USDT', '')}/USDT
                                                    <span className="text-muted-foreground">{chart.interval}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex bg-muted rounded p-1">
                                                        {Object.keys(INTERVALS).map(i => (
                                                            <button
                                                                key={i}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateChart(chart.id, { interval: i as Interval });
                                                                }}
                                                                className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                                                                    chart.interval === i
                                                                        ? 'bg-background text-foreground shadow-sm'
                                                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                                                }`}
                                                            >
                                                                {i}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        className="text-muted-foreground hover:text-foreground"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleRemoveChart(chart.id);
                                                        }}
                                                        title={t('chartCloseWindow')}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                              <div className="h-[calc(100%-36px)] chart-interact">
                                                <ChartWindow
                                                    key={`${chart.id}-${resetKey}`}
                                                    chartId={chart.id}
                                                    symbol={chart.symbol}
                                                    interval={chart.interval}
                                                    selectedKols={globalSelectedKols}
                                                    onAvailableKolsChange={handleAvailableKolsChange}
                                                    onAutoSelectAll={handleAutoSelectAll}
                                                    hoveredSignalId={hoveredSignalId}
                                                    onSignalHover={setHoveredSignalId}
                                                    selectedDirection={globalSelectedDirection}
                                                    selectedTimeRange={globalSelectedTimeRange}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </ResponsiveGridLayout>
                        )}
                    </div>
                </div>

                <div
                    className={`border-l border-border bg-card hidden md:block relative group ${
                        rightSidebarCollapsed ? 'w-[56px]' : 'w-[350px]'
                    }`}
                >
                    {rightSidebarCollapsed ? (
                        <div className="h-full flex flex-col items-center py-2 gap-2">
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                onClick={() => handleExpandSidebar()}
                                aria-label={t('chartExpandSidebar')}
                                title={t('chartExpand')}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                onClick={() => handleExpandSidebar('comments')}
                                aria-label={t('chartCommentsShort')}
                                title={t('chartCommentsShort')}
                            >
                                <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                onClick={() => handleExpandSidebar('pending')}
                                aria-label={t('chartActiveSignalsShort')}
                                title={t('chartActiveSignalsShort')}
                            >
                                <Activity className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                onClick={() => handleExpandSidebar('history')}
                                aria-label={t('chartHistorySignalsShort')}
                                title={t('chartHistorySignalsShort')}
                            >
                                <History className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                className="absolute top-2 left-0 z-10 h-8 w-8 inline-flex items-center justify-center rounded-r border border-border bg-card text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setRightSidebarCollapsed(true)}
                                aria-label={t('chartCollapseSidebar')}
                                title={t('chartCollapse')}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <Sidebar
                                activeTab={rightSidebarTab}
                                onTabChange={setRightSidebarTab}
                                onSignalHover={setHoveredSignalId}
                                selectedKols={globalSelectedKols}
                                selectedSymbols={new Set(selectedSymbols)}
                                selectedDirection={globalSelectedDirection}
                                selectedTimeRange={globalSelectedTimeRange}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChartPage;
