import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';

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

const DEFAULT_INITIAL_CAPITAL = 10000;

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
    // today window
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

interface ProfitComparisonPanelProps {
  kols: KolData[];
}

interface KolProfitTrendPoint {
  date: string;
  daily: number;
  cumulative: number;
}

const COMPARISON_COLOR_PALETTE = [
  '#22D3EE',
  '#A78BFA',
  '#34D399',
  '#F59E0B',
  '#F472B6',
  '#60A5FA',
  '#F97316',
  '#2DD4BF',
  '#E879F9',
  '#84CC16',
  '#FB7185',
  '#38BDF8',
];

const getComparisonColor = (index: number) => {
  if (index < COMPARISON_COLOR_PALETTE.length) {
    return COMPARISON_COLOR_PALETTE[index];
  }

  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue}, 78%, 58%)`;
};

const ProfitComparisonPanel = ({ kols }: ProfitComparisonPanelProps) => {
  const [timeRange, setTimeRange] = useState('7D');
  const [visibleModels, setVisibleModels] = useState<string[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendRows, setTrendRows] = useState<Record<string, number | string>[]>([]);

  const sortedModels = useMemo(() => {
    return [...kols]
      .sort((a, b) => Number(b.account_value) - Number(a.account_value))
      .map((kol, index) => ({
        ...kol,
        color: getComparisonColor(index),
      }));
  }, [kols]);

  const modelNameMap = useMemo(
    () => Object.fromEntries(sortedModels.map((model) => [model.id, model.short_name || model.name])),
    [sortedModels]
  );

  const modelMetaMap = useMemo(
    () => Object.fromEntries(sortedModels.map((model) => [model.id, model])),
    [sortedModels]
  );

  useEffect(() => {
    setVisibleModels(sortedModels.map((model) => model.id));
  }, [sortedModels]);

  const fetchComparisonTrend = useCallback(async () => {
    if (sortedModels.length === 0) {
      setTrendRows([]);
      return;
    }

    setTrendLoading(true);
    try {
      const mappedRange = timeRange === '1M' ? '1month' : '7days';
      const { from, to } = getTimeBounds(mappedRange);

      const results = await Promise.all(
        sortedModels.map(async (kol) => {
          const { data, error } = await supabase.rpc('get_kol_profit_trend', {
            p_kol_id: kol.id,
            p_from: from,
            p_to: to,
            p_initial_capital: DEFAULT_INITIAL_CAPITAL,
          });

          if (error) {
            console.error(`Error fetching profit trend for ${kol.name}:`, error);
            return { kolId: kol.id, points: [] as KolProfitTrendPoint[] };
          }

          return {
            kolId: kol.id,
            points: (data || []) as KolProfitTrendPoint[],
          };
        })
      );

      const rowMap = new Map<string, { date: string; __order: number; [key: string]: string | number }>();
      let fallbackOrder = 0;

      results.forEach(({ kolId, points }) => {
        points.forEach((point) => {
          const dateKey = point.date;
          if (!rowMap.has(dateKey)) {
            rowMap.set(dateKey, {
              date: dateKey,
              __order: fallbackOrder++,
            });
          }

          const row = rowMap.get(dateKey)!;
          row[kolId] = ((Number(point.cumulative) / DEFAULT_INITIAL_CAPITAL) - 1) * 100;
        });
      });

      const mergedRows = Array.from(rowMap.values())
        .sort((a, b) => {
          const aParsed = Date.parse(String(a.date));
          const bParsed = Date.parse(String(b.date));
          const aTime = Number.isFinite(aParsed) ? aParsed : Number(a.__order);
          const bTime = Number.isFinite(bParsed) ? bParsed : Number(b.__order);
          return aTime - bTime;
        })
        .map(({ __order, ...row }) => row);

      setTrendRows(mergedRows);
    } catch (err) {
      console.error('Error fetching comparison trend:', err);
      setTrendRows([]);
    } finally {
      setTrendLoading(false);
    }
  }, [sortedModels, timeRange]);

  useEffect(() => {
    fetchComparisonTrend();
  }, [fetchComparisonTrend]);

  const returnRateAxis = useMemo(() => {
    const values = sortedModels
      .filter((model) => visibleModels.includes(model.id))
      .map((model) => Number(model.return_rate))
      .filter((value) => Number.isFinite(value));

    const nonZeroValues = values.filter((value) => value !== 0);

    if (nonZeroValues.length === 0) {
      const maxAbs = 1;
      const tickCount = 5;
      const step = (maxAbs * 2) / (tickCount - 1);
      const ticks = Array.from({ length: tickCount }, (_, idx) => Number((-maxAbs + step * idx).toFixed(2)));
      return { min: -maxAbs, max: maxAbs, ticks };
    }

    const rawMax = Math.max(...nonZeroValues);
    const rawMin = Math.min(...nonZeroValues);
    const scaledMax = rawMax > 0 ? rawMax * 1.2 : 0;
    const scaledMin = rawMin < 0 ? rawMin * 1.2 : 0;

    const niceUp = (value: number) => {
      if (value <= 0) return 0;
      const magnitude = 10 ** Math.floor(Math.log10(Math.abs(value)));
      return Number((Math.ceil(value / magnitude) * magnitude).toFixed(2));
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
  }, [sortedModels, visibleModels]);

  const handleToggleModel = (modelId: string) => {
    setVisibleModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const rows = payload
      .filter((entry: any) => Number.isFinite(Number(entry?.value)))
      .map((entry: any) => {
        const modelId = String(entry.dataKey || entry.name || '');
        const model = modelMetaMap[modelId] as KolData | undefined;
        const value = Number(entry.value);
        return {
          modelId,
          name: model ? (model.short_name || model.name) : (modelNameMap[modelId] || modelId),
          avatar: model?.avatar_url || '',
          value,
          color: entry.color,
        };
      })
      .sort((a: any, b: any) => b.value - a.value);

    return (
      <div className="bg-card border border-border rounded-md p-2.5 min-w-[170px]">
        <div className="text-xs font-semibold text-foreground mb-2">{label}</div>
        <div className="space-y-1.5">
          {rows.map((row: any) => (
            <div key={row.modelId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="w-5 h-5 shrink-0">
                  <AvatarImage src={row.avatar || undefined} alt={row.name} />
                  <AvatarFallback className="text-[9px]">{String(row.name).slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground truncate max-w-[84px]">{row.name}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: row.color }}>
                {row.value >= 0 ? '+' : ''}{row.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex-1 min-h-0 p-4">
        <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <div className="min-h-0 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <h1 className="font-mono text-sm font-semibold tracking-wider text-foreground">收益率趋势</h1>
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
            <div className="flex-1 min-h-0 p-3">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  加载收益率趋势中...
                </div>
              ) : trendRows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                  暂无收益率趋势数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendRows} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      domain={[returnRateAxis.min, returnRateAxis.max]}
                      ticks={returnRateAxis.ticks}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${Number(value).toFixed(2)}%`}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <RechartsTooltip
                      content={<CustomTrendTooltip />}
                    />
                    {sortedModels.map((model) => (
                      visibleModels.includes(model.id) && (
                        <Line
                          key={model.id}
                          type="monotone"
                          dataKey={model.id}
                          name={model.id}
                          stroke={model.color}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="min-h-0 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-foreground border-b border-border">
              有效信号列表
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
              <div className="space-y-3">
                {sortedModels.map((model) => {
                  const isActive = visibleModels.includes(model.id);
                  const isPositive = Number(model.return_rate) >= 0;
                  const totalPnl = Number(model.total_pnl);

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleToggleModel(model.id)}
                      className={`w-full text-left p-3 rounded-lg bg-card border transition-all cursor-pointer group ${
                        isActive
                          ? 'border-foreground/30'
                          : 'border-border opacity-60 hover:opacity-100 hover:border-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarImage src={model.avatar_url || undefined} alt={model.name} />
                            <AvatarFallback className="text-[10px]">
                              {(model.short_name || model.name).slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{model.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{model.short_name || model.name}</div>
                          </div>
                        </div>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: model.color }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] text-muted-foreground">账户价值</div>
                          <div className="font-mono text-xs font-semibold text-foreground">
                            ${Number(model.account_value).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">收益</div>
                          <div className={`font-mono text-xs font-semibold ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                            {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">收益率</div>
                          <div className={`font-mono text-xs font-semibold ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                            {Number(model.return_rate) >= 0 ? '+' : ''}{Number(model.return_rate).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const LeaderboardContent = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Fetch leaderboard data via ranged pre-aggregated RPC
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getTimeBounds(timeRange, customDateRange);
      const { data, error } = await supabase.rpc('get_leaderboard_by_range', {
        p_from: from,
        p_to: to,
        p_initial_capital: DEFAULT_INITIAL_CAPITAL,
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
  }, [timeRange, customDateRange]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to Realtime changes on kols/signals
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        (_payload) => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

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
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
          {activeTab === 'overall' && (
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
                {false && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {t('filter')}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                  {t('refresh')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filter Options Row - Only show for overall tab */}
        {activeTab === 'overall' && false && (
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
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('accountValue')} ↓</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('returnRate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('totalPnL')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('winRate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('maxProfit')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('maxLoss')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('tradingDays')}</th>
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
                              navigate(`/kols?kol=${row.id}`);
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
                        <td className="px-4 py-3 text-left text-foreground font-medium">
                          ${Number(row.account_value).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-left font-medium ${Number(row.return_rate) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {Number(row.return_rate) >= 0 ? '+' : ''}{Number(row.return_rate).toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-left font-medium ${Number(row.total_pnl) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {Number(row.total_pnl) >= 0 ? '+' : ''}${Number(row.total_pnl).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-left text-muted-foreground">{Number(row.win_rate)}%</td>
                        <td className="px-4 py-3 text-left text-accent-green">${Number(row.max_profit).toLocaleString()}</td>
                        <td className="px-4 py-3 text-left text-accent-red">-${Math.abs(Number(row.max_loss)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-left text-muted-foreground">{row.trading_days}</td>
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
                          navigate(`/kols?kol=${item.id}`);
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
                              backgroundColor: 'hsl(var(--foreground))',
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
        ) : (
          <ProfitComparisonPanel kols={filteredData} />
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
