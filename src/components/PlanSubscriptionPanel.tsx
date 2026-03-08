import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Bitcoin, Check, CircleDot, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CryptoPaymentModal from './CryptoPaymentModal';
import LoginModal from './LoginModal';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PlanType = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
type PlanTab = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

interface PlanRecord {
  id: number;
  name: string;
  plan_family: 'pro' | 'max' | 'lifetime';
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
  key: 'free' | 'pro' | 'max' | 'lifetime';
  type: PlanType | 'free';
  sourcePlanId?: number;
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
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    currency: string;
    orderId?: string;
    providerPaymentId?: string | null;
    paymentUrl?: string | null;
    payAddress?: string | null;
    payAmount?: number | null;
    payCurrency?: string | null;
    providerStatus?: string | null;
  } | null>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [activePlanTab, setActivePlanTab] = useState<PlanTab>('monthly');
  const [selectedPayCurrency, setSelectedPayCurrency] = useState('USDT');
  const [creatingPlanKey, setCreatingPlanKey] = useState<DisplayPlanCard['key'] | null>(null);
  const showStripePayment = false;
  const showExchangeRebateCallout = false;

  const createNowpaymentsOrder = async (planId: number, payCurrency: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const ensureValidSession = async () => {
      const { data: initialSessionData } = await supabase.auth.getSession();

      if (!initialSessionData.session?.access_token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const initialUserResult = await supabase.auth.getUser(initialSessionData.session.access_token);

      if (!initialUserResult.error && initialUserResult.data.user) {
        return initialSessionData.session;
      }

      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session?.access_token) {
        throw new Error('NOT_AUTHENTICATED');
      }

      const refreshedUserResult = await supabase.auth.getUser();
      if (refreshedUserResult.error || !refreshedUserResult.data.user) {
        throw new Error('NOT_AUTHENTICATED');
      }

      return refreshed.session;
    };

    let validSession = await ensureValidSession();

    const requestWithSession = async (sessionToken: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nowpayments-create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          apikey: supabaseAnonKey,
          'x-client-info': 'kolarena-web',
        },
        body: JSON.stringify({ planId, payCurrency }),
      });

      const json = await response.json().catch(() => null);
      return { response, json };
    };

    let result = await requestWithSession(validSession.access_token);

    if (result.response.status === 401) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

      if (!refreshError && refreshed.session?.access_token) {
        validSession = refreshed.session;
        result = await requestWithSession(validSession.access_token);
      }
    }

    if (!result.response.ok) {
      const error = new Error(
        result.json?.detail?.message ||
        result.json?.detail ||
        result.json?.message ||
        `HTTP_${result.response.status}`
      ) as Error & {
        context?: { status?: number; json?: any };
      };
      error.context = {
        status: result.response.status,
        json: result.json,
      };
      throw error;
    }

    return result.json;
  };

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

  const handleCryptoPayment = async (plan: DisplayPlanCard) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

    if (!plan.sourcePlanId) {
      toast({
        title: t('paymentFailed'),
        description: `${t('paymentFailedReasonLabel')}: Plan id not found。${t('paymentContactSupportHint')}`,
        variant: 'destructive',
      });
      return;
    }

    setCreatingPlanKey(plan.key);
    try {
      const data = await createNowpaymentsOrder(plan.sourcePlanId, selectedPayCurrency);
      if (!data?.success || !data?.order) {
        throw new Error(data?.message || 'CREATE_PAYMENT_FAILED');
      }

      setSelectedPlan({
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        orderId: data.order.id,
        providerPaymentId: data.order.provider_payment_id,
        paymentUrl: data.order.invoice_url,
        payAddress: data.order.pay_address,
        payAmount: data.order.pay_amount,
        payCurrency: data.order.pay_currency || selectedPayCurrency,
        providerStatus: data.order.provider_status,
      });
      setCryptoModalOpen(true);
    } catch (error: any) {
      const normalizedMessage = String(error?.message || '');
      const responseStatus = error?.context?.status;
      const responseJson = error?.context?.json;
      const responseMessage =
        responseJson?.detail?.message ||
        responseJson?.detail?.error ||
        responseJson?.detail ||
        responseJson?.message ||
        error?.context?.body?.message;

      let reason = responseMessage || normalizedMessage || 'Unknown error';
      if (normalizedMessage.includes('Failed to send a request to the Edge Function')) {
        reason = t('paymentNetworkOrCorsError');
      } else if (responseStatus === 401 || normalizedMessage === 'NOT_AUTHENTICATED' || /invalid jwt/i.test(normalizedMessage)) {
        reason = t('paymentAuthExpired');
      } else if (responseStatus === 500 && responseMessage === 'NOWPAYMENTS_API_KEY_MISSING') {
        reason = t('paymentProviderKeyMissing');
      } else if (/amountto is too small/i.test(reason)) {
        reason = t('paymentAmountTooSmall');
      }

      if (reason === t('paymentAuthExpired')) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session?.access_token) {
          setLoginModalOpen(true);
        }
      }

      toast({
        title: t('paymentFailed'),
        description: `${t('paymentFailedReasonLabel')}: ${reason}。${t('paymentContactSupportHint')}`,
        variant: 'destructive',
      });
    } finally {
      setCreatingPlanKey(null);
    }
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

  const proPlanDuration: PlanType = billingCycle;

  const normalizedPlans = useMemo(() => {
    return plans.map((plan) => {
      const lowerName = (plan.name || '').toLowerCase();
      const lowerFamily = (plan.plan_family || '').toLowerCase();

      let inferredFamily: 'pro' | 'max' | 'lifetime' = 'pro';
      if (lowerFamily === 'max' || lowerName.includes('max')) {
        inferredFamily = 'max';
      } else if (lowerFamily === 'lifetime' || plan.duration === 'lifetime' || lowerName.includes('lifetime')) {
        inferredFamily = 'lifetime';
      }

      return {
        ...plan,
        inferredFamily,
      };
    });
  }, [plans]);

  const proPlan = useMemo(() => {
    const sameDuration = normalizedPlans.filter((plan) => plan.duration === proPlanDuration);
    return sameDuration.find((plan) => plan.inferredFamily === 'pro');
  }, [normalizedPlans, proPlanDuration]);

  const maxPlan = useMemo(() => {
    const sameDuration = normalizedPlans.filter((plan) => plan.duration === proPlanDuration);
    return sameDuration.find((plan) => plan.inferredFamily === 'max');
  }, [normalizedPlans, proPlanDuration]);

  const lifetimePlan = useMemo(() => {
    return normalizedPlans.find((plan) => plan.inferredFamily === 'lifetime' || plan.duration === 'lifetime');
  }, [normalizedPlans]);

  const defaultMonthlyPrice = 10;
  const defaultQuarterlyPrice = 28;
  const defaultYearlyPrice = 99;
  const defaultMaxMonthlyPrice = 20;
  const defaultMaxQuarterlyPrice = 56;
  const defaultMaxYearlyPrice = 199;
  const defaultLifetimePrice = 299;

  const proPrice = proPlan?.price ?? (
    billingCycle === 'yearly' ? defaultYearlyPrice : billingCycle === 'quarterly' ? defaultQuarterlyPrice : defaultMonthlyPrice
  );
  const proCurrency = proPlan?.currency ?? 'USDT';
  const maxPrice = maxPlan?.price ?? (
    billingCycle === 'yearly' ? defaultMaxYearlyPrice : billingCycle === 'quarterly' ? defaultMaxQuarterlyPrice : defaultMaxMonthlyPrice
  );
  const maxCurrency = maxPlan?.currency ?? 'USDT';
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
        priceLabel: '0 USD',
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
        sourcePlanId: proPlan?.id,
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
        isPopular: false,
        stripeUrl: proPlan?.stripe_invoice_url,
        nowpaymentUrl: proPlan?.nowpayment_invoice_url,
        isFree: false,
      },
      {
        key: 'max',
        type: proPlanDuration,
        sourcePlanId: maxPlan?.id,
        name: t('planMax'),
        price: maxPrice,
        currency: maxCurrency,
        priceLabel: formatPrice(maxPrice, maxCurrency),
        period: periodLabel(proPlanDuration),
        description: maxPlan?.description || t('planProDesc'),
        features: Array.isArray(maxPlan?.benefits) && maxPlan.benefits.length
          ? maxPlan.benefits.map((text) => ({ text }))
          : proFeatures,
        featuresTitle: billingCycle === 'yearly' ? t('featuresTitlePremium') : t('featuresTitlePlus'),
        isPopular: true,
        stripeUrl: maxPlan?.stripe_invoice_url,
        nowpaymentUrl: maxPlan?.nowpayment_invoice_url,
        isFree: false,
      },
      {
        key: 'lifetime',
        type: 'lifetime',
        sourcePlanId: lifetimePlan?.id,
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
    maxCurrency,
    maxPlan?.benefits,
    maxPlan?.description,
    maxPlan?.nowpayment_invoice_url,
    maxPlan?.stripe_invoice_url,
    maxPrice,
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

  const visiblePlanCards = useMemo(() => {
    if (activePlanTab === 'lifetime') {
      return planCards.filter((plan) => plan.key === 'lifetime');
    }
    return planCards.filter((plan) => plan.key !== 'lifetime');
  }, [activePlanTab, planCards]);

  const coreFeatureLines: Record<DisplayPlanCard['key'], Array<{ text: string; type?: 'heading' | 'limit' }>> = {
    free: [
      { text: t('planFreeSectionBasic'), type: 'heading' },
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
      { text: t('planProSectionMore'), type: 'heading' },
      { text: t('planProFeatureSupport') },
      { text: t('planProFeatureCommunityNotice') },
    ],
    max: [
      { text: t('planProSectionExclusive'), type: 'heading' },
      { text: t('planProFeatureNoAds') },
      { text: t('planProFeatureMarketQuotes') },
      { text: t('planProFeatureChartTracking') },
      { text: t('planProFeatureSignalPush') },
      { text: t('planProFeatureHistoryRank') },
      { text: t('planProFeatureHistoryAnalysis') },
      { text: t('planProFeatureTrendCompare') },
      { text: t('planProFeatureLiveBacktest') },
      { text: t('planProSectionFuture'), type: 'heading' },
      { text: t('planProFeatureCustomSignalUpdate') },
      { text: t('planProFeatureOneClickCopySignal') },
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
      { text: t('planProFeatureHistoryRank') },
      { text: t('planProFeatureHistoryAnalysis') },
      { text: t('planProFeatureTrendCompare') },
      { text: t('planProFeatureLiveBacktest') },
      { text: t('planProSectionFuture'), type: 'heading' },
      { text: t('planProFeatureCustomSignalUpdate') },
      { text: t('planProFeatureOneClickCopySignal') },
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
            variant={activePlanTab === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBillingCycle('monthly');
              setActivePlanTab('monthly');
            }}
            className="min-w-[84px]"
          >
            {t('billingMonthly')}
          </Button>
          <Button
            variant={activePlanTab === 'quarterly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBillingCycle('quarterly');
              setActivePlanTab('quarterly');
            }}
            className="min-w-[84px]"
          >
            {t('planQuarterly')}
          </Button>
          <Button
            variant={activePlanTab === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBillingCycle('yearly');
              setActivePlanTab('yearly');
            }}
            className="min-w-[84px]"
          >
            {t('billingYearly')}
          </Button>
          <Button
            variant={activePlanTab === 'lifetime' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivePlanTab('lifetime')}
            className="min-w-[84px]"
          >
            {t('planLifetime')}
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div
        className={`mx-auto grid grid-cols-1 gap-4 ${
          activePlanTab === 'lifetime' ? 'max-w-xl md:grid-cols-1' : 'max-w-5xl md:grid-cols-3'
        }`}
      >
        {isLoading ? (
          <div className="col-span-full text-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        ) : (
          visiblePlanCards.map((plan) => (
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
            <div className="mb-4">
              <span className="text-2xl font-bold font-mono text-foreground">{plan.priceLabel}</span>
              {plan.period && <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>}
            </div>

            {/* Exchange Registration Callout - Only for paid plans */}
            {!plan.isFree && showExchangeRebateCallout && (
              <div 
                className="mb-4 p-4 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/8 to-transparent shadow-lg animate-pulse-glow cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => navigate('/community#exchanges')}
              >
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

            {/* Payment Buttons */}
            {!plan.isFree && (
              <div className="space-y-2 mb-4">
                <Select value={selectedPayCurrency} onValueChange={setSelectedPayCurrency}>
                  <SelectTrigger className="w-full border-border bg-background/50">
                    <SelectValue placeholder="USDT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="BNB">BNB (BSC)</SelectItem>
                    <SelectItem value="XRP">XRP</SelectItem>
                    <SelectItem value="DOGE">DOGE</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={creatingPlanKey === plan.key}
                  onClick={() => handleCryptoPayment(plan)}
                >
                  {creatingPlanKey === plan.key ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bitcoin className="w-4 h-4 mr-2" />
                  )}
                  {creatingPlanKey === plan.key ? t('paymentProcessing') : t('payWithCrypto')}
                </Button>
                {showStripePayment && (
                  <Button 
                    variant="outline"
                    className="w-full border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-foreground"
                    onClick={() => handleStripePayment(plan.name, plan.stripeUrl)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('payWithStripe')}
                  </Button>
                )}
              </div>
            )}
            
            {/* Core Features */}
            <div className="space-y-1.5 mb-4">
              {coreFeatureLines[plan.key].map((item, index) => (
                item.type === 'heading' ? (
                  <div key={index}>
                    {item.text === t('planProSectionMore') && <div className="h-6" />}
                    <div className="mt-2 inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/85">
                      {item.text}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {item.type === 'limit' ? (
                      <span className="w-5 h-5 inline-flex items-center justify-center text-muted-foreground/70">—</span>
                    ) : (
                      <Check className={`w-5 h-5 ${plan.isFree ? 'text-muted-foreground' : 'text-primary/90'}`} />
                    )}
                    <span className={item.type === 'limit' ? 'text-muted-foreground/80' : plan.isFree ? 'text-muted-foreground' : 'text-foreground/90 font-medium'}>{item.text}</span>
                  </div>
                )
              ))}
            </div>
            
            <div className="flex-1" />
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
          orderId={selectedPlan.orderId}
          providerPaymentId={selectedPlan.providerPaymentId}
          providerStatus={selectedPlan.providerStatus}
          paymentUrl={selectedPlan.paymentUrl}
          payAddress={selectedPlan.payAddress}
          payAmount={selectedPlan.payAmount}
          payCurrency={selectedPlan.payCurrency}
        />
      )}

      {/* Login Modal for unauthenticated users */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
};

export default PlanSubscriptionPanel;
