import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { chartData, models, ModelData } from '@/lib/chartData';
import { useMemo } from 'react';

interface PerformanceChartProps {
  visibleModels: string[];
  displayMode: '$' | '%' | 'profit';
  timeRange: string;
}

const PerformanceChart = ({ visibleModels, displayMode, timeRange }: PerformanceChartProps) => {
  const formatYAxis = (value: number) => {
    if (displayMode === '%') {
      const returnRate = ((value - 10000) / 10000) * 100;
      const sign = returnRate >= 0 ? '+' : '';
      return `${sign}${returnRate.toFixed(0)}%`;
    }
    if (displayMode === 'profit') {
      const profit = value - 10000;
      const sign = profit >= 0 ? '+' : '-';
      return `${sign}$${Math.abs(profit).toLocaleString()}`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatXAxis = (value: string) => {
    const parts = value.split(' ');
    return parts.slice(0, 2).join(' ');
  };

  // Custom dot component to show avatar at the end of each line
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    const model = models.find(m => m.id === dataKey);

    // Only show avatar on the last data point
    const isLastPoint = payload === filteredChartData[filteredChartData.length - 1];

    if (!isLastPoint || !model || !visibleModels.includes(model.id)) return null;

    const value = payload[dataKey] as number;
    const returnRate = ((value - 10000) / 10000) * 100;
    const profit = value - 10000;

    return (
      <g>
        {/* Outer glow */}
        <circle cx={cx} cy={cy} r="28" fill={model.color} opacity="0.2" />
        <circle cx={cx} cy={cy} r="22" fill={model.color} opacity="0.4" />
        {/* Avatar circle */}
        <circle cx={cx} cy={cy} r="18" fill={model.color} stroke={model.color} strokeWidth="2" />
        {/* Avatar image clipped to circle */}
        <defs>
          <clipPath id={`avatar-clip-${model.id}`}>
            <circle cx={cx} cy={cy} r="15" />
          </clipPath>
        </defs>
        <image
          x={cx - 15}
          y={cy - 15}
          width="30"
          height="30"
          href={model.avatar}
          clipPath={`url(#avatar-clip-${model.id})`}
        />
        {/* Value label to the right of avatar */}
        <text
          x={cx + 28}
          y={cy + 5}
          fill={model.color}
          fontSize="12"
          fontFamily="JetBrains Mono"
          fontWeight="600"
        >
          {displayMode === '%'
            ? `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`
            : displayMode === 'profit'
              ? `${profit >= 0 ? '+' : '-'}$${Math.abs(profit).toLocaleString()}`
              : `$${value.toLocaleString()}`
          }
        </text>
      </g>
    );
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
            const profit = value - 10000;
            return (
              <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
                <span>{entry.name.toUpperCase()}</span>
                <span>
                  {displayMode === '%' 
                    ? `${sign}${returnRate.toFixed(2)}%`
                    : displayMode === 'profit'
                      ? `${profit >= 0 ? '+' : '-'}$${Math.abs(profit).toLocaleString()}`
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

  // Filter chart data based on time range
  const filteredChartData = useMemo(() => {
    const now = new Date();

    if (timeRange === '7D') {
      // Show last 7 days of data
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return chartData.filter(d => d.timestamp >= sevenDaysAgo);
    } else if (timeRange === '1M') {
      // Show all data (30 days)
      return chartData;
    }
    return chartData;
  }, [timeRange]);

  // Generate X-axis ticks based on time range - must match data date format
  const xAxisTicks = useMemo(() => {
    const now = new Date();

    if (timeRange === '7D') {
      // Find the first data point for each of the last 7 days
      const ticks: string[] = [];
      const seenDates = new Set<string>();

      // Iterate through filtered data to find first occurrence of each day
      for (const dataPoint of filteredChartData) {
        const dateStr = dataPoint.date.split(',')[0]; // Get "Feb 3" from "Feb 3, 14:30"
        if (!seenDates.has(dateStr) && seenDates.size < 7) {
          seenDates.add(dateStr);
          ticks.push(dataPoint.date);
        }
      }
      return ticks;
    } else {
      // For 1M, show every 5 days
      const ticks: string[] = [];
      const seenDates = new Set<string>();
      let count = 0;

      for (const dataPoint of filteredChartData) {
        const dateStr = dataPoint.date.split(',')[0];
        if (!seenDates.has(dateStr)) {
          seenDates.add(dateStr);
          if (count % 5 === 0) {
            ticks.push(dataPoint.date);
          }
          count++;
        }
      }
      return ticks;
    }
  }, [timeRange, filteredChartData]);

  // Chart domain configuration
  const yMin = 6000;
  const yMax = 14500;

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={filteredChartData}
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
            ticks={xAxisTicks}
            interval={0}
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
                dot={<CustomDot />}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
      

    </div>
  );
};

export default PerformanceChart;
