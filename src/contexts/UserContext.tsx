import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatar: avatarUrl });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, updateAvatar, logout }}>
      {children}
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
