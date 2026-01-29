import { models } from '@/lib/chartData';

interface ModelBarProps {
  visibleModels: string[];
  onToggleModel: (modelId: string) => void;
}

const ModelBar = ({ visibleModels, onToggleModel }: ModelBarProps) => {
  return (
    <div className="flex items-center justify-start gap-4 px-4 py-3 border-t border-border bg-card overflow-x-auto">
      {models.map((model) => {
        const isActive = visibleModels.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => onToggleModel(model.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all font-mono text-xs whitespace-nowrap ${
              isActive 
                ? 'opacity-100' 
                : 'opacity-40 hover:opacity-60'
            }`}
            style={{ 
              borderLeft: `3px solid ${model.color}`,
              backgroundColor: isActive ? `${model.color}15` : 'transparent'
            }}
          >
            <span className="flex items-center gap-1.5">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: model.color }}
              />
              <span className="text-foreground font-medium">{model.name}</span>
            </span>
            <span className="text-muted-foreground">${model.value.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModelBar;
