import { useState, useEffect, useCallback } from 'react';
import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ProfitComparisonPanel, type KolData } from './Leaderboard';

const DEFAULT_INITIAL_CAPITAL = 10000;

const TrendComparisonPage = () => {
  const { t } = useLanguage();
  const { user } = useUser();
  const [kolsData, setKolsData] = useState<KolData[]>([]);
  const [followedKolIds, setFollowedKolIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchRelations = useCallback(async () => {
    if (!user) {
      setFollowedKolIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_kol_relations');
      if (error) {
        console.error('Error fetching relations:', error);
        return;
      }

      setFollowedKolIds(new Set(data?.followed_kol_ids || []));
    } catch (err) {
      console.error('Error fetching relations:', err);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_leaderboard_by_range', {
        p_from: null,
        p_to: null,
        p_initial_capital: DEFAULT_INITIAL_CAPITAL,
      });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      setKolsData((data || []) as KolData[]);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchRelations();

    const dataChannel = supabase
      .channel('comparison-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kols' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => fetchLeaderboard())
      .subscribe();

    const relationsChannel = supabase
      .channel('comparison-relations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_follows' }, () => fetchRelations())
      .subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(relationsChannel);
    };
  }, [fetchLeaderboard, fetchRelations]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      <TickerBar />

      <div className="px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm sm:text-base font-semibold text-foreground">{t('profitComparison')}</h1>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchLeaderboard} disabled={loading} title={t('refresh')}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            {t('loading') || 'Loading...'}
          </div>
        ) : (
          <ProfitComparisonPanel kols={kolsData} followedKolIds={followedKolIds} />
        )}
      </div>
    </div>
  );
};

export default TrendComparisonPage;
