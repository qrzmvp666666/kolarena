import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar as CalendarIcon,
  FlaskConical,
  ArrowLeft,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  DollarSign,
  Percent,
  BarChart3,
  TableProperties,
  LineChart as LineChartIcon,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip,
  Line, BarChart, Bar, Cell,
} from 'recharts';
import { toast } from 'sonner';

// ---- Types ----

interface KolData {
  id: string;
  name: string;
  short_name: string | null;
  avatar_url: string | null;
}

interface BacktestSummary {
  initial_capital: number;
  final_capital: number;
  total_return_rate: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  max_drawdown: number;
  max_single_profit: number;
  max_single_loss: number;
  profit_factor: number;
  total_trades: number;
  avg_return_per_trade: number;
}

interface BacktestTrade {
  signal_id: string;
  symbol: string;
  direction: 'long' | 'short';
  leverage: number;
  entry_price: number;
  exit_price: number;
  pnl_percentage: number;
  invest_amount: number;
  pnl_amount: number;
  balance_before: number;
  balance_after: number;
  exit_time: string;
  exit_type: string;
}

interface EquityCurvePoint {
  date: string;
  balance: number;
  cumulative_return: number;
}

interface MonthlyStatRow {
  month: string;
  pnl: number;
  return_rate: number;
  trade_count: number;
  win_count: number;
}

interface BacktestResult {
  summary: BacktestSummary;
  trades: BacktestTrade[];
  equity_curve: EquityCurvePoint[];
  monthly_stats: MonthlyStatRow[];
}

// ---- Helpers ----

const TRADES_PAGE_SIZE = 10;

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

// ---- Component ----

