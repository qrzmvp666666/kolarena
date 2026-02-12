import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import PerformanceChart from '@/components/PerformanceChart';
import ChartHeader from '@/components/ChartHeader';
import ModelBar from '@/components/ModelBar';
import { useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, RefreshCw, Calendar as CalendarIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, Area, AreaChart } from 'recharts';

// KOL display info mapping (name -> color/icon) derived from models
const kolDisplayMap: Record<string, { color: string; icon: string }> = {};
models.forEach(m => {
  kolDisplayMap[m.name] = { color: m.color, icon: m.icon };
});

// Default color palette for KOLs not in models
const defaultColors = [
  'hsl(168, 100%, 40%)', 'hsl(280, 100%, 60%)', 'hsl(200, 100%, 50%)',
  'hsl(25, 100%, 50%)', 'hsl(0, 0%, 40%)', 'hsl(0, 0%, 20%)', 'hsl(45, 100%, 50%)',
];

export interface KolData {
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

// Helper to get display info for a KOL
const getKolDisplay = (kol: KolData, index: number) => {
  const mapped = kolDisplayMap[kol.name];
  return {
    color: mapped?.color || defaultColors[index % defaultColors.length],
    icon: mapped?.icon || '⚪',
  };
};

// Generate mock profit trend data
const generateProfitTrendData = (traderId: string, timeRange: string = '7days', customRange?: DateRange) => {
  let days = 30;
  if (timeRange === 'today') days = 1;
  else if (timeRange === '7days') days = 7;
  else if (timeRange === '1month') days = 30;
  else if (timeRange === '6months') days = 180;
  else if (timeRange === '1year') days = 365;
  else if (timeRange === 'custom' && customRange?.from && customRange?.to) {
    const diffTime = Math.abs(customRange.to.getTime() - customRange.from.getTime());
    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  let cumulative = 10000;
  return Array.from({ length: days }, (_, i) => {
    const daily = (Math.random() - 0.45) * 500;
    cumulative += daily;
    return {
      date: format(new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000), 'MM/dd'),
      daily: Math.round(daily),
      cumulative: Math.round(cumulative),
    };
  });
};

// Generate coin distribution data
const generateCoinDistribution = () => {
  const coins = [
    { name: 'BTC', value: Math.floor(Math.random() * 40) + 20, color: '#F7931A' },
    { name: 'ETH', value: Math.floor(Math.random() * 25) + 15, color: '#627EEA' },
    { name: 'SOL', value: Math.floor(Math.random() * 15) + 10, color: '#00FFA3' },
    { name: 'XRP', value: Math.floor(Math.random() * 10) + 5, color: '#23292F' },
    { name: 'DOGE', value: Math.floor(Math.random() * 10) + 5, color: '#C3A634' },
    { name: 'BNB', value: Math.floor(Math.random() * 10) + 5, color: '#F3BA2F' },
  ];
  const total = coins.reduce((sum, c) => sum + c.value, 0);
  return coins.map(c => ({ ...c, percent: ((c.value / total) * 100).toFixed(1) }));
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
  status: 'active' | 'closed' | 'cancelled';
  signal_duration: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  updated_at: string;
}

// Mapped trade row for rendering
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
  duration: string;
  closeTime: string;
  status: string;
}

// Map a signal row from DB to a TradeRow for table rendering
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
    duration: signal.signal_duration || '-',
    closeTime: signal.exit_time ? format(new Date(signal.exit_time), 'MM/dd HH:mm') : '-',
    status: signal.exit_type === 'take_profit' ? 'tp' : signal.exit_type === 'stop_loss' ? 'sl' : signal.exit_type === 'draw' ? 'draw' : signal.exit_type === 'manual' ? 'manual' : '-',
  };
};

// Advanced Analysis Component
interface AdvancedAnalysisProps {
  traders: KolData[];
  t: (key: string) => string;
  selectedTrader: string;
  timeRange: string;
  customDateRange?: DateRange;
}

