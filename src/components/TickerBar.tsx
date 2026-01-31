import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';

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
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">{t('highest')}:</span>
          <span className="text-accent-purple">🟣</span>
          <span className="text-foreground">DEEPSEEK CHAT V3.1</span>
          <span className="text-foreground font-medium">$13,628.83</span>
          <span className="flex items-center gap-0.5 text-accent-green">
            <TrendingUp size={12} />
            +36.29%
          </span>
        </div>
        
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">{t('lowest')}:</span>
          <span className="text-accent-orange">🟠</span>
          <span className="text-foreground">GEMINI 2.5 PRO</span>
          <span className="text-foreground font-medium">$6,753.27</span>
          <span className="flex items-center gap-0.5 text-accent-red">
            <TrendingDown size={12} />
            -32.47%
          </span>
        </div>
      </div>
    </div>
  );
};

export default TickerBar;
