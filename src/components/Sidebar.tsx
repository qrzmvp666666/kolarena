import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, LogIn, ArrowRight } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import { useLanguage } from '@/lib/i18n';
import { useUser } from '@/contexts/UserContext';
import { formatDateTime, useTimeZone } from '@/lib/timezone';
import { supabase } from '@/lib/supabase';

// Mock user data for demo
const mockUsers = [
  { name: 'CryptoMaster', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
  { name: 'ETH_Whale', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' },
  { name: 'GoldAnalyst', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' },
  { name: 'AltCoinKing', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4' },
  { name: 'Carrysolo668', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5' },
  { name: 'TraderNick', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6' },
  { name: 'BitcoinBull', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=7' },
  { name: 'SolanaSniper', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=8' },
  { name: 'DefiDegen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=9' },
  { name: 'WhaleWatcher', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=10' },
];

const coinTypes = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB'];

interface Comment {
  id: number;
  text: string;
  timestamp: string;
  userName: string;
  userAvatar: string | null;
}

interface PendingOrder {
  id: string;
  author: string;
  avatar: string;
  pair: string;
  symbol: string;
  signalType: 'long' | 'short';
  leverage: string;
  entryPrice: string;
  positionMode: string;
  orderTime: string;
  takeProfit: string | null;
  stopLoss: string | null;
  entryStatus?: 'pending' | 'entered';
  rawTime: number;
}

interface CompletedTrade {
  id: string;
  author: string;
  avatar: string;
  pair: string;
  symbol: string;
  signalType: 'long' | 'short';
  leverage: string;
  entryPrice: string;
  closePrice: string;
  positionMode: string;
  openTime: string;
  closeTime: string;
  takeProfit: string | null;
  stopLoss: string | null;
  profit: string;
  isProfit: boolean;
  signalDuration: string;
  returnRate: string;
  profitRatio: string;
  outcome: 'takeProfit' | 'stopLoss' | 'draw';
  rawTime: number;
}

// Remove mock data generation
// const generateMockPendingOrders = ... 
// const generateMockCompletedTrades = ...
// const mockPendingOrders = generateMockPendingOrders(15);
// const mockCompletedTrades = generateMockCompletedTrades(20);

// const Sidebar = () => { ... } 

// We need to fetch real signals similar to Signal.tsx or ChartPage.tsx
// I will rewrite the component to include state for pending/history orders and fetch them.

type SidebarTab = 'comments' | 'pending' | 'history';

interface SidebarProps {
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  onSignalHover?: (signalId: string | null) => void;
  selectedKols?: Set<string>;
  selectedSymbols?: Set<string>;
  selectedDirection?: 'all' | 'long' | 'short';
  selectedTimeRange?: 'all' | '24h' | '3d' | '7d' | '30d';
}

const Sidebar = ({ activeTab, onTabChange, onSignalHover, selectedKols, selectedSymbols, selectedDirection = 'all', selectedTimeRange = 'all' }: SidebarProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSignals, setActiveSignals] = useState<PendingOrder[]>([]);
  const [historySignals, setHistorySignals] = useState<CompletedTrade[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const { user } = useUser();
  const { timeZone } = useTimeZone();

  // Fetch signals
  const fetchSignals = async () => {
    try {
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
        ];
        if (activeLike.length > 0) {
          const activeMap = new Map<string, any>();
          activeLike.forEach((s: any) => {
            if (s?.id && !activeMap.has(s.id)) activeMap.set(s.id, s);
          });
          const mappedActive = Array.from(activeMap.values()).map((s: any) => ({
                id: s.id,
                author: s.kol_name,
                avatar: s.kol_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.kol_name}`,
                pair: `${s.symbol} 永续`, // Assuming symbol like BTC/USDT or BTCUSDT
                symbol: s.symbol,
                signalType: s.direction,
                leverage: s.leverage ? `${s.leverage}x` : '未提供',
                entryPrice: String(s.entry_price),
                positionMode: s.margin_mode === 'cross' ? '全仓' : '逐仓',
            orderTime: formatDateTime(s.entry_time || s.created_at, {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
              }, timeZone),
                takeProfit: s.take_profit ? String(s.take_profit) : null,
                stopLoss: s.stop_loss ? String(s.stop_loss) : null,
            profitRatio: s.expected_pnl_ratio ? Number(s.expected_pnl_ratio).toFixed(2) : '-',
            entryStatus: s.status === 'pending_entry' ? 'pending' : (s.status === 'entered' || s.status === 'active' ? 'entered' : undefined),
            rawTime: new Date(s.entry_time || s.created_at || 0).getTime(),
            _sortTime: new Date(s.entry_time || s.created_at || 0).getTime(),
          }));
          mappedActive.sort((a, b) => (b._sortTime || 0) - (a._sortTime || 0));
          const cleanedActive = mappedActive.map(({ _sortTime, ...rest }) => rest);
          setActiveSignals(cleanedActive);
        } else {
          setActiveSignals([]);
        }

        if (closedRes.data) {
            const mappedHistory = closedRes.data.map((s: any) => ({
                id: s.id,
                author: s.kol_name,
                avatar: s.kol_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.kol_name}`,
                pair: `${s.symbol} 永续`,
                symbol: s.symbol,
                signalType: s.direction,
                leverage: s.leverage ? `${s.leverage}x` : '未提供',
                entryPrice: String(s.entry_price),
                closePrice: String(s.exit_price || s.entry_price), // Fallback if null
                positionMode: s.margin_mode === 'cross' ? '全仓' : '逐仓',
                openTime: formatDateTime(s.entry_time, {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                }, timeZone),
                closeTime: s.exit_time ? formatDateTime(s.exit_time, {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                }, timeZone) : '-',
                takeProfit: s.take_profit ? String(s.take_profit) : null,
                stopLoss: s.stop_loss ? String(s.stop_loss) : null,
                profit: s.pnl_percentage ? `${s.pnl_percentage >= 0 ? '+' : ''}${s.pnl_percentage}%` : '0%',
                isProfit: (s.pnl_percentage || 0) >= 0,
                signalDuration: s.signal_duration || '-',
                returnRate: s.pnl_percentage ? `${s.pnl_percentage}%` : '0%', // slightly redundant with profit
                profitRatio: s.pnl_ratio ? Number(s.pnl_ratio).toFixed(2) : '-',
                outcome: s.exit_type === 'take_profit' ? 'takeProfit' : s.exit_type === 'stop_loss' ? 'stopLoss' : 'draw',
                rawTime: new Date(s.entry_time || s.created_at || 0).getTime()
            }));
            setHistorySignals(mappedHistory);
        }

    } catch (err) {
        console.error("Failed to fetch sidebar signals", err);
    }
  };

  // 获取评论
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_comments', {
        p_target_type: 'global',
        p_target_id: null,
        p_limit: 50
      });

      if (error) throw error;
      if (data) {
        const formattedComments: Comment[] = data.map((comment: any) => ({
          id: comment.id,
          text: comment.content,
          timestamp: formatDateTime(comment.created_at, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }, timeZone),
          userName: comment.user_display_name || 'Anonymous',
          userAvatar: comment.user_avatar_url
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  // 初始化加载和实时订阅
  useEffect(() => {
    fetchComments();
    fetchSignals();

    // 订阅评论表的变化
    const commentChannel = supabase
      .channel('sidebar-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: 'target_type=eq.global'
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();
    
    // 订阅信号表变化
    const signalChannel = supabase
      .channel('sidebar-signals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => { fetchSignals(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(signalChannel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [comments]);

  const getSignalTypeStyle = (type: 'long' | 'short') => {
    switch (type) {
      case 'long':
        return 'bg-[rgb(51,240,140)]/10 text-[rgb(51,240,140)] border-[rgb(51,240,140)]/30';
      case 'short':
        return 'bg-[rgb(240,80,80)]/10 text-[rgb(240,80,80)] border-[rgb(240,80,80)]/30';
    }
  };

  const getSignalTypeLabel = (type: 'long' | 'short') => {
    switch (type) {
      case 'long':
        return t('signalLong');
      case 'short':
        return t('signalShort');
    }
  };

  const currentTab = activeTab ?? 'pending';

  const filteredActiveSignals = activeSignals.filter(s => {
    const matchKol = selectedKols ? selectedKols.has(s.author) : true;
    const matchSymbol = selectedSymbols ? selectedSymbols.has(s.symbol) : true;
    const matchDirection = selectedDirection !== 'all' ? s.signalType === selectedDirection : true;
    const matchTime = selectedTimeRange !== 'all' ? (() => {
      const now = Date.now();
      const timeLimit = selectedTimeRange === '24h' ? 24 * 60 * 60 * 1000 :
                        selectedTimeRange === '3d' ? 3 * 24 * 60 * 60 * 1000 :
                        selectedTimeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                        30 * 24 * 60 * 60 * 1000;
      return (now - s.rawTime) <= timeLimit;
    })() : true;
    return matchKol && matchSymbol && matchDirection && matchTime;
  });

  const filteredHistorySignals = historySignals.filter(s => {
    const matchKol = selectedKols ? selectedKols.has(s.author) : true;
    const matchSymbol = selectedSymbols ? selectedSymbols.has(s.symbol) : true;
    const matchDirection = selectedDirection !== 'all' ? s.signalType === selectedDirection : true;
    const matchTime = selectedTimeRange !== 'all' ? (() => {
      const now = Date.now();
      const timeLimit = selectedTimeRange === '24h' ? 24 * 60 * 60 * 1000 :
                        selectedTimeRange === '3d' ? 3 * 24 * 60 * 60 * 1000 :
                        selectedTimeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                        30 * 24 * 60 * 60 * 1000;
      return (now - s.rawTime) <= timeLimit;
    })() : true;
    return matchKol && matchSymbol && matchDirection && matchTime;
  });

  return (
    <div className="w-full bg-card flex flex-col h-full overflow-hidden">
      <Tabs
        value={currentTab}
        onValueChange={(value) => onTabChange?.(value as SidebarTab)}
        className="flex flex-col h-full overflow-hidden"
      >
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto flex-shrink-0 flex items-center">
          <TabsTrigger
            value="pending"
            className={`flex-1 rounded-none border-r border-border py-2 px-1 font-mono ${language === 'en' ? 'text-[10px]' : 'text-sm'} text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-b-foreground data-[state=active]:font-semibold truncate transition-all`}
          >
            {t('pendingOrders')}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className={`flex-1 rounded-none border-r border-border py-2 px-1 font-mono ${language === 'en' ? 'text-[10px]' : 'text-sm'} text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-b-foreground data-[state=active]:font-semibold truncate transition-all`}
          >
            {t('historySignals')}
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className={`flex-1 rounded-none py-2 px-1 font-mono ${language === 'en' ? 'text-[10px]' : 'text-sm'} text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-b-foreground data-[state=active]:font-semibold truncate transition-all`}
          >
            {t('comments')}
          </TabsTrigger>
        </TabsList>

        {/* Completed Trades Tab */}
        <TabsContent value="history" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
            {filteredHistorySignals.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                {t('noHistoryOrders')}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistorySignals.map((trade) => (
                  <div
                    key={trade.id}
                    className="relative p-3 rounded-lg bg-card hover:bg-muted/80 hover:backdrop-blur-xl hover:shadow-xl hover:shadow-primary/10 border border-border hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group overflow-hidden"
                  >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={trade.avatar} alt={trade.author} />
                        <AvatarFallback className="text-[10px]">{trade.author.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[80px]">{trade.author}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>

                    {/* Outcome Badge (Moved from absolute for alignment) */}
                    <div className={`px-2 py-0.5 text-[10px] font-bold text-black rounded shrink-0 ${
                      trade.outcome === 'takeProfit' ? 'bg-[rgb(51,240,140)]' :
                      trade.outcome === 'stopLoss' ? 'bg-[rgb(240,80,80)]' :
                      'bg-[rgb(120,120,120)] text-white'
                    }`}>
                      {trade.outcome === 'takeProfit' ? '止盈' :
                       trade.outcome === 'stopLoss' ? '止损' : '平局'}
                    </div>
                  </div>

                  {/* Pair & Type & Leverage */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-sm font-medium text-foreground">{trade.pair}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSignalTypeStyle(trade.signalType)}`}>
                      {getSignalTypeLabel(trade.signalType)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                      {trade.leverage}
                    </span>
                  </div>

                  {/* Row 1: Entry Price | Position Mode | Return Rate */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('entryPrice')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{trade.entryPrice}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('positionMode')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{trade.positionMode}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('returnRate')}</div>
                      <div className={`font-mono text-xs font-medium ${trade.isProfit ? 'text-[rgb(51,240,140)]' : 'text-[rgb(240,80,80)]'}`}>
                        {trade.returnRate}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: TP | SL | Profit Ratio */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('takeProfit')}</div>
                      <div className="text-xs font-semibold text-[rgb(51,240,140)]">
                        {trade.takeProfit || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('stopLoss')}</div>
                      <div className="text-xs font-semibold text-[rgb(240,80,80)]">
                        {trade.stopLoss || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('profitRatio')}</div>
                      <div className={`text-xs font-semibold ${trade.profitRatio === '-' ? 'text-muted-foreground' : Number(trade.profitRatio) > 0 ? 'text-[rgb(51,240,140)]' : Number(trade.profitRatio) < 0 ? 'text-[rgb(240,80,80)]' : 'text-foreground'}`}>
                        {trade.profitRatio}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Signal Duration | Order Time | Close Time */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('signalDuration')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{trade.signalDuration}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('orderTime')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{trade.openTime}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('closeTime')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{trade.closeTime}</div>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="pending" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
            {filteredActiveSignals.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                {t('noPendingOrders')}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActiveSignals.map((order) => (
                  <div
                    key={order.id}
                    className="relative p-3 rounded-lg bg-card hover:bg-muted/80 hover:backdrop-blur-xl hover:shadow-xl hover:shadow-primary/10 border border-border hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                    onMouseEnter={() => {
                      if (order.entryStatus === 'pending' || order.entryStatus === 'entered') {
                        onSignalHover?.(order.id);
                      }
                    }}
                    onMouseLeave={() => onSignalHover?.(null)}
                  >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={order.avatar} alt={order.author} />
                        <AvatarFallback className="text-[10px]">{order.author.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[80px]">{order.author}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>

                    {/* Entry Status Badge (Moved from absolute for alignment) */}
                    {order.entryStatus && (
                      <div className={`px-2 py-0.5 text-[10px] font-bold text-black rounded shrink-0 ${
                        order.entryStatus === 'entered' ? 'bg-[rgb(51,240,140)]' : 'bg-[rgb(247,147,26)]'
                      }`}>
                        {order.entryStatus === 'entered' ? '已入场' : '待入场'}
                      </div>
                    )}
                  </div>

                  {/* Pair & Type */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-sm font-medium text-foreground">{order.pair}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSignalTypeStyle(order.signalType)}`}>
                      {getSignalTypeLabel(order.signalType)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                      {order.leverage}
                    </span>
                  </div>

                  {/* Price & Mode */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('entryPrice')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{order.entryPrice}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('positionMode')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{order.positionMode}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('orderTime')}</div>
                      <div className="font-mono text-xs font-medium text-foreground">{order.orderTime}</div>
                    </div>
                  </div>

                  {/* TP / SL / Profit Ratio - 按照截图样式 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('takeProfit')}</div>
                      <div className="text-xs font-semibold text-[rgb(51,240,140)]">
                        {order.takeProfit || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('stopLoss')}</div>
                      <div className="text-xs font-semibold text-[rgb(240,80,80)]">
                        {order.stopLoss || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('expectedPnlRatio')}</div>
                      <div className={`text-xs font-semibold ${order.profitRatio === '-' ? 'text-muted-foreground' : Number(order.profitRatio) > 0 ? 'text-[rgb(51,240,140)]' : Number(order.profitRatio) < 0 ? 'text-[rgb(240,80,80)]' : 'text-foreground'}`}>{order.profitRatio}</div>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            <div className="p-3 space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-lg bg-secondary/50 border border-border animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.userAvatar || undefined} alt={comment.userName} />
                      <AvatarFallback className="text-xs">{comment.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-foreground truncate">
                          {comment.userName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment Input Area */}
          <div className="px-4 py-6 border-t border-border bg-card flex items-center min-h-[90px]">
            {user ? (
              <div className="flex items-start gap-2 w-full">
                <Input
                  placeholder={t('writeComment')}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 h-[52px] font-mono text-sm bg-background border-border"
                  disabled={isSubmitting}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentInput.trim() && !isSubmitting) {
                      e.preventDefault();
                      setIsSubmitting(true);
                      try {
                        const { error } = await supabase.rpc('create_comment', {
                          p_target_type: 'global',
                          p_target_id: null,
                          p_content: commentInput.trim(),
                          p_display_time: new Date().toISOString()
                        });
                        if (error) throw error;
                        setCommentInput('');
                      } catch (error) {
                        console.error('创建评论失败:', error);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-[52px] px-4"
                  disabled={!commentInput.trim() || isSubmitting}
                  onClick={async () => {
                    if (commentInput.trim() && !isSubmitting) {
                      setIsSubmitting(true);
                      try {
                        const { error } = await supabase.rpc('create_comment', {
                          p_target_type: 'global',
                          p_target_id: null,
                          p_content: commentInput.trim(),
                          p_display_time: new Date().toISOString()
                        });
                        if (error) throw error;
                        setCommentInput('');
                      } catch (error) {
                        console.error('创建评论失败:', error);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-[52px] w-full gap-2"
                onClick={() => setLoginModalOpen(true)}
              >
                <LogIn className="w-4 h-4 text-primary" />
                <span className="text-primary font-semibold">{t('loginToComment')}</span>
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
};

export default Sidebar;
