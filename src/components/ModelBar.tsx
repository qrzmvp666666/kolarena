import { models } from '@/lib/chartData';

interface ModelBarProps {
  visibleModels: string[];
  onToggleModel: (modelId: string) => void;
}

const ModelBar = ({ visibleModels, onToggleModel }: ModelBarProps) => {
  return (
    <div className="flex items-stretch border-t border-border bg-card overflow-x-auto">
      {models.map((model, index) => {
        const isActive = visibleModels.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => onToggleModel(model.id)}
            className={`flex flex-col items-start justify-center px-4 py-2 font-mono text-xs whitespace-nowrap transition-all ${
              index !== models.length - 1 ? 'border-r border-border' : ''
            } ${
              isActive 
                ? 'opacity-100 bg-card' 
                : 'opacity-40 hover:opacity-60 bg-muted/30'
            }`}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span>{model.icon}</span>
              <span className="font-medium uppercase tracking-wide">{model.name}</span>
            </span>
            <span className="text-foreground font-semibold text-sm mt-0.5">
              ${model.value.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ModelBar;
