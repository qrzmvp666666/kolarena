import { useState, useMemo, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, RefreshCw, Calendar as CalendarIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, Area, AreaChart } from 'recharts';

// Coin types for filtering
const coinTypes = ['ALL', 'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB'];

// KOL type from Supabase
interface KolData {
  id: string;
  name: string;
  short_name: string | null;
  icon: string | null;
  avatar_url: string | null;
  main_coin: string | null;
  account_value: number;
  return_rate: number;
  total_pnl: number;
  win_rate: number;
  max_profit: number;
  max_loss: number;
  trading_days: number;
  created_at: string;
  updated_at: string;
}

// Transform Supabase data to UI format
const transformKolData = (kols: KolData[]) => {
  const colors = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  return kols.map((kol, index) => ({
    rank: index + 1,
    id: kol.id,
    name: kol.name,
    shortName: kol.short_name || '',
    icon: kol.icon || '👤',
    color: colors[index % colors.length],
    avatar: kol.avatar_url || '',
    accountValue: Number(kol.account_value),
    returnRate: Number(kol.return_rate),
    totalPnL: Number(kol.total_pnl),
    winRate: Number(kol.win_rate),
    maxProfit: Number(kol.max_profit),
    maxLoss: Number(kol.max_loss),
    trades: kol.trading_days,
    mainCoin: kol.main_coin || 'BTC',
  }));
};

// Generate mock profit trend data
const generateProfitTrendData = (traderId: string) => {
  const days = 30;
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

// Generate trade history
const generateTradeHistory = (traderName: string) => {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'BNB/USDT'];
  const directions = ['long', 'short'] as const;
  const types = ['open', 'close'] as const;
  
  return Array.from({ length: 15 }, (_, i) => {
    const direction = directions[Math.floor(Math.random() * 2)];
    const type = types[Math.floor(Math.random() * 2)];
    const pnl = type === 'close' ? (Math.random() - 0.4) * 1000 : 0;
    return {
      id: i + 1,
      time: format(new Date(Date.now() - i * 3600 * 1000 * Math.random() * 24), 'MM/dd HH:mm'),
      pair: pairs[Math.floor(Math.random() * pairs.length)],
      type,
      direction,
      amount: (Math.random() * 2 + 0.1).toFixed(3),
      price: (Math.random() * 50000 + 1000).toFixed(2),
      pnl: Math.round(pnl),
    };
  }).sort((a, b) => b.id - a.id);
};

// Advanced Analysis Component
interface AdvancedAnalysisProps {
  traders: typeof leaderboardData;
  t: (key: string) => string;
  selectedTrader: string;
}

