import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { CalendarPlus, Check, X } from 'lucide-react';

interface LeaveRequest {
  id: number;
  user_id: number;
  user_name?: string;
  email?: string;
  leave_type: string;
  date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function StateLeave() {
  const { user } = useOutletContext<{ user: any }>();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ leave_type: 'casual', date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ['master', 'admin', 'coordinator', 'state_head'].includes(user.role);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/leave');
      setRequests(res.data.leave || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const submit = async () => {
    if (!form.date) { setError('Pick a date'); return; }
    setError('');
    setSubmitting(true);
    try {
      await stateApi.post('/leave', form);
      setForm({ leave_type: 'casual', date: '', reason: '' });
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await stateApi.put(`/leave/${id}`, { status });
      fetchRequests();
    } catch { }
  };

  const badge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Leave</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Request and manage time off</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Request Leave</h2>
        {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>}
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}
            className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[11px] font-bold">
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="earned">Earned</option>
          </select>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[11px] font-bold" />
          <input type="text" placeholder="Reason (optional)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
            className="flex-1 px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[11px] font-bold" />
          <button onClick={submit} disabled={submitting}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-5 py-2 rounded-xl transition-colors disabled:opacity-40">
            <CalendarPlus size={14} /> {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {[...(canManage ? ['User'] : []), 'Type', 'Date', 'Reason', 'Status', ...(canManage ? ['Action'] : [])].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  {canManage && <td className="px-6 py-4 text-xs font-black text-gray-900">{r.user_name || '-'}</td>}
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-700 uppercase">{r.leave_type}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-700">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-[10px] text-gray-500">{r.reason || '-'}</td>
                  <td className="px-6 py-4">{badge(r.status)}</td>
                  {canManage && (
                    <td className="px-6 py-4">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => decide(r.id, 'approved')} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check size={14} /></button>
                          <button onClick={() => decide(r.id, 'rejected')} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><X size={14} /></button>
                        </div>
                      ) : <span className="text-[9px] text-gray-300">-</span>}
                    </td>
                  )}
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 4} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? 'Loading...' : 'No leave requests'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
