import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, MessageSquare, MessageSquareOff, Globe, User, LogOut, ChevronDown, Clock, Menu } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';
import { useUser } from '@/contexts/UserContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import LoginModal from '@/components/LoginModal';

interface TopNavProps {
  danmakuEnabled: boolean;
  onToggleDanmaku: () => void;
  hideDanmakuToggle?: boolean;
  mobileQuickActions?: ReactNode;
}

const TopNav = ({ danmakuEnabled, onToggleDanmaku, hideDanmakuToggle = false, mobileQuickActions }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { timeZone, setTimeZone, timeZones } = useTimeZone();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogin = () => {
    // User state is now managed by UserContext
  };
  
  const handleLogout = async () => {
    await logout();
  };

  const handleProClick = () => {
    navigate('/account?tab=subscription');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const currentTimeZoneLabel = timeZones.find((tz) => tz.value === timeZone)?.label || timeZone;
  const navItems = [
    { to: '/chart', label: t('chartPage'), isActive: location.pathname === '/chart' || location.pathname === '/' },
    { to: '/leaderboard', label: t('leaderboard'), isActive: location.pathname === '/leaderboard' },
    { to: '/kols', label: t('kols'), isActive: location.pathname === '/kols' },
    { to: '/signals', label: t('models'), isActive: location.pathname === '/signals' },
    { to: '/community', label: t('joinCommunity'), isActive: location.pathname === '/community' },
    { to: '/about', label: t('aboutUs'), isActive: location.pathname === '/about' },
  ];

  return (
    <nav className="flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3 border-b border-border bg-card gap-2">
      {/* Logo */}
      <Link to="/chart" className="flex items-center gap-2">
        <span className="text-lg md:text-xl font-bold tracking-tight logo-shine logo-text">
          KOL<span>Arena</span>
        </span>
      </Link>

      {/* Center Navigation */}
      <div className="hidden md:flex items-center gap-5">
        {navItems.map((item, index) => (
          <div key={item.to} className="flex items-center gap-5">
            <Link
              to={item.to}
              className={`font-mono text-sm transition-colors ${
                item.isActive
                  ? 'text-foreground text-base font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
            {index < navItems.length - 1 && <span className="text-muted-foreground">|</span>}
          </div>
        ))}
        <span className="text-muted-foreground">|</span>
        <button
          onClick={handleProClick}
          className={`font-mono text-sm transition-colors ${
            location.pathname === '/account' ? 'text-foreground text-base font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          套餐
        </button>
      </div>

      {/* Right Side - Controls & User */}
      <div className="flex items-center gap-1 md:gap-3">
        {isMobile && mobileQuickActions}

        {/* Language Toggle */}
        {!isMobile && (
          <button
            onClick={toggleLanguage}
            className="touch-target flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors font-mono text-xs"
            aria-label="Toggle language"
            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Globe size={16} />
            <span>{language === 'zh' ? '中文' : 'EN'}</span>
          </button>
        )}

        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors font-mono text-xs">
              <Clock size={16} />
              <>
                <span className="max-w-[120px] truncate" title={currentTimeZoneLabel}>{currentTimeZoneLabel}</span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              {timeZones.map((tz) => (
                <DropdownMenuItem
                  key={tz.value}
                  onClick={() => setTimeZone(tz.value)}
                  className="cursor-pointer"
                >
                  {tz.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {!isMobile && !hideDanmakuToggle && (
          <button
            onClick={onToggleDanmaku}
            className="touch-target p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle danmaku"
            title={danmakuEnabled ? t('closeDanmaku') : t('openDanmaku')}
          >
            {danmakuEnabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
          </button>
        )}
        
        {!isMobile && (
          <button
            onClick={toggleTheme}
            className="touch-target p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        )}

        {/* User Section */}
        <div className="hidden md:block ml-2 pl-3 border-l border-border">
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

        {isMobile && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[360px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-mono">KOLArena</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                <div className="pb-2 border-b border-border">
                  <div className="text-xs text-muted-foreground mb-2">{currentTimeZoneLabel}</div>
                  {user ? (
                    <div className="space-y-2">
                      <Link
                        to="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-mono border border-border"
                      >
                        <User size={15} />
                        {t('myAccount')}
                      </Link>
                      <button
                        onClick={async () => {
                          await handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-mono border border-border text-left"
                      >
                        <LogOut size={15} />
                        {t('logout')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setLoginModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-transparent hover:bg-accent text-foreground font-mono text-sm transition-colors"
                    >
                      <User size={16} />
                      {t('loginRegister')}
                    </button>
                  )}
                </div>

                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-md px-3 py-3 font-mono text-sm border transition-colors ${
                      item.isActive
                        ? 'border-foreground text-foreground bg-accent'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    handleProClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-md px-3 py-3 font-mono text-sm border transition-colors ${
                    location.pathname === '/account'
                      ? 'border-foreground text-foreground bg-accent'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  套餐
                </button>

                <div className="pt-2 border-t border-border space-y-2">
                  <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-mono border border-border"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={15} />
                      语言
                    </span>
                    <span className="text-muted-foreground">{language === 'zh' ? '中文' : 'EN'}</span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-mono border border-border">
                      <span className="flex items-center gap-2">
                        <Clock size={15} />
                        时区
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="max-w-[140px] truncate">{currentTimeZoneLabel}</span>
                        <ChevronDown size={12} />
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="font-mono text-xs max-h-[300px] overflow-y-auto">
                      {timeZones.map((tz) => (
                        <DropdownMenuItem
                          key={tz.value}
                          onClick={() => setTimeZone(tz.value)}
                          className="cursor-pointer"
                        >
                          {tz.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {!hideDanmakuToggle && (
                    <button
                      onClick={onToggleDanmaku}
                      className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-mono border border-border"
                    >
                      <span className="flex items-center gap-2">
                        {danmakuEnabled ? <MessageSquare size={15} /> : <MessageSquareOff size={15} />}
                        弹幕
                      </span>
                      <span className="text-muted-foreground">{danmakuEnabled ? '开启' : '关闭'}</span>
                    </button>
                  )}

                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-mono border border-border"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                      主题
                    </span>
                    <span className="text-muted-foreground">{theme === 'light' ? '浅色' : '深色'}</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

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
