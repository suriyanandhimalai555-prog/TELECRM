import { useAuthStore } from '../store/authStore';
const buildRequest = (path: string) => {
  const { token, user, viewingCompanyId } = useAuthStore.getState();
  const params = new URLSearchParams();
  if (user?.role === 'master_admin' && viewingCompanyId)
    params.set('company_id', String(viewingCompanyId));
  const qs = params.toString();
  return { url: qs ? `${path}?${qs}` : path, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
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
