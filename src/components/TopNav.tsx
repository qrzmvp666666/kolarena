import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, MessageSquare, MessageSquareOff, Globe, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LoginModal from '@/components/LoginModal';

interface TopNavProps {
  danmakuEnabled: boolean;
  onToggleDanmaku: () => void;
  hideDanmakuToggle?: boolean;
}

// Mock user state - replace with real auth later
interface MockUser {
  name: string;
  avatar: string;
}

const TopNav = ({ danmakuEnabled, onToggleDanmaku, hideDanmakuToggle = false }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  
  // Mock login state - set to null for logged out, or user object for logged in
  const [user, setUser] = useState<MockUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
  const handleLogin = (loggedInUser: MockUser) => {
    setUser(loggedInUser);
  };
  
  const handleLogout = () => {
    setUser(null);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="w-full flex justify-center py-4 px-4">
      <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg max-w-4xl w-full">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Kol<span className="text-accent-purple">Arena</span>
          </span>
        </div>

        {/* Center Navigation */}
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            className={`font-mono text-sm transition-colors ${
              location.pathname === '/' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('live')}
          </Link>
          <a href="#" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('leaderboard')}
          </a>
          <Link 
            to="/signals" 
            className={`font-mono text-sm transition-colors ${
              location.pathname === '/signals' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('models')}
          </Link>
          <a 
            href="#" 
            className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('aboutUs')}
          </a>
        </div>

        {/* Right Side - Controls & User */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-accent/50 transition-colors font-mono text-xs"
            aria-label="Toggle language"
            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Globe size={14} />
            <span>{language === 'zh' ? '中文' : 'EN'}</span>
          </button>
          
          {!hideDanmakuToggle && (
            <button
              onClick={onToggleDanmaku}
              className="p-2 rounded-full hover:bg-accent/50 transition-colors"
              aria-label="Toggle danmaku"
              title={danmakuEnabled ? t('closeDanmaku') : t('openDanmaku')}
            >
              {danmakuEnabled ? <MessageSquare size={16} /> : <MessageSquareOff size={16} />}
            </button>
          )}
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-accent/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User Section */}
          <div className="ml-1 pl-2 border-l border-border/50">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-accent/50 rounded-full px-2 py-1 transition-colors">
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-6 h-6 rounded-full border border-border/50"
                  />
                  <span className="font-mono text-sm text-foreground">{user.name}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-mono">
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                    <LogOut size={14} />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background hover:bg-foreground/90 font-mono text-sm transition-colors"
              >
                <User size={14} />
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
        </div>
      </nav>
    </div>
  );
};

export default TopNav;
