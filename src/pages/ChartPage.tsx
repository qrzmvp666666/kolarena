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
}

const ChartWindow = ({
    chartId,
    symbol,
    interval,
    selectedKols,
    onAvailableKolsChange,
    onAutoSelectAll,
}: ChartWindowProps) => {
    const { candles, loading } = useBinanceCandles(symbol, interval);
    const [rawSignals, setRawSignals] = useState<SignalRow[]>([]);
    const [chartSignals, setChartSignals] = useState<ChartSignal[]>([]);
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

                const allData = [
                    ...(pendingRes.data || []),
                    ...(enteredRes.data || []),
                    ...(activeRes.data || []),
                    ...(closedRes.data || []),
                ] as SignalRow[];

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
                } else if (hasInitializedSelection.current) {
                     // Check if there are new KOLs and auto-select them
                     // We need to pass the new KOLs to parent to add to selection
                     // We can't access selectedKols here easily without adding it to dependency array and causing loops.
                     // Instead, we can let the parent handle "auto-select new KOLs".
                     // But onAvailableKolsChange receives the full list.
                     
                     // Alternative: passed `onNewKolsDetected`?
                     // Or just rely on parent comparing `prev` and `next` in `setAvailableKolsByChart`.
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

    useEffect(() => {
        let filtered = rawSignals;
        filtered = filtered.filter(s => selectedKols.has(s.kol_name));

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
                status: s.status as 'active' | 'closed' | 'cancelled',
            };
        });

        setChartSignals(mapped);
    }, [rawSignals, selectedKols, interval]);

    return (
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
    );
};

