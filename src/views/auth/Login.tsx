import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import axios from 'axios';
import { LogIn } from 'lucide-react';

type CrmMode = 'normal' | 'state';

export default function Login() {
  const [mode, setMode] = useState<CrmMode>('normal');
  const [email, setEmail] = useState('');
  const [companies, setCompanies] = useState<{ id: number; company_name: string }[]>([]);
  useEffect(() => {
    api.get("/auth/companies").then(res => setCompanies(res.data)).catch(() => {});
  }, []);
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'state') {
      setLoading(true);
      try {
        const res = await axios.post('/api/state/auth/login', { email, password });
        localStorage.setItem('state_crm_token', res.data.token);
        localStorage.setItem('state_crm_user', JSON.stringify(res.data.user));
        navigate('/state-crm');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to login');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (companyId === '') { setError('Please select your company'); return; }
    setLoading(true);
    try {
      const payload: any = { email, password };
      if (companyId !== -1) { payload.company_id = companyId; }
      const res = await api.post('/auth/login', payload);
      login(res.data.token, res.data.user);
      useAuthStore.getState().setUser({ ...res.data.user, token: res.data.token });
      localStorage.setItem('company_id', res.data.user.company_id);
      localStorage.setItem('user_role', res.data.user.role);
      window.location.href = '/app';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="AVG CRM" className="h-16 w-auto" />
        </div>
        <h2 className="text-center text-3xl font-black uppercase tracking-tighter text-gray-900">Sign in</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {mode === 'normal' ? 'CRM — Sales & Lead Management' : 'State CRM — Sales & Lead Management'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* CRM type toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('normal'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
              mode === 'normal' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Normal CRM
          </button>
          <button
            type="button"
            onClick={() => { setMode('state'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
              mode === 'state' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            State CRM
          </button>
        </div>

        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {mode === 'normal' && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Company</label>
                <select value={companyId} onChange={e => setCompanyId(Number(e.target.value))} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select your company...</option>
                  <option value={-1}>Master Admin (No Company)</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl disabled:opacity-50 transition-colors">
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
