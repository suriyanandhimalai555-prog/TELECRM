import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Check, X } from 'lucide-react';

const REVIEW_ROLES = ['master', 'admin', 'coordinator', 'state_head'];
const errMsg = (e: any) => e?.response?.data?.message || 'Something went wrong';
const BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function StateLate() {
  const { user } = useOutletContext<{ user: any }>();
  const canReview = REVIEW_ROLES.includes(user?.role);
  const [mine, setMine] = useState<any[]>([]);
  const [review, setReview] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await stateApi.get('/late'); setMine(Array.isArray(r.data?.requests) ? r.data.requests : []); } catch { setMine([]); }
    if (canReview) {
      try { const r = await stateApi.get('/late', { params: { scope: 'review' } }); setReview(Array.isArray(r.data?.requests) ? r.data.requests : []); } catch { setReview([]); }
    }
  }, [canReview]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try { const r = await stateApi.post('/late', { date, reason }); setMsg({ ok: true, text: r.data.message }); setDate(''); setReason(''); await load(); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
    setBusy(false);
  };

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    setMsg(null);
    try { const r = await stateApi.put(`/late/${id}`, { status }); setMsg({ ok: true, text: r.data.message }); await load(); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h1 className="text-xl font-semibold">Late regularization</h1>
        <p className="text-sm text-gray-500 mb-4">Ask your manager to forgive a late arrival. If approved, that day is paid in full.</p>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why were you late?" className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm" />
          <button disabled={busy || !date || reason.trim().length < 5} onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-40">Send request</button>
        </div>
        {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold mb-3">My requests</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Date</th><th>Checked in</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {mine.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">No requests yet.</td></tr>}
            {mine.map(r => (
              <tr key={r.id} className="border-b last:border-0"><td className="py-2">{r.date}</td><td>{r.check_in_time || '—'}</td><td className="text-gray-600">{r.reason}</td>
                <td><span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[r.status] || ''}`}>{r.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {canReview && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold mb-3">Requests to review</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Name</th><th>Date</th><th>Checked in</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {review.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nothing to review.</td></tr>}
              {review.map(r => (
                <tr key={r.id} className="border-b last:border-0"><td className="py-2">{r.user_name}</td><td>{r.date}</td><td>{r.check_in_time || '—'}</td><td className="text-gray-600">{r.reason}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[r.status] || ''}`}>{r.status}</span></td>
                  <td className="text-right whitespace-nowrap">
                    {r.status === 'pending' && r.user_id !== user.id && (<>
                      <button onClick={() => decide(r.id, 'approved')} className="p-1.5 rounded bg-green-100 text-green-700 mr-1" title="Approve"><Check size={14} /></button>
                      <button onClick={() => decide(r.id, 'rejected')} className="p-1.5 rounded bg-red-100 text-red-700" title="Reject"><X size={14} /></button>
                    </>)}
                  </td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
