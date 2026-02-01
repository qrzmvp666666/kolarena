import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, LogIn } from 'lucide-react';
import { models } from '@/lib/chartData';
import { useLanguage } from '@/lib/i18n';
import { danmakuMessages, danmakuColors } from '@/lib/danmakuMessages';

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

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  color: string;
  userName: string;
  userAvatar: string;
}

const Sidebar = () => {
  const [filterModel, setFilterModel] = useState('all');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // TODO: 接入实际登录状态
  const [commentInput, setCommentInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Initialize comments and auto-scroll
  useEffect(() => {
    // Generate initial comments - newest first
    const initialComments: Comment[] = danmakuMessages.slice(0, 15).map((text, index) => {
      const user = mockUsers[index % mockUsers.length];
      return {
        id: `comment-${Date.now()}-${index}`,
        text,
        timestamp: new Date(Date.now() - index * 5000).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        color: danmakuColors[index % danmakuColors.length],
        userName: user.name,
        userAvatar: user.avatar,
      };
    });

    setComments(initialComments);

    // Add new comment every 3 seconds - insert at the beginning
    const addInterval = setInterval(() => {
      setComments(prev => {
        const randomMessage = danmakuMessages[Math.floor(Math.random() * danmakuMessages.length)];
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          text: randomMessage,
          timestamp: new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          color: danmakuColors[Math.floor(Math.random() * danmakuColors.length)],
          userName: user.name,
          userAvatar: user.avatar,
        };
        const updated = [newComment, ...prev];
        // Keep only last 50 comments to prevent memory issues
        if (updated.length > 50) {
          return updated.slice(0, 50);
        }
        return updated;
      });
    }, 3000);

    return () => clearInterval(addInterval);
  }, []);

  // Auto scroll to top (newest comments are at top)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [comments]);

  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      <Tabs defaultValue="pending" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto flex-shrink-0">
          <TabsTrigger 
            value="comments" 
            className="flex-1 rounded-none border-r border-border py-2 px-1 font-mono text-[10px] text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('comments')}
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className="flex-1 rounded-none border-r border-border py-2 px-1 font-mono text-[10px] text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('pendingOrders')}
          </TabsTrigger>
          <TabsTrigger 
            value="trades" 
            className="flex-1 rounded-none py-2 px-1 font-mono text-[10px] text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('completedTrades')}
          </TabsTrigger>
        </TabsList>

        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{t('filter')}:</span>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[140px] h-8 font-mono text-xs bg-background border-border">
                <SelectValue placeholder={t('allModels')} />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="all">{t('allModels')}</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.icon} {model.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="trades" className="flex-1 p-4 mt-0">
          <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
            {t('noCompletedTrades')}
          </div>
        </TabsContent>
        
        <TabsContent value="pending" className="flex-1 p-4 mt-0">
          <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
            {t('noPendingOrders')}
          </div>
        </TabsContent>
        
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
                      <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                      <AvatarFallback className="text-xs">{comment.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-foreground truncate">
                          {comment.userName}
                        </span>
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: comment.color }}
                        >
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
          <div className="p-4 border-t border-border bg-card">
            {isLoggedIn ? (
              <div className="flex items-start gap-2">
                <Input
                  placeholder={t('writeComment')}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 min-h-[60px] h-auto font-mono text-sm bg-background border-border py-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && commentInput.trim()) {
                      e.preventDefault();
                      // TODO: 发送评论到后端，使用当前登录用户信息
                      const currentUser = mockUsers[0]; // TODO: 替换为实际登录用户
                      const newComment: Comment = {
                        id: `comment-${Date.now()}`,
                        text: commentInput.trim(),
                        timestamp: new Date().toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }),
                        color: danmakuColors[Math.floor(Math.random() * danmakuColors.length)],
                        userName: currentUser.name,
                        userAvatar: currentUser.avatar,
                      };
                      setComments(prev => [newComment, ...prev].slice(0, 50));
                      setCommentInput('');
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  className="h-[60px] px-4"
                  disabled={!commentInput.trim()}
                  onClick={() => {
                    if (commentInput.trim()) {
                      const currentUser = mockUsers[0]; // TODO: 替换为实际登录用户
                      const newComment: Comment = {
                        id: `comment-${Date.now()}`,
                        text: commentInput.trim(),
                        timestamp: new Date().toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }),
                        color: danmakuColors[Math.floor(Math.random() * danmakuColors.length)],
                        userName: currentUser.name,
                        userAvatar: currentUser.avatar,
                      };
                      setComments(prev => [newComment, ...prev].slice(0, 50));
                      setCommentInput('');
                    }
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-[60px] font-mono text-sm gap-2"
                onClick={() => {
                  // TODO: 打开登录弹窗
                  setIsLoggedIn(true); // 临时：点击即登录，用于演示
                }}
              >
                <LogIn className="w-4 h-4" />
                {t('loginToComment')}
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;
