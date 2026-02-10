import { useState, useEffect, useCallback, useMemo } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import SignalListCard from '@/components/SignalListCard';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { enUS, zhCN } from 'date-fns/locale';

const coinTypes = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'XAU', 'PENDLE', 'ARB', 'OP'];

// ---- Types matching DB schema ----
interface SignalRow {
  id: string;
  kol_id: string;
  kol_name: string;
  kol_avatar_url: string;
  symbol: string;
  direction: 'long' | 'short';
  leverage: number;
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
}

// Transform DB row → card props
const transformSignal = (row: SignalRow, isHistory: boolean) => {
  const entryTimeStr = row.entry_time
    ? new Date(row.entry_time).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).replace(/\//g, '/')
    : '-';

  const closeTimeStr = row.exit_time
    ? new Date(row.exit_time).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).replace(/\//g, '/')
    : undefined;

  const isProfit = row.pnl_percentage !== null ? row.pnl_percentage >= 0 : undefined;
  const returnRate = row.pnl_percentage !== null
    ? `${row.pnl_percentage >= 0 ? '+' : ''}${row.pnl_percentage}%`
    : undefined;

  const outcomeMap: Record<string, 'takeProfit' | 'stopLoss' | 'draw'> = {
    take_profit: 'takeProfit',
    stop_loss: 'stopLoss',
    draw: 'draw',
    manual: 'draw',
  };

  return {
    id: row.id,
    author: row.kol_name,
    avatar: row.kol_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.kol_name}`,
    pair: `${row.symbol} 永续`,
    signalType: row.direction,
    leverage: row.leverage ? `${row.leverage}x` : '未提供',
    entryPrice: String(row.entry_price),
    positionMode: row.margin_mode === 'cross' ? '全仓' : '逐仓',
    orderTime: entryTimeStr,
    takeProfit: row.take_profit !== null ? String(row.take_profit) : null,
    stopLoss: row.stop_loss !== null ? String(row.stop_loss) : null,
    profitRatio: row.pnl_ratio || '0:0',
    ...(isHistory ? {
      returnRate,
      isProfit,
      signalDuration: row.signal_duration || undefined,
      closeTime: closeTimeStr,
      outcome: row.exit_type ? outcomeMap[row.exit_type] : undefined,
    } : {}),
  };
};

const SignalsContent = () => {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const { toast } = useToast();
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [followFilter, setFollowFilter] = useState<'all' | 'followed' | 'unfollowed'>('all');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedSignalType, setSelectedSignalType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year' | 'custom'>('7days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // ---- Supabase data ----
  const [activeSignals, setActiveSignals] = useState<SignalRow[]>([]);
  const [historySignals, setHistorySignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Follow / Subscribe state ----
  const [followedKolIds, setFollowedKolIds] = useState<Set<string>>(new Set());
  const [subscribedKolIds, setSubscribedKolIds] = useState<Set<string>>(new Set());

  // Fetch user's follow/subscribe relations
  const fetchRelations = useCallback(async () => {
    if (!user) {
      setFollowedKolIds(new Set());
      setSubscribedKolIds(new Set());
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_user_kol_relations');
      if (error) {
        console.error('Error fetching relations:', error);
        return;
      }
      if (data) {
        setFollowedKolIds(new Set(data.followed_kol_ids || []));
        setSubscribedKolIds(new Set(data.subscribed_kol_ids || []));
      }
    } catch (err) {
      console.error('Error fetching relations:', err);
    }
  }, [user]);

  // Toggle follow handler
  const handleToggleFollow = useCallback(async (kolId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { p_kol_id: kolId });
      if (error) {
        console.error('Error toggling follow:', error);
        return;
      }
      setFollowedKolIds(prev => {
        const next = new Set(prev);
        if (data) next.add(kolId);
        else next.delete(kolId);
        return next;
      });
      toast({
        description: data ? t('followSuccess') : t('unfollowSuccess'),
      });
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  }, [user, t, toast]);

  // Toggle subscribe handler
  const handleToggleSubscribe = useCallback(async (kolId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('toggle_subscription', { p_kol_id: kolId });
      if (error) {
        console.error('Error toggling subscription:', error);
        return;
      }
      setSubscribedKolIds(prev => {
        const next = new Set(prev);
        if (data) next.add(kolId);
        else next.delete(kolId);
        return next;
      });
      toast({
        description: data ? t('subscribeSuccess') : t('unsubscribeSuccess'),
      });
    } catch (err) {
      console.error('Error toggling subscription:', err);
    }
  }, [user, t, toast]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    const [activeRes, closedRes] = await Promise.all([
      supabase.rpc('get_signals', { p_status: 'active', p_limit: 50 }),
      supabase.rpc('get_signals', { p_status: 'closed', p_limit: 50 }),
    ]);
    if (activeRes.data) setActiveSignals(activeRes.data as SignalRow[]);
    if (closedRes.data) setHistorySignals(closedRes.data as SignalRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();
    fetchRelations();

    // Realtime subscription for signals
    const signalsChannel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => {
          fetchSignals();
        }
      )
      .subscribe();

    // Realtime subscription for follows & subscriptions
    const relationsChannel = supabase
      .channel('relations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_follows' },
        () => {
          fetchRelations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions' },
        () => {
          fetchRelations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(relationsChannel);
    };
  }, [fetchSignals, fetchRelations]);

  // Compute subscribed/unsubscribed counts
  const allSignals = [...activeSignals, ...historySignals];
  const subscribedSignals = allSignals.filter(s => subscribedKolIds.has(s.kol_id));
  const unsubscribedSignals = allSignals.filter(s => !subscribedKolIds.has(s.kol_id));

  const followedSignals = allSignals.filter(s => followedKolIds.has(s.kol_id));
  const unfollowedSignals = allSignals.filter(s => !followedKolIds.has(s.kol_id));

  const subscriptionTabs = [
    { id: 'subscribed' as const, label: t('signalSubscribed'), count: subscribedSignals.length },
    { id: 'unsubscribed' as const, label: t('signalUnsubscribed'), count: unsubscribedSignals.length },
  ];

  const followTabs = [
    { id: 'followed' as const, label: t('signalFollowed'), count: followedSignals.length },
    { id: 'unfollowed' as const, label: t('signalUnfollowed'), count: unfollowedSignals.length },
  ];

  const timeRanges = [
    { id: 'today' as const, label: t('timeRange_today') },
    { id: '7days' as const, label: t('timeRange_7days') },
    { id: '1month' as const, label: t('timeRange_1month') },
    { id: '6months' as const, label: t('timeRange_6months') },
    { id: '1year' as const, label: t('timeRange_1year') },
    { id: 'custom' as const, label: t('timeRange_custom') },
  ];

  const handleResetFilters = useCallback(() => {
    setSubscriptionFilter('all');
    setFollowFilter('all');
    setMarketType('futures');
    setSearchQuery('');
    setSelectedPair('all');
    setSelectedSignalType('all');
    setTimeRange('7days');
    setCustomDateRange(undefined);
  }, []);

  const filteredSignals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const buildRange = () => {
      switch (timeRange) {
        case 'today': {
          return { from: startOfToday, to: now };
        }
        case '7days': {
          const from = new Date(now);
          from.setDate(from.getDate() - 7);
          return { from, to: now };
        }
        case '1month': {
          const from = new Date(now);
          from.setMonth(from.getMonth() - 1);
          return { from, to: now };
        }
        case '6months': {
          const from = new Date(now);
          from.setMonth(from.getMonth() - 6);
          return { from, to: now };
        }
        case '1year': {
          const from = new Date(now);
          from.setFullYear(from.getFullYear() - 1);
          return { from, to: now };
        }
        case 'custom': {
          if (customDateRange?.from && customDateRange?.to) {
            const from = new Date(customDateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = new Date(customDateRange.to);
            to.setHours(23, 59, 59, 999);
            return { from, to };
          }
          return null;
        }
        default:
          return null;
      }
    };

    const activeRange = buildRange();

    const matchesFilters = (row: SignalRow) => {
      if (marketType === 'spot') return false;
      if (subscriptionFilter === 'subscribed' && !subscribedKolIds.has(row.kol_id)) return false;
      if (subscriptionFilter === 'unsubscribed' && subscribedKolIds.has(row.kol_id)) return false;
      if (followFilter === 'followed' && !followedKolIds.has(row.kol_id)) return false;
      if (followFilter === 'unfollowed' && followedKolIds.has(row.kol_id)) return false;
      if (selectedPair !== 'all' && !row.symbol.toUpperCase().includes(selectedPair.toUpperCase())) return false;
      if (selectedSignalType !== 'all' && selectedSignalType !== 'spot' && row.direction !== selectedSignalType) return false;
      if (selectedSignalType === 'spot') return false;
      if (query) {
        const symbolText = row.symbol?.toLowerCase() ?? '';
        const nameText = row.kol_name?.toLowerCase() ?? '';
        if (!symbolText.includes(query) && !nameText.includes(query)) return false;
      }
      if (activeRange) {
        const timeValue = row.entry_time ?? row.created_at;
        if (!timeValue) return false;
        const time = new Date(timeValue);
        if (Number.isNaN(time.getTime())) return false;
        if (time < activeRange.from || time > activeRange.to) return false;
      }
      return true;
    };

    return {
      active: activeSignals.filter(matchesFilters),
      history: historySignals.filter(matchesFilters),
    };
  }, [
    activeSignals,
    historySignals,
    subscriptionFilter,
    followFilter,
    marketType,
    searchQuery,
    selectedPair,
    selectedSignalType,
    timeRange,
    customDateRange,
    subscribedKolIds,
    followedKolIds,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation - no danmaku on signals page */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => { }} hideDanmakuToggle />

      {/* Ticker Bar */}
      <TickerBar />

      {/* Main Content */}
      <div className="px-6 py-3">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground mb-0.5">{t('tradingSignals')}</h1>
          <p className="text-xs text-muted-foreground">{t('signalSummary')}</p>
        </div>

        {/* Filter Bar - Row 1 */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: Market Type Toggle + Tabs */}
          <div className="flex items-center gap-4">
            {/* Market Type Toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setMarketType('futures')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${marketType === 'futures'
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

            {/* All Button */}
            <button
              onClick={() => {
                setSubscriptionFilter('all');
                setFollowFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${subscriptionFilter === 'all' && followFilter === 'all'
                  ? 'bg-card border-accent-orange text-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
                }`}
            >
              <span className="text-sm">{t('signalAll')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${subscriptionFilter === 'all' && followFilter === 'all'
                  ? 'bg-accent-orange/20 text-accent-orange'
                  : 'bg-muted text-muted-foreground'
                }`}>
                {allSignals.length}
              </span>
            </button>

            {/* Subscription Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('filterSubscription')}:</span>
              {subscriptionTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSubscriptionFilter(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${subscriptionFilter === tab.id
                      ? 'bg-card border-accent-orange text-foreground'
                      : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                >
                  <span className="text-sm">{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${subscriptionFilter === tab.id ? 'bg-accent-orange/20 text-accent-orange' : 'bg-muted text-muted-foreground'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Follow Tabs */}
            <div className="flex items-center gap-2">
              {followTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFollowFilter(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${followFilter === tab.id
                      ? 'bg-card border-accent-orange text-foreground'
                      : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                >
                  <span className="text-sm">{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${followFilter === tab.id ? 'bg-accent-orange/20 text-accent-orange' : 'bg-muted text-muted-foreground'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-card border-border"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchSignals} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {/* Filter Bar - Row 2: Filters Left, Reset Right */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Trading Pair Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('tradingPair')}:</span>
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-28 h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">{t('allPairs')}</SelectItem>
                  {coinTypes.map(coin => (
                    <SelectItem key={coin} value={coin}>{coin}/USDT</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Signal Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('signalType')}:</span>
              <Select value={selectedSignalType} onValueChange={setSelectedSignalType}>
                <SelectTrigger className="w-24 h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="long">{t('signalLong')}</SelectItem>
                  <SelectItem value="short">{t('signalShort')}</SelectItem>
                  <SelectItem value="spot">{t('signalSpot')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('timeRange')}:</span>
              <div className="flex flex-wrap items-center rounded-lg border border-border overflow-hidden">
                {timeRanges.map(range => (
                  <button
                    key={range.id}
                    onClick={() => {
                      setTimeRange(range.id);
                      if (range.id !== 'custom') setCustomDateRange(undefined);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${timeRange === range.id
                        ? 'bg-accent-orange text-white'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              {timeRange === 'custom' && (
                <div className="w-full md:w-auto md:ml-2">
                  <DatePickerWithRange
                    date={customDateRange}
                    setDate={setCustomDateRange}
                    locale={language === 'zh' ? zhCN : enUS}
                    formatPattern={language === 'zh' ? 'yyyy/MM/dd' : 'MMM dd, yyyy'}
                    placeholder={t('selectDateRange')}
                    buttonClassName="w-full md:w-[260px] text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="ml-auto"
          >
            {t('resetFilters')}
          </Button>
        </div>

        {/* Signal Tabs: Active vs History */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start">
            <TabsTrigger
              value="active"
              className="rounded-none border-b-2 border-transparent py-2 px-4 font-mono text-sm text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
            >
              {t('activeSignals')}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent py-2 px-4 font-mono text-sm text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
            >
              {t('historySignals')}
            </TabsTrigger>
          </TabsList>

          {/* Active Signals List View */}
          <TabsContent value="active" className="mt-0 h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                加载中...
              </div>
            ) : filteredSignals.active.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                暂无有效信号
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredSignals.active.map(row => (
                  <SignalListCard
                    key={row.id}
                    signal={transformSignal(row, false)}
                    isHistory={false}
                    kolId={row.kol_id}
                    isFollowed={followedKolIds.has(row.kol_id)}
                    isSubscribed={subscribedKolIds.has(row.kol_id)}
                    onToggleFollow={handleToggleFollow}
                    onToggleSubscribe={handleToggleSubscribe}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Signals List View */}
          <TabsContent value="history" className="mt-0 h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                加载中...
              </div>
            ) : filteredSignals.history.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                暂无历史信号
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredSignals.history.map(row => (
                  <SignalListCard
                    key={row.id}
                    signal={transformSignal(row, true)}
                    isHistory={true}
                    kolId={row.kol_id}
                    isFollowed={followedKolIds.has(row.kol_id)}
                    isSubscribed={subscribedKolIds.has(row.kol_id)}
                    onToggleFollow={handleToggleFollow}
                    onToggleSubscribe={handleToggleSubscribe}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SignalsContent;
