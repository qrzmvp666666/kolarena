import { useLanguage } from '@/lib/i18n';
import { ArrowRight, Star, Bell } from 'lucide-react';

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
  entryStatus?: 'pending' | 'entered';
}

interface SignalListCardProps {
  signal: SignalListItem;
  isHistory?: boolean;
  isFollowed?: boolean;
  isSubscribed?: boolean;
  onToggleFollow?: (kolId: string) => void;
  onToggleSubscribe?: (kolId: string) => void;
  kolId?: string;
}

const SignalListCard = ({ signal, isHistory = false, isFollowed = false, isSubscribed = false, onToggleFollow, onToggleSubscribe, kolId }: SignalListCardProps) => {
  const { t } = useLanguage();

  const getSignalTypeStyle = (type: 'long' | 'short') => {
    switch (type) {
      case 'long':
        return 'bg-[rgb(51,240,140)]/10 text-[rgb(51,240,140)] border-[rgb(51,240,140)]/30';
      case 'short':
        return 'bg-[rgb(240,80,80)]/10 text-[rgb(240,80,80)] border-[rgb(240,80,80)]/30';
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
    >
      {/* Header: Avatar + Author + Follow/Subscribe + Status Badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Left Side: Avatar + Author + Arrow */}
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={signal.avatar}
            alt={signal.author}
            className="w-10 h-10 rounded-full border border-border shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-foreground text-base truncate max-w-[120px]">{signal.author}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </div>

        {/* Right Side: Follow + Subscribe + Status Badge */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5">
            {/* Follow Star Button */}
            {kolId && onToggleFollow && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFollow(kolId); }}
                className={`p-1.5 rounded-md transition-colors ${
                  isFollowed
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isFollowed ? t('unfollow') : t('follow')}
              >
                <Star className={`w-4 h-4 ${isFollowed ? 'fill-yellow-400' : ''}`} />
              </button>
            )}
            {/* Subscribe Bell Button */}
            {kolId && onToggleSubscribe && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSubscribe(kolId); }}
                className={`p-1.5 rounded-md transition-colors ${
                  isSubscribed
                    ? 'text-foreground hover:text-foreground/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isSubscribed ? t('unsubscribe') : t('subscribe')}
              >
                <Bell className={`w-4 h-4 ${isSubscribed ? 'fill-foreground' : ''}`} />
              </button>
            )}
          </div>

          {/* Status Badge (Moved from absolute to flex row for better alignment) */}
          {!isHistory && signal.entryStatus && (
            <div className={`px-2 py-1 text-[11px] font-bold rounded ${
              signal.entryStatus === 'entered' ? 'bg-[rgb(51,240,140)] text-black' : 'bg-foreground text-background'
            }`}>
              {signal.entryStatus === 'entered' ? '已入场' : '待入场'}
            </div>
          )}
          {isHistory && signal.outcome && (
            <div className={`px-2 py-1 text-[11px] font-bold text-black rounded ${
              signal.outcome === 'takeProfit' ? 'bg-[rgb(51,240,140)]' :
              signal.outcome === 'stopLoss' ? 'bg-[rgb(240,80,80)]' :
              'bg-[rgb(120,120,120)] text-white'
            }`}>
              {signal.outcome === 'takeProfit' ? '止盈' :
               signal.outcome === 'stopLoss' ? '止损' : '平局'}
            </div>
          )}
        </div>
      </div>

      {/* Pair & Type & Leverage */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-bold text-foreground whitespace-nowrap">{signal.pair}</span>
        <span className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${getSignalTypeStyle(signal.signalType)}`}>
          {getSignalTypeLabel(signal.signalType)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border inline-flex items-center h-6 leading-none whitespace-nowrap shrink-0">
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
              <div className={`text-sm font-bold ${signal.isProfit ? 'text-[rgb(51,240,140)]' : 'text-[rgb(240,80,80)]'}`}>
                {signal.returnRate}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">{t('orderTime')}</div>
              <div className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground leading-tight">{signal.orderTime}</div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: TP / SL / Profit Ratio */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('takeProfit')}</div>
          <div className={`text-sm font-semibold ${signal.takeProfit ? 'text-[rgb(51,240,140)]' : 'text-[rgb(51,240,140)]'}`}>
            {signal.takeProfit || t('notProvided')}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('stopLoss')}</div>
          <div className={`text-sm font-semibold ${signal.stopLoss ? 'text-[rgb(240,80,80)]' : 'text-[rgb(240,80,80)]'}`}>
            {signal.stopLoss || t('notProvided')}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{t('profitRatio')}</div>
          <div className="text-sm font-semibold text-foreground">{signal.profitRatio}</div>
        </div>
      </div>

      {/* Row 3: Signal Duration | Order Time | Close Time (历史信号) / Duration (有效信号) */}
      {isHistory ? (
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
      ) : signal.duration ? (
        <div className="grid grid-cols-3 gap-4">
          <div></div>
          <div></div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t('duration')}</div>
            <div className="text-sm font-semibold text-foreground">{signal.duration}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SignalListCard;
