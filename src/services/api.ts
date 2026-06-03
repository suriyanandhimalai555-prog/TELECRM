import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://telecrm-copy-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Auto-inject company_id for all roles (except auth endpoints)
  const { user, viewingCompanyId } = useAuthStore.getState();
  const url = config.url || '';
  if (!url.includes('/auth/')) {
    let effectiveCompanyId = user?.role === 'master_admin' ? viewingCompanyId : user?.company_id ?? null;
    // Fallback: decode JWT directly if store not ready
    if (!effectiveCompanyId) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload?.role !== 'master_admin') effectiveCompanyId = payload?.company_id ?? null;
        }
      } catch {}
    }
    if (effectiveCompanyId) {
      config.params = { ...config.params, company_id: effectiveCompanyId };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/') ) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
