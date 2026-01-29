import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChartHeaderProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const ChartHeader = ({ timeRange, onTimeRangeChange }: ChartHeaderProps) => {
  const [displayMode, setDisplayMode] = useState<'$' | '%'>('$');

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="flex border border-border rounded overflow-hidden">
          <button
            onClick={() => setDisplayMode('$')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '$' 
                ? 'bg-secondary text-foreground' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setDisplayMode('%')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '%' 
                ? 'bg-secondary text-foreground' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            %
          </button>
        </div>
      </div>

      <h1 className="font-mono text-sm font-semibold tracking-wider text-foreground">
        TOTAL ACCOUNT VALUE
      </h1>

      <div className="flex items-center gap-2">
        <div className="flex border border-border rounded overflow-hidden">
          <button
            onClick={() => onTimeRangeChange('ALL')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === 'ALL' 
                ? 'bg-secondary text-foreground' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => onTimeRangeChange('72H')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === '72H' 
                ? 'bg-secondary text-foreground' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            72H
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartHeader;
