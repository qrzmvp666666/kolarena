import { useLanguage } from '@/lib/i18n';

interface ChartHeaderProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  displayMode: '$' | '%';
  onDisplayModeChange: (mode: '$' | '%') => void;
}

const ChartHeader = ({ timeRange, onTimeRangeChange, displayMode, onDisplayModeChange }: ChartHeaderProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="flex border border-border rounded overflow-hidden">
          <button
            onClick={() => onDisplayModeChange('$')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '$'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            $
          </button>
          <button
            onClick={() => onDisplayModeChange('%')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              displayMode === '%'
                ? 'bg-foreground text-background font-semibold'
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
            onClick={() => onTimeRangeChange('7D')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === '7D'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            最近7天
          </button>
          <button
            onClick={() => onTimeRangeChange('1M')}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              timeRange === '1M'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            最近一个月
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartHeader;
