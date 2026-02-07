import { useState } from 'react';
import { CreditCard, Bitcoin, Check, Zap, TrendingUp, Shield, Clock, Users, MessageSquare, BarChart3, Crown, CircleDot } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CryptoPaymentModal from './CryptoPaymentModal';

type PlanType = 'monthly' | 'quarterly' | 'yearly';

interface PlanFeature {
  text: string;
  highlight?: boolean;
}

const PlanSubscriptionPanel = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);

  const handleStripePayment = (planName: string) => {
    toast({
      title: t('paymentNotAvailable'),
      description: 'Stripe integration coming soon',
    });
  };

  const handleCryptoPayment = (planName: string, price: number) => {
    setSelectedPlan({ name: planName, price });
    setCryptoModalOpen(true);
  };

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

  const plans = [
    {
      type: 'monthly' as PlanType,
      name: t('planMonthly'),
      price: 10,
      priceLabel: '10 USDT',
      period: t('perMonth'),
      description: t('planMonthlyDesc'),
      features: monthlyFeatures,
      featuresTitle: t('featuresTitle'),
      isPopular: false,
    },
    {
      type: 'quarterly' as PlanType,
      name: t('planQuarterly'),
      price: 28,
      priceLabel: '28 USDT',
      period: t('perQuarter'),
      description: t('planQuarterlyDesc'),
      features: quarterlyFeatures,
      featuresTitle: t('featuresTitlePlus'),
      isPopular: true,
      save: '7%',
    },
    {
      type: 'yearly' as PlanType,
      name: t('planYearly'),
      price: 99,
      priceLabel: '99 USDT',
      period: t('perYear'),
      description: t('planYearlyDesc'),
      features: yearlyFeatures,
      featuresTitle: t('featuresTitlePremium'),
      isPopular: false,
      save: '18%',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-mono text-2xl font-bold mb-2">{t('subscriptionPlans')}</h1>
        <p className="text-muted-foreground">{t('subscriptionDesc')}</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.type}
            className={`relative rounded-xl p-6 flex flex-col transition-all ${
              plan.isPopular 
                ? 'border-2 border-primary bg-card shadow-lg shadow-primary/10' 
                : 'border border-border bg-card/50'
            }`}
          >
            {/* Plan Name */}
            <div className="mb-4">
              <h3 className="font-mono text-lg font-medium text-foreground">{plan.name}</h3>
            </div>
            
            {/* Price */}
            <div className="mb-2">
              <span className="text-3xl font-bold font-mono text-foreground">{plan.priceLabel}</span>
            </div>
            
            {/* Period / Save */}
            <p className="text-sm text-muted-foreground mb-6">
              {plan.period}
              {plan.save && (
                <span className="ml-2 text-primary font-medium">({t('saveMoney')} {plan.save})</span>
              )}
            </p>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
            
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
                className={`w-full ${
                  plan.isPopular 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
                onClick={() => handleCryptoPayment(plan.name, plan.price)}
              >
                <Bitcoin className="w-4 h-4 mr-2" />
                {t('payWithCrypto')}
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => handleStripePayment(plan.name)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t('payWithStripe')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Banner - Enterprise Style */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-mono font-semibold text-foreground mb-1">{t('enterprisePlan')}</h3>
          <p className="text-sm text-muted-foreground">{t('enterpriseDesc')}</p>
        </div>
        <Button variant="outline" className="whitespace-nowrap">
          {t('contactUs')}
        </Button>
      </div>

      {/* Payment Info */}
      <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>{t('securePayment')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{t('instantActivation')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{t('cancelAnytime')}</span>
        </div>
      </div>

      {/* Crypto Payment Modal */}
      {selectedPlan && (
        <CryptoPaymentModal
          open={cryptoModalOpen}
          onOpenChange={setCryptoModalOpen}
          planName={selectedPlan.name}
          price={selectedPlan.price}
        />
      )}
    </div>
  );
};

export default PlanSubscriptionPanel;
