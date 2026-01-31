import { useState, useMemo } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, RefreshCw } from 'lucide-react';

// Coin types for filtering
const coinTypes = ['ALL', 'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB'];

// Generate leaderboard data based on models
const generateLeaderboardData = () => {
  return models
    .filter(m => m.id !== 'btc') // Exclude BTC benchmark
    .map((model, index) => {
      const accountValue = model.value;
      const returnRate = ((accountValue - 10000) / 10000) * 100;
      const totalPnL = accountValue - 10000;
      const fees = Math.floor(Math.random() * 2000) + 500;
      const winRate = parseFloat((Math.random() * 15 + 25).toFixed(1));
      const maxProfit = Math.floor(Math.random() * 2000) + 400;
      const maxLoss = -(Math.floor(Math.random() * 1500) + 500);
      const sharpe = (Math.random() * 0.2 - 0.1).toFixed(3);
      const trades = Math.floor(Math.random() * 800) + 150;
      const mainCoin = coinTypes[Math.floor(Math.random() * (coinTypes.length - 1)) + 1];

      return {
        rank: index + 1,
        id: model.id,
        name: model.name,
        shortName: model.shortName,
        icon: model.icon,
        color: model.color,
        avatar: model.avatar,
        accountValue,
        returnRate,
        totalPnL,
        fees,
        winRate,
        maxProfit,
        maxLoss,
        sharpe,
        trades,
        mainCoin,
      };
    })
    .sort((a, b) => b.accountValue - a.accountValue)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

const leaderboardData = generateLeaderboardData();

const LeaderboardContent = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overall' | 'advanced'>('overall');
  const [marketType, setMarketType] = useState<'futures' | 'spot'>('futures');
  const [searchQuery, setSearchQuery] = useState('');
  const [coinFilter, setCoinFilter] = useState('ALL');
  const [returnRateFilter, setReturnRateFilter] = useState('all');
  const [winRateFilter, setWinRateFilter] = useState('all');
  const [maxLossFilter, setMaxLossFilter] = useState('all');

  // Filtered data
  const filteredData = useMemo(() => {
    return leaderboardData.filter(item => {
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Coin filter
      if (coinFilter !== 'ALL' && item.mainCoin !== coinFilter) {
        return false;
      }
      // Return rate filter
      if (returnRateFilter === 'positive' && item.returnRate < 0) return false;
      if (returnRateFilter === 'negative' && item.returnRate >= 0) return false;
      // Win rate filter
      if (winRateFilter === 'high' && item.winRate < 30) return false;
      if (winRateFilter === 'low' && item.winRate >= 30) return false;
      // Max loss filter
      if (maxLossFilter === 'low' && item.maxLoss < -1000) return false;
      if (maxLossFilter === 'high' && item.maxLoss >= -1000) return false;
      
      return true;
    });
  }, [searchQuery, coinFilter, returnRateFilter, winRateFilter, maxLossFilter]);

  const winner = filteredData[0] || leaderboardData[0];
  const maxValue = Math.max(...filteredData.map(d => d.accountValue), 1);

  const handleRefresh = () => {
    setSearchQuery('');
    setCoinFilter('ALL');
    setReturnRateFilter('all');
    setWinRateFilter('all');
    setMaxLossFilter('all');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-6 py-3">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground mb-0.5">{t('leaderboard')}</h1>
          <p className="text-xs text-muted-foreground">{t('leaderboardSummary')}</p>
        </div>

        {/* Filter Bar - Similar to Signals page */}
        <div className="flex items-center justify-between mb-6">
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
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                activeTab === 'overall'
                  ? 'bg-card border-accent-orange text-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <span className="text-sm">{t('overallData')}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === 'overall' ? 'bg-accent-orange/20 text-accent-orange' : 'bg-muted text-muted-foreground'
              }`}>
                {filteredData.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                activeTab === 'advanced'
                  ? 'bg-card border-accent-orange text-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <span className="text-sm">{t('advancedAnalysis')}</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchTrader')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 bg-card border-border"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              {t('filter')}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {/* Filter Options Row */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {/* Coin Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('coinType')}:</span>
            <Select value={coinFilter} onValueChange={setCoinFilter}>
              <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                {coinTypes.map(coin => (
                  <SelectItem key={coin} value={coin}>{coin === 'ALL' ? t('all') : coin}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Return Rate Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('returnRate')}:</span>
            <Select value={returnRateFilter} onValueChange={setReturnRateFilter}>
              <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="positive">{t('positive')}</SelectItem>
                <SelectItem value="negative">{t('negative')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Win Rate Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('winRate')}:</span>
            <Select value={winRateFilter} onValueChange={setWinRateFilter}>
              <SelectTrigger className="w-[100px] h-8 font-mono text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="high">{'>'}30%</SelectItem>
                <SelectItem value="low">{'<'}30%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Loss Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('maxLoss')}:</span>
            <Select value={maxLossFilter} onValueChange={setMaxLossFilter}>
              <SelectTrigger className="w-[120px] h-8 font-mono text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="low">{t('lowRisk')}</SelectItem>
                <SelectItem value="high">{t('highRisk')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overall' ? (
          <>
            {/* Data Table */}
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RANK</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('trader')}</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{t('coinType')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('accountValue')} ↓</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('returnRate')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('totalPnL')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">FEES</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('winRate')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('maxProfit')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t('maxLoss')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">SHARPE</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">TRADES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{row.icon}</span>
                            <span className="text-foreground font-medium">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.mainCoin}</td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">
                          ${row.accountValue.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${row.returnRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {row.returnRate >= 0 ? '+' : ''}{row.returnRate.toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${row.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {row.totalPnL >= 0 ? '+' : ''}${row.totalPnL.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">${row.fees.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.winRate}%</td>
                        <td className="px-4 py-3 text-right text-accent-green">${row.maxProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-accent-red">-${Math.abs(row.maxLoss).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.sharpe}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Bottom Section: Winner Card + Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Winner Card */}
              <div className="lg:col-span-1 border border-border rounded-lg p-6 bg-card">
                <div className="text-sm text-muted-foreground mb-3">{t('winningModel')}</div>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: winner.color + '33' }}
                  >
                    {winner.icon}
                  </div>
                  <span className="text-lg font-bold text-foreground">{winner.name}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">{t('totalEquity')}</div>
                <div className="text-2xl font-bold text-foreground">
                  ${winner.accountValue.toLocaleString()}
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="lg:col-span-3 border border-border rounded-lg p-6 bg-card">
                <div className="flex items-end justify-between gap-4 h-48">
                  {filteredData.slice(0, 8).map((item) => {
                    const heightPercent = (item.accountValue / maxValue) * 100;
                    return (
                      <div key={item.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-foreground">
                          ${item.accountValue.toLocaleString()}
                        </div>
                        <div className="w-full flex justify-center">
                          <div 
                            className="w-12 rounded-t-sm transition-all duration-500"
                            style={{ 
                              height: `${heightPercent * 1.2}px`, 
                              backgroundColor: item.color,
                              minHeight: '20px'
                            }}
                          />
                        </div>
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ backgroundColor: item.color + '33' }}
                        >
                          {item.icon}
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center truncate w-full">
                          {item.shortName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-6 text-xs text-muted-foreground">
              <span className="font-medium">{t('note')}:</span> {t('leaderboardNote')}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground border border-border rounded-lg bg-card">
            {t('comingSoon')}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardContent;
