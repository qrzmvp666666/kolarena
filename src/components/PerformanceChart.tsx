import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartData, models } from '@/lib/chartData';
import { useMemo } from 'react';

interface PerformanceChartProps {
  visibleModels: string[];
  displayMode: '$' | '%';
}

const PerformanceChart = ({ visibleModels, displayMode }: PerformanceChartProps) => {
  const formatYAxis = (value: number) => {
    if (displayMode === '%') {
      const returnRate = ((value - 10000) / 10000) * 100;
      const sign = returnRate >= 0 ? '+' : '';
      return `${sign}${returnRate.toFixed(0)}%`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatXAxis = (value: string) => {
    const parts = value.split(' ');
    return parts.slice(0, 2).join(' ');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 font-mono text-xs">
          <p className="text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const value = entry.value as number;
            const returnRate = ((value - 10000) / 10000) * 100;
            const sign = returnRate >= 0 ? '+' : '';
            return (
              <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
                <span>{entry.name.toUpperCase()}</span>
                <span>
                  {displayMode === '%' 
                    ? `${sign}${returnRate.toFixed(2)}%`
                    : `$${value.toLocaleString()}`
                  }
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Get last data point for labels and calculate Y positions
  const lastDataPoint = chartData[chartData.length - 1];
  
  // Chart domain configuration
  const yMin = 6000;
  const yMax = 14500;
  
  // Calculate avatar positions based on chart values
  const avatarPositions = useMemo(() => {
    return models
      .filter(model => visibleModels.includes(model.id))
      .map(model => {
        const value = lastDataPoint[model.id as keyof typeof lastDataPoint] as number;
        // Calculate percentage position from bottom (inverted for CSS)
        const percentage = ((value - yMin) / (yMax - yMin)) * 100;
        return {
          ...model,
          value,
          topPercentage: 100 - percentage,
        };
      })
      .sort((a, b) => a.value - b.value); // Sort by value for proper stacking
  }, [visibleModels, lastDataPoint]);

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 100, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="1 1" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            domain={[yMin, yMax]}
            ticks={[6000, 8000, 10000, 12000, 14000]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={10000} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
          
          {models.map((model) => (
            visibleModels.includes(model.id) && (
              <Line
                key={model.id}
                type="monotone"
                dataKey={model.id}
                name={model.shortName}
                stroke={model.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Avatar markers at end of lines */}
      <div 
        className="absolute flex flex-col gap-0"
        style={{ 
          right: '4px',
          top: '20px',
          bottom: '20px',
        }}
      >
        {avatarPositions.map((model) => (
          <div
            key={model.id}
            className="absolute flex items-center gap-2 transition-all duration-300"
            style={{ 
              top: `${model.topPercentage}%`,
              transform: 'translateY(-50%)',
              right: 0,
            }}
          >
            {/* Avatar circle with person image + pulse effect */}
            <div className="relative">
              {/* Pulse ring */}
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: model.color }}
              />
              {/* Static outer glow */}
              <div 
                className="absolute -inset-1 rounded-full opacity-40 blur-sm"
                style={{ backgroundColor: model.color }}
              />
              {/* Avatar */}
              <div 
                className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 overflow-hidden"
                style={{ 
                  borderColor: model.color,
                  backgroundColor: model.color,
                }}
              >
                <img 
                  src={model.avatar} 
                  alt={model.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Value label */}
            <div className="flex flex-col items-start font-mono">
              <span 
                className="text-xs font-semibold"
                style={{ color: model.color }}
              >
                {displayMode === '%' 
                  ? `${((model.value - 10000) / 10000) >= 0 ? '+' : ''}${(((model.value - 10000) / 10000) * 100).toFixed(2)}%`
                  : `$${model.value.toLocaleString()}`
                }
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceChart;
