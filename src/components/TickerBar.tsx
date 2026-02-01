import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useEffect, useMemo } from 'react';
import { models, chartData } from '@/lib/chartData';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface CryptoPrice {
  symbol: string;
  price: number;
  icon: string;
  color: string;
}

const initialPrices: CryptoPrice[] = [
  { symbol: 'BTC', price: 110222.50, icon: '/crypto/btc.svg', color: '#F7931A' },
  { symbol: 'ETH', price: 4039.15, icon: '/crypto/eth.svg', color: '#627EEA' },
  { symbol: 'SOL', price: 191.67, icon: '/crypto/sol.svg', color: '#00FFA3' },
  { symbol: 'BNB', price: 1124.15, icon: '/crypto/bnb.svg', color: '#F3BA2F' },
  { symbol: 'DOGE', price: 0.2001, icon: '/crypto/doge.svg', color: '#C2A633' },
  { symbol: 'XRP', price: 2.44, icon: '/crypto/xrp.svg', color: '#23292F' },
];

const TickerBar = () => {
  const { t } = useLanguage();
  const [prices, setPrices] = useState(initialPrices);
  const [flashingIndex, setFlashingIndex] = useState<number | null>(null);

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

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * prices.length);
      setFlashingIndex(randomIndex);
      
      setPrices(prev => prev.map((crypto, index) => {
        if (index === randomIndex) {
          // Random price fluctuation between -0.5% and +0.5%
          const change = (Math.random() - 0.5) * 0.01;
          const newPrice = crypto.price * (1 + change);
          return { ...crypto, price: newPrice };
        }
        return crypto;
      }));

      // Remove flash after animation
      setTimeout(() => setFlashingIndex(null), 300);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
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

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border text-xs">
      {/* Crypto Prices */}
      <div className="flex items-center gap-6">
        {prices.map((crypto, index) => (
          <div 
            key={crypto.symbol} 
            className="flex items-center gap-2 font-mono"
          >
            <img 
              src={crypto.icon} 
              alt={crypto.symbol}
              className="w-4 h-4"
              style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' }}
            />
            <span className="text-muted-foreground">{crypto.symbol}</span>
            <span 
              className={`font-medium transition-colors duration-300 ${
                flashingIndex === index 
                  ? 'text-accent-green' 
                  : 'text-foreground'
              }`}
            >
              {formatPrice(crypto.price)}
            </span>
          </div>
        ))}
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
