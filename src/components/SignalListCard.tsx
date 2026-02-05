import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';

interface SignalListItem {
  id: string;
  author: string;
  avatar: string;
  pair: string;
  signalType: 'long' | 'short';
  leverage: string;
  entryPrice: string;
  positionMode: string;
  orderTime: string;
  duration?: string;
  takeProfit: string | null;
  stopLoss: string | null;
  profitRatio: string;
  returnRate?: string;
  isProfit?: boolean;
  signalDuration?: string;
  closeTime?: string;
  outcome?: 'takeProfit' | 'stopLoss' | 'draw';
}

interface SignalListCardProps {
  signal: SignalListItem;
  isHistory?: boolean;
}

const SignalListCard = ({ signal, isHistory = false }: SignalListCardProps) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const getSignalTypeStyle = (type: 'long' | 'short') => {
    switch (type) {
      case 'long':
        return 'bg-accent-green/10 text-accent-green border-accent-green/30';
      case 'short':
        return 'bg-accent-red/10 text-accent-red border-accent-red/30';
    }
  };

  const getSignalTypeLabel = (type: 'long' | 'short') => {
    switch (type) {
      case 'long':
        return t('signalLong');
      case 'short':
        return t('signalShort');
    }
  };

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-4 hover:border-foreground/20 transition-all duration-200 cursor-pointer overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outcome Badge - Top Right (历史信号) */}
      {isHistory && signal.outcome && (
        <div className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold text-black rounded ${
          signal.outcome === 'takeProfit' ? 'bg-[rgb(51,240,140)]' :
          signal.outcome === 'stopLoss' ? 'bg-[rgb(240,80,80)]' :
          'bg-yellow-500'
        }`}>
          {signal.outcome === 'takeProfit' ? '止盈' :
           signal.outcome === 'stopLoss' ? '止损' : '平局'}
        </div>
      )}

      {/* Arrow - Below Badge */}
      {isHistory && (
        <div className="absolute top-10 right-3">
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Header: Avatar + Author */}
      <div className={`flex items-center justify-between mb-3 ${isHistory ? 'pr-10' : ''}`}>
        <div className="flex items-center gap-3">
          <img
            src={signal.avatar}
            alt={signal.author}
            className="w-10 h-10 rounded-full border border-border"
          />
          <span className="font-semibold text-foreground text-base">{signal.author}</span>
        </div>
        {!isHistory && (
          <ArrowRight
            className={`w-5 h-5 text-muted-foreground transition-all duration-200 ${
              isHovered ? 'translate-x-1 text-foreground' : ''
            }`}
          />
        )}
      </div>

      {/* Pair & Type & Leverage */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-bold text-foreground">{signal.pair}</span>
        <span className={`text-xs px-2 py-0.5 rounded border ${getSignalTypeStyle(signal.signalType)}`}>
          {getSignalTypeLabel(signal.signalType)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
          {signal.leverage}
        </span>
      </div>

      {/* Info Grid: Entry Price | Position Mode | Return Rate/Order Time */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('entryPrice')}</div>
          <div className="text-sm font-bold text-foreground">{signal.entryPrice}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('positionMode')}</div>
          <div className="text-sm font-bold text-foreground">{signal.positionMode}</div>
        </div>
        <div>
          {isHistory && signal.returnRate ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">{t('returnRate')}</div>
              <div className={`text-sm font-bold ${signal.isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                {signal.returnRate}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">{t('orderTime')}</div>
              <div className="text-sm font-bold text-foreground">{signal.orderTime}</div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: TP / SL / Profit Ratio */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('takeProfit')}</div>
          <div className={`text-sm font-semibold ${signal.takeProfit ? 'text-accent-green' : 'text-accent-green'}`}>
            {signal.takeProfit || t('notProvided')}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('stopLoss')}</div>
          <div className={`text-sm font-semibold ${signal.stopLoss ? 'text-accent-red' : 'text-accent-red'}`}>
            {signal.stopLoss || t('notProvided')}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('profitRatio')}</div>
          <div className="text-sm font-semibold text-foreground">{signal.profitRatio}</div>
        </div>
      </div>

      {/* Row 3: Signal Duration | Order Time | Close Time (历史信号) */}
      {isHistory && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('signalDuration')}</div>
            <div className="text-sm font-bold text-foreground">{signal.signalDuration || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('orderTime')}</div>
            <div className="text-sm font-bold text-foreground">{signal.orderTime}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('closeTime')}</div>
            <div className="text-sm font-bold text-foreground">{signal.closeTime || '-'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalListCard;
