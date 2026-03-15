import { useState, useEffect, useCallback, useMemo } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import SignalListCard from '@/components/SignalListCard';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import LoginModal from '@/components/LoginModal';
import { formatDateTime, useTimeZone } from '@/lib/timezone';

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
  expected_pnl_ratio: string | null;
  status: 'pending_entry' | 'entered' | 'active' | 'closed' | 'cancelled';
  signal_duration: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
}

// Transform DB row → card props
const transformSignal = (row: SignalRow, isHistory: boolean, timeZone: string) => {
  const entryTimeStr = row.entry_time
    ? formatDateTime(row.entry_time, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }, timeZone)
    : '-';

  const closeTimeStr = row.exit_time
    ? formatDateTime(row.exit_time, {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }, timeZone)
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

  const entryStatus = !isHistory
    ? (row.status === 'pending_entry' ? 'pending' : row.status === 'entered' || row.status === 'active' ? 'entered' : undefined)
    : undefined;

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
    profitRatio: isHistory
      ? (row.pnl_percentage !== null ? Number(row.pnl_percentage).toFixed(2) : '-')
      : (row.expected_pnl_ratio ? Number(row.expected_pnl_ratio).toFixed(2) : '-'),
    isHistorySignal: isHistory,
    entryStatus,
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
  const { timeZone } = useTimeZone();
  const { user } = useUser();
  const { toast } = useToast();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [followFilter, setFollowFilter] = useState<'all' | 'followed' | 'unfollowed'>('all');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedSignalType, setSelectedSignalType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '1month' | '6months' | '1year'>('7days');

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
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
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
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
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
    const [pendingRes, enteredRes, activeRes, closedRes] = await Promise.all([
      supabase.rpc('get_signals', { p_status: 'pending_entry', p_limit: 50 }),
      supabase.rpc('get_signals', { p_status: 'entered', p_limit: 50 }),
      supabase.rpc('get_signals', { p_status: 'active', p_limit: 50 }),
      supabase.rpc('get_signals', { p_status: 'closed', p_limit: 50 }),
    ]);

    const activeLike = [
      ...(pendingRes.data || []),
      ...(enteredRes.data || []),
      ...(activeRes.data || []),
    ] as SignalRow[];
    const activeMap = new Map<string, SignalRow>();
    activeLike.forEach((row) => {
      if (row?.id && !activeMap.has(row.id)) activeMap.set(row.id, row);
    });
    const activeSorted = Array.from(activeMap.values()).sort((a, b) => {
      const aTime = new Date(a.entry_time ?? a.created_at ?? 0).getTime() || 0;
      const bTime = new Date(b.entry_time ?? b.created_at ?? 0).getTime() || 0;
      return bTime - aTime;
    });
    setActiveSignals(activeSorted);

    const historySorted = (closedRes.data as SignalRow[] | null | undefined)
      ? [...(closedRes.data as SignalRow[])].sort((a, b) => {
          const aTime = new Date(a.exit_time ?? a.entry_time ?? a.created_at ?? 0).getTime() || 0;
          const bTime = new Date(b.exit_time ?? b.entry_time ?? b.created_at ?? 0).getTime() || 0;
          return bTime - aTime;
        })
      : [];
    setHistorySignals(historySorted);
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

  const timeRanges = [
    { id: 'today' as const, label: t('timeRange_today') },
    { id: '7days' as const, label: t('timeRange_7days') },
    { id: '1month' as const, label: t('timeRange_1month') },
    { id: '6months' as const, label: t('timeRange_6months') },
    { id: '1year' as const, label: t('timeRange_1year') },
  ];

  const handleResetFilters = useCallback(() => {
    setSubscriptionFilter('all');
    setFollowFilter('all');
    setMarketType('futures');
    setSearchQuery('');
    setSelectedPair('all');
    setSelectedSignalType('all');
    setTimeRange('7days');
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
        default:
          return null;
      }
    };

    const activeRange = buildRange();

    const matchesFilters = (row: SignalRow, useExitTime = false) => {
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
        const timeValue = useExitTime
          ? (row.exit_time ?? row.entry_time ?? row.created_at)
          : (row.entry_time ?? row.created_at);
        if (!timeValue) return false;
        const time = new Date(timeValue);
        if (Number.isNaN(time.getTime())) return false;
        if (time < activeRange.from || time > activeRange.to) return false;
      }
      return true;
    };

    return {
      active: activeSignals.filter((row) => matchesFilters(row, false)),
      history: historySignals.filter((row) => matchesFilters(row, true)),
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
      <div className="px-3 sm:px-6 py-3">
        {/* Filter Bar - Row 1 */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
          <div />

          {/* Search & Actions */}
          <div className="flex flex-col gap-2 w-full xl:w-auto">
            <div className="flex items-center gap-2 w-full xl:w-auto">
              <div className="relative flex-1 xl:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full xl:w-64 bg-card border-border"
                />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchSignals} disabled={loading} title={t('refresh')}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleResetFilters} title={t('resetFilters')}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Bar - Row 2: Filters Left, Reset Right */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-1 sm:flex-wrap sm:overflow-visible sm:gap-6">
            {/* Market Type Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={marketType} onValueChange={(v) => setMarketType(v as 'futures' | 'spot')}>
                <SelectTrigger className="w-[88px] sm:w-[96px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="futures">{t('futures')}</SelectItem>
                  <SelectItem value="spot">{t('spot')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscription Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={subscriptionFilter} onValueChange={(v) => setSubscriptionFilter(v as 'all' | 'subscribed' | 'unsubscribed')}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">{language === 'zh' ? '订阅（全部）' : `${t('filterSubscription')} (All)`}</SelectItem>
                  <SelectItem value="subscribed">{t('signalSubscribed')} ({subscribedSignals.length})</SelectItem>
                  <SelectItem value="unsubscribed">{t('signalUnsubscribed')} ({unsubscribedSignals.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Follow Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={followFilter} onValueChange={(v) => setFollowFilter(v as 'all' | 'followed' | 'unfollowed')}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">{language === 'zh' ? '关注（全部）' : `${t('signalFollowed')} (All)`}</SelectItem>
                  <SelectItem value="followed">{t('signalFollowed')} ({followedSignals.length})</SelectItem>
                  <SelectItem value="unfollowed">{t('signalUnfollowed')} ({unfollowedSignals.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trading Pair Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-muted-foreground">{t('tradingPair')}:</span>
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-[96px] sm:w-28 h-8 text-xs bg-card border-border">
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
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-muted-foreground">{t('signalType')}:</span>
              <Select value={selectedSignalType} onValueChange={setSelectedSignalType}>
                <SelectTrigger className="w-[88px] sm:w-24 h-8 text-xs bg-card border-border">
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

            {/* Time Range Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs text-muted-foreground">{t('timeRange')}:</span>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as 'today' | '7days' | '1month' | '6months' | '1year')}>
                <SelectTrigger className="w-[96px] sm:w-[110px] h-8 text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {timeRanges.map(range => (
                    <SelectItem key={range.id} value={range.id}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Signal Tabs: Active vs History */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start">
            <TabsTrigger
              value="active"
              className="rounded-none border-b-2 border-transparent py-2 px-4 font-mono text-sm text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-foreground data-[state=active]:font-semibold"
            >
              {t('activeSignals')} ({filteredSignals.active.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent py-2 px-4 font-mono text-sm text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-foreground data-[state=active]:font-semibold"
            >
              {t('historySignals')} ({filteredSignals.history.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Signals List View */}
          <TabsContent value="active" className="mt-0 h-[calc(100dvh-320px)] md:h-[calc(100dvh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 sm:pr-2">
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
                    signal={transformSignal(row, false, timeZone)}
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
          <TabsContent value="history" className="mt-0 h-[calc(100dvh-320px)] md:h-[calc(100dvh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 sm:pr-2">
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
                    signal={transformSignal(row, true, timeZone)}
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

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onLogin={() => {}}
      />
    </div>
  );
};

export default SignalsContent;
