import { ExternalLink, Sun, Moon, MessageSquare, MessageSquareOff, Globe } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/lib/i18n';

interface TopNavProps {
  danmakuEnabled: boolean;
  onToggleDanmaku: () => void;
}

const TopNav = ({ danmakuEnabled, onToggleDanmaku }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-foreground">
          Kol<span className="text-accent-purple">Arena</span>
        </span>
        <span className="text-xs text-muted-foreground">by</span>
      </div>

      {/* Center Navigation */}
      <div className="flex items-center gap-8">
        <a href="#" className="font-mono text-sm text-foreground hover:text-accent-cyan transition-colors">
          {t('live')}
        </a>
        <span className="text-muted-foreground">|</span>
        <a href="#" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t('leaderboard')}
        </a>
        <span className="text-muted-foreground">|</span>
        <a href="#" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t('models')}
        </a>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors font-mono text-xs"
          aria-label="Toggle language"
          title={language === 'zh' ? 'Switch to English' : '切换到中文'}
        >
          <Globe size={16} />
          <span>{language === 'zh' ? '中文' : 'EN'}</span>
        </button>
        
        <button
          onClick={onToggleDanmaku}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Toggle danmaku"
          title={danmakuEnabled ? t('closeDanmaku') : t('openDanmaku')}
        >
          {danmakuEnabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <a 
          href="#" 
          className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('joinWaitlist')}
          <ExternalLink size={14} />
        </a>
        <a 
          href="#" 
          className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('aboutNofi')}
          <ExternalLink size={14} />
        </a>
      </div>
    </nav>
  );
};

export default TopNav;