const AdvancedAnalysisContent = ({ traders, t, selectedTrader }: AdvancedAnalysisProps) => {
  const currentTrader = traders.find(tr => tr.id === selectedTrader) || traders[0];
  const profitTrendData = useMemo(() => generateProfitTrendData(selectedTrader), [selectedTrader]);
  const coinDistribution = useMemo(() => generateCoinDistribution(), [selectedTrader]);
  const tradeHistory = useMemo(() => generateTradeHistory(currentTrader?.name || ''), [selectedTrader, currentTrader?.name]);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('totalTrades')}</div>
          <div className="text-2xl font-bold text-foreground">{currentTrader.trades}</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('winRate')}</div>
          <div className="text-2xl font-bold text-foreground">{currentTrader.winRate}%</div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('totalPnL')}</div>
          <div className={`text-2xl font-bold ${currentTrader.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {currentTrader.totalPnL >= 0 ? '+' : ''}${currentTrader.totalPnL.toLocaleString()}
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="text-xs text-muted-foreground mb-1">{t('profitFactor')}</div>
          <div className="text-2xl font-bold text-foreground">{(Math.random() * 1.5 + 0.8).toFixed(2)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Trend Chart */}
        <div className="lg:col-span-2 border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-orange" />
              {t('profitTrend')}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-accent-orange" />
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
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
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
              <Area type="monotone" dataKey="cumulative" stroke="#F97316" fillOpacity={1} fill="url(#colorCumulative)" strokeWidth={2} />
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

      {/* Trade History Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">{t('tradeHistory')}</h3>
        </div>
        <ScrollArea className="max-h-[300px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradeTime')}</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('tradePair')}</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">{t('tradeType')}</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">{t('tradeDirection')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('tradeAmount')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('tradePrice')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('tradePnL')}</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.map((trade) => (
                <tr key={trade.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 text-muted-foreground">{trade.time}</td>
                  <td className="px-4 py-2 text-foreground font-medium">{trade.pair}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      trade.type === 'open' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {t(trade.type)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 ${
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
                  <td className="px-4 py-2 text-right text-foreground">{trade.amount}</td>
                  <td className="px-4 py-2 text-right text-foreground">${trade.price}</td>
                  <td className={`px-4 py-2 text-right font-medium ${
                    trade.pnl === 0 ? 'text-muted-foreground' : trade.pnl > 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {trade.pnl === 0 ? '-' : `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
};


const LeaderboardContent = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overall' | 'advanced'>('overall');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [coinFilter, setCoinFilter] = useState('ALL');
  const [returnRateFilter, setReturnRateFilter] = useState('all');
  const [winRateFilter, setWinRateFilter] = useState('all');
  const [maxLossFilter, setMaxLossFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // KOL data from Supabase
  const [leaderboardData, setLeaderboardData] = useState<ReturnType<typeof transformKolData>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKol, setSelectedKol] = useState('');

  // Fetch KOL data via RPC
  const fetchKols = async () => {
    try {
      const { data, error } = await supabase.rpc('get_kols');
      if (error) throw error;
      const transformed = transformKolData(data || []);
      setLeaderboardData(transformed);
      if (transformed.length > 0 && !selectedKol) {
        setSelectedKol(transformed[0].id);
      }
    } catch (err) {
      console.error('Error fetching KOLs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchKols();

    // Subscribe to Realtime changes on kols table
    const channel = supabase
      .channel('kols-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kols',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Refetch data on any change
          fetchKols();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered data
  const filteredData = useMemo(() => {
    return leaderboardData.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Coin filter
      if (coinFilter !== 'ALL' && item.mainCoin !== coinFilter) {
        return false;
      }
      // Return rate filter
      if (returnRateFilter === 'positive' && item.returnRate < 0) return false;
      if (returnRateFilter === 'negative' && item.returnRate >= 0) return false;
      // Win rate filter
      if (winRateFilter === 'high' && item.winRate < 30) return false;
      if (winRateFilter === 'low' && item.winRate >= 30) return false;
      // Max loss filter
      if (maxLossFilter === 'low' && item.maxLoss < -1000) return false;
      if (maxLossFilter === 'high' && item.maxLoss >= -1000) return false;
      
      return true;
    });
  }, [leaderboardData, searchQuery, coinFilter, returnRateFilter, winRateFilter, maxLossFilter]);

  const winner = filteredData[0] || leaderboardData[0] || null;
  const maxValue = Math.max(...filteredData.map(d => d.accountValue), 1);

  const handleRefresh = () => {
    setSearchQuery('');
    setCoinFilter('ALL');
    setReturnRateFilter('all');
    setWinRateFilter('all');
    setMaxLossFilter('all');
    setTimeRange('month');
    setCustomDateRange({ from: undefined, to: undefined });
    fetchKols(); // Also refetch data
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
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
          <h1 className="text-xl font-bold text-foreground mb-0.5">{t('leaderboard')}</h1>
          <p className="text-xs text-muted-foreground">{t('leaderboardSummary')}</p>
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
                    ? 'bg-accent-orange text-white'
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                activeTab === 'overall'
                  ? 'bg-card border-accent-orange text-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <span className="text-sm">{t('overallData')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === 'overall' ? 'bg-accent-orange/20 text-accent-orange' : 'bg-muted text-muted-foreground'
              }`}>
                {filteredData.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                activeTab === 'advanced'
                  ? 'bg-card border-accent-orange text-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <span className="text-sm">{t('advancedAnalysis')}</span>
            </button>
          </div>

          {/* Search & Actions - Show KOL selector when in advanced tab */}
          <div className="flex items-center gap-3">
            {activeTab === 'advanced' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('selectTrader')}:</span>
                <Select value={selectedKol} onValueChange={setSelectedKol}>
                  <SelectTrigger className="w-[200px] h-9 bg-card border-border">
                    <SelectValue placeholder={leaderboardData[0]?.name}>
                      {leaderboardData.find(t => t.id === selectedKol)?.icon} {leaderboardData.find(t => t.id === selectedKol)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {leaderboardData.map(trader => (
                      <SelectItem key={trader.id} value={trader.id}>
                        <div className="flex items-center gap-2">
                          <span>{trader.icon}</span>
                          <span>{trader.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {/* Coin Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('coinType')}:</span>
              <Select value={coinFilter} onValueChange={setCoinFilter}>
                <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  {coinTypes.map(coin => (
                    <SelectItem key={coin} value={coin}>{coin === 'ALL' ? t('all') : coin}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Max Loss Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('maxLoss')}:</span>
              <Select value={maxLossFilter} onValueChange={setMaxLossFilter}>
                <SelectTrigger className="w-[120px] h-8 font-mono text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="low">{t('lowRisk')}</SelectItem>
                  <SelectItem value="high">{t('highRisk')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('timeRange')}:</span>
              <div className="flex items-center gap-1">
                {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-accent-orange text-white'
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
                          ? 'bg-accent-orange text-white'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {timeRange === 'custom' && customDateRange.from && customDateRange.to
                        ? getTimeRangeLabel()
                        : t('timeRange_custom')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t('selectDateRange')}</span>
                        <div className="flex gap-6 text-xs text-muted-foreground">
                          <span>{t('startDate')}</span>
                          <span>{t('endDate')}</span>
                        </div>
                      </div>
                      <div className="flex border border-border rounded-lg overflow-hidden">
                        <Calendar
                          mode="single"
                          selected={customDateRange.from}
                          onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                          locale={language === 'zh' ? zhCN : enUS}
                          className="pointer-events-auto border-r border-border"
                        />
                        <Calendar
                          mode="single"
                          selected={customDateRange.to}
                          onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                          locale={language === 'zh' ? zhCN : enUS}
                          className="pointer-events-auto"
                          disabled={(date) => customDateRange.from ? date < customDateRange.from : false}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (customDateRange.from && customDateRange.to) {
                            setTimeRange('custom');
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={!customDateRange.from || !customDateRange.to}
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
            {/* Data Table */}
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RANK</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('trader')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('description')}</th>
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
                    {filteredData.map((row, index) => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-accent-orange transition-colors"
                            onClick={() => {
                              setSelectedKol(row.id);
                              setActiveTab('advanced');
                            }}
                          >
                            <span>{row.icon}</span>
                            <span className="text-foreground font-medium hover:text-accent-orange">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left text-muted-foreground text-[10px]">
                          {row.shortName || '-'}
                        </td>
                        <td className="px-4 py-3 text-left text-foreground font-medium">
                          ${row.accountValue.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-left font-medium ${row.returnRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {row.returnRate >= 0 ? '+' : ''}{row.returnRate.toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-left font-medium ${row.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {row.totalPnL >= 0 ? '+' : ''}${row.totalPnL.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-left text-muted-foreground">{row.winRate}%</td>
                        <td className="px-4 py-3 text-left text-accent-green">${row.maxProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-left text-accent-red">-${Math.abs(row.maxLoss).toLocaleString()}</td>
                        <td className="px-4 py-3 text-left text-muted-foreground">{row.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Bottom Section: Winner Card + Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Winner Card */}
              {winner && (
              <div className="lg:col-span-1 border border-border rounded-lg p-6 bg-card">
                <div className="text-sm text-muted-foreground mb-3">{t('winningModel')}</div>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: winner.color + '33' }}
                  >
                    {winner.icon}
                  </div>
                  <span className="text-lg font-bold text-foreground">{winner.name}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">{t('totalEquity')}</div>
                <div className="text-2xl font-bold text-foreground">
                  ${winner.accountValue.toLocaleString()}
                </div>
              </div>
              )}

              {/* Bar Chart Visualization */}
              <div className="lg:col-span-3 border border-border rounded-lg p-6 bg-card">
                <div className="flex items-end justify-between gap-4 h-48">
                  {filteredData.slice(0, 8).map((item) => {
                    const heightPercent = (item.accountValue / maxValue) * 100;
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
                          ${item.accountValue.toLocaleString()}
                        </div>
                        <div className="w-full flex justify-center">
                          <div 
                            className="w-12 rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                            style={{ 
                              height: `${heightPercent * 1.2}px`, 
                              backgroundColor: item.color,
                              minHeight: '20px'
                            }}
                          />
                        </div>
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: item.color + '33' }}
                        >
                          {item.icon}
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center truncate w-full group-hover:text-accent-orange transition-colors">
                          {item.shortName}
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
        ) : (
          <AdvancedAnalysisContent traders={filteredData} t={t} selectedTrader={selectedKol} />
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
