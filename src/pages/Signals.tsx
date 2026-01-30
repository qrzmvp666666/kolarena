import { useState } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import Danmaku from '@/components/Danmaku';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import SignalCard from '@/components/SignalCard';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Mock signal data - generate more traders
const traderNames = [
  'CryptoMaster', 'ETH_Whale', 'GoldAnalyst', 'AltCoinKing', 'Carrysolo668', 
  'TraderNick', 'BitcoinBull', 'SolanaSniper', 'DefiDegen', 'WhaleWatcher',
  'MoonHunter', 'DiamondHands', 'CryptoQueen', 'BlockchainBob', 'TokenTitan',
  'SatoshiFan', 'EtherKing', 'ChartMaster', 'TrendTrader', 'ProfitPro',
  'CoinCollector', 'CryptoNinja', 'MarketMaker', 'SwingKing', 'DayTraderX'
];

const channels = [
  'premium-signals', 'eth-trading', 'xau-signals', 'altcoin-gems', 'btc-premium',
  'nick-analysis', 'whale-alerts', 'defi-plays', 'moon-shots', 'safe-trades'
];

const coinTypes = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'XAU', 'PENDLE', 'ARB', 'OP'];
const signalTypes: ('spot' | 'long' | 'short')[] = ['spot', 'long', 'short'];

const generateMockSignals = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const coinType = coinTypes[Math.floor(Math.random() * coinTypes.length)];
    const hasTP = Math.random() > 0.3;
    const hasSL = Math.random() > 0.3;
    
    return {
      id: String(i + 1),
      author: traderNames[i % traderNames.length],
      channel: channels[Math.floor(Math.random() * channels.length)],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=trader${i}`,
      signalType,
      coinType,
      signalCount7d: Math.floor(Math.random() * 15) + 1,
      pair: `${coinType}/USDT`,
      entryPrice: coinType === 'BTC' ? String(Math.floor(Math.random() * 20000) + 80000) 
        : coinType === 'ETH' ? String(Math.floor(Math.random() * 500) + 1500)
        : coinType === 'SOL' ? String(Math.floor(Math.random() * 50) + 150)
        : String((Math.random() * 100).toFixed(2)),
      takeProfit: hasTP ? String(Math.floor(Math.random() * 10000) + 50000) : null,
      stopLoss: hasSL ? String(Math.floor(Math.random() * 5000) + 70000) : null,
      leverage: Math.random() > 0.7 ? `${Math.floor(Math.random() * 20) + 5}x` : null,
      time: `${Math.floor(Math.random() * 12) + 10}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      totalSignals: Math.floor(Math.random() * 100) + 1,
    };
  });
};

const mockSignals = generateMockSignals(25);

const SignalsContent = () => {
  const { t } = useLanguage();
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'all' as const, label: t('signalAll'), count: 1000 },
    { id: 'subscribed' as const, label: t('signalSubscribed'), count: 0 },
    { id: 'unsubscribed' as const, label: t('signalUnsubscribed'), count: 1000 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Danmaku Layer */}
      {danmakuEnabled && <Danmaku />}
      
      {/* Top Navigation */}
      <TopNav danmakuEnabled={danmakuEnabled} onToggleDanmaku={() => setDanmakuEnabled(!danmakuEnabled)} />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('tradingSignals')}</h1>
          <p className="text-sm text-muted-foreground">{t('signalSummary')}</p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-card border-accent-orange text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
                }`}
              >
                <span className="text-sm">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTab === tab.id ? 'bg-accent-orange/20 text-accent-orange' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-card border-border"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              {t('filter')}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {/* Signal Grid - 5 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {mockSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Signals = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SignalsContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Signals;
