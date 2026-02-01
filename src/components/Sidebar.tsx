import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { models } from '@/lib/chartData';
import { useLanguage } from '@/lib/i18n';
import { danmakuMessages, danmakuColors } from '@/lib/danmakuMessages';

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  color: string;
}

const Sidebar = () => {
  const [filterModel, setFilterModel] = useState('all');
  const [comments, setComments] = useState<Comment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Initialize comments and auto-scroll
  useEffect(() => {
    // Generate initial comments - newest first
    const initialComments: Comment[] = danmakuMessages.slice(0, 15).map((text, index) => ({
      id: `comment-${Date.now()}-${index}`,
      text,
      timestamp: new Date(Date.now() - index * 5000).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      color: danmakuColors[index % danmakuColors.length],
    }));
    
    setComments(initialComments);

    // Add new comment every 3 seconds - insert at the beginning
    const addInterval = setInterval(() => {
      setComments(prev => {
        const randomMessage = danmakuMessages[Math.floor(Math.random() * danmakuMessages.length)];
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          text: randomMessage,
          timestamp: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          color: danmakuColors[Math.floor(Math.random() * danmakuColors.length)],
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
            value="positions" 
            className="flex-1 rounded-none border-r border-border py-2 px-1 font-mono text-[10px] text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t('positions')}
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
        
        <TabsContent value="positions" className="flex-1 p-4 mt-0">
          <div className="font-mono text-xs space-y-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span>ETH</span>
              <span className="text-accent-green">+12.5%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>BTC</span>
              <span className="text-accent-green">+8.2%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>SOL</span>
              <span className="text-accent-green">+15.7%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>XRP</span>
              <span className="text-accent-red">-2.1%</span>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="comments" className="flex-1 mt-0 overflow-hidden">
          <div 
            ref={scrollRef}
            className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            <div className="p-3 space-y-3">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="p-3 rounded-lg bg-secondary/50 border border-border animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="font-mono text-xs font-semibold"
                      style={{ color: comment.color }}
                    >
                      {comment.timestamp}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-foreground">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;
