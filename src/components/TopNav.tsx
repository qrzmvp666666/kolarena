import { useState } from 'react';
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
}

// Mock user state - replace with real auth later
interface MockUser {
  name: string;
  avatar: string;
}

const TopNav = ({ danmakuEnabled, onToggleDanmaku }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
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
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-foreground">
          Kol<span className="text-accent-purple">Arena</span>
        </span>
      </div>

      {/* Center Navigation */}
      <div className="flex items-center gap-6">
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
        <span className="text-muted-foreground">|</span>
        <a 
          href="#" 
          className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('joinWaitlist')}
        </a>
        <span className="text-muted-foreground">|</span>
        <a 
          href="#" 
          className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('aboutUs')}
        </a>
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

        {/* User Section */}
        <div className="ml-2 pl-3 border-l border-border">
          {user ? (
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
                <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                  <LogOut size={14} />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      </div>
    </nav>
  );
};

export default TopNav;
