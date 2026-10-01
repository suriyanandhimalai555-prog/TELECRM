import sys, re, shutil

F = 'src/views/state-crm/StateWorkTracking.tsx'
s = open(F, encoding='utf-8').read()

shutil.copyfile(F, F + '.bak')

old_import = "import { Plus, Check, X, History } from 'lucide-react';"
new_import = "import { Plus, Check, X, History, Clock, Power, Filter } from 'lucide-react';"
if old_import in s:
    s = s.replace(old_import, new_import)
elif "Power" not in s:
    sys.exit("STOP: icon import line not found, and Power not already present")

old_marker_start = "function Dashboard({ refreshKey }: { refreshKey: number }) {"
old_marker_end = "\nexport default function StateWorkTracking() {"

if old_marker_start not in s:
    if "function Dashboard(" in s and "EOD window" in s:
        print("ALREADY_PATCHED")
        sys.exit(0)
    sys.exit("STOP: old Dashboard marker not found")
if s.count(old_marker_start) != 1:
    sys.exit("STOP: old Dashboard marker found more than once")
if old_marker_end not in s:
    sys.exit("STOP: end marker (export default function StateWorkTracking) not found")

start_idx = s.index(old_marker_start)
end_idx = s.index(old_marker_end)

new_dashboard = r'''function Dashboard({ user, canManageAll }: { user: any; canManageAll: boolean }) {
  const todayStr2 = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [win, setWin] = useState<{ start: string; end: string; status: string; withinWindow: boolean; today: string } | null>(null);
  const [mine, setMine] = useState<any>(null);
  const [date, setDate] = useState(todayStr2());
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, marked: 0, not_marked: 0, absent: 0 });
  const [selectedEmp, setSelectedEmp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { stateApi.get('/work-tracker/eod/window').then(r => setWin(r.data)).catch(() => {}); }, [tick]);
  useEffect(() => { if (!canManageAll) stateApi.get('/work-tracker/eod/mine').then(r => setMine(r.data)).catch(() => {}); }, [canManageAll, tick]);
  useEffect(() => {
    if (!canManageAll) return;
    const params: any = { date };
    if (statusFilter) params.status = statusFilter;
    if (empFilter) params.search = empFilter;
    stateApi.get('/work-tracker/eod/employees', { params })
      .then(r => { setRows(r.data.records || []); setCounts(r.data.counts || { total: 0, marked: 0, not_marked: 0, absent: 0 }); })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load'));
  }, [canManageAll, date, statusFilter, empFilter, tick]);

  const clearFilters = () => { setDate(todayStr2()); setStatusFilter(''); setEmpFilter(''); };

  const toggleSelected = async (on: boolean) => {
    if (!selectedEmp) { setError('Select an employee first'); return; }
    setBusy(true); setError('');
    try {
      if (on) await stateApi.post('/work-tracker/eod/toggle', { user_id: Number(selectedEmp), date: todayStr2() });
      else await stateApi.delete(`/work-tracker/eod/toggle/${selectedEmp}/${todayStr2()}`);
      setTick(t => t + 1);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };

  const markMine = async (status: 'marked' | 'absent') => {
    setBusy(true); setError('');
    try {
      await stateApi.post(status === 'marked' ? '/work-tracker/eod/mark' : '/work-tracker/eod/absent', {});
      setTick(t => t + 1);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };

  const toggleRow = async (r: any) => {
    setSelectedEmp(String(r.user_id)); setBusy(true); setError('');
    try {
      if (r.enablement_id) await stateApi.delete(`/work-tracker/eod/toggle/${r.user_id}/${date}`);
      else await stateApi.post('/work-tracker/eod/toggle', { user_id: r.user_id, date });
      setTick(t => t + 1);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };

  const selectedEnabled = !!rows.find(r => String(r.user_id) === selectedEmp)?.enablement_id;

  return (
    <div className="space-y-4">
      {win && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <Clock size={14} className="text-gray-400" />
            <span><b>EOD window:</b> {win.start} – {win.end} (Asia/Kolkata)</span>
            <span className="text-gray-300">·</span>
            <span><b>Server today:</b> {win.today}</span>
            <span className="text-gray-300">·</span>
            <span><b>Status:</b> <span className={win.withinWindow ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{win.status}</span></span>
          </div>
          {canManageAll && (
            <div className="flex items-center gap-2">
              <select className={`${input} !w-48`} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                <option value="">Select employee</option>
                {rows.map(r => <option key={r.user_id} value={r.user_id}>{r.user_name}</option>)}
              </select>
              <button disabled={busy} onClick={() => toggleSelected(!selectedEnabled)}
                className={`${btn} flex items-center gap-1 ${selectedEnabled ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Power size={12} /> EOD {selectedEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!canManageAll && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-gray-900">Log Work Entry</div>
            <p className="text-xs text-gray-500 mt-1">
              {mine?.record
                ? `You marked: ${mine.record.status}`
                : mine?.canSubmit
                  ? `EOD is open. You can submit between ${mine?.window?.start} and ${mine?.window?.end} (Asia/Kolkata).`
                  : 'EOD window is closed.'}
            </p>
          </div>
          {!mine?.record && (
            <div className="flex gap-2">
              <button disabled={busy || !mine?.canSubmit} onClick={() => markMine('marked')} className={`${btn} bg-blue-600 text-white flex items-center gap-1`}><Check size={14} /> Log Work Entry</button>
              <button disabled={busy || !mine?.canSubmit} onClick={() => markMine('absent')} className={`${btn} bg-gray-100 text-gray-600`}>Mark Absent</button>
            </div>
          )}
        </div>
      )}

      {canManageAll && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Total Employees', counts.total],
              ['Marked', counts.marked],
              ['Not Marked', counts.not_marked],
              ['Absent', counts.absent],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
                <div className="text-2xl font-black text-gray-900 mt-1">{value}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">as of selected date</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-gray-900">HR EOD Panel — Employee Status</div>
                <p className="text-[10px] text-gray-400 mt-0.5">Showing records on {date} · {rows.length} {rows.length === 1 ? 'employee' : 'employees'} in current view</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" className={`${input} !w-40`} value={date} onChange={e => setDate(e.target.value)} />
                <select className={`${input} !w-36`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All status</option><option value="marked">Marked</option><option value="not_marked">Not Marked</option><option value="absent">Absent</option>
                </select>
                <input className={`${input} !w-44`} placeholder="Search employee" value={empFilter} onChange={e => setEmpFilter(e.target.value)} />
                <button className={`${btn} bg-gray-100 text-gray-600 flex items-center gap-1`} onClick={clearFilters}><Filter size={12} /> Clear Filters</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-gray-400 text-left">
                  <tr><th className="p-3">Employee</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Note</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td className="p-6 text-center text-gray-400" colSpan={5}>No employees found</td></tr>}
                  {rows.map(r => (
                    <tr key={r.user_id} className="border-t border-gray-50">
                      <td className="p-3 font-semibold text-gray-900">{r.user_name}</td>
                      <td className="p-3 text-xs text-gray-500">{r.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${r.status === 'marked' ? 'bg-green-100/50 text-green-700' : r.status === 'absent' ? 'bg-red-100/50 text-red-700' : 'bg-yellow-100/50 text-yellow-700'}`}>
                          {r.status === 'marked' ? 'Marked' : r.status === 'absent' ? 'Absent' : 'Not Marked'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-500">{r.note || '—'}</td>
                      <td className="p-3 text-right">
                        {!r.status && (
                          <button disabled={busy} className={`${btn} ${r.enablement_id ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`} onClick={() => toggleRow(r)}>
                            {r.enablement_id ? 'Enabled' : 'Enable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'''

s = s[:start_idx] + new_dashboard + s[end_idx + 1:]

call_re = re.compile(r"<Dashboard\s+refreshKey=\{refreshKey\}\s*/>")
new_call = "<Dashboard user={user} canManageAll={REVIEWER_ROLES.includes(user?.role)} />"
if call_re.search(s):
    s = call_re.sub(new_call, s)
elif 'canManageAll={REVIEWER_ROLES' not in s:
    sys.exit("STOP: dashboard call site not found; file left unchanged")

open(F, 'w', encoding='utf-8').write(s)
print("DASHBOARD_PATCH_OK  (backup saved as " + F + ".bak)")