const AdvancedAnalysisContent = ({ traders, t, selectedTrader, timeRange, customDateRange }: AdvancedAnalysisProps) => {
  const currentTrader = traders.find(tr => tr.id === selectedTrader) || traders[0];
  const profitTrendData = useMemo(() => generateProfitTrendData(selectedTrader, timeRange, customDateRange), [selectedTrader, timeRange, customDateRange]);
  const coinDistribution = useMemo(() => generateCoinDistribution(), [selectedTrader]);

  // Real signals from Supabase
  const [activeSignals, setActiveSignals] = useState<SignalRow[]>([]);
  const [historySignals, setHistorySignals] = useState<SignalRow[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);

  // Fetch signals from DB via RPC
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

  // Fetch signals when selectedTrader changes
  useEffect(() => {
    if (selectedTrader) {
      fetchSignals(selectedTrader);
    }
  }, [selectedTrader, fetchSignals]);

  // Realtime subscription for signals table
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
            // If status changed from active to closed, move from active to history
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTrader]);

  // Map DB signals to TradeRow for rendering
  const activeTrades = useMemo(() => activeSignals.map(mapSignalToTrade), [activeSignals]);
  const historyTrades = useMemo(() => historySignals.map(mapSignalToTrade), [historySignals]);

  const renderTradeTable = (trades: TradeRow[], isHistory = false) => (
    <ScrollArea className="max-h-[300px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/50">
          <tr className="border-b border-border">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradePair')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradeDirection')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('leverage')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('entryPrice')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('takeProfit')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('stopLoss')}</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('orderTime')}</th>
            {isHistory && (
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('signalDuration')}</th>
            )}
            {isHistory && (
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('closeTime')}</th>
            )}
            {isHistory && (
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('signalStatus')}</th>
            )}
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t(isHistory ? 'tradePnL' : 'profitRatio')}</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
             <tr>
               <td colSpan={isHistory ? 11 : 8} className="text-center py-8 text-muted-foreground">{t('noData') || 'No Data'}</td>
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
                <span className={`inline-flex items-center gap-1 font-bold ${
                  trade.direction === 'long' ? 'text-accent-green' : 'text-accent-red'
                }`}>
                    {trade.direction === 'long' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {t(trade.direction === 'long' ? 'longPosition' : 'shortPosition')}
                </span>
              </td>
              <td className="px-4 py-2 text-left text-foreground">
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{trade.leverage}</span>
              </td>
              <td className="px-4 py-2 text-left text-foreground">${trade.entryPrice}</td>
              <td className="px-4 py-2 text-left text-accent-green">{trade.tp}</td>
              <td className="px-4 py-2 text-left text-accent-red">{trade.sl}</td>
              <td className="px-4 py-2 text-left text-muted-foreground">{trade.time}</td>
              {isHistory && (
                <td className="px-4 py-2 text-left text-muted-foreground">{trade.duration}</td>
              )}
              {isHistory && (
                <td className="px-4 py-2 text-left text-muted-foreground">{trade.closeTime}</td>
              )}
              {isHistory && (
                <td className={`px-4 py-2 text-left font-medium ${
                  trade.status === 'tp' ? 'text-accent-green' : trade.status === 'sl' ? 'text-accent-red' : 'text-muted-foreground'
                }`}>
                  {trade.status === 'tp' ? t('tpHit') : trade.status === 'sl' ? t('slHit') : trade.status === 'draw' ? t('drawHit') : trade.status === 'manual' ? t('manualClose') : '-'}
                </td>
              )}
              <td className={`px-4 py-2 text-left font-medium ${
                (isHistory ? trade.pnl : Number(trade.roi)) === 0 ? 'text-muted-foreground' : (isHistory ? trade.pnl : Number(trade.roi)) > 0 ? 'text-accent-green' : 'text-accent-red'
              }`}>
                <div className="flex flex-col items-start">
                   {isHistory ? (
                     <span>{trade.pnl === 0 ? '-' : `${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}%`}</span>
                   ) : (
                     <span>{trade.roi && Number(trade.roi) !== 0 ? `${Number(trade.roi) > 0 ? '+' : ''}${trade.roi}%` : '-'}</span>
                   )}
                </div>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
    </ScrollArea>
  );

  if (!currentTrader) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border border-border rounded-lg bg-card">
        {t('comingSoon')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('accountValue')}</div>
          <div className="text-xl font-bold text-foreground">${Number(currentTrader.account_value).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('returnRate')}</div>
          <div className={`text-xl font-bold ${currentTrader.return_rate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {currentTrader.return_rate >= 0 ? '+' : ''}{Number(currentTrader.return_rate).toFixed(2)}%
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('totalPnL')}</div>
          <div className={`text-xl font-bold ${currentTrader.total_pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {currentTrader.total_pnl >= 0 ? '+' : ''}${Number(currentTrader.total_pnl).toLocaleString()}
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('winRate')}</div>
          <div className="text-xl font-bold text-foreground">{currentTrader.win_rate}%</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('maxProfit')}</div>
          <div className="text-xl font-bold text-accent-green">${Number(currentTrader.max_profit).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('maxLoss')}</div>
          <div className="text-xl font-bold text-accent-red">-${Math.abs(Number(currentTrader.max_loss)).toLocaleString()}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('tradingDays')}</div>
          <div className="text-xl font-bold text-foreground">{currentTrader.trading_days}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Trend Chart */}
        <div className="lg:col-span-2 border border-border rounded-lg p-4 bg-card text-foreground">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('profitTrend')}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-foreground" />
                <span className="text-muted-foreground">{t('cumulativeProfit')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-accent-green" />
                <span className="text-muted-foreground">{t('dailyProfit')}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={profitTrendData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Area type="monotone" dataKey="cumulative" stroke="currentColor" fillOpacity={1} fill="url(#colorCumulative)" strokeWidth={2} />
              <Line type="monotone" dataKey="daily" stroke="#22C55E" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Coin Distribution Pie Chart */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium text-foreground mb-4">{t('coinDistribution')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={coinDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
              >
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
        </div>
      </div>

      {/* Trade History Tabs */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Tabs defaultValue="active" className="w-full">
            <div className="px-4 py-3 border-b border-border flex items-center gap-4">
              <TabsList className="bg-muted p-1 rounded-md">
                <TabsTrigger value="active" className="text-xs h-7 px-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all">{t('activeSignals')}</TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-7 px-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all">{t('historySignals')}</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="active" className="m-0">
              {renderTradeTable(activeTrades)}
            </TabsContent>
            
            <TabsContent value="history" className="m-0">
              {renderTradeTable(historyTrades, true)}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ProfitComparisonPanel = () => {
  const [timeRange, setTimeRange] = useState('7D');
  const [displayMode, setDisplayMode] = useState<'$' | '%' | 'profit'>('$');
  const [visibleModels, setVisibleModels] = useState<string[]>(models.map(m => m.id));

  const handleToggleModel = (modelId: string) => {
    setVisibleModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setDisplayMode('$')}
              className={`px-3 py-1 font-mono text-sm transition-colors ${
                displayMode === '$'
                  ? 'bg-foreground/10 text-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              账户价值
            </button>
            <button
              onClick={() => setDisplayMode('profit')}
              className={`px-3 py-1 font-mono text-sm transition-colors ${
                displayMode === 'profit'
                  ? 'bg-foreground/10 text-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              收益
            </button>
            <button
              onClick={() => setDisplayMode('%')}
              className={`px-3 py-1 font-mono text-sm transition-colors ${
                displayMode === '%'
                  ? 'bg-foreground/10 text-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              收益率
            </button>
          </div>
        </div>

        <h1 className="font-mono text-sm font-semibold tracking-wider text-foreground">
          趋势对比
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setTimeRange('7D')}
              className={`px-3 py-1 font-mono text-sm transition-colors ${
                timeRange === '7D'
                  ? 'bg-foreground/10 text-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              最近7天
            </button>
            <button
              onClick={() => setTimeRange('1M')}
              className={`px-3 py-1 font-mono text-sm transition-colors ${
                timeRange === '1M'
                  ? 'bg-foreground/10 text-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              最近一个月
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <PerformanceChart visibleModels={visibleModels} displayMode={displayMode} timeRange={timeRange} />
      </div>
      <div className="border-t border-border">
        <ModelBar visibleModels={visibleModels} onToggleModel={handleToggleModel} />
      </div>
    </div>
  );
};


const LeaderboardContent = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overall' | 'comparison' | 'advanced'>('overall');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [returnRateFilter, setReturnRateFilter] = useState('all');
  const [winRateFilter, setWinRateFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year' | 'custom'>('7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [kolsData, setKolsData] = useState<KolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKol, setSelectedKol] = useState('');

  const requestedKolId = useMemo(() => {
    const raw = searchParams.get('kol');
    return raw ? raw.trim() : '';
  }, [searchParams]);

  // Fetch leaderboard data via RPC
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard');
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

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to Realtime changes on kols table
    const channel = supabase
      .channel('kols-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kols' },
        (_payload) => {
          // Re-fetch the full leaderboard on any change (INSERT, UPDATE, DELETE)
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (searchParams.get('tab') === 'advanced' || requestedKolId) {
      setActiveTab('advanced');
    }
  }, [searchParams, requestedKolId]);

  useEffect(() => {
    if (kolsData.length === 0) return;

    if (requestedKolId) {
      const exists = kolsData.some(kol => kol.id === requestedKolId);
      if (exists) {
        setSelectedKol(requestedKolId);
        return;
      }
    }

    if (!selectedKol) {
      setSelectedKol(kolsData[0].id);
    }
  }, [kolsData, requestedKolId, selectedKol]);

  // Filtered data
  const filteredData = useMemo(() => {
    return kolsData.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Return rate filter
      if (returnRateFilter === 'positive' && Number(item.return_rate) < 0) return false;
      if (returnRateFilter === 'negative' && Number(item.return_rate) >= 0) return false;
      // Win rate filter
      if (winRateFilter === 'high' && Number(item.win_rate) < 30) return false;
      if (winRateFilter === 'low' && Number(item.win_rate) >= 30) return false;
      
      return true;
    });
  }, [kolsData, searchQuery, returnRateFilter, winRateFilter]);

  const winner = filteredData[0] || kolsData[0];
  const maxValue = Math.max(...filteredData.map(d => Number(d.account_value)), 1);

  const handleRefresh = () => {
    setSearchQuery('');
    setReturnRateFilter('all');
    setWinRateFilter('all');
    setTimeRange('7days');
    setCustomDateRange(undefined);
    fetchLeaderboard();
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && customDateRange?.from && customDateRange?.to) {
      const locale = language === 'zh' ? zhCN : enUS;
      return `${format(customDateRange.from, 'MM/dd', { locale })} - ${format(customDateRange.to, 'MM/dd', { locale })}`;
    }
    return t(`timeRange_${timeRange}`);
  };

  

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-6 py-3">
        {/* Header */}
        <div className="mb-4">
        </div>

        {/* Filter Bar - Similar to Signals page */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: Market Type Toggle + Tabs */}
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

            {/* Tabs */}
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                activeTab === 'overall'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span className="text-sm">{t('overallData')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === 'overall' ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground font-semibold'
              }`}>
                {filteredData.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                activeTab === 'comparison'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span className="text-sm">{t('profitComparison')}</span>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                activeTab === 'advanced'
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span className="text-sm">{t('advancedAnalysis')}</span>
            </button>
          </div>

          {/* Search & Actions - Show KOL selector when in advanced tab */}
          <div className="flex items-center gap-3">
            {activeTab === 'advanced' && (
              <div className="flex items-center gap-4">
                {/* Time Range Filter for Advanced Tab */}
                <div className="flex items-center gap-2 mr-2">
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

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('selectTrader')}:</span>
                  <Select value={selectedKol} onValueChange={setSelectedKol}>
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
            </div>
          )}
          {activeTab === 'overall' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('searchTrader')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-card border-border"
                />
              </div>
            )}
            {activeTab === 'overall' && (
              <>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {t('filter')}
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                  {t('refresh')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filter Options Row - Only show for overall tab */}
        {activeTab === 'overall' && (
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {/* Return Rate Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('returnRate')}:</span>
              <Select value={returnRateFilter} onValueChange={setReturnRateFilter}>
                <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="positive">{t('positive')}</SelectItem>
                  <SelectItem value="negative">{t('negative')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Win Rate Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('winRate')}:</span>
              <Select value={winRateFilter} onValueChange={setWinRateFilter}>
                <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="high">{'>'}30%</SelectItem>
                  <SelectItem value="low">{'<'}30%</SelectItem>
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
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
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
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
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
                  <PopoverContent className="w-auto p-4" align="start">
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
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'overall' ? (
          <>
            {/* Loading state */}
            {loading ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                {t('loading') || 'Loading...'}
              </div>
            ) : (
            <>
            {/* Data Table */}
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RANK</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('trader')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('accountValue')} ↓</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('returnRate')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('totalPnL')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('winRate')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('maxProfit')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('maxLoss')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('tradingDays')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => {
                      const display = getKolDisplay(row, index);
                      return (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:underline transition-colors"
                            onClick={() => {
                              setSelectedKol(row.id);
                              setActiveTab('advanced');
                            }}
                          >
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt={row.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <span>{display.icon}</span>
                            )}
                            <span className="text-foreground font-medium">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">
                          ${Number(row.account_value).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${Number(row.return_rate) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {Number(row.return_rate) >= 0 ? '+' : ''}{Number(row.return_rate).toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${Number(row.total_pnl) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {Number(row.total_pnl) >= 0 ? '+' : ''}${Number(row.total_pnl).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{Number(row.win_rate)}%</td>
                        <td className="px-4 py-3 text-right text-accent-green">${Number(row.max_profit).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-accent-red">-${Math.abs(Number(row.max_loss)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.trading_days}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Bottom Section: Winner Card + Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Winner Card */}
              {winner && (() => {
                const winnerIdx = filteredData.findIndex(d => d.id === winner.id);
                const winnerDisplay = getKolDisplay(winner, winnerIdx >= 0 ? winnerIdx : 0);
                return (
              <div className="lg:col-span-1 border border-border rounded-lg p-6 bg-card">
                <div className="text-sm text-muted-foreground mb-3">{t('winningModel')}</div>
                <div className="flex items-center gap-3 mb-4">
                  {winner.avatar_url ? (
                    <img src={winner.avatar_url} alt={winner.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: winnerDisplay.color + '33' }}
                    >
                      {winnerDisplay.icon}
                    </div>
                  )}
                  <span className="text-lg font-bold text-foreground">{winner.name}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">{t('totalEquity')}</div>
                <div className="text-2xl font-bold text-foreground">
                  ${Number(winner.account_value).toLocaleString()}
                </div>
              </div>
                );
              })()}

              {/* Bar Chart Visualization */}
              <div className="lg:col-span-3 border border-border rounded-lg p-6 bg-card">
                <div className="flex items-end justify-between gap-4 h-48">
                  {filteredData.slice(0, 8).map((item, idx) => {
                    const heightPercent = (Number(item.account_value) / maxValue) * 100;
                    const itemDisplay = getKolDisplay(item, idx);
                    return (
                      <div 
                        key={item.id} 
                        className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                        onClick={() => {
                          setSelectedKol(item.id);
                          setActiveTab('advanced');
                        }}
                      >
                        <div className="text-xs font-medium text-foreground">
                          ${Number(item.account_value).toLocaleString()}
                        </div>
                        <div className="w-full flex justify-center">
                          <div 
                            className="w-12 rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                            style={{ 
                              height: `${heightPercent * 1.2}px`, 
                              backgroundColor: itemDisplay.color,
                              minHeight: '20px'
                            }}
                          />
                        </div>
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={item.name} className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: itemDisplay.color + '33' }}
                          >
                            {itemDisplay.icon}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground text-center truncate w-full group-hover:text-foreground group-hover:font-semibold transition-colors">
                          {item.short_name || item.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-6 text-xs text-muted-foreground">
              <span className="font-medium">{t('note')}:</span> {t('leaderboardNote')}
            </div>
          </>
          )}
          </>
        ) : activeTab === 'comparison' ? (
          <ProfitComparisonPanel />
        ) : (
          <AdvancedAnalysisContent 
            traders={filteredData} 
            t={t} 
            selectedTrader={selectedKol} 
            timeRange={timeRange}
            customDateRange={customDateRange}
          />
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
