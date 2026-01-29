import { useState } from 'react';
import ChartHeader from '@/components/ChartHeader';
import PerformanceChart from '@/components/PerformanceChart';
import ModelBar from '@/components/ModelBar';
import Sidebar from '@/components/Sidebar';
import { models } from '@/lib/chartData';

const Index = () => {
  const [timeRange, setTimeRange] = useState('ALL');
  const [visibleModels, setVisibleModels] = useState<string[]>(models.map(m => m.id));

  const handleToggleModel = (modelId: string) => {
    setVisibleModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono dark">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <ChartHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          
          {/* Chart Area */}
          <div className="flex-1 p-4">
            <PerformanceChart visibleModels={visibleModels} />
          </div>
          
          {/* Model Bar */}
          <ModelBar 
            visibleModels={visibleModels} 
            onToggleModel={handleToggleModel} 
          />
        </div>

        {/* Sidebar */}
        <Sidebar />
      </div>
    </div>
  );
};

export default Index;
