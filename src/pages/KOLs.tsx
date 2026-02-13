import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, Area, AreaChart } from 'recharts';

// ---- Shared types/helpers (same as Leaderboard) ----

const kolDisplayMap: Record<string, { color: string; icon: string }> = {};
models.forEach(m => {
  kolDisplayMap[m.name] = { color: m.color, icon: m.icon };
});

const defaultColors = [
  'hsl(168, 100%, 40%)', 'hsl(280, 100%, 60%)', 'hsl(200, 100%, 50%)',
  'hsl(25, 100%, 50%)', 'hsl(0, 0%, 40%)', 'hsl(0, 0%, 20%)', 'hsl(45, 100%, 50%)',
];

const DEFAULT_INITIAL_CAPITAL = 10000;
const coinPalette = ['#F7931A', '#627EEA', '#00FFA3', '#23292F', '#C3A634', '#F3BA2F', '#8B5CF6', '#06B6D4'];
const SIGNALS_PAGE_SIZE = 10;

interface KolData {
  id: string;
  name: string;
  short_name: string | null;
  avatar_url: string | null;
  account_value: number;
  return_rate: number;
  total_pnl: number;
  win_rate: number;
  max_profit: number;
  max_loss: number;
  trading_days: number;
  created_at: string;
  updated_at: string;
  rank: number;
}

const getKolDisplay = (kol: KolData, index: number) => {
  const mapped = kolDisplayMap[kol.name];
  return {
    color: mapped?.color || defaultColors[index % defaultColors.length],
    icon: mapped?.icon || '⚪',
  };
};

// Signal data type from Supabase
interface SignalRow {
  id: string;
  kol_id: string;
  symbol: string;
  direction: 'long' | 'short';
  leverage: number | null;
  margin_mode: 'isolated' | 'cross';
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  exit_type: 'take_profit' | 'stop_loss' | 'manual' | 'draw' | null;
  pnl_percentage: number | null;
  pnl_ratio: string | null;
  expected_pnl_ratio: string | null;
  status: 'active' | 'closed' | 'cancelled';
  signal_duration: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  updated_at: string;
}

interface TradeRow {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  leverage: string;
  marginMode: 'isolated' | 'cross';
  entryPrice: string;
  tp: string;
  sl: string;
  time: string;
  pnl: number;
  roi: string;
  expectedRoi: string;
  duration: string;
  closeTime: string;
  status: string;
}

interface KolMetricsRow {
  account_value: number;
  return_rate: number;
  total_pnl: number;
  win_rate: number;
  max_profit: number;
  max_loss: number;
  trading_days: number;
}

interface ProfitTrendPoint {
  date: string;
  daily_return_rate: number;
  cumulative_return_rate: number;
}

interface CoinDistributionPoint {
  name: string;
  value: number;
  percent: number;
  color: string;
}

const mapSignalToTrade = (signal: SignalRow): TradeRow => {
  return {
    id: signal.id,
    pair: signal.symbol,
    direction: signal.direction,
    leverage: signal.leverage ? `${signal.leverage}x` : '未提供',
    marginMode: signal.margin_mode,
    entryPrice: Number(signal.entry_price).toFixed(2),
    tp: signal.take_profit ? Number(signal.take_profit).toFixed(2) : '-',
    sl: signal.stop_loss ? Number(signal.stop_loss).toFixed(2) : '-',
    time: signal.entry_time ? format(new Date(signal.entry_time), 'MM/dd HH:mm') : '-',
    pnl: signal.pnl_percentage ? Number(signal.pnl_percentage) : 0,
    roi: signal.pnl_ratio || (signal.pnl_percentage ? Number(signal.pnl_percentage).toFixed(2) : '0'),
    expectedRoi: signal.expected_pnl_ratio || '0',
    duration: signal.signal_duration || '-',
    closeTime: signal.exit_time ? format(new Date(signal.exit_time), 'MM/dd HH:mm') : '-',
    status: signal.exit_type === 'take_profit' ? 'tp' : signal.exit_type === 'stop_loss' ? 'sl' : signal.exit_type === 'draw' ? 'draw' : signal.exit_type === 'manual' ? 'manual' : '-',
  };
};

