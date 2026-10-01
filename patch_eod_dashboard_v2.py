import sys, re, shutil, os

F = 'src/views/state-crm/StateWorkTracking.tsx'
s = open(F, encoding='utf-8').read()

if 'REVIEWER_ROLES' not in s:
    sys.exit("STOP: REVIEWER_ROLES not found in file")

# ---------- 1. Extra icon import (aliased so nothing can clash) ----------
ICON_LINE = "import { Clock as EodClock, Users as EodUsers, CheckCircle2 as EodCheck, AlertCircle as EodAlert, XCircle as EodX, FileText as EodFile, PlusCircle as EodPlus } from 'lucide-react'; // EOD-ICONS\n"
if '// EOD-ICONS' not in s:
    m = re.search(r"^import [^\n]*from 'lucide-react';[^\n]*\n", s, re.M)
    if m:
        s = s[:m.end()] + ICON_LINE + s[m.end():]
    else:
        m = re.search(r"^import ", s, re.M)
        if not m:
            sys.exit("STOP: no import lines found")
        s = s[:m.start()] + ICON_LINE + s[m.start():]

# ---------- 2. Replace Dashboard component ----------
if s.count('function Dashboard(') != 1:
    sys.exit("STOP: expected exactly one 'function Dashboard(' in file")
end_marker = "\nexport default function StateWorkTracking() {"
if end_marker not in s:
    sys.exit("STOP: end marker (export default function StateWorkTracking) not found")

start_idx = s.index('function Dashboard(')
end_idx = s.index(end_marker)
if end_idx < start_idx:
    sys.exit("STOP: Dashboard is not defined before StateWorkTracking")
segment = s[start_idx:end_idx]
first_nl = segment.index('\n')
if re.search(r"\n(function|const|let|var|class|export|type|interface) ", segment[first_nl:]):
    sys.exit("STOP: something else is defined between Dashboard and StateWorkTracking; not touching the file")

