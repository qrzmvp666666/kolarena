import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Bitcoin, Check, CircleDot } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CryptoPaymentModal from './CryptoPaymentModal';
import LoginModal from './LoginModal';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

type PlanType = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
type BillingCycle = 'monthly' | 'yearly';

interface PlanRecord {
  id: number;
  name: string;
  duration: PlanType;
  price: number;
  currency: string;
  description: string | null;
  benefits: string[] | null;
  stripe_invoice_url: string | null;
  nowpayment_invoice_url: string | null;
}

interface PlanFeature {
  text: string;
  highlight?: boolean;
}

interface DisplayPlanCard {
  key: 'free' | 'pro' | 'lifetime';
  type: PlanType | 'free';
  name: string;
  price: number;
  currency: string;
  priceLabel: string;
  period: string;
  description: string;
  features: PlanFeature[];
  featuresTitle: string;
  isPopular: boolean;
  stripeUrl?: string | null;
  nowpaymentUrl?: string | null;
  isFree: boolean;
}

const PlanSubscriptionPanel = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useUser();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; currency: string; nowpaymentUrl?: string | null } | null>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const handleStripePayment = (planName: string, stripeUrl?: string | null) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (!stripeUrl) {
      toast({
        title: t('paymentNotAvailable'),
        description: 'Stripe link not configured',
      });
      return;
    }
    window.open(stripeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCryptoPayment = (planName: string, price: number, currency: string, nowpaymentUrl?: string | null) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    setSelectedPlan({ name: planName, price, currency, nowpaymentUrl });
    setCryptoModalOpen(true);
  };

  const periodLabel = (duration: PlanType) => {
    switch (duration) {
      case 'monthly':
        return t('perMonth');
      case 'quarterly':
        return t('perQuarter');
      case 'yearly':
        return t('perYear');
      case 'lifetime':
        return '';
      default:
        return '';
    }
  };

  const planTitle = (duration: PlanType) => {
    switch (duration) {
      case 'monthly':
        return t('planMonthly');
      case 'quarterly':
        return t('planQuarterly');
      case 'yearly':
        return t('planYearly');
      case 'lifetime':
        return t('planLifetime');
      default:
        return '';
    }
  };

  const formatPrice = (price: number, currency: string) => `${price} ${currency}`;

  const fetchPlans = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc('get_membership_plans');
    if (error) {
      console.error('获取套餐失败:', error);
      toast({
        title: t('error'),
        description: t('profileLoadError'),
      });
      setIsLoading(false);
      return;
    }
    setPlans((data || []) as PlanRecord[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlans();

    const channel = supabase
      .channel('membership_plans_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membership_plans' },
        () => {
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const monthlyFeatures: PlanFeature[] = [
    { text: t('featureLive') },
    { text: t('featureLeaderboard') },
    { text: t('featureSignals') },
    { text: t('featureCharts') },
    { text: t('featureCommunity') },
  ];

  const quarterlyFeatures: PlanFeature[] = [
    { text: t('featureLive') },
    { text: t('featureLeaderboard') },
    { text: t('featureSignals') },
    { text: t('featureCharts') },
    { text: t('featureCommunity') },
  ];

  const yearlyFeatures: PlanFeature[] = [
    { text: t('featureLive') },
    { text: t('featureLeaderboard') },
    { text: t('featureSignals') },
    { text: t('featureCharts') },
    { text: t('featureCommunity') },
    { text: t('featureVipGroup'), highlight: true },
    { text: t('featureExclusive'), highlight: true },
  ];

  const plansByDuration = useMemo(() => {
    const map: Partial<Record<PlanType, PlanRecord>> = {};
    plans.forEach((plan) => {
      map[plan.duration] = plan;
    });
    return map;
  }, [plans]);

  const proPlanDuration: PlanType = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const proPlan = plansByDuration[proPlanDuration];
  const lifetimePlan = plansByDuration.lifetime;

  const defaultMonthlyPrice = 10;
  const defaultYearlyPrice = 99;
  const defaultLifetimePrice = 299;

  const proPrice = proPlan?.price ?? (billingCycle === 'yearly' ? defaultYearlyPrice : defaultMonthlyPrice);
  const proCurrency = proPlan?.currency ?? 'USDT';
  const lifetimePrice = lifetimePlan?.price ?? defaultLifetimePrice;
  const lifetimeCurrency = lifetimePlan?.currency ?? 'USDT';

  const freeFeatures: PlanFeature[] = [
    { text: t('featureLive') },
    { text: t('featureLeaderboard') },
    { text: t('featureSignals') },
  ];

  const proFeatures = billingCycle === 'yearly' ? yearlyFeatures : monthlyFeatures;

  const lifetimeFeatures: PlanFeature[] = [
    ...yearlyFeatures,
    { text: t('featureVipGroup'), highlight: true },
    { text: t('featureExclusive'), highlight: true },
  ];

  const planCards: DisplayPlanCard[] = useMemo(() => {
    return [
      {
        key: 'free',
        type: 'free',
        name: t('planFree'),
        price: 0,
        currency: 'USDT',
        priceLabel: t('planPriceFree'),
        period: '',
        description: t('planFreeDesc'),
        features: freeFeatures,
        featuresTitle: t('featuresTitle'),
        isPopular: false,
        isFree: true,
      },
      {
        key: 'pro',
        type: proPlanDuration,
        name: t('planPro'),
        price: proPrice,
        currency: proCurrency,
        priceLabel: formatPrice(proPrice, proCurrency),
        period: periodLabel(proPlanDuration),
        description: proPlan?.description || t('planProDesc'),
        features: Array.isArray(proPlan?.benefits) && proPlan.benefits.length
          ? proPlan.benefits.map((text) => ({ text }))
          : proFeatures,
        featuresTitle: billingCycle === 'yearly' ? t('featuresTitlePremium') : t('featuresTitlePlus'),
        isPopular: true,
        stripeUrl: proPlan?.stripe_invoice_url,
        nowpaymentUrl: proPlan?.nowpayment_invoice_url,
        isFree: false,
      },
      {
        key: 'lifetime',
        type: 'lifetime',
        name: t('planLifetime'),
        price: lifetimePrice,
        currency: lifetimeCurrency,
        priceLabel: formatPrice(lifetimePrice, lifetimeCurrency),
        period: '',
        description: lifetimePlan?.description || t('planLifetimeDesc'),
        features: Array.isArray(lifetimePlan?.benefits) && lifetimePlan.benefits.length
          ? lifetimePlan.benefits.map((text) => ({ text }))
          : lifetimeFeatures,
        featuresTitle: t('featuresTitlePremium'),
        isPopular: false,
        stripeUrl: lifetimePlan?.stripe_invoice_url,
        nowpaymentUrl: lifetimePlan?.nowpayment_invoice_url,
        isFree: false,
      },
    ];
  }, [
    billingCycle,
    freeFeatures,
    lifetimeCurrency,
    lifetimeFeatures,
    lifetimePlan?.benefits,
    lifetimePlan?.description,
    lifetimePlan?.nowpayment_invoice_url,
    lifetimePlan?.stripe_invoice_url,
    lifetimePrice,
    proCurrency,
    proFeatures,
    proPlan?.benefits,
    proPlan?.description,
    proPlan?.nowpayment_invoice_url,
    proPlan?.stripe_invoice_url,
    proPlanDuration,
    proPrice,
    t,
  ]);

  const coreFeatureLines: Record<DisplayPlanCard['key'], Array<{ text: string; type?: 'heading' }>> = {
    free: [
      { text: t('planFreeFeatureAds') },
      { text: t('planFreeFeatureDelayedChart') },
      { text: t('planFreeFeatureLimitedSignals') },
    ],
    pro: [
      { text: t('planProSectionExclusive'), type: 'heading' },
      { text: t('planProFeatureNoAds') },
      { text: t('planProFeatureMarketQuotes') },
      { text: t('planProFeatureChartTracking') },
      { text: t('planProFeatureSignalPush') },
      { text: t('planProFeatureSignalAlert') },
      { text: t('planProFeatureHistoryRank') },
      { text: t('planProFeatureHistoryAnalysis') },
      { text: t('planProFeatureTrendCompare') },
      { text: t('planProFeatureLiveBacktest') },
      { text: t('planProSectionMore'), type: 'heading' },
      { text: t('planProFeatureSupport') },
      { text: t('planProFeatureCommunityNotice') },
    ],
    lifetime: [
      { text: t('planProSectionExclusive'), type: 'heading' },
      { text: t('planProFeatureNoAds') },
      { text: t('planProFeatureMarketQuotes') },
      { text: t('planProFeatureChartTracking') },
      { text: t('planProFeatureSignalPush') },
      { text: t('planProFeatureSignalAlert') },
      { text: t('planProFeatureHistoryRank') },
      { text: t('planProFeatureHistoryAnalysis') },
      { text: t('planProFeatureTrendCompare') },
      { text: t('planProFeatureLiveBacktest') },
      { text: t('planProSectionMore'), type: 'heading' },
      { text: t('planProFeatureSupport') },
      { text: t('planProFeatureCommunityNotice') },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-mono text-2xl font-bold mb-2">{t('subscriptionPlans')}</h1>
        <p className="text-muted-foreground">
          {billingCycle === 'yearly' ? t('subscriptionDescYearly') : t('subscriptionDescMonthly')}
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('monthly')}
            className="min-w-[84px]"
          >
            {t('billingMonthly')}
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('yearly')}
            className="min-w-[84px]"
          >
            {t('billingYearly')}
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        ) : (
          planCards.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-xl p-5 flex flex-col transition-all ${
                plan.isPopular
                  ? 'border-2 border-primary bg-card shadow-lg shadow-primary/10 animate-border-pulse'
                  : 'border border-border bg-card/50'
              }`}
            >
            {plan.isPopular && (
              <div className="absolute -top-4 right-4 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full font-bold animate-badge-pulse shadow-lg z-10">
                {t('mostPopular')}
              </div>
            )}
            {/* Plan Name */}
            <div className="mb-3">
              <h3 className="font-mono text-base font-medium text-foreground">{plan.name}</h3>
            </div>
            
            {/* Price */}
            <div className="mb-2">
              <span className="text-2xl font-bold font-mono text-foreground">{plan.priceLabel}</span>
              {plan.period && <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>}
            </div>
            
            {/* Exchange Registration Callout - Only for paid plans */}
            {!plan.isFree && (
              <div className="mb-4 p-4 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/8 to-transparent shadow-lg animate-pulse-glow">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative">
                    <CircleDot className="w-4 h-4 text-primary animate-ping-slow relative z-10" />
                    <CircleDot className="w-4 h-4 text-primary absolute top-0 left-0 opacity-50" />
                  </div>
                  <span className="text-sm font-bold text-primary tracking-tight">注册交易所免费获取</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium pl-6">
                  通过专属交易所链接注册，当月合约交易量达 <span className="text-primary font-bold">5000U</span> 即可解锁当月会员
                </p>
              </div>
            )}
            
            {/* Core Features */}
            <div className="space-y-1.5 mb-4">
              {coreFeatureLines[plan.key].map((item, index) => (
                item.type === 'heading' ? (
                  <div key={index}>
                    {item.text === t('planProSectionMore') && <div className="h-6" />}
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mt-2">
                      {item.text}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                )
              ))}
            </div>
            
            <div className="flex-1" />
            
            {/* Payment Buttons - Together at bottom */}
            <div className="space-y-2 mt-4">
              {!plan.isFree && (
                <>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleCryptoPayment(plan.name, plan.price, plan.currency, plan.nowpaymentUrl)}
                  >
                    <Bitcoin className="w-4 h-4 mr-2" />
                    {t('payWithCrypto')}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-foreground"
                    onClick={() => handleStripePayment(plan.name, plan.stripeUrl)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('payWithStripe')}
                  </Button>
                </>
              )}
            </div>
            </div>
          ))
        )}
      </div>

      {/* Crypto Payment Modal */}
      {selectedPlan && (
        <CryptoPaymentModal
          open={cryptoModalOpen}
          onOpenChange={setCryptoModalOpen}
          planName={selectedPlan.name}
          price={selectedPlan.price}
          currency={selectedPlan.currency}
          paymentUrl={selectedPlan.nowpaymentUrl}
        />
      )}

      {/* Login Modal for unauthenticated users */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
};

export default PlanSubscriptionPanel;
