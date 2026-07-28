import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';

type AuthValue = {
  user: User | null;
  loading: boolean;
  setSession: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) return setUser(null);
    try {
      setUser(await api<User>('/me'));
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    setSession: async (token, nextUser) => {
      await SecureStore.setItemAsync('auth_token', token);
      setUser(nextUser);
    },
    logout: async () => {
      try { await api('/logout', { method: 'POST' }); } catch {}
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    },
    refresh,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
