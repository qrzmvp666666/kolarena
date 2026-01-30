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

// Mock signal data
const mockSignals = [
  {
    id: '1',
    author: 'CryptoMaster',
    channel: 'premium-signals',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=crypto1',
    signalType: 'long' as const,
    coinType: 'BTC',
    signalCount7d: 4,
    pair: 'BTC/USDT',
    entryPrice: '100825',
    takeProfit: '115498',
    stopLoss: '97480',
    leverage: null,
    time: '15:21',
    totalSignals: 2,
  },
  {
    id: '2',
    author: 'ETH_Whale',
    channel: 'eth-trading',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eth2',
    signalType: 'spot' as const,
    coinType: 'ETH',
    signalCount7d: 4,
    pair: 'ETH/USDT',
    entryPrice: '1700',
    takeProfit: null,
    stopLoss: null,
    leverage: null,
    time: '17:04',
    totalSignals: 16,
  },
  {
    id: '3',
    author: 'GoldAnalyst',
    channel: 'xau-signals',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gold3',
    signalType: 'long' as const,
    coinType: 'XAU',
    signalCount7d: 4,
    pair: 'XAU/USDT',
    entryPrice: '5172',
    takeProfit: '5315',
    stopLoss: '5045',
    leverage: null,
    time: '15:11',
    totalSignals: 4,
  },
  {
    id: '4',
    author: 'AltCoinKing',
    channel: 'altcoin-gems',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alt4',
    signalType: 'short' as const,
    coinType: 'PENDLE',
    signalCount7d: 10,
    pair: 'PENDLE/USDT',
    entryPrice: '1.9692',
    takeProfit: null,
    stopLoss: null,
    leverage: null,
    time: '14:55',
    totalSignals: 81,
  },
  {
    id: '5',
    author: 'Carrysolo668',
    channel: 'btc-premium',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carry5',
    signalType: 'long' as const,
    coinType: 'BTC',
    signalCount7d: 4,
    pair: 'BTC/USDT',
    entryPrice: '80300-81200',
    takeProfit: '82500',
    stopLoss: '80300',
    leverage: null,
    time: '14:37',
    totalSignals: 10,
  },
  {
    id: '6',
    author: 'TraderNick',
    channel: 'nick-analysis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nick6',
    signalType: 'short' as const,
    coinType: 'BTC',
    signalCount7d: 10,
    pair: 'BTC/USDT',
    entryPrice: '86000-89000',
    takeProfit: '78000',
    stopLoss: '89500',
    leverage: null,
    time: '14:29',
    totalSignals: 8,
  },
];

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

        {/* Signal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
