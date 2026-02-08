import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, MessageSquare, MessageSquareOff, Globe, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/lib/i18n';
import { useUser } from '@/contexts/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LoginModal from '@/components/LoginModal';
import CommunityModal from '@/components/CommunityModal';

interface TopNavProps {
  danmakuEnabled: boolean;
  onToggleDanmaku: () => void;
  hideDanmakuToggle?: boolean;
}

const TopNav = ({ danmakuEnabled, onToggleDanmaku, hideDanmakuToggle = false }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const { user, logout } = useUser();
  
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  
  const handleLogin = () => {
    // User state is now managed by UserContext
  };
  
  const handleLogout = async () => {
    await logout();
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      {/* Logo */}
      <Link to="/chart" className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-foreground logo-shine">
          Kol<span className="text-accent-purple">Arena</span>
        </span>
      </Link>

      {/* Center Navigation */}
      <div className="flex items-center gap-6">
        <Link 
          to="/chart" 
          className={`font-mono text-sm transition-colors ${
            location.pathname === '/chart' ? 'text-foreground text-base font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('chartPage')}
        </Link>
        <span className="text-muted-foreground">|</span>
        <Link 
          to="/leaderboard" 
          className={`font-mono text-sm transition-colors ${
            location.pathname === '/leaderboard' ? 'text-foreground text-base font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('leaderboard')}
        </Link>
        <span className="text-muted-foreground">|</span>
        <Link 
          to="/signals" 
          className={`font-mono text-sm transition-colors ${
            location.pathname === '/signals' ? 'text-foreground text-base font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('models')}
        </Link>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={() => setCommunityModalOpen(true)}
          className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('joinCommunity')}
        </button>
        <span className="text-muted-foreground">|</span>
        <Link 
          to="/about"
          className={`font-mono text-sm transition-colors ${
            location.pathname === '/about' ? 'text-foreground text-base font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('aboutUs')}
        </Link>
      </div>

      {/* Right Side - Controls & User */}
      <div className="flex items-center gap-3">
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
        
        {!hideDanmakuToggle && (
          <button
            onClick={onToggleDanmaku}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle danmaku"
            title={danmakuEnabled ? t('closeDanmaku') : t('openDanmaku')}
          >
            {danmakuEnabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
          </button>
        )}
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Section */}
        <div className="ml-2 pl-3 border-l border-border">
          {user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1 transition-colors">
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-border"
                  />
                  <span className="font-mono text-sm text-foreground">{user.name}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-mono">
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link to="/account">
                      <User size={14} />
                      {t('myAccount')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                    <LogOut size={14} />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-transparent hover:bg-accent text-foreground font-mono text-sm transition-colors"
            >
              <User size={16} />
              {t('loginRegister')}
            </button>
          )}
        </div>

        {/* Login Modal */}
        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onLogin={handleLogin}
        />

        {/* Community Modal */}
        <CommunityModal
          open={communityModalOpen}
          onOpenChange={setCommunityModalOpen}
        />
      </div>
    </nav>
  );
};

export default TopNav;
