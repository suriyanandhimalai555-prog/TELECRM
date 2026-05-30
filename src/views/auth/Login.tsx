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
  const [showPledge, setShowPledge] = useState(false);
  const [pledgeData, setPledgeData] = useState<any>(null);
  const [pledgeLoading, setPledgeLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      // Send login notification to admin
      try {
        await api.post('/attendance/login-notify', {
          name: res.data.user.name,
          role: res.data.user.role,
          email: res.data.user.email,
        });
      } catch {}
      // Show pledge popup
      setPledgeData(res.data.user);
      setShowPledge(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handlePledgeConfirm = async () => {
    setPledgeLoading(true);
    const finish = () => {
      setPledgeLoading(false);
      setShowPledge(false);
      navigate('/app');
    };
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try { await api.post('/attendance/checkin', { lat: pos.coords.latitude, lng: pos.coords.longitude }); } catch {}
        finish();
      }, async () => {
        try { await api.post('/attendance/checkin', { lat: null, lng: null }); } catch {}
        finish();
      });
    } catch {
      finish();
    }
  };

  const handlePledgeSkip = () => {
    setShowPledge(false);
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      {/* Pledge Modal */}
      {showPledge && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900">Attendance Pledge</h2>
              <p className="text-gray-400 text-sm mt-1">Welcome, {pledgeData?.name}!</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
              <p className="text-[12px] text-blue-800 font-semibold text-center leading-relaxed">
                "I, <strong>{pledgeData?.name}</strong>, pledge to be productive, honest, and committed in my work today. I confirm that I am marking my attendance for{' '}
                <strong>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>."
              </p>
            </div>

            <div className="text-[10px] text-gray-400 text-center mb-6">
              📍 Your location will be recorded for attendance tracking
            </div>

            <div className="flex gap-3">
              <button onClick={handlePledgeSkip}
                className="flex-1 py-3 border border-gray-200 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-50">
                Skip
              </button>
              <button onClick={handlePledgeConfirm} disabled={pledgeLoading}
                className="flex-2 flex-grow-[2] py-3 bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-600 disabled:opacity-50">
                {pledgeLoading ? "Marking Attendance..." : "I Agree & Check In ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="AVG CRM" className="h-16 w-auto" />
        </div>
        <h2 className="text-center text-3xl font-black uppercase tracking-tighter text-gray-900">Sign in</h2>
        <p className="mt-2 text-center text-sm text-gray-500">AVG CRM — Sales & Lead Management</p>
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
