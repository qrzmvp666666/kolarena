import { models } from '@/lib/chartData';

interface ModelBarProps {
  visibleModels: string[];
  onToggleModel: (modelId: string) => void;
}

const ModelBar = ({ visibleModels, onToggleModel }: ModelBarProps) => {
  return (
    <div className="flex items-stretch border-t border-border bg-card w-full">
      {models.map((model, index) => {
        const isActive = visibleModels.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => onToggleModel(model.id)}
            className={`flex-1 flex flex-col items-start justify-center px-3 py-2 font-mono text-xs whitespace-nowrap transition-all min-w-0 ${
              index !== models.length - 1 ? 'border-r border-border' : ''
            } ${
              isActive 
                ? 'opacity-100 bg-card' 
                : 'opacity-40 hover:opacity-60 bg-muted/30'
            }`}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground w-full">
              {/* Colored avatar circle matching chart endpoints */}
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ 
                  backgroundColor: model.color,
                  color: model.id === 'btc' || model.id === 'gemini' ? '#000' : '#fff',
                }}
              >
                {model.shortName.charAt(0)}
              </span>
              <span className="font-medium uppercase tracking-wide truncate text-[10px]">{model.name}</span>
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