const ChartPage = () => {
    const [danmakuEnabled, setDanmakuEnabled] = useState(true);

    const [charts, setCharts] = useState<ChartWindowState[]>([
        { id: 'chart-1', symbol: 'BTCUSDT', interval: '1d' },
    ]);
    const [activeChartId, setActiveChartId] = useState('chart-1');
    const [layoutPreset, setLayoutPreset] = useState({ rows: 1, cols: 1 });
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTCUSDT']);
    const chartIdCounter = useRef(2);
    const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
    const [rightSidebarTab, setRightSidebarTab] = useState<'comments' | 'pending' | 'history'>('comments');

    const [availableKolsByChart, setAvailableKolsByChart] = useState<
        Record<string, KolOption[]>
    >({});
    const [selectedKolsByChart, setSelectedKolsByChart] = useState<
        Record<string, Set<string>>
    >({ 'chart-1': new Set() });

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
            [{ id: 'chart-1', symbol: 'BTCUSDT', interval: '1d' }],
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
            
            // Check for new KOLs to auto-select them
            const existingNames = new Set(existingKols.map(k => k.name));
            const newRunKols = kols.filter(k => !existingNames.has(k.name));

            if (newRunKols.length > 0) {
                 setSelectedKolsByChart(prevSel => {
                    const currentSel = prevSel[id] || new Set();
                    const nextSel = new Set(currentSel);
                    newRunKols.forEach(k => nextSel.add(k.name));
                    return { ...prevSel, [id]: nextSel };
                 });
            }
            
            // Only update state if list actually changed to avoid render loops if references differ but content same
            if (JSON.stringify(existingKols) === JSON.stringify(kols)) return prev;
            return { ...prev, [id]: kols };
        });
    }, []);

    const handleAutoSelectAll = useCallback((id: string, kolNames: string[]) => {
        setSelectedKolsByChart(prev => ({ ...prev, [id]: new Set(kolNames) }));
    }, []);

    const activeChart = charts.find(c => c.id === activeChartId) || charts[0];

    const activeAvailableKols =
        (activeChart && availableKolsByChart[activeChart.id]) || [];
    const activeSelectedKols =
        (activeChart && selectedKolsByChart[activeChart.id]) || new Set<string>();
    const symbolDisplay = selectedSymbols.length === 1
        ? selectedSymbols[0].replace('USDT', '') + '/USDT'
        : `已选 ${selectedSymbols.length} 个`;

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
                        interval: activeChart?.interval || '1d',
                    } as ChartWindowState;
                });

                setSelectedKolsByChart(prevSelected => {
                    const nextSelected: Record<string, Set<string>> = {};
                    nextCharts.forEach(chart => {
                        nextSelected[chart.id] = prevSelected[chart.id] || new Set();
                    });
                    return nextSelected;
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
        setSelectedKolsByChart(prev => {
            const next = { ...prev };
            delete next[chartId];
            return next;
        });

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
                    interval: '1d',
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
        const nextSymbols = ['BTCUSDT'];
        setSelectedSymbols(nextSymbols);
        setLayoutPreset({ rows: 1, cols: 1 });
        syncChartsWithSymbols(nextSymbols);
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
                                        className="h-7 gap-2 text-[11px] font-medium border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
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
                                                仅保留一个
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
                                                    暂无交易对
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
                                        className="h-7 gap-2 text-[11px] font-medium border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        KOL 筛选
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                Select KOL
                                            </Label>
                                            <div className="flex gap-2">
                                                <button
                                                    className="text-[10px] text-primary hover:underline"
                                                    onClick={() =>
                                                        activeChart &&
                                                        setSelectedKolsByChart(prev => ({
                                                            ...prev,
                                                            [activeChart.id]: new Set(activeAvailableKols.map(k => k.name)),
                                                        }))
                                                    }
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    className="text-[10px] text-muted-foreground hover:underline"
                                                    onClick={() =>
                                                        activeChart &&
                                                        setSelectedKolsByChart(prev => ({
                                                            ...prev,
                                                            [activeChart.id]: new Set(),
                                                        }))
                                                    }
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                            {activeAvailableKols.map(kol => (
                                                <div
                                                    key={kol.name}
                                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        if (!activeChart) return;
                                                        const newSet = new Set(activeSelectedKols);
                                                        if (newSet.has(kol.name)) newSet.delete(kol.name);
                                                        else newSet.add(kol.name);
                                                        setSelectedKolsByChart(prev => ({
                                                            ...prev,
                                                            [activeChart.id]: newSet,
                                                        }));
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
                                                    暂无 KOL 信号
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    className="h-7 gap-1 text-[11px] border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                    onClick={handleAddChart}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    新增窗口
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                    onClick={handleResetLayout}
                                    aria-label="重置布局"
                                    title="重置布局"
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
                                    aria-label="单窗"
                                    title="单窗"
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
                                    aria-label="一行两列"
                                    title="一行两列"
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
                                    aria-label="两行一列"
                                    title="两行一列"
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
                                    aria-label="两行两列"
                                    title="两行两列"
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
                                                        title="关闭窗口"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                              <div className="h-[calc(100%-36px)] chart-interact">
                                                <ChartWindow
                                                    chartId={chart.id}
                                                    symbol={chart.symbol}
                                                    interval={chart.interval}
                                                    selectedKols={selectedKolsByChart[chart.id] || new Set()}
                                                    onAvailableKolsChange={handleAvailableKolsChange}
                                                    onAutoSelectAll={handleAutoSelectAll}
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
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                onClick={() => handleExpandSidebar()}
                                aria-label="展开侧边栏"
                                title="展开"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                onClick={() => handleExpandSidebar('comments')}
                                aria-label="评论"
                                title="评论"
                            >
                                <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                onClick={() => handleExpandSidebar('pending')}
                                aria-label="有效信号"
                                title="有效信号"
                            >
                                <Activity className="w-4 h-4" />
                            </button>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded border border-border bg-muted text-white hover:text-foreground hover:bg-background/50"
                                onClick={() => handleExpandSidebar('history')}
                                aria-label="历史信号"
                                title="历史信号"
                            >
                                <History className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                className="absolute top-2 left-0 z-10 h-8 w-8 inline-flex items-center justify-center rounded-r border border-border bg-muted text-white hover:text-foreground hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setRightSidebarCollapsed(true)}
                                aria-label="收起侧边栏"
                                title="收起"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <Sidebar
                                activeTab={rightSidebarTab}
                                onTabChange={setRightSidebarTab}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChartPage;
