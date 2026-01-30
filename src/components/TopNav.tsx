import { ExternalLink, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const TopNav = () => {
  const { theme, toggleTheme } = useTheme();

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
          LIVE
        </a>
        <span className="text-muted-foreground">|</span>
        <a href="#" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
          LEADERBOARD
        </a>
        <span className="text-muted-foreground">|</span>
        <a href="#" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
          MODELS
        </a>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-6">
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
          JOIN THE PLATFORM WAITLIST
          <ExternalLink size={14} />
        </a>
        <a 
          href="#" 
          className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ABOUT NOFI
          <ExternalLink size={14} />
        </a>
      </div>
    </nav>
  );
};

export default TopNav;
