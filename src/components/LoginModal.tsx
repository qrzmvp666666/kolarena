import { useState } from 'react';
import { Mail, Phone, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

type LoginMethod = 'email' | 'phone';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (user: { name: string; avatar: string }) => void;
}

const LoginModal = ({ open, onOpenChange, onLogin }: LoginModalProps) => {
  const { t } = useLanguage();
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - just close modal and set user
    onLogin({
      name: method === 'email' ? email.split('@')[0] : phone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${method === 'email' ? email : phone}&backgroundColor=b6e3f4`
    });
    onOpenChange(false);
    // Reset form
    setEmail('');
    setPhone('');
    setPassword('');
  };

  const handleGoogleLogin = () => {
    // Mock Google login
    onLogin({
      name: 'Google User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=google&backgroundColor=ffd5dc'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold text-center">
            {t('loginRegister')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Login Method Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm transition-colors ${
                method === 'email'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Mail size={16} />
              {t('emailLogin')}
            </button>
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm transition-colors ${
                method === 'phone'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Phone size={16} />
              {t('phoneLogin')}
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {method === 'email' ? (
              <Input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono"
              />
            ) : (
              <Input
                type="tel"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="font-mono"
              />
            )}

            <Input
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="font-mono"
            />

            <Button type="submit" className="w-full font-mono">
              {t('login')}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-mono">{t('orContinueWith')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Login */}
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full font-mono gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('googleLogin')}
          </Button>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground mt-6 font-mono">
            {t('noAccount')}{' '}
            <button className="text-primary hover:underline">
              {t('register')}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
