import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoPrice {
  symbol: string;
  price: string;
  icon: string;
}

const cryptoPrices: CryptoPrice[] = [
  { symbol: 'BTC', price: '$110,222.50', icon: '₿' },
  { symbol: 'ETH', price: '$4,039.15', icon: 'Ξ' },
  { symbol: 'SOL', price: '$191.67', icon: '◎' },
  { symbol: 'BNB', price: '$1,124.15', icon: '⬡' },
  { symbol: 'DOGE', price: '$0.2001', icon: 'Ð' },
  { symbol: 'XRP', price: '$2.44', icon: '✕' },
];

const TickerBar = () => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border text-xs">
      {/* Crypto Prices */}
      <div className="flex items-center gap-6">
        {cryptoPrices.map((crypto) => (
          <div key={crypto.symbol} className="flex items-center gap-2 font-mono">
            <span className="text-muted-foreground">{crypto.icon}</span>
            <span className="text-muted-foreground">{crypto.symbol}</span>
            <span className="text-foreground font-medium">{crypto.price}</span>
          </div>
        ))}
      </div>

      {/* Performance Indicators */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">HIGHEST:</span>
          <span className="text-accent-purple">🟣</span>
          <span className="text-foreground">DEEPSEEK CHAT V3.1</span>
          <span className="text-foreground font-medium">$13,628.83</span>
          <span className="flex items-center gap-0.5 text-accent-green">
            <TrendingUp size={12} />
            +36.29%
          </span>
        </div>
        
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">LOWEST:</span>
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
