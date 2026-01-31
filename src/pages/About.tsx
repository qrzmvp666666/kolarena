import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { Target, Shield, Zap, Users, TrendingUp, Award } from 'lucide-react';

const About = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Target,
      titleKey: 'aboutFeature1Title',
      descKey: 'aboutFeature1Desc',
    },
    {
      icon: Shield,
      titleKey: 'aboutFeature2Title',
      descKey: 'aboutFeature2Desc',
    },
    {
      icon: Zap,
      titleKey: 'aboutFeature3Title',
      descKey: 'aboutFeature3Desc',
    },
    {
      icon: Users,
      titleKey: 'aboutFeature4Title',
      descKey: 'aboutFeature4Desc',
    },
    {
      icon: TrendingUp,
      titleKey: 'aboutFeature5Title',
      descKey: 'aboutFeature5Desc',
    },
    {
      icon: Award,
      titleKey: 'aboutFeature6Title',
      descKey: 'aboutFeature6Desc',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      {/* Main Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {t('aboutTitle')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('aboutSubtitle')}
          </p>
        </div>

        {/* Mission */}
        <div className="mb-12 p-6 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent-orange" />
            {t('aboutMissionTitle')}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('aboutMissionDesc')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">
            {t('aboutWhyChoose')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="p-5 rounded-lg border border-border bg-card hover:border-accent-orange/50 transition-colors"
                >
                  <IconComponent className="w-8 h-8 text-accent-orange mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div className="text-center p-8 rounded-lg border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {t('aboutTeamTitle')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('aboutTeamDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
