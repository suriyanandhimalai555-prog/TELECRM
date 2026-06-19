import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { LogIn } from 'lucide-react';

const COMPANIES = [
  { id: 3, name: 'AVG Prime Tech Bangalore' },
  { id: 11, name: 'Almanzar Primetech LLC (India)' },
  { id: 12, name: 'Almanzar Digital (Dubai)' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyId) { setError('Please select your company'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password, company_id: companyId });
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
        <p className="mt-2 text-center text-sm text-gray-500">CRM — Sales & Lead Management</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Company</label>
              <select value={companyId} onChange={e => setCompanyId(Number(e.target.value))} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="">Select your company...</option>
                {COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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
