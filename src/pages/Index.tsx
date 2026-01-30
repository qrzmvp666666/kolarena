import { useState } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import ChartHeader from '@/components/ChartHeader';
import PerformanceChart from '@/components/PerformanceChart';
import ModelBar from '@/components/ModelBar';
import Sidebar from '@/components/Sidebar';
import Danmaku from '@/components/Danmaku';
import { models } from '@/lib/chartData';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/lib/i18n';

const Index = () => {
  const [timeRange, setTimeRange] = useState('ALL');
  const [visibleModels, setVisibleModels] = useState<string[]>(models.map(m => m.id));
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);

  const handleToggleModel = (modelId: string) => {
    setVisibleModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background text-foreground font-mono relative">
          {/* Danmaku Layer */}
          {danmakuEnabled && <Danmaku />}
          
          {/* Top Navigation */}
          <TopNav danmakuEnabled={danmakuEnabled} onToggleDanmaku={() => setDanmakuEnabled(!danmakuEnabled)} />
          
          {/* Ticker Bar */}
          <TickerBar />
          
          <div className="flex h-[calc(100vh-88px)]">
            {/* Main Content with Chart and ModelBar */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <ChartHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
              
              {/* Chart Area - fills remaining space */}
              <div className="flex-1 p-4 min-h-0">
                <PerformanceChart visibleModels={visibleModels} />
              </div>
              
              {/* Model Bar - fixed at bottom of main content */}
              <ModelBar 
                visibleModels={visibleModels} 
                onToggleModel={handleToggleModel} 
              />
            </div>

            {/* Sidebar */}
            <Sidebar />
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Index;
