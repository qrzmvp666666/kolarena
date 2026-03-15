import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
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
  followedKolIds: Set<string>;
}

interface KolProfitTrendPoint {
  date: string;
  daily_return_rate: number;
  cumulative_return_rate: number;
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

export const ProfitComparisonPanel = ({ kols, followedKolIds }: ProfitComparisonPanelProps) => {
  const { t, language } = useLanguage();
  const [comparisonTimeRange, setComparisonTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year' | 'custom'>('7days');
  const [comparisonCustomDateRange, setComparisonCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [comparisonCalendarOpen, setComparisonCalendarOpen] = useState(false);
  const [followedOnly, setFollowedOnly] = useState(false);
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

  const displayModels = useMemo(() => {
    if (!followedOnly) {
      return sortedModels;
    }
    return sortedModels.filter((model) => followedKolIds.has(model.id));
  }, [followedOnly, followedKolIds, sortedModels]);

  useEffect(() => {
    setVisibleModels(displayModels.map((model) => model.id));
  }, [displayModels]);

  const getComparisonTimeRangeLabel = () => {
    if (comparisonTimeRange === 'custom' && comparisonCustomDateRange?.from && comparisonCustomDateRange?.to) {
      const locale = language === 'zh' ? zhCN : enUS;
      return `${format(comparisonCustomDateRange.from, 'MM/dd', { locale })} - ${format(comparisonCustomDateRange.to, 'MM/dd', { locale })}`;
    }
    return t(`timeRange_${comparisonTimeRange}`);
  };

  const fetchComparisonTrend = useCallback(async () => {
    if (displayModels.length === 0) {
      setTrendRows([]);
      return;
    }

    setTrendLoading(true);
    try {
      const { from, to } = getTimeBounds(comparisonTimeRange, comparisonCustomDateRange);

      const results = await Promise.all(
        displayModels.map(async (kol) => {
          const { data, error } = await supabase.rpc('get_kol_profit_trend', {
            p_kol_id: kol.id,
            p_from: from,
            p_to: to,
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
          row[kolId] = Number(point.cumulative_return_rate);
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
  }, [displayModels, comparisonTimeRange, comparisonCustomDateRange]);

  useEffect(() => {
    fetchComparisonTrend();
  }, [fetchComparisonTrend]);

  const returnRateAxis = useMemo(() => {
    const values = displayModels
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
  }, [displayModels, visibleModels]);

  const handleToggleModel = (modelId: string) => {
    setVisibleModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleResetComparison = () => {
    setComparisonTimeRange('7days');
    setComparisonCustomDateRange(undefined);
    setComparisonCalendarOpen(false);
    setFollowedOnly(false);
    setVisibleModels(sortedModels.map((model) => model.id));
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
              <div className="flex items-center gap-1">
                {(['today', '7days', '1month', '6months', '1year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setComparisonTimeRange(range)}
                    className={`px-2 py-1 text-[11px] rounded-md transition-colors ${
                      comparisonTimeRange === range
                        ? 'bg-foreground text-background'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {t(`timeRange_${range}`)}
                  </button>
                ))}
                <Popover open={comparisonCalendarOpen} onOpenChange={setComparisonCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`px-2 py-1 text-[11px] rounded-md transition-colors flex items-center gap-1.5 ${
                        comparisonTimeRange === 'custom'
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {comparisonTimeRange === 'custom' && comparisonCustomDateRange?.from && comparisonCustomDateRange?.to
                        ? getComparisonTimeRangeLabel()
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
                          selected={comparisonCustomDateRange}
                          onSelect={setComparisonCustomDateRange}
                          numberOfMonths={2}
                          locale={language === 'zh' ? zhCN : enUS}
                          className="pointer-events-auto"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold"
                        onClick={() => {
                          if (comparisonCustomDateRange?.from && comparisonCustomDateRange?.to) {
                            setComparisonTimeRange('custom');
                            setComparisonCalendarOpen(false);
                          }
                        }}
                        disabled={!comparisonCustomDateRange?.from || !comparisonCustomDateRange?.to}
                      >
                        {t('confirm')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[26px] px-2 text-[11px]"
                  onClick={handleResetComparison}
                >
                  {t('resetFilters')}
                </Button>
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
                    {displayModels.map((model) => (
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
            <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">有效信号列表</span>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none cursor-pointer">
                <Checkbox
                  checked={followedOnly}
                  onCheckedChange={(checked) => setFollowedOnly(checked === true)}
                  className="h-3.5 w-3.5"
                />
                <span>{t('signalFollowed')}</span>
              </label>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
              <div className="space-y-3">
                {displayModels.map((model) => {
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
                {followedOnly && displayModels.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                    暂无已关注的KOL
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const LeaderboardContent = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [returnRateFilter, setReturnRateFilter] = useState('all');
  const [winRateFilter, setWinRateFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year'>('7days');
  const [kolsData, setKolsData] = useState<KolData[]>([]);
  const [loading, setLoading] = useState(true);

  const timeRanges = [
    { id: 'today' as const, label: t('timeRange_today') },
    { id: '7days' as const, label: t('timeRange_7days') },
    { id: '1month' as const, label: t('timeRange_1month') },
    { id: '6months' as const, label: t('timeRange_6months') },
    { id: '1year' as const, label: t('timeRange_1year') },
  ];

  // Fetch leaderboard data via ranged pre-aggregated RPC
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getTimeBounds(timeRange);
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
  }, [timeRange]);

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
      // Return rate filter
      if (returnRateFilter === 'positive' && Number(item.return_rate) < 0) return false;
      if (returnRateFilter === 'negative' && Number(item.return_rate) >= 0) return false;
      // Win rate filter
      if (winRateFilter === 'high' && Number(item.win_rate) < 30) return false;
      if (winRateFilter === 'low' && Number(item.win_rate) >= 30) return false;
      
      return true;
    });
  }, [kolsData, returnRateFilter, winRateFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-3 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-1 sm:flex-wrap sm:overflow-visible sm:gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <Select value={marketType} onValueChange={(v) => setMarketType(v as 'futures' | 'spot')}>
                <SelectTrigger className="w-[88px] sm:w-[96px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="futures">{t('futures')}</SelectItem>
                  <SelectItem value="spot" disabled>{`${t('spot')} (${t('comingSoon')})`}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as 'today' | '7days' | '1month' | '6months' | '1year')}>
                <SelectTrigger className="w-[96px] sm:w-[110px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {timeRanges.map((range) => (
                    <SelectItem key={range.id} value={range.id}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
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
                <table className="w-full text-xs min-w-[760px]">
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

            {/* Note */}
            <div className="mt-6 text-xs text-muted-foreground">
              <span className="font-medium">{t('note')}:</span> {t('leaderboardNote')}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
