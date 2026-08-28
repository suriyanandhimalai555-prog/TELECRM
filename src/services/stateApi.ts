import axios from 'axios';

const stateApi = axios.create({
  baseURL: '/api/state',
});

stateApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('state_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

stateApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('state_crm_token');
      localStorage.removeItem('state_crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default stateApi;
