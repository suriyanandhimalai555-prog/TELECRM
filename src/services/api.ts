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

  // Auto-inject company_id for master_admin viewing a specific company
  const { user, viewingCompanyId } = useAuthStore.getState();
  if (user?.role === 'master_admin' && viewingCompanyId) {
    config.params = { ...config.params, company_id: viewingCompanyId };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
