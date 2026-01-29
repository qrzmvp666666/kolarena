import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartData, models } from '@/lib/chartData';

interface PerformanceChartProps {
  visibleModels: string[];
}

const PerformanceChart = ({ visibleModels }: PerformanceChartProps) => {
  const formatYAxis = (value: number) => {
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
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{entry.name.toUpperCase()}</span>
              <span>${entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get last data point for labels
  const lastDataPoint = chartData[chartData.length - 1];

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 120, left: 20, bottom: 20 }}
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
            domain={[6000, 14500]}
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
      
      {/* Value labels at end of lines - styled like reference */}
      <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center gap-2 text-xs font-mono">
        {models
          .filter(model => visibleModels.includes(model.id))
          .sort((a, b) => {
            const aValue = lastDataPoint[a.id as keyof typeof lastDataPoint] as number;
            const bValue = lastDataPoint[b.id as keyof typeof lastDataPoint] as number;
            return bValue - aValue;
          })
          .map((model) => {
            const value = lastDataPoint[model.id as keyof typeof lastDataPoint] as number;
            return (
              <div 
                key={model.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md"
                style={{ 
                  backgroundColor: model.color,
                  color: model.id === 'gemini' || model.id === 'btc' || model.id === 'qwen' ? 'hsl(0, 0%, 10%)' : 'white'
                }}
              >
                <span className="text-sm">{model.icon}</span>
                <span className="font-semibold">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default PerformanceChart;
