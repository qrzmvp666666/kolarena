import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useMemo } from 'react';
import { models, chartData } from '@/lib/chartData';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';

interface CryptoConfig {
  symbol: string;
  icon: string;
  color: string;
}

const cryptoConfigs: CryptoConfig[] = [
  { symbol: 'BTCUSDT', icon: '/crypto/btc.svg', color: '#F7931A' },
  { symbol: 'ETHUSDT', icon: '/crypto/eth.svg', color: '#627EEA' },
  { symbol: 'SOLUSDT', icon: '/crypto/sol.svg', color: '#00FFA3' },
  { symbol: 'BNBUSDT', icon: '/crypto/bnb.svg', color: '#F3BA2F' },
  { symbol: 'DOGEUSDT', icon: '/crypto/doge.svg', color: '#C2A633' },
  { symbol: 'XRPUSDT', icon: '/crypto/xrp.svg', color: '#23292F' },
];

const TickerBar = () => {
  const { t } = useLanguage();
  const { prices, priceChanges, isConnected, isFallback } = useBinanceWebSocket();

  // Calculate highest and lowest performers based on latest chart data
  const { highest, lowest } = useMemo(() => {
    const latestData = chartData[chartData.length - 1];
    if (!latestData) return { highest: null, lowest: null };

    const modelValues = models.map(model => {
      const value = latestData[model.id as keyof typeof latestData] as number;
      const startValue = 10000;
      const returnRate = ((value - startValue) / startValue) * 100;
      return {
        ...model,
        value,
        returnRate
      };
    });

    const sorted = [...modelValues].sort((a, b) => b.value - a.value);
    return {
      highest: sorted[0],
      lowest: sorted[sorted.length - 1]
    };
  }, []);

  const formatPrice = (price: number) => {
    if (!price) return '$0.00';
    if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatReturnRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  const getDisplaySymbol = (fullSymbol: string) => {
    return fullSymbol.replace('USDT', '');
  };

  const getPriceChangeColor = (symbol: string) => {
    const change = priceChanges[symbol];
    if (!change || change.direction === 'none') return 'text-foreground';
    return change.direction === 'up' ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border text-xs">
      {/* Crypto Prices */}
      <div className="flex items-center gap-6">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-yellow-500" />
          )}
          {isFallback && (
            <span className="text-yellow-500 text-[10px]">HTTP</span>
          )}
        </div>

        {cryptoConfigs.map((config) => {
          const tickerData = prices[config.symbol];
          const price = tickerData?.price || 0;

          return (
            <div 
              key={config.symbol} 
              className="flex items-center gap-2 font-mono"
            >
              <img 
                src={config.icon} 
                alt={config.symbol}
                className="w-4 h-4"
                style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' }}
              />
              <span className="text-muted-foreground">{getDisplaySymbol(config.symbol)}</span>
              <span 
                className={`font-medium transition-colors duration-300 ${getPriceChangeColor(config.symbol)}`}
              >
                {formatPrice(price)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Performance Indicators */}
      <div className="flex items-center gap-6">
        {highest && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-muted-foreground">{t('highest')}:</span>
            <Avatar className="w-5 h-5 rounded-full border-2" style={{ borderColor: highest.color }}>
              <AvatarImage src={highest.avatar} alt={highest.name} />
              <AvatarFallback className="text-[8px]">{highest.shortName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-foreground">{highest.name}</span>
            <span className="text-foreground font-medium">{formatPrice(highest.value)}</span>
            <span className="flex items-center gap-0.5 text-accent-green">
              <TrendingUp size={12} />
              {formatReturnRate(highest.returnRate)}
            </span>
          </div>
        )}
        
        {lowest && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-muted-foreground">{t('lowest')}:</span>
            <Avatar className="w-5 h-5 rounded-full border-2" style={{ borderColor: lowest.color }}>
              <AvatarImage src={lowest.avatar} alt={lowest.name} />
              <AvatarFallback className="text-[8px]">{lowest.shortName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-foreground">{lowest.name}</span>
            <span className="text-foreground font-medium">{formatPrice(lowest.value)}</span>
            <span className="flex items-center gap-0.5 text-accent-red">
              <TrendingDown size={12} />
              {formatReturnRate(lowest.returnRate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TickerBar;
