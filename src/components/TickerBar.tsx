import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { supabase } from '@/lib/supabase';

interface CryptoConfig {
  symbol: string;
  icon: string;
  color: string;
}

interface KolRow {
  id: string;
  name: string;
  short_name: string;
  icon: string;
  color: string;
  avatar_url: string | null;
  account_value: number;
  return_rate: number;
  total_pnl: number;
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

  // Fetch KOL data from Supabase for highest/lowest
  const [kolData, setKolData] = useState<KolRow[]>([]);

  const fetchKols = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_kols');
      if (error) throw error;
      if (data) setKolData(data as KolRow[]);
    } catch (err) {
      console.error('TickerBar: Error fetching KOLs:', err);
    }
  }, []);

  useEffect(() => {
    fetchKols();

    const channel = supabase
      .channel('tickerbar-kols-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kols' },
        () => { fetchKols(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchKols]);

  // Calculate highest and lowest performers from Supabase data
  const { highest, lowest } = useMemo(() => {
    if (kolData.length === 0) return { highest: null, lowest: null };

    const sorted = [...kolData].sort((a, b) => b.total_pnl - a.total_pnl);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    const mapKol = (k: KolRow) => ({
      name: k.name,
      shortName: k.short_name,
      color: k.color,
      icon: k.icon,
      avatar: k.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${k.name}`,
      value: k.account_value,
      returnRate: k.return_rate,
      totalPnl: k.total_pnl,
    });

    return {
      highest: mapKol(top),
      lowest: mapKol(bottom),
    };
  }, [kolData]);

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
            <span className="text-foreground font-medium">${highest.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
            <span className="text-foreground font-medium">${lowest.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`flex items-center gap-0.5 ${lowest.returnRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {lowest.returnRate >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatReturnRate(lowest.returnRate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TickerBar;
