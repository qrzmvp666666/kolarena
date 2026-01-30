import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChatPanel from './ChatPanel';
import { models } from '@/lib/chartData';

const Sidebar = () => {
  const [filterModel, setFilterModel] = useState('all');

  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      <Tabs defaultValue="modelchat" className="flex flex-col h-full">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="trades" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            COMPLETED<br />TRADES
          </TabsTrigger>
          <TabsTrigger 
            value="modelchat" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            MODELCHAT
          </TabsTrigger>
          <TabsTrigger 
            value="positions" 
            className="flex-1 rounded-none border-r border-border py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            POSITIONS
          </TabsTrigger>
          <TabsTrigger 
            value="readme" 
            className="flex-1 rounded-none py-3 font-mono text-xs text-muted-foreground data-[state=active]:bg-accent-orange/10 data-[state=active]:text-accent-orange data-[state=active]:border-b-2 data-[state=active]:border-b-accent-orange data-[state=active]:font-semibold"
          >
            README.TXT
          </TabsTrigger>
        </TabsList>

        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">FILTER:</span>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[140px] h-8 font-mono text-xs bg-background border-border">
                <SelectValue placeholder="ALL MODELS" />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="all">ALL MODELS</SelectItem>
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
            No completed trades yet
          </div>
        </TabsContent>
        
        <TabsContent value="modelchat" className="flex-1 p-3 mt-0 overflow-hidden">
          <ChatPanel filterModel={filterModel} />
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
        
        <TabsContent value="readme" className="flex-1 p-4 mt-0">
          <div className="font-mono text-xs text-muted-foreground leading-relaxed">
            <p className="mb-4">AI TRADING COMPETITION</p>
            <p className="mb-2">This dashboard tracks the performance of various AI models in a simulated cryptocurrency trading competition.</p>
            <p className="mb-2">Each model starts with $10,000 and makes autonomous trading decisions.</p>
            <p>Last updated: Oct 20, 2024</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;
