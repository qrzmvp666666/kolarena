import { useLanguage } from '@/lib/i18n';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Signal {
  id: string;
  author: string;
  channel: string;
  avatar: string;
  signalType: 'spot' | 'long' | 'short';
  coinType: string;
  signalCount7d: number;
  pair: string;
  entryPrice: string;
  takeProfit: string | null;
  stopLoss: string | null;
  leverage: string | null;
  time: string;
  totalSignals: number;
}

interface SignalCardProps {
  signal: Signal;
}

const SignalCard = ({ signal }: SignalCardProps) => {
  const { t } = useLanguage();

  const getSignalTypeStyle = (type: 'spot' | 'long' | 'short') => {
    switch (type) {
      case 'spot':
        return 'bg-muted text-muted-foreground border-border';
      case 'long':
        return 'bg-accent-green/10 text-accent-green border-accent-green/30';
      case 'short':
        return 'bg-accent-red/10 text-accent-red border-accent-red/30';
    }
  };

  const getSignalTypeLabel = (type: 'spot' | 'long' | 'short') => {
    switch (type) {
      case 'spot':
        return t('signalSpot');
      case 'long':
        return t('signalLong');
      case 'short':
        return t('signalShort');
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors relative">
      {/* Subscribe Button - Top Right */}
      <Button 
        variant="outline" 
        size="sm" 
        className="absolute top-3 right-3 h-7 text-xs border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-white"
      >
        {t('subscribe')}
      </Button>

      {/* Header */}
      <div className="flex items-start mb-3 pr-16">
        <div className="flex items-center gap-3">
          <img 
            src={signal.avatar} 
            alt={signal.author}
            className="w-10 h-10 rounded-full border border-border"
          />
          <div>
            <div className="font-semibold text-foreground text-sm">{signal.author}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
              {signal.channel}
            </div>
          </div>
        </div>
      </div>

      {/* Coin Badge & Signal Count */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-1 bg-muted rounded text-foreground font-medium">
          {signal.coinType}
        </span>
        <span className="text-xs text-accent-blue">
          {t('signal7dCount').replace('{count}', signal.signalCount7d.toString())}
        </span>
      </div>

      {/* Trading Pair & Price with Signal Type */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">{signal.pair.split('/')[0]}</span>
          <span className="text-sm text-muted-foreground">/{signal.pair.split('/')[1]}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Signal Type Badge */}
          <span className={`text-xs px-2 py-1 rounded border self-center ${getSignalTypeStyle(signal.signalType)}`}>
            {getSignalTypeLabel(signal.signalType)}
          </span>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t('entryPrice')}</div>
            <div className="text-xl font-bold text-accent-orange">{signal.entryPrice}</div>
          </div>
        </div>
      </div>

      {/* TP / SL / Leverage */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2 py-1 rounded border ${
          signal.takeProfit 
            ? 'bg-accent-green/10 text-accent-green border-accent-green/30' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {t('takeProfit')} {signal.takeProfit || t('notProvided')}
        </span>
        <span className={`text-xs px-2 py-1 rounded border ${
          signal.stopLoss 
            ? 'bg-accent-red/10 text-accent-red border-accent-red/30' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {t('stopLoss')} {signal.stopLoss || t('notProvided')}
        </span>
        <span className="text-xs px-2 py-1 rounded border bg-muted text-muted-foreground border-border">
          {t('leverage')} {signal.leverage || t('notProvided')}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">{signal.time}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {signal.totalSignals}{t('signalCount')}
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            {t('view')}
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
