import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { models } from '@/lib/chartData';
import { useLanguage } from '@/lib/i18n';
import { generateCommentsList } from '@/lib/danmakuMessages';
import { ScrollArea } from '@/components/ui/scroll-area';

const Sidebar = () => {
  const [filterModel, setFilterModel] = useState('all');
  const { t } = useLanguage();
  
  const comments = useMemo(() => generateCommentsList(), []);

  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      <Tabs defaultValue="pending" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="trades" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            {t('completedTrades').split(' ').join('\n')}
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            {t('pendingOrders')}
          </TabsTrigger>
          <TabsTrigger 
            value="positions" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            {t('positions')}
          </TabsTrigger>
          <TabsTrigger 
            value="comments" 
            className="flex-1 rounded-none py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            {t('comments')}
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
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="p-3 rounded-lg bg-secondary/50 border border-border"
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
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;
