import React, { useEffect, useMemo, useState } from 'react';
import { Users, CheckCircle2, XCircle, AlertCircle, CalendarDays, PlusCircle, FileText, Lock, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { EodReport, EodReportEmployee, EodSubmissionGate, EodSubmissionStatus, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { WorkFormModal } from '../works/WorkFormModal';

const inputClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

type StatusFilter = 'all' | 'marked' | 'absent' | 'not_marked' | 'locked' | 'pending';
type EmployeeRow = EodReportEmployee & { status: 'marked' | 'absent_leave' | 'not_marked' };

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatHourLabel(hour24: number) {
  if (hour24 === 0) return '12:00 AM';
  if (hour24 < 12) return `${hour24}:00 AM`;
  if (hour24 === 12) return '12:00 PM';
  return `${hour24 - 12}:00 PM`;
}

function submissionLabel(status: EodSubmissionStatus, eodStatus: EmployeeRow['status']): string {
  if (eodStatus === 'marked') return 'EOD Submitted';
  if (eodStatus === 'absent_leave') return 'Absent / Leave';
  switch (status) {
    case 'open':
      return 'EOD Open';
    case 'pending':
      return 'Enabled by HR';
    case 'before_open':
      return 'EOD Not Open Yet';
    case 'locked':
      return 'EOD Locked';
    case 'submitted':
      return 'EOD Submitted';
    default:
      return 'Not Marked';
  }
}

function SummaryBox({
  totalEmployees,
  marked,
  notMarked,
  absent,
  isLoading,
  hideTotal,
}: {
  totalEmployees: number;
  marked: number;
  notMarked: number;
  absent: number;
  isLoading: boolean;
  hideTotal?: boolean;
}) {
  const allRows = [
    { label: 'Total Employees', value: totalEmployees, icon: Users },
    { label: 'Marked', value: marked, icon: CheckCircle2 },
    { label: 'Not Marked', value: notMarked, icon: AlertCircle },
    { label: 'Absent', value: absent, icon: XCircle },
  ];

  const rows = hideTotal ? allRows.filter((r) => r.label !== 'Total Employees') : allRows;

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {rows.map(({ label, value, icon: Icon }) => {
        const colorMap: Record<string, { iconBg: string; iconText: string; pillBg: string; pillText: string }> = {
          'Total Employees': { iconBg: 'bg-violet-100 dark:bg-violet-950/20', iconText: 'text-violet-600', pillBg: 'bg-violet-50', pillText: 'text-violet-700' },
          Marked: { iconBg: 'bg-emerald-100 dark:bg-emerald-950/20', iconText: 'text-emerald-600', pillBg: 'bg-emerald-50', pillText: 'text-emerald-700' },
          'Not Marked': { iconBg: 'bg-amber-100 dark:bg-amber-950/20', iconText: 'text-amber-600', pillBg: 'bg-amber-50', pillText: 'text-amber-700' },
          Absent: { iconBg: 'bg-rose-100 dark:bg-rose-950/20', iconText: 'text-rose-600', pillBg: 'bg-rose-50', pillText: 'text-rose-700' },
        };
        const color = colorMap[label] || { iconBg: 'bg-slate-100', iconText: 'text-slate-400', pillBg: 'bg-slate-50', pillText: 'text-slate-600' };

        return (
          <div key={label} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color.iconBg} ${color.iconText}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color.pillBg} ${color.pillText}`}>{label}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500 mt-1">as of selected date</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ row }: { row: EmployeeRow }) {
  const label = submissionLabel(row.submissionStatus, row.status);
  const styles: Record<string, string> = {
    'EOD Submitted': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    'Absent / Leave': 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400',
    'EOD Open': 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    'Enabled by HR': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'EOD Not Open Yet': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'EOD Locked': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'Not Marked': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  };

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${styles[label] || styles['Not Marked']}`}>
      {label}
    </span>
  );
}

function OnOffSwitch({
  checked,
  disabled,
  busy,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[11px] font-bold uppercase tracking-wide ${
          checked ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        Off
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || busy}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          } ${busy ? 'opacity-70' : ''}`}
        />
      </button>
      <span
        className={`text-[11px] font-bold uppercase tracking-wide ${
          checked ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'
        }`}
      >
        On
      </span>
    </div>
  );
}

function HrEodToggle({
  row,
  busy,
  onToggle,
}: {
  row: EmployeeRow;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  if (row.status !== 'not_marked') {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const canToggle = row.hrEnabled ? row.canDisable : row.canEnable;
  if (!canToggle && !row.hrEnabled && row.submissionStatus !== 'locked') {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p
        className={`text-[11px] font-semibold ${
          row.hrEnabled
            ? 'text-indigo-700 dark:text-indigo-300'
            : 'text-amber-700 dark:text-amber-300'
        }`}
      >
        {row.hrEnabled ? 'Enabled by HR' : 'EOD Locked'}
      </p>
      <OnOffSwitch
        checked={row.hrEnabled}
        busy={busy}
        disabled={!canToggle}
        onChange={onToggle}
      />
    </div>
  );
}

export const EodReportPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isEmployee = user?.role === 'employee';
  const isHr = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'manager';
  const [date, setDate] = useState(todayIso());
  const [userId, setUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [report, setReport] = useState<EodReport | null>(null);
  const [gate, setGate] = useState<EodSubmissionGate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [quickEnableUserId, setQuickEnableUserId] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await api.eod.report(date, { userId: userId || undefined });
      setReport(data);
      if (isEmployee) {
        const status = await api.eod.submissionStatus(date);
        setGate(status);
      } else {
        setGate(null);
      }
    } catch (error: any) {
      addToast('error', 'EOD Report Error', error.message || 'Could not load EOD report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployee) {
      api.users.list().then((list) => setUsers(list.filter((u) => u.role === 'employee'))).catch(() => undefined);
    }
  }, [isEmployee]);

  useEffect(() => {
    load();
  }, [date, userId]);

  const allRows: EmployeeRow[] = useMemo(() => {
    if (!report) return [];
    return [
      ...report.marked.map((r) => ({ ...r, status: 'marked' as const })),
      ...report.absentLeave.map((r) => ({ ...r, status: 'absent_leave' as const })),
      ...report.notMarked.map((r) => ({ ...r, status: 'not_marked' as const })),
    ].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [report]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return allRows;
    if (statusFilter === 'marked') return allRows.filter((r) => r.status === 'marked');
    if (statusFilter === 'absent') return allRows.filter((r) => r.status === 'absent_leave');
    if (statusFilter === 'locked') {
      return allRows.filter((r) => r.status === 'not_marked' && r.submissionStatus === 'locked');
    }
    if (statusFilter === 'pending') {
      return allRows.filter((r) => r.status === 'not_marked' && (r.submissionStatus === 'pending' || r.hrEnabled));
    }
    return allRows.filter((r) => r.status === 'not_marked');
  }, [allRows, statusFilter]);

  const totalEmployees = allRows.length;
  const markedCount = report?.marked.length ?? 0;
  const absentCount = report?.absentLeave.length ?? 0;
  const notMarkedCount = report?.notMarked.length ?? 0;
  const windowMeta = report?.window || gate?.window;

  const handleToggleEod = async (row: EmployeeRow, enabled: boolean) => {
    setTogglingUserId(row.userId);
    try {
      if (enabled) {
        await api.eod.enable(row.userId, date);
        addToast('success', 'EOD ON', `${row.fullName} can now submit EOD for ${formatDisplayDate(date)}.`);
      } else {
        await api.eod.disable(row.userId, date);
        addToast('success', 'EOD OFF', `Submission locked again for ${row.fullName}.`);
      }
      await load();
    } catch (error: any) {
      addToast('error', 'Toggle Failed', error.message || 'Could not update EOD access.');
    } finally {
      setTogglingUserId(null);
    }
  };

  const quickSelectedRow = useMemo(
    () => allRows.find((r) => r.userId === quickEnableUserId) || null,
    [allRows, quickEnableUserId]
  );
  const quickToggleOn = Boolean(quickSelectedRow?.hrEnabled);

  const handleQuickToggle = async (enabled: boolean) => {
    if (!quickEnableUserId) {
      addToast('warning', 'Select Employee', 'Choose an employee before toggling EOD.');
      return;
    }
    const selected = users.find((u) => u.id === quickEnableUserId);
    setTogglingUserId(quickEnableUserId);
    try {
      if (enabled) {
        await api.eod.enable(quickEnableUserId, date);
        addToast(
          'success',
          'EOD ON',
          `${selected?.fullName || 'Employee'} can now submit EOD for ${formatDisplayDate(date)}.`
        );
      } else {
        await api.eod.disable(quickEnableUserId, date);
        addToast('success', 'EOD OFF', `Submission locked again for ${selected?.fullName || 'employee'}.`);
      }
      await load();
    } catch (error: any) {
      addToast('error', 'Toggle Failed', error.message || 'Could not update EOD access.');
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>

      {windowMeta && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>
                EOD window: <strong>{formatHourLabel(windowMeta.openHour)}</strong> –{' '}
                <strong>{formatHourLabel(windowMeta.closeHour)}</strong> ({windowMeta.timezone})
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>
                Server today: <strong>{formatDisplayDate(windowMeta.today)}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>
                Status:{' '}
                <strong>
                  {windowMeta.phase === 'open'
                    ? 'Open'
                    : windowMeta.phase === 'before_open'
                      ? 'Not open yet'
                      : 'Closed / Locked'}
                </strong>
              </span>
            </div>

            {isHr && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={quickEnableUserId}
                  onChange={(e) => setQuickEnableUserId(e.target.value)}
                  className={`${inputClass} min-w-[180px]`}
                >
                  <option value="">Select employee</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    EOD
                  </span>
                  <OnOffSwitch
                    checked={quickToggleOn}
                    busy={togglingUserId === quickEnableUserId && Boolean(quickEnableUserId)}
                    disabled={!quickEnableUserId || users.length === 0}
                    onChange={handleQuickToggle}
                  />
                </div>
              </div>
            )}
          </div>
          {isHr && users.length === 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              No employees found. Add users with role <strong>Employee</strong> from Employee List, then use the ON/OFF switch here or in the table below.
            </p>
          )}
          {isHr && users.length > 0 && windowMeta.phase === 'open' && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              During the open window, employees can submit on their own. Turn EOD ON after 7:00 PM (or for a past missed date) for a selected employee.
            </p>
          )}
        </div>
      )}

      {isEmployee && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
                  gate?.canSubmit ? 'bg-indigo-600' : 'bg-slate-500'
                }`}
              >
                {gate?.canSubmit ? <FileText className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">WorkLog Entry</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {gate?.message || 'Log your daily work or mark absent/leave for today.'}
                </p>
                {gate && (
                  <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {submissionLabel(
                      gate.submissionStatus,
                      gate.eodStatus === 'not_marked' ? 'not_marked' : gate.eodStatus
                    )}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsWorkLogOpen(true)}
              icon={<PlusCircle className="h-4 w-4" />}
              className="shrink-0 self-start sm:self-auto"
              disabled={!gate?.canSubmit}
            >
              {gate?.canSubmit ? 'Log Work Entry' : 'EOD Locked'}
            </Button>
          </div>
        </div>
      )}

      <SummaryBox
        totalEmployees={totalEmployees}
        marked={markedCount}
        notMarked={notMarkedCount}
        absent={absentCount}
        isLoading={isLoading}
        hideTotal={isEmployee}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isHr ? 'HR EOD Panel — Employee Status' : 'Employee Status List'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Showing records on {formatDisplayDate(date)}
              </p>
              <p className="text-xs text-slate-400">
                {filteredRows.length} employee{filteredRows.length !== 1 ? 's' : ''} in current view
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={inputClass}
              >
                <option value="all">All status</option>
                <option value="marked">Submitted</option>
                <option value="absent">Absent</option>
                <option value="not_marked">Not Marked</option>
                <option value="locked">Locked</option>
                <option value="pending">Enabled by HR</option>
              </select>

              {!isEmployee && (
                <>
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
                    <option value="">All employees</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setUserId('');
                      setDate(todayIso());
                    }}
                    className="ml-1"
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Loading EOD report…</div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              {users.length === 0 && isHr ? (
                <>
                  No employees yet. Go to <strong>Employee List</strong> and create users with role{' '}
                  <strong>Employee</strong>. Then Enable EOD will appear here and in the top banner.
                </>
              ) : (
                'No employee records found for the selected filters.'
              )}
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Employee Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Note</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isHr && <th className="px-6 py-3.5">HR Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row) => (
                  <tr key={row.userId} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-300">
                      {formatDisplayDate(date)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.fullName}</p>
                      {row.employeeId && (
                        <p className="text-xs text-slate-400">ID: {row.employeeId}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{row.department}</td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-slate-500 dark:text-slate-400">
                      {row.reason || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge row={row} />
                    </td>
                    {isHr && (
                      <td className="px-6 py-4">
                        <HrEodToggle
                          row={row}
                          busy={togglingUserId === row.userId}
                          onToggle={(enabled) => handleToggleEod(row, enabled)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isEmployee && (
        <WorkFormModal
          isOpen={isWorkLogOpen}
          onClose={() => setIsWorkLogOpen(false)}
          onSuccess={() => {
            setIsWorkLogOpen(false);
            load();
          }}
          eodGate={gate}
        />
      )}
    </div>
  );
};
