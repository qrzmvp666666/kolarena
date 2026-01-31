import { useState } from 'react';
import { CreditCard, Wallet, Bitcoin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import TopNav from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type TabType = 'purchases' | 'accounts';

interface PurchaseRecord {
  id: string;
  date: string;
  crypto: string;
  cryptoIcon: string;
  amount: string;
  usdValue: string;
  plan: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
}

interface TradingAccount {
  id: string;
  exchange: string;
  accountName: string;
  apiKeyPreview: string;
  createdAt: string;
  status: 'active' | 'inactive';
  balance: string;
}

// Mock data
const mockPurchases: PurchaseRecord[] = [
  {
    id: '1',
    date: '2024-01-15 14:32',
    crypto: 'BTC',
    cryptoIcon: '/crypto/btc.svg',
    amount: '0.0025',
    usdValue: '$105.50',
    plan: 'Pro Monthly',
    status: 'completed',
    txHash: '0x1a2b3c...4d5e6f',
  },
  {
    id: '2',
    date: '2024-01-10 09:15',
    crypto: 'ETH',
    cryptoIcon: '/crypto/eth.svg',
    amount: '0.045',
    usdValue: '$112.00',
    plan: 'Pro Monthly',
    status: 'completed',
    txHash: '0x7g8h9i...0j1k2l',
  },
  {
    id: '3',
    date: '2024-01-05 18:22',
    crypto: 'SOL',
    cryptoIcon: '/crypto/sol.svg',
    amount: '1.25',
    usdValue: '$125.00',
    plan: 'Pro Quarterly',
    status: 'pending',
    txHash: '0x3m4n5o...6p7q8r',
  },
];

const mockAccounts: TradingAccount[] = [
  {
    id: '1',
    exchange: 'Binance',
    accountName: 'Main Trading',
    apiKeyPreview: 'Vx7K...9mPq',
    createdAt: '2024-01-01',
    status: 'active',
    balance: '$12,450.00',
  },
  {
    id: '2',
    exchange: 'OKX',
    accountName: 'Spot Account',
    apiKeyPreview: 'Hy3L...8nRs',
    createdAt: '2024-01-08',
    status: 'active',
    balance: '$3,280.50',
  },
  {
    id: '3',
    exchange: 'Bybit',
    accountName: 'Futures',
    apiKeyPreview: 'Zw9M...2tUv',
    createdAt: '2024-01-12',
    status: 'inactive',
    balance: '$0.00',
  },
];

const Account = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('purchases');
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);

  const getStatusBadge = (status: 'completed' | 'pending' | 'failed') => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-500 text-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('completed')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500 gap-1">
            <Clock className="w-3 h-3" />
            {t('pending')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-500 text-red-500 gap-1">
            <XCircle className="w-3 h-3" />
            {t('failed')}
          </Badge>
        );
    }
  };

  const getAccountStatusBadge = (status: 'active' | 'inactive') => {
    return status === 'active' ? (
      <Badge variant="outline" className="border-green-500 text-green-500">
        {t('active')}
      </Badge>
    ) : (
      <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
        {t('inactive')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav 
        danmakuEnabled={danmakuEnabled} 
        onToggleDanmaku={() => setDanmakuEnabled(!danmakuEnabled)}
        hideDanmakuToggle
      />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-card p-4">
          <h2 className="font-mono text-lg font-semibold mb-4 px-2">{t('myAccount')}</h2>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                activeTab === 'purchases'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {t('purchaseRecords')}
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                activeTab === 'accounts'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              {t('tradingAccounts')}
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === 'purchases' && (
            <div>
              <h1 className="font-mono text-xl font-semibold mb-6">{t('purchaseRecords')}</h1>
              
              <div className="space-y-4">
                {mockPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <img src={purchase.cryptoIcon} alt={purchase.crypto} className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-mono font-medium">
                          {purchase.amount} {purchase.crypto}
                          <span className="text-muted-foreground ml-2 text-sm">({purchase.usdValue})</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {purchase.plan} • {purchase.date}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-xs text-muted-foreground">TX</div>
                        <div className="font-mono text-sm">{purchase.txHash}</div>
                      </div>
                      {getStatusBadge(purchase.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              {mockPurchases.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bitcoin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noPurchaseRecords')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-mono text-xl font-semibold">{t('tradingAccounts')}</h1>
                <Button size="sm" className="gap-2">
                  <Wallet className="w-4 h-4" />
                  {t('addAccount')}
                </Button>
              </div>
              
              <div className="space-y-4">
                {mockAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-sm">
                        {account.exchange.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mono font-medium flex items-center gap-2">
                          {account.exchange}
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{account.accountName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          API: {account.apiKeyPreview} • {t('created')}: {account.createdAt}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-xs text-muted-foreground">{t('balance')}</div>
                        <div className="font-mono font-medium">{account.balance}</div>
                      </div>
                      {getAccountStatusBadge(account.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              {mockAccounts.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noTradingAccounts')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
