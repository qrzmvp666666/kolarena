import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import PerformanceChart from '@/components/PerformanceChart';
import ModelBar from '@/components/ModelBar';
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
import { Search, Filter, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

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
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
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
        ) : (
          <ProfitComparisonPanel />
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
