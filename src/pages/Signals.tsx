import { useState } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import SignalCard from '@/components/SignalCard';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [activeTab, setActiveTab] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedSignalType, setSelectedSignalType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');

  const tabs = [
    { id: 'all' as const, label: t('signalAll'), count: 1000 },
    { id: 'subscribed' as const, label: t('signalSubscribed'), count: 0 },
    { id: 'unsubscribed' as const, label: t('signalUnsubscribed'), count: 1000 },
  ];

  const timeRanges = [
    { id: 'week' as const, label: t('timeRange_week') },
    { id: 'month' as const, label: t('timeRange_month') },
    { id: 'quarter' as const, label: t('timeRange_quarter') },
    { id: 'year' as const, label: t('timeRange_year') },
    { id: 'custom' as const, label: t('timeRange_custom') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation - no danmaku on signals page */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-6 py-3">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground mb-0.5">{t('tradingSignals')}</h1>
          <p className="text-xs text-muted-foreground">{t('signalSummary')}</p>
        </div>

        {/* Filter Bar - Row 1 */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: Market Type Toggle + Tabs */}
          <div className="flex items-center gap-4">
            {/* Market Type Toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setMarketType('futures')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  marketType === 'futures'
                    ? 'bg-accent-orange text-white'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('futures')}
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="px-4 py-2 text-sm font-medium bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                    >
                      {t('spot')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('comingSoon')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Tabs */}
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
              <RefreshCw className="w-4 h-4" />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {/* Filter Bar - Row 2: All Filters on Left */}
        <div className="flex items-center gap-6 mb-6">
          {/* Trading Pair Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('tradingPair')}:</span>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-28 h-8 text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">{t('allPairs')}</SelectItem>
                {coinTypes.map(coin => (
                  <SelectItem key={coin} value={coin}>{coin}/USDT</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Signal Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('signalType')}:</span>
            <Select value={selectedSignalType} onValueChange={setSelectedSignalType}>
              <SelectTrigger className="w-24 h-8 text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                <SelectItem value="long">{t('signalLong')}</SelectItem>
                <SelectItem value="short">{t('signalShort')}</SelectItem>
                <SelectItem value="spot">{t('signalSpot')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('timeRange')}:</span>
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {timeRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === range.id
                      ? 'bg-accent-orange text-white'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
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

export default SignalsContent;
