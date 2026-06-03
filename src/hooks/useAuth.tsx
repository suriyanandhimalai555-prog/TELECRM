import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import api from '../services/api';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncToStore = useCallback((userData: any, token: string) => {
    try {
      useAuthStore.getState().setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company_id: userData.company_id ?? null,
        company_name: userData.company_name ?? '',
        token,
      });
    } catch {}
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      syncToStore(res.data, localStorage.getItem('token') || '');
    } catch (error: any) {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, [syncToStore]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.id) {
          const userData = { id: payload.id, email: payload.email, name: payload.name, role: payload.role, company_id: payload.company_id, company_name: payload.company_name };
          setUser(userData as any);
          syncToStore(userData, token);
          setLoading(false);
          return;
        }
      } catch {}
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser, syncToStore]);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    setUser(user);
    syncToStore(user, token);
    setLoading(false);
  }, [syncToStore]);

  const logout = useCallback(async () => {
    try {
      await api.post('/attendance/checkout');
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
    useAuthStore.getState().logout();
  }, []);

  const value = useMemo(() => ({ 
    user, 
    loading, 
    login, 
    logout, 
    refreshUser 
  }), [user, loading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
