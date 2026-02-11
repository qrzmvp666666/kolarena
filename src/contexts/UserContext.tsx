import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface UserContextType {
  user: UserProfile | null;
  updateAvatar: (avatarUrl: string) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showKickAlert, setShowKickAlert] = useState(false);

  const loadUserProfile = async (authUserId: string, authEmail?: string | null) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUserId}&backgroundColor=b6e3f4`;
      const avatar = data?.avatar_url || fallbackAvatar;

      setUser({
        id: authUserId,
        email: authEmail || '',
        name: authEmail?.split('@')[0] || 'User',
        avatar,
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email);

        // Single Session Enforcement
        const allowMultiSession = withoutMultiSessionCheck();

        if (!allowMultiSession) {
          (async () => {
            const userId = session.user.id;
            const storageKey = `session_token_${userId}`;

            const claimSession = async () => {
              try {
                const newToken = typeof crypto !== 'undefined' && crypto.randomUUID 
                  ? crypto.randomUUID() 
                  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  
                localStorage.setItem(storageKey, newToken);
                
                // Fire and forget update - do not await strictly if it blocks UI
                supabase
                  .from('users')
                  .update({ last_login_token: newToken })
                  .eq('auth_user_id', userId)
                  .then(({ error }) => {
                     if (error) console.error('Failed to update session token:', error);
                  });
              } catch (err) {
                console.error('Session claim failed:', err);
              }
            };

            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
              await claimSession();
            } else if (event === 'INITIAL_SESSION') {
              const localToken = localStorage.getItem(storageKey);
              if (!localToken) {
                await claimSession();
              } else {
                // Completely detached non-blocking check
                setTimeout(async () => {
                  try {
                    const { data, error } = await supabase
                      .from('users')
                      .select('last_login_token')
                      .eq('auth_user_id', userId)
                      .maybeSingle();

                    if (!error && data && data.last_login_token && data.last_login_token !== localToken) {
                      console.warn('Session mismatch detected, logging out...');
                      setShowKickAlert(true);
                    }
                  } catch (e) {
                    console.error('Session validation failed:', e);
                  }
                }, 1000);
              }
            }
          })().catch(err => console.error("Session enforcement error:", err));
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const allowMultiSession = withoutMultiSessionCheck();
    if (allowMultiSession || !user) return;

    const userId = user.id;
    const channel = supabase.channel(`session_check_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `auth_user_id=eq.${userId}` },
        async (payload) => {
          const newToken = payload.new.last_login_token;
          const storageKey = `session_token_${userId}`;
          const localToken = localStorage.getItem(storageKey);

          if (newToken && localToken && newToken !== localToken) {
            setShowKickAlert(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  function withoutMultiSessionCheck() {
    return import.meta.env.VITE_ALLOW_MULTI_SESSION === 'true';
  }

  const updateAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatar: avatarUrl });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleKickConfirm = async () => {
    setShowKickAlert(false);
    await logout();
  };

  return (
    <UserContext.Provider value={{ user, updateAvatar, logout }}>
      {children}
      <AlertDialog open={showKickAlert} onOpenChange={(open) => { if (!open) handleKickConfirm(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>账号下线通知</AlertDialogTitle>
            <AlertDialogDescription>
              您的账号已在其他设备登录。如果这不是您的操作，请重新登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleKickConfirm}>我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
