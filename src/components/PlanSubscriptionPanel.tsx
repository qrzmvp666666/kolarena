import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Bitcoin, Check, Zap, TrendingUp, Shield, Clock, Users, MessageSquare, BarChart3, Crown, CircleDot } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CryptoPaymentModal from './CryptoPaymentModal';
import { supabase } from '@/lib/supabase';

type PlanType = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

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

const PlanSubscriptionPanel = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; currency: string; nowpaymentUrl?: string | null } | null>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleStripePayment = (planName: string, stripeUrl?: string | null) => {
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

  const planCards = useMemo(() => {
    return plans.map((plan) => {
      const baseFeatures = plan.duration === 'yearly' || plan.duration === 'lifetime'
        ? yearlyFeatures
        : plan.duration === 'quarterly'
          ? quarterlyFeatures
          : monthlyFeatures;

      const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];

      return {
        type: plan.duration,
        name: planTitle(plan.duration) || plan.name,
        price: plan.price,
        currency: plan.currency,
        priceLabel: formatPrice(plan.price, plan.currency),
        period: periodLabel(plan.duration),
        description: plan.description || '',
        features: benefits.length
          ? benefits.map((text) => ({ text }))
          : baseFeatures,
        featuresTitle: plan.duration === 'yearly' || plan.duration === 'lifetime'
          ? t('featuresTitlePremium')
          : plan.duration === 'quarterly'
            ? t('featuresTitlePlus')
            : t('featuresTitle'),
        isPopular: plan.duration === 'lifetime',
        stripeUrl: plan.stripe_invoice_url,
        nowpaymentUrl: plan.nowpayment_invoice_url,
      };
    });
  }, [plans, t]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-mono text-2xl font-bold mb-2">{t('subscriptionPlans')}</h1>
        <p className="text-muted-foreground">{t('subscriptionDesc')}</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        ) : (
          planCards.map((plan) => (
            <div
              key={plan.type}
              className={`relative rounded-xl p-6 flex flex-col transition-all ${
                plan.isPopular
                  ? 'border-2 border-primary bg-card shadow-lg shadow-primary/10 animate-border-pulse'
                  : 'border border-border bg-card/50'
              }`}
            >
            {plan.isPopular && (
              <div className="absolute -top-4 right-4 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full font-bold animate-badge-pulse shadow-lg z-10">
                最多人选
              </div>
            )}
            {/* Plan Name */}
            <div className="mb-4">
              <h3 className="font-mono text-lg font-medium text-foreground">{plan.name}</h3>
            </div>
            
            {/* Price */}
            <div className="mb-2">
              <span className="text-3xl font-bold font-mono text-foreground">{plan.priceLabel}</span>
            </div>
            
            {/* Specs with dots */}
            <div className="space-y-2 mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('featureLive')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('featureLeaderboard')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('featureSignals')}</span>
              </div>
            </div>
            
            {/* Features Title */}
            <h4 className="text-sm font-medium text-foreground mb-3">{plan.featuresTitle}</h4>
            
            {/* Features with checks */}
            <div className="space-y-2 flex-1">
              {plan.features.slice(3).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className={`w-4 h-4 flex-shrink-0 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={feature.highlight ? 'text-foreground' : 'text-muted-foreground'}>
                    {feature.text}
                  </span>
                </div>
              ))}
              {plan.features.slice(3).length === 0 && (
                <p className="text-xs text-muted-foreground italic">{t('basicFeatures')}</p>
              )}
            </div>
            
            {/* Payment Buttons - Together at bottom */}
            <div className="space-y-2 mt-6 pt-6 border-t border-border">
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
    </div>
  );
};

export default PlanSubscriptionPanel;
