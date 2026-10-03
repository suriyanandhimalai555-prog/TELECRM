import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Trash2 } from 'lucide-react';

const MANAGE_ROLES = ['master', 'admin'];
const errMsg = (e: any) => e?.response?.data?.message || 'Something went wrong';

export default function StateHolidays() {
  const { user } = useOutletContext<{ user: any }>();
  const canManage = MANAGE_ROLES.includes(user?.role);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try { const r = await stateApi.get('/holidays', { params: { year } }); setRows(Array.isArray(r.data?.holidays) ? r.data.holidays : []); }
    catch { setRows([]); }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setMsg(null);
    try { const r = await stateApi.post('/holidays', { name, from, to: to || undefined }); setMsg({ ok: true, text: r.data.message }); setName(''); setFrom(''); setTo(''); await load(); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };
  const remove = async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return;
    try { await stateApi.delete(`/holidays/${id}`); await load(); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {canManage && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h1 className="text-xl font-semibold mb-1">Add a holiday</h1>
          <p className="text-sm text-gray-500 mb-4">For one day, fill only the start date. For a range, add an end date (up to 31 days). Applies to all states.</p>
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Holiday name" className="flex-1 min-w-[180px] border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <button disabled={!name.trim() || !from} onClick={add} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-40">Add holiday</button>
          </div>
          {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Holidays</h2>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} className="border rounded-lg px-2 py-1 text-sm w-24" />
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Date</th><th>Name</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">No holidays for {year}.</td></tr>}
            {rows.map(h => (
              <tr key={h.id} className="border-b last:border-0"><td className="py-2">{h.date}</td><td>{h.name}</td>
                <td className="text-right">{canManage && <button onClick={() => remove(h.id)} className="p-1.5 rounded bg-red-100 text-red-700" title="Delete"><Trash2 size={14} /></button>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
