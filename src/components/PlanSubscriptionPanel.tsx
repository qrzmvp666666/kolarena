import { CreditCard, Bitcoin, Check, Zap, TrendingUp, Shield, Clock, Users, MessageSquare, BarChart3, Star, Crown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

type PlanType = 'monthly' | 'quarterly' | 'yearly';

interface PlanFeature {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
}

const PlanSubscriptionPanel = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handlePayment = (plan: PlanType, method: 'stripe' | 'crypto') => {
    toast({
      title: t('paymentNotAvailable'),
      description: method === 'stripe' ? 'Stripe integration coming soon' : 'Crypto payment coming soon',
    });
  };

  const commonFeatures: PlanFeature[] = [
    { icon: <TrendingUp className="w-4 h-4" />, text: t('featureSignals') },
    { icon: <BarChart3 className="w-4 h-4" />, text: t('featureCharts') },
    { icon: <MessageSquare className="w-4 h-4" />, text: t('featureChat') },
  ];

  const quarterlyFeatures: PlanFeature[] = [
    ...commonFeatures,
    { icon: <Zap className="w-4 h-4" />, text: t('featurePriority'), highlight: true },
    { icon: <Shield className="w-4 h-4" />, text: t('featureAdvanced') },
  ];

  const yearlyFeatures: PlanFeature[] = [
    ...quarterlyFeatures,
    { icon: <Users className="w-4 h-4" />, text: t('featureVipGroup'), highlight: true },
    { icon: <Crown className="w-4 h-4" />, text: t('featureExclusive'), highlight: true },
  ];

  const plans = [
    {
      type: 'monthly' as PlanType,
      name: t('planMonthly'),
      price: 10,
      period: t('perMonth'),
      badge: null,
      badgeColor: '',
      features: commonFeatures,
      gradient: 'from-blue-500/10 to-blue-600/5',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      type: 'quarterly' as PlanType,
      name: t('planQuarterly'),
      price: 28,
      period: t('perQuarter'),
      badge: t('mostPopular'),
      badgeColor: 'bg-purple-500',
      features: quarterlyFeatures,
      gradient: 'from-purple-500/10 to-purple-600/5',
      borderColor: 'border-purple-500/50',
      iconColor: 'text-purple-400',
      save: '7%',
    },
    {
      type: 'yearly' as PlanType,
      name: t('planYearly'),
      price: 99,
      period: t('perYear'),
      badge: t('bestValue'),
      badgeColor: 'bg-yellow-500',
      features: yearlyFeatures,
      gradient: 'from-yellow-500/10 to-yellow-600/5',
      borderColor: 'border-yellow-500/50',
      iconColor: 'text-yellow-400',
      save: '18%',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold mb-2">{t('subscriptionPlans')}</h1>
        <p className="text-sm text-muted-foreground">{t('subscriptionDesc')}</p>
      </div>

      {/* Horizontal 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card 
            key={plan.type}
            className={`relative overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br ${plan.gradient} ${plan.borderColor} flex flex-col`}
          >
            {plan.badge && (
              <div className="absolute top-0 right-0">
                <Badge className={`rounded-none rounded-bl-lg ${plan.badgeColor} text-white border-0`}>
                  <Star className="w-3 h-3 mr-1" />
                  {plan.badge}
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-base flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full bg-background/50 flex items-center justify-center ${plan.iconColor}`}>
                  {plan.type === 'monthly' && <Zap className="w-3.5 h-3.5" />}
                  {plan.type === 'quarterly' && <TrendingUp className="w-3.5 h-3.5" />}
                  {plan.type === 'yearly' && <Crown className="w-3.5 h-3.5" />}
                </div>
                {plan.name}
              </CardTitle>
              <div className="flex items-baseline gap-1 mt-2 flex-wrap">
                <span className="text-2xl font-bold font-mono">{plan.price}</span>
                <span className="text-muted-foreground text-sm">USDT</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
                {plan.save && (
                  <Badge variant="outline" className="ml-1 border-green-500 text-green-500 text-[10px] px-1.5 py-0">
                    {t('saveMoney')} {plan.save}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <Separator className="bg-border/50" />
              
              {/* Features List */}
              <div className="space-y-2 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('includedFeatures')}
                </p>
                <ul className="space-y-1.5">
                  {plan.features.map((feature, index) => (
                    <li 
                      key={index}
                      className={`flex items-center gap-1.5 text-xs ${
                        feature.highlight ? 'text-primary font-medium' : 'text-foreground'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                        {feature.icon}
                      </div>
                      <span className="truncate">{feature.text}</span>
                      {feature.highlight && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/50 text-primary flex-shrink-0">
                          {t('exclusive')}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Separator className="bg-border/50" />
              
              {/* Payment Buttons */}
              <div className="space-y-2 mt-auto">
                <Button 
                  className="w-full gap-2 text-xs h-9" 
                  variant="outline"
                  onClick={() => handlePayment(plan.type, 'stripe')}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {t('payWithStripe')}
                </Button>
                <Button 
                  className="w-full gap-2 text-xs h-9"
                  onClick={() => handlePayment(plan.type, 'crypto')}
                >
                  <Bitcoin className="w-3.5 h-3.5" />
                  {t('payWithCrypto')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Info - Horizontal on larger screens */}
      <div className="bg-muted/30 rounded-lg p-4 flex flex-wrap gap-4 md:gap-8 justify-center">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-green-500" />
          <span>{t('securePayment')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>{t('instantActivation')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-primary" />
          <span>{t('cancelAnytime')}</span>
        </div>
      </div>
    </div>
  );
};

export default PlanSubscriptionPanel;
