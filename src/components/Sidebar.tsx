import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, LogIn, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useUser } from '@/contexts/UserContext';
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
  signalType: 'long' | 'short';
  leverage: string;
  entryPrice: string;
  positionMode: string;
  orderTime: string;
  takeProfit: string | null;
  stopLoss: string | null;
}

interface CompletedTrade {
  id: string;
  author: string;
  avatar: string;
  pair: string;
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
}

// Generate mock pending orders
const generateMockPendingOrders = (count: number): PendingOrder[] => {
  return Array.from({ length: count }, (_, i) => {
    const signalType = Math.random() > 0.5 ? 'long' : 'short';
    const coinType = coinTypes[Math.floor(Math.random() * coinTypes.length)];
    const hasTP = Math.random() > 0.2;
    const hasSL = Math.random() > 0.2;

    const now = new Date();
    const orderDate = new Date(now.getTime() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    const orderTimeStr = orderDate.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id: `pending-${i + 1}`,
      author: mockUsers[i % mockUsers.length].name,
      avatar: mockUsers[i % mockUsers.length].avatar,
      pair: `${coinType}/USDT 永续`,
      signalType,
      leverage: `${Math.floor(Math.random() * 15) + 5}x`,
      entryPrice: coinType === 'BTC' ? String(Math.floor(Math.random() * 20000) + 80000)
        : coinType === 'ETH' ? String(Math.floor(Math.random() * 500) + 1500)
          : String((Math.random() * 100).toFixed(2)),
      positionMode: Math.random() > 0.5 ? '全仓' : '逐仓',
      orderTime: orderTimeStr,
      takeProfit: hasTP ? String(Math.floor(Math.random() * 5000) + 100000) : null,
      stopLoss: hasSL ? String(Math.floor(Math.random() * 5000) + 70000) : null,
    };
  });
};

// Generate mock completed trades
const generateMockCompletedTrades = (count: number): CompletedTrade[] => {
  return Array.from({ length: count }, (_, i) => {
    const signalType = Math.random() > 0.5 ? 'long' : 'short';
    const coinType = coinTypes[Math.floor(Math.random() * coinTypes.length)];
    const isProfit = Math.random() > 0.4;
    const hasTP = Math.random() > 0.2;
    const hasSL = Math.random() > 0.2;

    const now = new Date();
    const openDate = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const closeDate = new Date(openDate.getTime() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

    const entryPrice = coinType === 'BTC' ? Math.floor(Math.random() * 20000) + 80000
      : coinType === 'ETH' ? Math.floor(Math.random() * 500) + 1500
        : Math.floor(Math.random() * 100);

    const priceChange = isProfit
      ? entryPrice * (1 + Math.random() * 0.3)
      : entryPrice * (1 - Math.random() * 0.2);

    const profitValue = isProfit
      ? `+${(Math.random() * 50).toFixed(1)}%`
      : `-${(Math.random() * 30).toFixed(1)}%`;

    return {
      id: `trade-${i + 1}`,
      author: mockUsers[i % mockUsers.length].name,
      avatar: mockUsers[i % mockUsers.length].avatar,
      pair: `${coinType}/USDT 永续`,
      signalType,
      leverage: `${Math.floor(Math.random() * 15) + 5}x`,
      entryPrice: String(entryPrice),
      closePrice: String(Math.floor(priceChange)),
      positionMode: Math.random() > 0.5 ? '全仓' : '逐仓',
      openTime: openDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      closeTime: closeDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      takeProfit: hasTP ? String(Math.floor(Math.random() * 5000) + 100000) : null,
      stopLoss: hasSL ? String(Math.floor(Math.random() * 5000) + 70000) : null,
      profit: profitValue,
      isProfit,
      signalDuration: `${Math.floor(Math.random() * 48) + 1}h`,
      returnRate: isProfit ? `+${(Math.random() * 30).toFixed(1)}%` : `-${(Math.random() * 20).toFixed(1)}%`,
      profitRatio: '0:0',
      outcome: isProfit ? 'takeProfit' : Math.random() > 0.5 ? 'stopLoss' : 'draw',
    };
  });
};

const mockPendingOrders = generateMockPendingOrders(15);
const mockCompletedTrades = generateMockCompletedTrades(20);

const Sidebar = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { user } = useUser();

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
          timestamp: new Date(comment.created_at).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
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

    // 订阅评论表的变化
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
        return 'bg-accent-green/10 text-accent-green border-accent-green/30';
      case 'short':
        return 'bg-accent-red/10 text-accent-red border-accent-red/30';
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

  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="comments" className="flex flex-col h-full overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto flex-shrink-0">
          <TabsTrigger
            value="comments"
            className="flex-1 rounded-none border-r border-border py-2 px-1 font-mono text-sm text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('comments')}
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="flex-1 rounded-none border-r border-border py-2 px-1 font-mono text-sm text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('pendingOrders')}
          </TabsTrigger>
          <TabsTrigger
            value="trades"
            className="flex-1 rounded-none py-2 px-1 font-mono text-sm text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('completedTrades')}
          </TabsTrigger>
        </TabsList>

        {/* Completed Trades Tab */}
        <TabsContent value="trades" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
            <div className="space-y-3">
              {mockCompletedTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="relative p-3 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all cursor-pointer group overflow-hidden"
                >
                  {/* Outcome Badge - Top Right */}
                  <div className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold text-black rounded ${
                    trade.outcome === 'takeProfit' ? 'bg-[rgb(51,240,140)]' :
                    trade.outcome === 'stopLoss' ? 'bg-[rgb(240,80,80)]' :
                    'bg-yellow-500'
                  }`}>
                    {trade.outcome === 'takeProfit' ? '止盈' :
                     trade.outcome === 'stopLoss' ? '止损' : '平局'}
                  </div>

                  {/* Arrow - Below Badge */}
                  <div className="absolute top-10 right-3">
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 pr-10">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={trade.avatar} alt={trade.author} />
                        <AvatarFallback className="text-[10px]">{trade.author.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-xs font-semibold text-foreground">{trade.author}</span>
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
                      <div className={`font-mono text-xs font-medium ${trade.isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                        {trade.returnRate}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: TP | SL | Profit Ratio */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('takeProfit')}</div>
                      <div className="text-xs font-semibold text-accent-green">
                        {trade.takeProfit || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('stopLoss')}</div>
                      <div className="text-xs font-semibold text-accent-red">
                        {trade.stopLoss || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('profitRatio')}</div>
                      <div className="text-xs font-semibold text-foreground">
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
          </div>
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="pending" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3">
            <div className="space-y-3">
              {mockPendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={order.avatar} alt={order.author} />
                        <AvatarFallback className="text-[10px]">{order.author.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-xs font-semibold text-foreground">{order.author}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
                      <div className="text-xs font-semibold text-accent-green">
                        {order.takeProfit || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('stopLoss')}</div>
                      <div className="text-xs font-semibold text-accent-red">
                        {order.stopLoss || t('notProvided')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{t('profitRatio')}</div>
                      <div className="text-xs font-semibold text-foreground">0:0</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              <div className="relative w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-lg blur-lg opacity-70" />
                <Button
                  variant="outline"
                  className="relative w-full h-[52px] font-mono text-sm gap-2 bg-background/60 backdrop-blur-md border-primary/40 hover:bg-primary/20 hover:border-primary/60 transition-all duration-300 shadow-xl hover:shadow-primary/30"
                >
                  <LogIn className="w-4 h-4 text-primary" />
                  <span className="text-primary font-semibold">{t('loginToComment')}</span>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;