new_dashboard = r'''function Dashboard({ user, canManageAll }: { user: any; canManageAll: boolean }) {
  const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const fmtDMY = (d: string) => { const p = (d || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (d || ''); };
  const fmt12 = (t: string) => {
    if (!t) return '';
    if (/am|pm/i.test(t)) return t;
    const [h, m] = t.split(':');
    const hh = Number(h);
    return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
  };
  const stOf = (r: any) => (r.status === 'marked' ? 'marked' : r.status === 'absent' ? 'absent' : 'not_marked');

  const fld = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-800 outline-none focus:border-indigo-400';

  const [win, setWin] = useState<{ start: string; end: string; status: string; withinWindow: boolean; today: string } | null>(null);
  const [mine, setMine] = useState<any>(null);
  const [date, setDate] = useState(todayIST());
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { stateApi.get('/work-tracker/eod/window').then(r => setWin(r.data)).catch(() => {}); }, [tick]);
  useEffect(() => { if (!canManageAll) stateApi.get('/work-tracker/eod/mine').then(r => setMine(r.data)).catch(() => {}); }, [canManageAll, tick]);
  useEffect(() => {
    let alive = true;
    stateApi.get('/work-tracker/eod/employees', { params: { date } })
      .then(r => { if (!alive) return; setRows(r.data.records || []); setLoadFailed(false); setError(''); })
      .catch(e => { if (!alive) return; setLoadFailed(true); if (canManageAll) setError(e?.response?.data?.message || 'Failed to load'); });
    return () => { alive = false; };
  }, [date, tick, canManageAll]);

  // Employees may not be allowed to list everyone: fall back to their own row.
  const fallback = !canManageAll && date === todayIST()
    ? [{ user_id: user?.id, user_name: user?.name, email: user?.email, department: user?.department, role: user?.role, status: mine?.record?.status || null, note: mine?.record?.note || '', enablement_id: null }]
    : [];
  const all: any[] = loadFailed && !canManageAll ? fallback : rows;

  const counts = {
    total: all.length,
    marked: all.filter(r => stOf(r) === 'marked').length,
    not_marked: all.filter(r => stOf(r) === 'not_marked').length,
    absent: all.filter(r => stOf(r) === 'absent').length,
  };
  const view = all.filter(r => (!statusFilter || stOf(r) === statusFilter) && (!empFilter || String(r.user_id) === empFilter));

  const sel = all.find(r => String(r.user_id) === selectedEmp);
  const selOn = !!sel?.enablement_id;

  const clearFilters = () => { setDate(todayIST()); setStatusFilter(''); setEmpFilter(''); };

  const setEnabled = async (userId: any, on: boolean) => {
    if (!userId) { setError('Select an employee first'); return; }
    setBusy(true); setError('');
    try {
      if (on) await stateApi.post('/work-tracker/eod/toggle', { user_id: Number(userId), date });
      else await stateApi.delete(`/work-tracker/eod/toggle/${userId}/${date}`);
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

  const Switch = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-indigo-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-8' : 'translate-x-1'}`} />
    </button>
  );

  const Stat = ({ icon, tile, pill, pillCls, value }: any) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tile}`}>{icon}</div>
        <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${pillCls}`}>{pill}</span>
      </div>
      <div className="text-3xl font-black text-gray-900 mt-4">{value}</div>
      <div className="text-xs text-gray-500 mt-1">as of selected date</div>
    </div>
  );

  const pillFor = (st: string) =>
    st === 'marked' ? 'bg-emerald-100 text-emerald-700' : st === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
  const labelFor = (st: string) => (st === 'marked' ? 'Marked' : st === 'absent' ? 'Absent' : 'Not Marked');

  return (
    <div className="space-y-5">
      {/* EOD window card */}
      {win && (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${canManageAll ? 'p-5' : 'px-5 py-3'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <EodClock size={16} className="text-gray-400 mt-1 shrink-0" />
              <div className={`leading-7 ${canManageAll ? 'max-w-lg' : ''}`}>
                <span>EOD window: <b className="text-gray-900">{fmt12(win.start)} – {fmt12(win.end)}</b> (Asia/Kolkata)</span>
                <span className="text-gray-300 mx-2">·</span>
                <span>Server today: <b className="text-gray-900">{fmtDMY(win.today)}</b></span>
                <span className="text-gray-300 mx-2">·</span>
                <span>Status: <b className={win.withinWindow ? 'text-gray-900' : 'text-red-600'}>{win.status}</b></span>
              </div>
            </div>
            {canManageAll && (
              <div className="flex flex-col items-start gap-2">
                <select className={`${fld} w-56`} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                  <option value="">Select employee</option>
                  {all.map(r => <option key={r.user_id} value={r.user_id}>{r.user_name}</option>)}
                </select>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide">
                  <span className="text-gray-500">EOD</span>
                  <span className={selOn ? 'text-gray-400' : 'text-gray-900'}>OFF</span>
                  <Switch on={selOn} disabled={busy} onClick={() => setEnabled(selectedEmp, !selOn)} />
                  <span className={selOn ? 'text-gray-900' : 'text-gray-400'}>ON</span>
                </div>
              </div>
            )}
          </div>
          {canManageAll && (
            <p className={`text-xs mt-3 ${all.length === 0 ? 'text-amber-700' : 'text-gray-500'}`}>
              {all.length === 0
                ? 'No employees found. Add users with role Employee from Employee List, then use the ON/OFF switch here or in the table below.'
                : 'During the open window, employees can submit on their own. Turn EOD ON after 7:00 PM (or for a past missed date) for a selected employee.'}
            </p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Employee: WorkLog entry card */}
      {!canManageAll && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><EodFile size={20} /></div>
            <div>
              <div className="text-base font-black text-gray-900">WorkLog Entry</div>
              <p className="text-sm text-gray-500 mt-0.5">
                {mine?.record
                  ? `You marked: ${labelFor(mine.record.status)}`
                  : mine?.canSubmit
                    ? `EOD is open. You can submit between ${fmt12(mine?.window?.start || win?.start || '')} and ${fmt12(mine?.window?.end || win?.end || '')} (Asia/Kolkata).`
                    : 'EOD window is closed.'}
              </p>
              <p className="text-xs text-gray-600 mt-2">{win?.withinWindow ? 'EOD Open' : 'EOD Closed'}</p>
            </div>
          </div>
          {!mine?.record && (
            <div className="flex items-center gap-3">
              <button disabled={busy || !mine?.canSubmit} onClick={() => markMine('absent')} className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-40">Mark Absent</button>
              <button disabled={busy || !mine?.canSubmit} onClick={() => markMine('marked')}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-3 shadow">
                <EodPlus size={16} /> Log Work Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canManageAll && <Stat icon={<EodUsers size={22} />} tile="bg-purple-100 text-purple-600" pill="Total Employees" pillCls="bg-purple-100 text-purple-700" value={counts.total} />}
        <Stat icon={<EodCheck size={22} />} tile="bg-emerald-100 text-emerald-600" pill="Marked" pillCls="bg-emerald-100 text-emerald-700" value={counts.marked} />
        <Stat icon={<EodAlert size={22} />} tile="bg-amber-100 text-amber-600" pill="Not Marked" pillCls="bg-amber-100 text-amber-700" value={counts.not_marked} />
        <Stat icon={<EodX size={22} />} tile="bg-rose-100 text-rose-600" pill="Absent" pillCls="bg-rose-100 text-rose-700" value={counts.absent} />
      </div>

      {/* Status table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-gray-900">{canManageAll ? 'HR EOD Panel — Employee Status' : 'Employee Status List'}</div>
            <p className="text-sm text-gray-500 mt-0.5">Showing records on {fmtDMY(date)}</p>
            <p className="text-xs text-gray-400">{view.length} {view.length === 1 ? 'employee' : 'employees'} in current view</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className={`${fld} w-44`} value={date} onChange={e => setDate(e.target.value || todayIST())} />
            <select className={`${fld} w-36`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All status</option>
              <option value="marked">Marked</option>
              <option value="not_marked">Not Marked</option>
              <option value="absent">Absent</option>
            </select>
            {canManageAll && (
              <select className={`${fld} w-44`} value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
                <option value="">All employees</option>
                {all.map(r => <option key={r.user_id} value={r.user_id}>{r.user_name}</option>)}
              </select>
            )}
            <button type="button" onClick={clearFilters} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Clear Filters</button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-widest text-gray-400 text-left">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-3 py-3">Employee</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Note</th>
                <th className="px-3 py-3">Status</th>
                {canManageAll && <th className="px-3 py-3 text-right pr-6">HR Action</th>}
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td className="p-8 text-center text-gray-400" colSpan={canManageAll ? 7 : 6}>No employees found</td></tr>
              )}
              {view.map(r => {
                const st = stOf(r);
                return (
                  <tr key={r.user_id} className="border-t border-gray-50">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{fmtDMY(date)}</td>
                    <td className="px-3 py-3 font-semibold text-gray-900">{r.user_name}</td>
                    <td className="px-3 py-3 text-gray-500">{r.email || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{r.department || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{r.note || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pillFor(st)}`}>{labelFor(st)}</span>
                    </td>
                    {canManageAll && (
                      <td className="px-3 py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {st === 'not_marked' ? (
                            <>
                              <span className="text-[11px] font-bold text-gray-500">{r.enablement_id ? 'ON' : 'OFF'}</span>
                              <Switch on={!!r.enablement_id} disabled={busy} onClick={() => { setSelectedEmp(String(r.user_id)); setEnabled(r.user_id, !r.enablement_id); }} />
                            </>
                          ) : <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''

s = s[:start_idx] + new_dashboard + s[end_idx:]

# ---------- 3. Call site ----------
call_re = re.compile(r"<Dashboard\s[^>]*/>")
new_call = "<Dashboard user={user} canManageAll={REVIEWER_ROLES.includes(user?.role)} />"
if call_re.search(s):
    s = call_re.sub(new_call, s)
else:
    sys.exit("STOP: <Dashboard ... /> call site not found; file left unchanged")

if not os.path.exists(F + '.bak2'):
    shutil.copyfile(F, F + '.bak2')
open(F, 'w', encoding='utf-8').write(s)
print("DASHBOARD_V2_PATCH_OK  (backup: " + F + ".bak2)")
