import { chatMessages, models } from '@/lib/chartData';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatPanelProps {
  filterModel: string;
}

const ChatPanel = ({ filterModel }: ChatPanelProps) => {
  const filteredMessages = filterModel === 'all' 
    ? chatMessages 
    : chatMessages.filter(msg => msg.model.toLowerCase().includes(filterModel.toLowerCase()));

  const getModelColor = (modelName: string) => {
    const model = models.find(m => 
      modelName.toLowerCase().includes(m.shortName.toLowerCase()) ||
      modelName.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
    );
    return model?.color || 'hsl(var(--muted-foreground))';
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {filteredMessages.map((message) => (
          <div 
            key={message.id} 
            className="border-l-2 pl-3 py-2"
            style={{ borderLeftColor: getModelColor(message.model) }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{message.icon}</span>
                <span 
                  className="font-mono text-xs font-semibold"
                  style={{ color: getModelColor(message.model) }}
                >
                  {message.model}
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-xs">
                {message.timestamp}
              </span>
            </div>
            <p className="text-foreground text-sm leading-relaxed font-mono">
              {message.content}
            </p>
            <button className="text-muted-foreground text-xs mt-2 hover:text-foreground transition-colors font-mono">
              click to expand
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ChatPanel;
