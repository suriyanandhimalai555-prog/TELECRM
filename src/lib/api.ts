import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://telecrm-copy-production.up.railway.app/api';

const buildRequest = (path: string) => {
  const { token, user, viewingCompanyId } = useAuthStore.getState();
  const params = new URLSearchParams();
  if (user?.role === 'master_admin' && viewingCompanyId)
    params.set('company_id', String(viewingCompanyId));
  const qs = params.toString();
  const fullPath = path.startsWith('http') ? path : `${BASE_URL}${path.replace('/api', '')}`;
  const url = qs ? `${fullPath}${fullPath.includes('?') ? '&' : '?'}${qs}` : fullPath;
  return { url, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const { url, headers } = buildRequest(path);
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const apiPost = async <T>(path: string, body: object): Promise<T> => {
  const { url, headers } = buildRequest(path);
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const apiDelete = async (path: string): Promise<void> => {
  const { url, headers } = buildRequest(path);
  await fetch(url, { method: 'DELETE', headers });
};
