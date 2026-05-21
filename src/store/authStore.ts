import { create } from 'zustand';
import { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  viewingCompanyId: number | null;
  setUser: (u: AuthUser) => void;
  setViewingCompany: (id: number | null) => void;
  logout: () => void;
  getEffectiveCompanyId: () => number | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  viewingCompanyId: null,
  setUser: (user) => { set({ user, token: user.token }); localStorage.setItem('token', user.token); },
  setViewingCompany: (id) => set({ viewingCompanyId: id }),
  logout: () => { set({ user: null, token: null, viewingCompanyId: null }); localStorage.removeItem('token'); },
  getEffectiveCompanyId: () => {
    const { user, viewingCompanyId } = get();
    return user?.role === 'master_admin' ? viewingCompanyId : user?.company_id ?? null;
  },
}));
