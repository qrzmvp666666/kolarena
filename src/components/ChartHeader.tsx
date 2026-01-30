import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface ChartHeaderProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const ChartHeader = ({ timeRange, onTimeRangeChange }: ChartHeaderProps) => {
  const [displayMode, setDisplayMode] = useState<'$' | '%'>('$');
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="flex border border-border rounded overflow-hidden">
          <button
            onClick={() => setDisplayMode('$')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '$' 
                ? 'bg-accent-orange/10 text-accent-orange font-semibold' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setDisplayMode('%')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '%' 
                ? 'bg-accent-orange/10 text-accent-orange font-semibold' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            %
          </button>
        </div>
      </div>

      <h1 className="font-mono text-sm font-semibold tracking-wider text-foreground">
        {t('totalAccountValue')}
      </h1>

      <div className="flex items-center gap-2">
        <div className="flex border border-border rounded overflow-hidden">
          <button
            onClick={() => onTimeRangeChange('ALL')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === 'ALL' 
                ? 'bg-accent-orange/10 text-accent-orange font-semibold' 
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('all')}
          </button>
          <button
            onClick={() => onTimeRangeChange('72H')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === '72H' 
                ? 'bg-accent-orange/10 text-accent-orange font-semibold' 
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
