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
    // Fallback: read from localStorage if store not ready
    if (!effectiveCompanyId) {
      const storedRole = localStorage.getItem('user_role');
      const storedCompanyId = localStorage.getItem('company_id');
      if (storedRole !== 'master_admin' && storedCompanyId) {
        effectiveCompanyId = parseInt(storedCompanyId);
      }
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
      if (!url.includes('/auth/') && !url.includes('/attendance/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('company_id');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
