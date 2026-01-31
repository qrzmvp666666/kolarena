import { models } from '@/lib/chartData';

interface ModelBarProps {
  visibleModels: string[];
  onToggleModel: (modelId: string) => void;
}

const ModelBar = ({ visibleModels, onToggleModel }: ModelBarProps) => {
  return (
    <div className="flex items-stretch border-t border-border bg-card w-full mb-3">
      {models.map((model, index) => {
        const isActive = visibleModels.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => onToggleModel(model.id)}
            className={`flex-1 flex flex-col items-start justify-center px-4 py-4 font-mono text-xs whitespace-nowrap transition-all min-w-0 ${
              index !== models.length - 1 ? 'border-r border-border' : ''
            } ${
              isActive 
                ? 'opacity-100 bg-card' 
                : 'opacity-40 hover:opacity-60 bg-muted/30'
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
          </button>
        );
      })}
    </div>
  );
};

export default ModelBar;