const BacktestPage = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // KOL data
  const [kolsData, setKolsData] = useState<KolData[]>([]);
  const [kolsLoading, setKolsLoading] = useState(true);
  const [selectedKol, setSelectedKol] = useState('');

  // Time range
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year' | 'custom'>('1month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Backtest parameters
  const [initialCapital, setInitialCapital] = useState('10000');
  const [investMode, setInvestMode] = useState<'fixed' | 'compound'>('fixed');
  const [investType, setInvestType] = useState<'amount' | 'percent'>('amount');
  const [investValue, setInvestValue] = useState('1000');
  const [useCustomLeverage, setUseCustomLeverage] = useState(false);
  const [customLeverage, setCustomLeverage] = useState('10');

  // Results
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [resultTab, setResultTab] = useState('equity');

  // Trade detail pagination
  const [tradePage, setTradePage] = useState(1);

  // Fetch KOL list
  useEffect(() => {
    const fetchKols = async () => {
      try {
        const { data, error } = await supabase.rpc('get_leaderboard_by_range', {
          p_from: null,
          p_to: null,
        });
        if (error) {
          console.error('Error fetching KOLs:', error);
          return;
        }
        if (data) {
          setKolsData(data as KolData[]);
        }
      } catch (err) {
        console.error('Error fetching KOLs:', err);
      } finally {
        setKolsLoading(false);
      }
    };
    fetchKols();
  }, []);

  // Set initial KOL from URL param
  useEffect(() => {
    if (kolsData.length === 0) return;
    const kolParam = searchParams.get('kol');
    if (kolParam) {
      const exists = kolsData.some(k => k.id === kolParam);
      if (exists) {
        setSelectedKol(kolParam);
        return;
      }
    }
    if (!selectedKol) {
      setSelectedKol(kolsData[0].id);
    }
  }, [kolsData, searchParams, selectedKol]);

  // Run backtest
  const handleRunBacktest = useCallback(async () => {
    if (!selectedKol) return;
    const capital = parseFloat(initialCapital);
    if (isNaN(capital) || capital <= 0) {
      toast.error(t('backtestError'));
      return;
    }
    const invest = parseFloat(investValue);
    if (investMode === 'fixed' && (isNaN(invest) || invest <= 0)) {
      toast.error(t('backtestError'));
      return;
    }
    if (investMode === 'fixed' && investType === 'percent' && invest > 100) {
      toast.error(t('backtestError'));
      return;
    }
    const levValue = parseFloat(customLeverage);
    if (useCustomLeverage && (isNaN(levValue) || levValue <= 0)) {
      toast.error(t('backtestError'));
      return;
    }

    setBacktestLoading(true);
    setResult(null);
    setTradePage(1);

    try {
      const { from, to } = getTimeBounds(timeRange, customDateRange);
      const { data, error } = await supabase.rpc('run_backtest', {
        p_kol_id: selectedKol,
        p_from: from,
        p_to: to,
        p_initial_capital: capital,
        p_mode: investMode,
        p_invest_type: investMode === 'fixed' ? investType : 'amount',
        p_invest_value: investMode === 'fixed' ? invest : capital,
        p_use_custom_leverage: useCustomLeverage,
        p_custom_leverage: useCustomLeverage ? levValue : 1,
      });
      if (error) {
        console.error('Backtest RPC error:', error);
        toast.error(t('backtestError'));
        return;
      }
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed.summary && parsed.summary.total_trades === 0) {
          toast.info(t('backtestNoData'));
          return;
        }
        setResult(parsed as BacktestResult);
      }
    } catch (err) {
      console.error('Backtest error:', err);
      toast.error(t('backtestError'));
    } finally {
      setBacktestLoading(false);
    }
  }, [selectedKol, initialCapital, investMode, investType, investValue, useCustomLeverage, customLeverage, timeRange, customDateRange, t]);

  // Pagination for trade details
  const tradeTotalPages = result ? Math.max(1, Math.ceil(result.trades.length / TRADES_PAGE_SIZE)) : 1;
  const pagedTrades = useMemo(() => {
    if (!result) return [];
    const start = (tradePage - 1) * TRADES_PAGE_SIZE;
    return result.trades.slice(start, start + TRADES_PAGE_SIZE);
  }, [result, tradePage]);

  // Equity curve axis
  const equityAxis = useMemo(() => {
    if (!result || result.equity_curve.length === 0) return { min: 0, max: 10000 };
    const balances = result.equity_curve.map(p => p.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const padding = (max - min) * 0.1 || 1000;
    return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
  }, [result]);

  const selectedKolName = useMemo(() => {
    const kol = kolsData.find(k => k.id === selectedKol);
    return kol?.name || '';
  }, [kolsData, selectedKol]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      <TickerBar />

      <div className="px-6 py-3 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(selectedKol ? `/kols?kol=${selectedKol}` : '/kols')}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDataOverview')}
          </Button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">{t('backtestTitle')}</h1>
          </div>
          <p className="text-xs text-muted-foreground hidden md:block">{t('backtestSubtitle')}</p>
        </div>

        {/* Parameter Section */}
        <div className="border border-border rounded-lg p-6 bg-card mb-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TableProperties className="w-4 h-4" />
            {t('backtestParamSection')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KOL Selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('selectTrader')}</Label>
              {kolsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedKol} onValueChange={setSelectedKol}>
                  <SelectTrigger className="h-9 bg-background border-border">
                    <SelectValue>
                      {(() => {
                        const found = kolsData.find(k => k.id === selectedKol);
                        return found ? (
                          <div className="flex items-center gap-2">
                            {found.avatar_url ? (
                              <img src={found.avatar_url} alt={found.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <span>⚪</span>
                            )}
                            <span>{found.name}</span>
                          </div>
                        ) : '';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {kolsData.map((kol) => (
                      <SelectItem key={kol.id} value={kol.id}>
                        <div className="flex items-center gap-2">
                          {kol.avatar_url ? (
                            <img src={kol.avatar_url} alt={kol.name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <span>⚪</span>
                          )}
                          <span>{kol.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Initial Capital */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('initialCapital')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  placeholder={t('initialCapitalPlaceholder')}
                  className="pl-9 h-9"
                  min={0}
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('timeRange')}</Label>
              <div className="flex items-center gap-1 flex-wrap">
                {(['7days', '1month', '6months', '1year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-foreground text-background'
                        : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {t(`timeRange_${range}`)}
                  </button>
                ))}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                        timeRange === 'custom'
                          ? 'bg-foreground text-background'
                          : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {timeRange === 'custom' && customDateRange?.from && customDateRange?.to
                        ? `${format(customDateRange.from, 'MM/dd', { locale: language === 'zh' ? zhCN : enUS })} - ${format(customDateRange.to, 'MM/dd', { locale: language === 'zh' ? zhCN : enUS })}`
                        : t('timeRange_custom')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      <span className="text-sm font-medium text-foreground">{t('selectDateRange')}</span>
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

            {/* Leverage */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('leverageSetting')}</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={useCustomLeverage}
                    onCheckedChange={setUseCustomLeverage}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-xs">
                    {useCustomLeverage ? t('useCustomLeverage') : t('useSignalLeverage')}
                  </span>
                </div>
                {useCustomLeverage && (
                  <div className="relative">
                    <Input
                      type="number"
                      value={customLeverage}
                      onChange={(e) => setCustomLeverage(e.target.value)}
                      placeholder={t('customLeveragePlaceholder')}
                      className="h-9 pr-8"
                      min={1}
                      max={200}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">x</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invest Mode Row */}
          <div className="mt-6 pt-6 border-t border-border">
            <Label className="text-xs text-muted-foreground mb-3 block">{t('investMode')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fixed Invest Card */}
              <div
                onClick={() => setInvestMode('fixed')}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  investMode === 'fixed'
                    ? 'border-foreground bg-foreground/5 shadow-sm'
                    : 'border-border hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    investMode === 'fixed' ? 'border-foreground' : 'border-muted-foreground'
                  }`}>
                    {investMode === 'fixed' && <div className="w-2 h-2 rounded-full bg-foreground" />}
                  </div>
                  <span className="text-sm font-medium">{t('fixedInvest')}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 ml-6">{t('fixedInvestDesc')}</p>

                {investMode === 'fixed' && (
                  <div className="ml-6 space-y-3">
                    {/* Invest Type Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setInvestType('amount'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          investType === 'amount'
                            ? 'bg-foreground text-background'
                            : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        {t('byAmount')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setInvestType('percent'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          investType === 'percent'
                            ? 'bg-foreground text-background'
                            : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        {t('byPercent')}
                      </button>
                    </div>

                    {/* Input */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      {investType === 'amount' ? (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            value={investValue}
                            onChange={(e) => setInvestValue(e.target.value)}
                            placeholder={t('investAmountPlaceholder')}
                            className="pl-8 h-8 text-sm"
                            min={0}
                          />
                        </>
                      ) : (
                        <>
                          <Input
                            type="number"
                            value={investValue}
                            onChange={(e) => setInvestValue(e.target.value)}
                            placeholder={t('investPercentPlaceholder')}
                            className="pr-8 h-8 text-sm"
                            min={0}
                            max={100}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </>
                      )}
                    </div>

                    {/* Hint */}
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>
                        {investType === 'amount'
                          ? t('investAmountHint').replace('{value}', investValue || '0')
                          : t('investPercentHint').replace('{value}', investValue || '0')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Compound Invest Card */}
              <div
                onClick={() => setInvestMode('compound')}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  investMode === 'compound'
                    ? 'border-foreground bg-foreground/5 shadow-sm'
                    : 'border-border hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    investMode === 'compound' ? 'border-foreground' : 'border-muted-foreground'
                  }`}>
                    {investMode === 'compound' && <div className="w-2 h-2 rounded-full bg-foreground" />}
                  </div>
                  <span className="text-sm font-medium">{t('compoundInvest')}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">{t('compoundInvestDesc')}</p>

                {investMode === 'compound' && (
                  <div className="ml-6 mt-3 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      {language === 'zh'
                        ? `初始投入 ${initialCapital || '0'} USDT，每笔交易全额投入，期末资金自动滚入下一笔`
                        : `Start with ${initialCapital || '0'} USDT, fully invested per trade, ending balance rolls into next trade`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleRunBacktest}
              disabled={backtestLoading || !selectedKol}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90 px-8"
            >
              {backtestLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('backtestRunning')}
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  {t('runBacktest')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {backtestLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        )}

        {/* Results */}
        {result && !backtestLoading && (
          <div className="space-y-6">
            {/* Result Header */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">{t('backtestResult')}</h2>
              <span className="text-xs text-muted-foreground">— {selectedKolName}</span>
            </div>

            {/* Tabs */}
            <Tabs value={resultTab} onValueChange={setResultTab}>
              <TabsList className="bg-muted p-1 rounded-md">
                <TabsTrigger
                  value="equity"
                  className="text-xs h-8 px-4 gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  {t('equityCurve')}
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="text-xs h-8 px-4 gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {t('summaryMetrics')}
                </TabsTrigger>
                <TabsTrigger
                  value="trades"
                  className="text-xs h-8 px-4 gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all"
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  {t('tradeDetail')}
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="text-xs h-8 px-4 gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm transition-all"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {t('monthlyStats')}
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Equity Curve */}
              <TabsContent value="equity" className="mt-4">
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t('equityCurve')}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                        {t('accountBalance')}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-green-500 inline-block rounded" />
                        {t('cumulativeReturn')}
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={result.equity_curve}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        yAxisId="balance"
                        domain={[equityAxis.min, equityAxis.max]}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                      />
                      <YAxis
                        yAxisId="return"
                        orientation="right"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'balance'
                            ? `$${Number(value).toLocaleString()}`
                            : `${Number(value).toFixed(2)}%`,
                          name === 'balance'
                            ? (language === 'zh' ? '账户余额' : 'Balance')
                            : (language === 'zh' ? '累计收益率' : 'Cumulative Return'),
                        ]}
                      />
                      <Area
                        yAxisId="balance"
                        type="monotone"
                        dataKey="balance"
                        stroke="#3B82F6"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="return"
                        type="monotone"
                        dataKey="cumulative_return"
                        stroke="#22C55E"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* Tab 2: Summary Metrics */}
              <TabsContent value="summary" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label={t('initialCapital')}
                    value={`$${Number(result.summary.initial_capital).toLocaleString()}`}
                  />
                  <MetricCard
                    label={t('finalCapital')}
                    value={`$${Number(result.summary.final_capital).toLocaleString()}`}
                    color={result.summary.final_capital >= result.summary.initial_capital ? 'green' : 'red'}
                  />
                  <MetricCard
                    label={t('totalReturnRate')}
                    value={`${result.summary.total_return_rate >= 0 ? '+' : ''}${Number(result.summary.total_return_rate).toFixed(2)}%`}
                    color={result.summary.total_return_rate >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    label={t('totalPnLAmount')}
                    value={`${result.summary.total_pnl >= 0 ? '+' : ''}$${Number(result.summary.total_pnl).toLocaleString()}`}
                    color={result.summary.total_pnl >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    label={t('winRate')}
                    value={`${Number(result.summary.win_rate).toFixed(2)}%`}
                  />
                  <MetricCard
                    label={t('maxDrawdown')}
                    value={`${Number(result.summary.max_drawdown).toFixed(2)}%`}
                    color="red"
                  />
                  <MetricCard
                    label={t('profitFactorLabel')}
                    value={Number(result.summary.profit_factor).toFixed(2)}
                  />
                  <MetricCard
                    label={t('avgReturnPerTrade')}
                    value={`${result.summary.avg_return_per_trade >= 0 ? '+' : ''}${Number(result.summary.avg_return_per_trade).toFixed(2)}%`}
                    color={result.summary.avg_return_per_trade >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    label={t('totalTradesCount')}
                    value={String(result.summary.total_trades)}
                  />
                  <MetricCard
                    label={t('winCount')}
                    value={String(result.summary.win_count)}
                    color="green"
                  />
                  <MetricCard
                    label={t('lossCount')}
                    value={String(result.summary.loss_count)}
                    color="red"
                  />
                  <MetricCard
                    label={t('maxSingleProfit')}
                    value={`+$${Number(result.summary.max_single_profit).toLocaleString()}`}
                    color="green"
                  />
                </div>
              </TabsContent>

              {/* Tab 3: Trade Details */}
              <TabsContent value="trades" className="mt-4">
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-medium">{t('tradeDetail')}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{tradePage} / {tradeTotalPages} · {result.trades.length}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setTradePage(p => Math.max(1, p - 1))}
                        disabled={tradePage <= 1}
                      >
                        {t('previousPage')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setTradePage(p => Math.min(tradeTotalPages, p + 1))}
                        disabled={tradePage >= tradeTotalPages}
                      >
                        {t('nextPage')}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/50">
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('tradePair')}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('tradeDirection')}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('leverage')}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('entryPrice')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('backtestInvestAmount')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('backtestPnlAmount')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('returnRate')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('backtestBalanceBefore')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('backtestBalanceAfter')}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('closeTime')}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('signalStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTrades.map((trade, idx) => (
                          <tr key={trade.signal_id || idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 font-medium">{trade.symbol}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 font-bold ${trade.direction === 'long' ? 'text-accent-green' : 'text-accent-red'}`}>
                                {trade.direction === 'long' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {t(trade.direction === 'long' ? 'longPosition' : 'shortPosition')}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">{trade.leverage}x</span>
                            </td>
                            <td className="px-3 py-2">${Number(trade.entry_price).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">${Number(trade.invest_amount).toLocaleString()}</td>
                            <td className={`px-3 py-2 text-right font-medium ${trade.pnl_amount >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                              {trade.pnl_amount >= 0 ? '+' : ''}${Number(trade.pnl_amount).toFixed(2)}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${trade.pnl_percentage >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                              {trade.pnl_percentage >= 0 ? '+' : ''}{Number(trade.pnl_percentage).toFixed(2)}%
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">${Number(trade.balance_before).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">${Number(trade.balance_after).toLocaleString()}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {trade.exit_time ? format(new Date(trade.exit_time), 'MM/dd HH:mm') : '-'}
                            </td>
                            <td className={`px-3 py-2 font-medium ${trade.exit_type === 'take_profit' ? 'text-accent-green' : trade.exit_type === 'stop_loss' ? 'text-accent-red' : 'text-muted-foreground'}`}>
                              {trade.exit_type === 'take_profit' ? t('tpHit') : trade.exit_type === 'stop_loss' ? t('slHit') : trade.exit_type === 'draw' ? t('drawHit') : trade.exit_type === 'manual' ? t('manualClose') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Monthly Stats */}
              <TabsContent value="monthly" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Bar Chart */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {t('backtestMonthReturn')}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={result.monthly_stats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [`${Number(value).toFixed(2)}%`, language === 'zh' ? '月收益率' : 'Monthly Return']}
                        />
                        <Bar dataKey="return_rate" radius={[4, 4, 0, 0]}>
                          {result.monthly_stats.map((entry, index) => (
                            <Cell key={index} fill={entry.return_rate >= 0 ? '#22C55E' : '#EF4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monthly Table */}
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-medium">{t('monthlyStats')}</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('backtestMonth')}</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('backtestMonthPnl')}</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('backtestMonthReturn')}</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('backtestMonthTrades')}</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('backtestMonthWinRate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.monthly_stats.map((row) => (
                            <tr key={row.month} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2 font-medium">{row.month}</td>
                              <td className={`px-4 py-2 text-right font-medium ${row.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                {row.pnl >= 0 ? '+' : ''}${Number(row.pnl).toFixed(2)}
                              </td>
                              <td className={`px-4 py-2 text-right font-medium ${row.return_rate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                {row.return_rate >= 0 ? '+' : ''}{Number(row.return_rate).toFixed(2)}%
                              </td>
                              <td className="px-4 py-2 text-right text-foreground">{row.trade_count}</td>
                              <td className="px-4 py-2 text-right text-foreground">
                                {row.trade_count > 0 ? `${((row.win_count / row.trade_count) * 100).toFixed(1)}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Metric Card ----

const MetricCard = ({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) => (
  <div className="border border-border rounded-lg p-4 bg-card">
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className={`text-xl font-bold ${
      color === 'green' ? 'text-accent-green' : color === 'red' ? 'text-accent-red' : 'text-foreground'
    }`}>
      {value}
    </div>
  </div>
);

export default BacktestPage;
