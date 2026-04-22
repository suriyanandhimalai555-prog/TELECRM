import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-aura-red/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-aura-red/10 blur-[120px] rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-aura-red rounded-2xl flex items-center justify-center text-white shadow-lg shadow-aura-red/20">
            <LogIn size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
          AVG<span className="text-aura-red">CRM</span> <span className="text-xs align-top bg-aura-red text-white px-1 ml-1 rounded">PRO</span>
        </h2>
        <p className="mt-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
          Central Command Interface
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Authorized Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-aura-red focus:border-transparent text-sm font-bold transition-all"
                  placeholder="name@avgcrm.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Access Credentials
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-aura-red focus:border-transparent text-sm font-bold transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-xs font-black text-white bg-aura-red hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aura-red disabled:opacity-50 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Validating Access...' : 'Initialize Session'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/register" className="text-[10px] font-black text-gray-400 hover:text-aura-red uppercase tracking-widest transition-colors">
              Request New Credentials
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