const getTimeBounds = (
  timeRange: 'today' | '7days' | '1month' | '6months' | '1year' | 'custom',
  customRange?: DateRange
) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (timeRange === 'today') {
    // already start/end of today
  } else if (timeRange === '7days') {
    start.setDate(start.getDate() - 6);
  } else if (timeRange === '1month') {
    start.setDate(start.getDate() - 29);
  } else if (timeRange === '6months') {
    start.setDate(start.getDate() - 179);
  } else if (timeRange === '1year') {
    start.setDate(start.getDate() - 364);
  } else if (timeRange === 'custom' && customRange?.from && customRange?.to) {
    const customStart = new Date(customRange.from);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(customRange.to);
    customEnd.setHours(23, 59, 59, 999);
    return { from: customStart.toISOString(), to: customEnd.toISOString() };
  }

  return { from: start.toISOString(), to: end.toISOString() };
};

// ---- Advanced Analysis Content ----

interface AdvancedAnalysisProps {
  traders: KolData[];
  t: (key: string) => string;
  language: 'zh' | 'en';
  selectedTrader: string;
  timeRange: 'today' | '7days' | '1month' | '6months' | '1year' | 'custom';
  customDateRange?: DateRange;
  refreshTick: number;
}

const AdvancedAnalysisContent = ({ traders, t, language, selectedTrader, timeRange, customDateRange, refreshTick }: AdvancedAnalysisProps) => {
  const currentTrader = traders.find(tr => tr.id === selectedTrader) || traders[0];
  const [metrics, setMetrics] = useState<KolMetricsRow | null>(null);
  const [profitTrendData, setProfitTrendData] = useState<ProfitTrendPoint[]>([]);
  const [coinDistribution, setCoinDistribution] = useState<CoinDistributionPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [activeSignals, setActiveSignals] = useState<SignalRow[]>([]);
  const [historySignals, setHistorySignals] = useState<SignalRow[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [tradeTab, setTradeTab] = useState<'active' | 'history'>('active');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchAnalytics = useCallback(async (kolId: string) => {
    if (!kolId) return;
    setAnalyticsLoading(true);
    try {
      const { from, to } = getTimeBounds(timeRange, customDateRange);
      const [metricsRes, trendRes, distributionRes] = await Promise.all([
        supabase.rpc('get_kol_metrics', {
          p_kol_id: kolId,
          p_from: from,
          p_to: to,
          p_initial_capital: DEFAULT_INITIAL_CAPITAL,
        }),
        supabase.rpc('get_kol_profit_trend', {
          p_kol_id: kolId,
          p_from: from,
          p_to: to,
        }),
        supabase.rpc('get_kol_coin_distribution', {
          p_kol_id: kolId,
          p_from: from,
          p_to: to,
          p_initial_capital: DEFAULT_INITIAL_CAPITAL,
        }),
      ]);

      if (metricsRes.error) console.error('Error fetching KOL metrics:', metricsRes.error);
      else setMetrics(((metricsRes.data || [])[0] || null) as KolMetricsRow | null);

      if (trendRes.error) console.error('Error fetching profit trend:', trendRes.error);
      else setProfitTrendData((trendRes.data || []) as ProfitTrendPoint[]);

      if (distributionRes.error) console.error('Error fetching coin distribution:', distributionRes.error);
      else {
        const rows = (distributionRes.data || []) as Array<{ name: string; value: number; percent: number }>;
        setCoinDistribution(rows.map((row, idx) => ({
          ...row,
          color: coinPalette[idx % coinPalette.length],
        })));
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [timeRange, customDateRange]);

  const fetchSignals = useCallback(async (kolId: string) => {
    if (!kolId) return;
    setSignalsLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        supabase.rpc('get_signals_by_kol', { p_kol_id: kolId, p_status: 'active' }),
        supabase.rpc('get_signals_by_kol', { p_kol_id: kolId, p_status: 'closed' }),
      ]);
      if (activeRes.error) console.error('Error fetching active signals:', activeRes.error);
      else setActiveSignals((activeRes.data || []) as SignalRow[]);
      if (historyRes.error) console.error('Error fetching history signals:', historyRes.error);
      else setHistorySignals((historyRes.data || []) as SignalRow[]);
    } catch (err) {
      console.error('Error fetching signals:', err);
    } finally {
      setSignalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTrader) {
      fetchSignals(selectedTrader);
    }
  }, [selectedTrader, fetchSignals]);

  useEffect(() => {
    if (selectedTrader) {
      fetchAnalytics(selectedTrader);
    }
  }, [selectedTrader, fetchAnalytics, refreshTick]);

  useEffect(() => {
    if (!selectedTrader) return;
    const channel = supabase
      .channel(`signals-kol-${selectedTrader}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
          filter: `kol_id=eq.${selectedTrader}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as SignalRow;
          const oldRow = payload.old as { id: string };
          if (eventType === 'INSERT') {
            if (newRow.status === 'active') {
              setActiveSignals(prev => [newRow, ...prev]);
            } else if (newRow.status === 'closed') {
              setHistorySignals(prev => [newRow, ...prev]);
            }
          } else if (eventType === 'UPDATE') {
            if (newRow.status === 'closed') {
              setActiveSignals(prev => prev.filter(s => s.id !== newRow.id));
              setHistorySignals(prev => {
                const exists = prev.find(s => s.id === newRow.id);
                if (exists) return prev.map(s => s.id === newRow.id ? newRow : s);
                return [newRow, ...prev];
              });
            } else if (newRow.status === 'active') {
              setActiveSignals(prev => {
                const exists = prev.find(s => s.id === newRow.id);
                if (exists) return prev.map(s => s.id === newRow.id ? newRow : s);
                return [newRow, ...prev];
              });
            } else if (newRow.status === 'cancelled') {
              setActiveSignals(prev => prev.filter(s => s.id !== newRow.id));
              setHistorySignals(prev => prev.filter(s => s.id !== newRow.id));
            }
          } else if (eventType === 'DELETE') {
            setActiveSignals(prev => prev.filter(s => s.id !== oldRow.id));
            setHistorySignals(prev => prev.filter(s => s.id !== oldRow.id));
          }
          fetchAnalytics(selectedTrader);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTrader, fetchAnalytics]);

  const activeTrades = useMemo(() => activeSignals.map(mapSignalToTrade), [activeSignals]);
  const historyTrades = useMemo(() => historySignals.map(mapSignalToTrade), [historySignals]);

  useEffect(() => {
    setActivePage(1);
  }, [activeTrades.length, selectedTrader, timeRange, customDateRange, refreshTick]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyTrades.length, selectedTrader, timeRange, customDateRange, refreshTick]);

  const activeTotalPages = Math.max(1, Math.ceil(activeTrades.length / SIGNALS_PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(historyTrades.length / SIGNALS_PAGE_SIZE));
  const currentPage = tradeTab === 'active' ? activePage : historyPage;
  const currentTotalPages = tradeTab === 'active' ? activeTotalPages : historyTotalPages;
  const currentTotalRows = tradeTab === 'active' ? activeTrades.length : historyTrades.length;

  const pagedActiveTrades = useMemo(() => {
    const start = (activePage - 1) * SIGNALS_PAGE_SIZE;
    return activeTrades.slice(start, start + SIGNALS_PAGE_SIZE);
  }, [activeTrades, activePage]);

  const pagedHistoryTrades = useMemo(() => {
    const start = (historyPage - 1) * SIGNALS_PAGE_SIZE;
    return historyTrades.slice(start, start + SIGNALS_PAGE_SIZE);
  }, [historyTrades, historyPage]);
  const returnRateTrendData = useMemo(
    () => profitTrendData.map((point) => ({
      date: point.date,
      dailyReturnRate: Number(point.daily_return_rate),
      cumulativeReturnRate: Number(point.cumulative_return_rate),
    })),
    [profitTrendData]
  );

  const returnRateAxis = useMemo(() => {
    const values = returnRateTrendData.flatMap((point) => [
      Number(point.dailyReturnRate),
      Number(point.cumulativeReturnRate),
    ]).filter((value) => Number.isFinite(value));

    const nonZeroValues = values.filter((value) => value !== 0);

    if (nonZeroValues.length === 0) {
      const maxAbs = 1;
      const tickCount = 5;
      const step = (maxAbs * 2) / (tickCount - 1);
      const ticks = Array.from({ length: tickCount }, (_, idx) => Number((-maxAbs + step * idx).toFixed(2)));
      return {
        min: -maxAbs,
        max: maxAbs,
        ticks,
      };
    }

    const rawMax = Math.max(...nonZeroValues);
    const rawMin = Math.min(...nonZeroValues);
    const scaledMax = rawMax > 0 ? rawMax * 1.2 : 0;
    const scaledMin = rawMin < 0 ? rawMin * 1.2 : 0;

    const niceUp = (value: number) => {
      if (value <= 0) return 0;
      const abs = Math.abs(value);
      const magnitude = 10 ** Math.floor(Math.log10(abs));
      return Number((Math.ceil(abs / magnitude) * magnitude).toFixed(2));
    };

    const niceDown = (value: number) => {
      if (value >= 0) return 0;
      const abs = Math.abs(value);
      const magnitude = 10 ** Math.floor(Math.log10(abs));
      return -Number((Math.ceil(abs / magnitude) * magnitude).toFixed(2));
    };

    const upperBound = niceUp(scaledMax);
    const lowerBound = niceDown(scaledMin);
    const maxAbs = Math.max(Math.abs(upperBound), Math.abs(lowerBound), 0.5);
    const tickCount = 7;
    const step = (maxAbs * 2) / (tickCount - 1);
    const ticks = Array.from({ length: tickCount }, (_, idx) => Number((-maxAbs + step * idx).toFixed(2)));

    return {
      min: -maxAbs,
      max: maxAbs,
      ticks,
    };
  }, [returnRateTrendData]);

  const renderTradeTable = (
    trades: TradeRow[],
    isHistory = false,
  ) => (
    <div>
      <div className="max-h-[340px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/50">
          <tr className="border-b border-border">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradePair')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradeDirection')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('leverage')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('entryPrice')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('takeProfit')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('stopLoss')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t(isHistory ? 'tradePnL' : 'expectedPnlRatio')}</th>
            {isHistory && <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('returnRate')}</th>}
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('orderTime')}</th>
            {isHistory && <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('signalDuration')}</th>}
            {isHistory && <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('closeTime')}</th>}
            {isHistory && <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('signalStatus')}</th>}
          </tr>
        </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={isHistory ? 12 : 8} className="text-center py-8 text-muted-foreground">{t('noData') || 'No Data'}</td>
              </tr>
            ) : (
              trades.map((trade) => (
              <tr key={trade.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 text-foreground font-medium">
                  <div className="flex flex-col">
                    <span>{trade.pair}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {trade.marginMode === 'cross' ? t('marginCross') : t('marginIsolated')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-left">
                  <span className={`inline-flex items-center gap-1 font-bold ${trade.direction === 'long' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {trade.direction === 'long' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {t(trade.direction === 'long' ? 'longPosition' : 'shortPosition')}
                  </span>
                </td>
                <td className="px-4 py-2 text-left text-foreground">
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{trade.leverage}</span>
                </td>
                <td className="px-4 py-2 text-left text-foreground">${trade.entryPrice}</td>
                <td className="px-4 py-2 text-left text-accent-green">{trade.tp}</td>
                <td className="px-4 py-2 text-left text-accent-red">{trade.sl}</td>
                <td className={`px-4 py-2 text-left font-medium ${(isHistory ? trade.pnl : Number(trade.expectedRoi)) === 0 ? 'text-muted-foreground' : (isHistory ? trade.pnl : Number(trade.expectedRoi)) > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  <div className="flex flex-col items-start">
                    {isHistory ? (
                      <span>{trade.pnl === 0 ? '-' : `${trade.pnl > 0 ? '+' : ''}${Number(trade.roi).toFixed(2)}`}</span>
                    ) : (
                      <span>{trade.expectedRoi && Number(trade.expectedRoi) !== 0 ? Number(trade.expectedRoi).toFixed(2) : '-'}</span>
                    )}
                  </div>
                </td>
                {isHistory && (
                  <td className={`px-4 py-2 text-left font-medium ${trade.pnl === 0 ? 'text-muted-foreground' : trade.pnl > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {trade.pnl === 0 ? '-' : `${trade.pnl > 0 ? '+' : ''}${Number(trade.roi).toFixed(2)}%`}
                  </td>
                )}
                <td className="px-4 py-2 text-left text-muted-foreground">{trade.time}</td>
                {isHistory && <td className="px-4 py-2 text-left text-muted-foreground">{trade.duration}</td>}
                {isHistory && <td className="px-4 py-2 text-left text-muted-foreground">{trade.closeTime}</td>}
                {isHistory && (
                  <td className={`px-4 py-2 text-left font-medium ${trade.status === 'tp' ? 'text-accent-green' : trade.status === 'sl' ? 'text-accent-red' : 'text-muted-foreground'}`}>
                    {trade.status === 'tp' ? t('tpHit') : trade.status === 'sl' ? t('slHit') : trade.status === 'draw' ? t('drawHit') : trade.status === 'manual' ? t('manualClose') : '-'}
                  </td>
                )}
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!currentTrader) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border border-border rounded-lg bg-card">
        {t('comingSoon')}
      </div>
    );
  }

  const displayMetrics: KolMetricsRow = metrics || {
    account_value: DEFAULT_INITIAL_CAPITAL,
    return_rate: 0,
    total_pnl: 0,
    win_rate: 0,
    max_profit: 0,
    max_loss: 0,
    trading_days: 0,
  };

  const hasClosedAnalytics =
    Number(displayMetrics.trading_days) > 0 ||
    Number(displayMetrics.total_pnl) !== 0 ||
    Number(displayMetrics.return_rate) !== 0 ||
    Number(displayMetrics.win_rate) !== 0 ||
    Number(displayMetrics.max_profit) !== 0 ||
    Number(displayMetrics.max_loss) !== 0;

  const hasTrendData = returnRateTrendData.length > 0;
  const hasCoinData = coinDistribution.some(item => Number(item.value) > 0);

  return (
    <div className="space-y-6">
      {analyticsLoading && (
        <div className="flex items-center justify-end text-xs text-muted-foreground gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {t('loading') || 'Loading...'}
        </div>
      )}
      {!analyticsLoading && !hasClosedAnalytics && (
        <div className="border border-dashed border-border rounded-lg px-3 py-2 text-xs text-muted-foreground bg-card/50">
          暂无历史平仓数据，当前展示为默认值；当该 KOL 出现止盈/止损/平价记录后会自动更新。
        </div>
      )}
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('accountValue')}</div>
          <div className="text-xl font-bold text-foreground">${Number(displayMetrics.account_value).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('returnRate')}</div>
          <div className={`text-xl font-bold ${displayMetrics.return_rate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {displayMetrics.return_rate >= 0 ? '+' : ''}{Number(displayMetrics.return_rate).toFixed(2)}%
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('totalPnL')}</div>
          <div className={`text-xl font-bold ${displayMetrics.total_pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {displayMetrics.total_pnl >= 0 ? '+' : ''}${Number(displayMetrics.total_pnl).toLocaleString()}
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('winRate')}</div>
          <div className="text-xl font-bold text-foreground">{Number(displayMetrics.win_rate).toFixed(2)}%</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('maxProfit')}</div>
          <div className="text-xl font-bold text-accent-green">${Number(displayMetrics.max_profit).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('maxLoss')}</div>
          <div className="text-xl font-bold text-accent-red">-${Math.abs(Number(displayMetrics.max_loss)).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('tradingDays')}</div>
          <div className="text-xl font-bold text-foreground">{displayMetrics.trading_days}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-border rounded-lg p-4 bg-card text-foreground">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('profitTrend')}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-foreground" />
                <span className="text-muted-foreground">{language === 'zh' ? '累计收益率' : 'Cumulative Return Rate'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-accent-green" />
                <span className="text-muted-foreground">{language === 'zh' ? '日收益率' : 'Daily Return Rate'}</span>
              </div>
            </div>
          </div>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={returnRateTrendData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  domain={[returnRateAxis.min, returnRateAxis.max]}
                  ticks={returnRateAxis.ticks}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${Number(value).toFixed(2)}%`}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `${Number(value).toFixed(2)}%`,
                    name === 'dailyReturnRate'
                      ? (language === 'zh' ? '日收益率' : 'Daily Return Rate')
                      : (language === 'zh' ? '累计收益率' : 'Cumulative Return Rate')
                  ]}
                />
                <Area type="monotone" dataKey="cumulativeReturnRate" stroke="currentColor" fillOpacity={1} fill="url(#colorCumulative)" strokeWidth={2} />
                <Line type="monotone" dataKey="dailyReturnRate" stroke="#22C55E" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
              暂无收益趋势数据
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium text-foreground mb-4">{t('coinDistribution')}</h3>
          {hasCoinData ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={coinDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {coinDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name, props) => [`${props.payload.percent}%`, name]}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-foreground">{value} ({entry.payload.percent}%)</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
              暂无币种收益占比数据
            </div>
          )}
        </div>
      </div>

      {/* Trade History Tabs */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Tabs value={tradeTab} onValueChange={(value) => setTradeTab(value as 'active' | 'history')} className="w-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-4">
            <TabsList className="bg-muted p-1 rounded-md">
              <TabsTrigger value="active" className="text-xs h-7 px-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all">{t('activeSignals')}</TabsTrigger>
              <TabsTrigger value="history" className="text-xs h-7 px-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all">{t('historySignals')}</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{currentPage} / {currentTotalPages} · {currentTotalRows}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  if (tradeTab === 'active') {
                    setActivePage(prev => Math.max(1, prev - 1));
                    return;
                  }
                  setHistoryPage(prev => Math.max(1, prev - 1));
                }}
                disabled={currentPage <= 1}
              >
                {t('previousPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  if (tradeTab === 'active') {
                    setActivePage(prev => Math.min(activeTotalPages, prev + 1));
                    return;
                  }
                  setHistoryPage(prev => Math.min(historyTotalPages, prev + 1));
                }}
                disabled={currentPage >= currentTotalPages}
              >
                {t('nextPage')}
              </Button>
            </div>
          </div>
          <TabsContent value="active" className="m-0">
            {renderTradeTable(pagedActiveTrades, false)}
          </TabsContent>
          <TabsContent value="history" className="m-0">
            {renderTradeTable(pagedHistoryTrades, true)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ---- KOLs Page ----

const KOLsPage = () => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [kolsData, setKolsData] = useState<KolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKol, setSelectedKol] = useState('');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year' | 'custom'>('7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const requestedKolId = useMemo(() => {
    const raw = searchParams.get('kol');
    return raw ? raw.trim() : '';
  }, [searchParams]);

  const handleKolChange = useCallback((kolId: string) => {
    setSelectedKol(kolId);
    const next = new URLSearchParams(searchParams);
    next.set('kol', kolId);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch leaderboard data via RPC
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_by_range', {
        p_from: null,
        p_to: null,
      });
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }
      if (data) {
        setKolsData(data as KolData[]);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('kols-realtime-kolspage')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kols' },
        (_payload) => { fetchLeaderboard(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (kolsData.length === 0) return;

    if (requestedKolId) {
      const exists = kolsData.some(kol => kol.id === requestedKolId);
      if (exists) {
        if (selectedKol !== requestedKolId) {
          setSelectedKol(requestedKolId);
        }
        return;
      }
    }

    if (!selectedKol) {
      setSelectedKol(kolsData[0].id);
    }
  }, [kolsData, requestedKolId, selectedKol]);

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && customDateRange?.from && customDateRange?.to) {
      const locale = language === 'zh' ? zhCN : enUS;
      return `${format(customDateRange.from, 'MM/dd', { locale })} - ${format(customDateRange.to, 'MM/dd', { locale })}`;
    }
    return t(`timeRange_${timeRange}`);
  };

  const handleRefresh = useCallback(() => {
    fetchLeaderboard();
    setRefreshTick(prev => prev + 1);
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      <TickerBar />

      <div className="px-6 py-3">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: Market Type Toggle + Tab */}
          <div className="flex items-center gap-4">
            {/* Market Type Toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setMarketType('futures')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  marketType === 'futures'
                    ? 'bg-foreground text-background'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('futures')}
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="px-4 py-2 text-sm font-medium bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                    >
                      {t('spot')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('comingSoon')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Data Overview Tab */}
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-foreground text-background border-foreground shadow-sm"
            >
              <span className="text-sm">{t('dataOverview')}</span>
            </button>
          </div>

          {/* Right: Filters */}
          <div className="flex items-center gap-4">
            {/* KOL Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('selectTrader')}:</span>
              <Select value={selectedKol} onValueChange={handleKolChange}>
                <SelectTrigger className="w-[200px] h-9 bg-card border-border">
                  <SelectValue placeholder={kolsData[0]?.name}>
                    {(() => {
                      const found = kolsData.find(t => t.id === selectedKol);
                      const idx = kolsData.findIndex(t => t.id === selectedKol);
                      const display = found ? getKolDisplay(found, idx) : null;
                      return found ? (
                        <div className="flex items-center gap-2">
                          {found.avatar_url ? (
                            <img src={found.avatar_url} alt={found.name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <span>{display?.icon}</span>
                          )}
                          <span>{found.name}</span>
                        </div>
                      ) : '';
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {kolsData.map((trader, idx) => (
                    <SelectItem key={trader.id} value={trader.id}>
                      <div className="flex items-center gap-2">
                        {trader.avatar_url ? (
                          <img src={trader.avatar_url} alt={trader.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <span>{getKolDisplay(trader, idx).icon}</span>
                        )}
                        <span>{trader.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('timeRange')}:</span>
              <div className="flex items-center gap-1">
                {(['today', '7days', '1month', '6months', '1year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-foreground text-background'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {t(`timeRange_${range}`)}
                  </button>
                ))}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                        timeRange === 'custom'
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {timeRange === 'custom' && customDateRange?.from && customDateRange?.to
                        ? getTimeRangeLabel()
                        : t('timeRange_custom')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t('selectDateRange')}</span>
                      </div>
                      <div className="flex border border-border rounded-lg overflow-hidden p-1 bg-card">
                        <Calendar
                          initialFocus
                          mode="range"
                          selected={customDateRange}
                          onSelect={setCustomDateRange}
                          numberOfMonths={2}
                          locale={language === 'zh' ? zhCN : enUS}
                          className="pointer-events-auto"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold"
                        onClick={() => {
                          if (customDateRange?.from && customDateRange?.to) {
                            setTimeRange('custom');
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={!customDateRange?.from || !customDateRange?.to}
                      >
                        {t('confirm')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            {t('loading') || 'Loading...'}
          </div>
        ) : (
          <AdvancedAnalysisContent
            traders={kolsData}
            t={t}
            language={language}
            selectedTrader={selectedKol}
            timeRange={timeRange}
            customDateRange={customDateRange}
            refreshTick={refreshTick}
          />
        )}
      </div>
    </div>
  );
};

export default KOLsPage;
