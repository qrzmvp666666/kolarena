import { useState } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { models } from '@/lib/chartData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Generate leaderboard data based on models
const generateLeaderboardData = () => {
  return models
    .filter(m => m.id !== 'btc') // Exclude BTC benchmark
    .map((model, index) => {
      const accountValue = model.value;
      const returnRate = ((accountValue - 10000) / 10000) * 100;
      const totalPnL = accountValue - 10000;
      const fees = Math.floor(Math.random() * 2000) + 500;
      const winRate = (Math.random() * 15 + 25).toFixed(1);
      const maxProfit = Math.floor(Math.random() * 2000) + 400;
      const maxLoss = -(Math.floor(Math.random() * 1500) + 500);
      const sharpe = (Math.random() * 0.2 - 0.1).toFixed(3);
      const trades = Math.floor(Math.random() * 800) + 150;

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
      };
    })
    .sort((a, b) => b.accountValue - a.accountValue)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

const leaderboardData = generateLeaderboardData();

const LeaderboardContent = () => {
  const { t } = useLanguage();
  const [competition, setCompetition] = useState('comprehensive');
  const [showAverage, setShowAverage] = useState(true);

  const winner = leaderboardData[0];
  const maxValue = Math.max(...leaderboardData.map(d => d.accountValue));

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-6 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('leaderboard')}</h1>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('competition')}:</span>
            <Select value={competition} onValueChange={setCompetition}>
              <SelectTrigger className="w-[140px] h-8 font-mono text-xs bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="comprehensive">{t('comprehensiveIndex')}</SelectItem>
                <SelectItem value="return">{t('returnRate')}</SelectItem>
                <SelectItem value="sharpe">{t('sharpeRatio')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('average')}:</span>
            <Checkbox 
              checked={showAverage} 
              onCheckedChange={(checked) => setShowAverage(checked as boolean)}
              className="border-accent-orange data-[state=checked]:bg-accent-orange"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overall" className="mb-6">
          <TabsList className="bg-card border border-border h-9">
            <TabsTrigger 
              value="overall" 
              className="font-mono text-xs data-[state=active]:bg-accent-orange data-[state=active]:text-white"
            >
              {t('overallData')}
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="font-mono text-xs data-[state=active]:bg-accent-orange data-[state=active]:text-white"
            >
              {t('advancedAnalysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="mt-4">
            {/* Data Table */}
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RANK</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t('model')}</th>
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
                    {leaderboardData.map((row) => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{row.rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{row.icon}</span>
                            <span className="text-foreground font-medium">{row.name}</span>
                          </div>
                        </td>
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
                  {leaderboardData.map((item) => {
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
          </TabsContent>

          <TabsContent value="advanced" className="mt-4">
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {t('comingSoon')}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Leaderboard = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LeaderboardContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default Leaderboard;
