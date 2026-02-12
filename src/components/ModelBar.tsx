import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { models, chartData } from '@/lib/chartData';

interface ModelBarProps {
  visibleModels: string[];
  onToggleModel: (modelId: string) => void;
}

const ModelBar = ({ visibleModels, onToggleModel }: ModelBarProps) => {
  // Get latest data and calculate return rates
  const { sortedModels, latestData } = useMemo(() => {
    const latest = chartData[chartData.length - 1];
    if (!latest) return { sortedModels: models, latestData: null };

    const modelsWithData = models.map(model => {
      const value = latest[model.id as keyof typeof latest] as number;
      const returnRate = ((value - 10000) / 10000) * 100;
      return {
        ...model,
        value,
        returnRate
      };
    });

    const sorted = [...modelsWithData].sort((a, b) => b.value - a.value);
    return { sortedModels: sorted, latestData: latest };
  }, []);

  return (
    <div className="flex items-stretch border-t border-border bg-card w-full mb-3">
      {sortedModels.map((model, index) => {
        const isActive = visibleModels.includes(model.id);
        const isPositive = model.returnRate >= 0;
        return (
          <button
            key={model.id}
            onClick={() => onToggleModel(model.id)}
            className={`flex-1 flex flex-col items-start justify-center px-4 py-4 font-mono text-xs whitespace-nowrap transition-all min-w-0 ${
              index !== sortedModels.length - 1 ? 'border-r border-border' : ''
            } ${
              isActive
                ? 'opacity-100 bg-background/50'
                : 'opacity-50 hover:opacity-100 hover:bg-muted/50 bg-muted/20'
            }`}
          >
            <span className="flex items-center gap-2 text-muted-foreground w-full">
              {/* Avatar with person image */}
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden border"
                style={{ borderColor: model.color }}
              >
                <img
                  src={model.avatar}
                  alt={model.shortName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium uppercase tracking-wide truncate text-xs">{model.name}</span>
            </span>
            <span className="text-foreground font-semibold text-base mt-1">
              ${model.value.toLocaleString()}
            </span>
            <span className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}{model.returnRate.toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ModelBar;
