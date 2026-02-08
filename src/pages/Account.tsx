import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Bitcoin, Clock, CheckCircle, XCircle, Gift, Ticket, Zap, Star, Crown, Info, ArrowRight, User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useUser } from '@/contexts/UserContext';
import TopNav from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlanSubscriptionPanel from '@/components/PlanSubscriptionPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

type TabType = 'subscription' | 'purchases' | 'accounts' | 'redemption' | 'settings';

type PlanType = 'monthly' | 'quarterly' | 'yearly';

interface PurchaseRecord {
  id: string;
  date: string;
  crypto: string;
  cryptoIcon: string;
  amount: string;
  usdValue: string;
  plan: PlanType;
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

interface RedemptionRecord {
  id: string;
  code: string;
  date: string;
  reward: string;
  rewardType: 'membership' | 'credits' | 'vip';
  duration?: string;
  status: 'success' | 'expired' | 'used';
}

// Mock data
const mockRedemptions: RedemptionRecord[] = [
  {
    id: '1',
    code: 'PROMO2024VIP',
    date: '2024-01-20 10:30',
    reward: 'Pro会员',
    rewardType: 'membership',
    duration: '30天',
    status: 'success',
  },
  {
    id: '2',
    code: 'WELCOME100',
    date: '2024-01-15 16:45',
    reward: '100积分',
    rewardType: 'credits',
    status: 'success',
  },
  {
    id: '3',
    code: 'NEWYEAR2024',
    date: '2024-01-01 00:05',
    reward: 'VIP体验',
    rewardType: 'vip',
    duration: '7天',
    status: 'success',
  },
];
const mockPurchases: PurchaseRecord[] = [
  {
    id: '1',
    date: '2024-01-15 14:32',
    crypto: 'BTC',
    cryptoIcon: '/crypto/btc.svg',
    amount: '0.0025',
    usdValue: '$10.00',
    plan: 'monthly',
    status: 'completed',
    txHash: '0x1a2b3c...4d5e6f',
  },
  {
    id: '2',
    date: '2024-01-10 09:15',
    crypto: 'ETH',
    cryptoIcon: '/crypto/eth.svg',
    amount: '0.012',
    usdValue: '$28.00',
    plan: 'quarterly',
    status: 'completed',
    txHash: '0x7g8h9i...0j1k2l',
  },
  {
    id: '3',
    date: '2024-01-05 18:22',
    crypto: 'SOL',
    cryptoIcon: '/crypto/sol.svg',
    amount: '0.98',
    usdValue: '$99.00',
    plan: 'yearly',
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
  const { toast } = useToast();
  const { user: contextUser, updateAvatar: updateContextAvatar } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('subscription');
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const userId = contextUser?.id || '';
  const email = contextUser?.email || '';
  const avatarUrl = contextUser?.avatar || '';

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast({
        title: t('redeemError'),
        description: t('enterRedeemCode'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsRedeeming(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: t('redeemSuccess'),
      description: t('redeemSuccessDesc'),
    });
    setRedeemCode('');
    setIsRedeeming(false);
  };

  const handleUpdateAvatar = async (file: File) => {
    if (!userId || !file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('error'),
        description: t('invalidFileType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('error'),
        description: t('fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (authError) throw authError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('auth_user_id', userId);
      if (profileError) throw profileError;

      // Update context
      updateContextAvatar(publicUrl);
      
      toast({
        title: t('avatarUpdated'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpdateAvatar(file);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) return;
    
    // 密码长度验证
    if (newPassword.length < 6) {
      toast({
        title: t('error'),
        description: t('passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }
    
    // 密码匹配验证
    if (newPassword !== confirmPassword) {
      toast({
        title: t('error'),
        description: t('passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: t('passwordUpdated'),
        description: t('passwordUpdateSuccess'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getRedemptionStatusBadge = (status: 'success' | 'expired' | 'used') => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="border-green-500 text-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('redeemStatusSuccess')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="border-red-500 text-red-500 gap-1">
            <XCircle className="w-3 h-3" />
            {t('redeemStatusExpired')}
          </Badge>
        );
      case 'used':
        return (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground gap-1">
            <Clock className="w-3 h-3" />
            {t('redeemStatusUsed')}
          </Badge>
        );
    }
  };

  const getRewardTypeBadge = (type: 'membership' | 'credits' | 'vip') => {
    switch (type) {
      case 'membership':
        return <Badge className="bg-primary/20 text-primary border-0">{t('rewardMembership')}</Badge>;
      case 'credits':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-0">{t('rewardCredits')}</Badge>;
      case 'vip':
        return <Badge className="bg-purple-500/20 text-purple-500 border-0">{t('rewardVip')}</Badge>;
    }
  };

  const getPlanBadge = (plan: PlanType) => {
    switch (plan) {
      case 'monthly':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-0">
            {t('planMonthly')} ({t('planPriceMonthly')})
          </Badge>
        );
      case 'quarterly':
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-0">
            {t('planQuarterly')} ({t('planPriceQuarterly')})
          </Badge>
        );
      case 'yearly':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
            {t('planYearly')} ({t('planPriceYearly')})
          </Badge>
        );
    }
  };

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
              onClick={() => setActiveTab('subscription')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                activeTab === 'subscription'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Crown className="w-4 h-4" />
              {t('subscriptionPlans')}
            </button>
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
              onClick={() => setActiveTab('redemption')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                activeTab === 'redemption'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Gift className="w-4 h-4" />
              {t('redemptionCenter')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <User className="w-4 h-4" />
              {t('accountSettings')}
            </button>
          </nav>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'subscription' && (
            <PlanSubscriptionPanel />
          )}

          {activeTab === 'purchases' && (
            <div>
              <h1 className="font-mono text-xl font-semibold mb-6">{t('purchaseRecords')}</h1>
              
              {/* Purchase Steps Guide */}
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-primary" />
                    <h3 className="font-mono font-medium text-sm">{t('purchaseStepsTitle')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center">
                          {step}
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(`purchaseStep${step}`)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
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
                        <div className="font-mono font-medium flex items-center gap-2">
                          {purchase.amount} {purchase.crypto}
                          <span className="text-muted-foreground text-sm">({purchase.usdValue})</span>
                          {getPlanBadge(purchase.plan)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {purchase.date}
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

          {activeTab === 'redemption' && (
            <div>
              <h1 className="font-mono text-xl font-semibold mb-6">{t('redemptionCenter')}</h1>
              
              {/* Redeem Code Input */}
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h2 className="font-mono font-medium mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  {t('redeemCode')}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{t('redeemCodeDesc')}</p>
                <div className="flex gap-3">
                  <Input
                    placeholder={t('enterRedeemCode')}
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    className="font-mono flex-1"
                    maxLength={20}
                  />
                  <Button 
                    onClick={handleRedeem} 
                    disabled={isRedeeming || !redeemCode.trim()}
                    className="gap-2"
                  >
                    <Gift className="w-4 h-4" />
                    {isRedeeming ? t('redeeming') : t('redeem')}
                  </Button>
                </div>
              </div>

              {/* Redemption Steps Guide */}
              <Card className="mb-6 border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-mono font-medium text-sm">{t('redemptionStepsTitle')}</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
                          {step}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t(`redemptionStep${step}`)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Redemption Records */}
              <h2 className="font-mono font-medium mb-4">{t('redemptionRecords')}</h2>
              <div className="space-y-4">
                {mockRedemptions.map((record) => (
                  <div
                    key={record.id}
                    className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-mono font-medium flex items-center gap-2">
                          {record.code}
                          {getRewardTypeBadge(record.rewardType)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.reward}
                          {record.duration && ` • ${record.duration}`}
                          {' • '}{record.date}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getRedemptionStatusBadge(record.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              {mockRedemptions.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noRedemptionRecords')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h1 className="font-mono text-xl font-semibold">{t('accountSettings')}</h1>

              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-sm">{t('profile')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarUrl} alt={email || 'avatar'} />
                        <AvatarFallback>{email?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                      >
                        <span className="text-white text-xs">{isUploadingAvatar ? t('uploading') : t('changeAvatar')}</span>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={isUploadingAvatar}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="text-sm text-muted-foreground">{t('emailAddress')}</div>
                      <div className="font-mono">{email || t('notProvided')}</div>
                      <p className="text-xs text-muted-foreground">{t('avatarHint')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-sm">{t('passwordSettings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder={t('newPassword')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="font-mono"
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">{t('passwordTooShort')}</p>
                  </div>
                  <Input
                    type="password"
                    placeholder={t('confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newPassword && confirmPassword) {
                        handleUpdatePassword();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isSavingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {isSavingPassword ? t('saving') : t('updatePassword')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
