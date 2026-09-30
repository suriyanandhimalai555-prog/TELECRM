import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EmployeeQuery, EmployeeQueryDetail, QUERY_TYPES, QueryFilters, QueryStatus, User } from '../../types';
import { QueryStatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

interface EmployeeQueriesPageProps {
  highlightId?: string | null;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const EmployeeQueriesPage: React.FC<EmployeeQueriesPageProps> = ({ highlightId }) => {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<QueryFilters>({ status: 'all', queryType: 'all' });
  const [queries, setQueries] = useState<EmployeeQuery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeQueryDetail | null>(null);
  const [hrResponse, setHrResponse] = useState('');
  const [nextStatus, setNextStatus] = useState<QueryStatus>('in_progress');
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [items, userList] = await Promise.all([api.queries.list(filters), api.users.list()]);
      setQueries(items);
      setUsers(userList.filter((u) => u.role === 'employee'));
    } catch (error: any) {
      addToast('error', 'Queries Error', error.message || 'Could not load employee queries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    if (!highlightId) return;
    api.queries
      .getById(highlightId)
      .then((detail) => {
        setSelected(detail);
        setHrResponse(detail.hrResponse || '');
        setNextStatus(detail.status === 'pending' ? 'in_review' : detail.status);
      })
      .catch(() => undefined);
  }, [highlightId]);

  const openQuery = async (id: string) => {
    try {
      const detail = await api.queries.getById(id);
      setSelected(detail);
      setHrResponse(detail.hrResponse || '');
      setNextStatus(detail.status === 'pending' ? 'in_review' : detail.status);
    } catch (error: any) {
      addToast('error', 'Query Error', error.message);
    }
  };

  const handleRespond = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      await api.queries.respond(selected.id, { status: nextStatus, hrResponse });
      addToast('success', 'Query Updated', 'The employee has been notified.');
      setSelected(null);
      await load();
    } catch (error: any) {
      addToast('error', 'Update Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabel = (value: string) => QUERY_TYPES.find((t) => t.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Employee Queries</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review helpdesk requests, respond, and update status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <input
          placeholder="Search subject, employee..."
          value={filters.search || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className={inputClass}
        />
        <select value={filters.userId || ''} onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value || undefined }))} className={inputClass}>
          <option value="">All employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
        <select
          value={filters.queryType || 'all'}
          onChange={(e) => setFilters((prev) => ({ ...prev, queryType: e.target.value as QueryFilters['queryType'] }))}
          className={inputClass}
        >
          <option value="all">All types</option>
          {QUERY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={filters.status || 'all'}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as QueryFilters['status'] }))}
          className={inputClass}
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filters.startDate || ''} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} className={inputClass} />
          <input type="date" value={filters.endDate || ''} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} className={inputClass} />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading queries…</p>
      ) : queries.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          No queries match the current filters.
        </p>
      ) : (
        <div className="space-y-3">
          {queries.map((query) => (
            <button
              key={query.id}
              type="button"
              onClick={() => openQuery(query.id)}
              className={`w-full text-left rounded-2xl border bg-white dark:bg-slate-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors ${
                highlightId === query.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{query.subject}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {query.userName} · {query.department} · {typeLabel(query.queryType)}
                    {query.relatedDate ? ` · ${query.relatedDate}` : ''}
                  </p>
                </div>
                <QueryStatusBadge status={query.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{query.description}</p>
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject || 'Query details'}
        subtitle={selected ? `${selected.userName} · ${selected.department}` : undefined}
        maxWidth="2xl"
      >
        {selected && (
          <form onSubmit={handleRespond} className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <QueryStatusBadge status={selected.status} />
              <span>{typeLabel(selected.queryType)}</span>
              {selected.relatedDate && <span>Date: {selected.relatedDate}</span>}
              <span>{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selected.description}</p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">Employee context</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                {selected.employee?.fullName} · {selected.employee?.email}
                {selected.employee?.employeeId ? ` · ID ${selected.employee.employeeId}` : ''}
                {selected.employee?.mobileNumber ? ` · ${selected.employee.mobileNumber}` : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Recent EOD</p>
                  {selected.recentEod.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No EOD records in the last 14 days.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {selected.recentEod.map((eod) => (
                        <li key={eod.id}>
                          {eod.date} — {eod.status === 'absent_leave' ? 'Leave/Absent' : 'Marked'}
                          {eod.reason ? ` (${eod.reason})` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Recent work logs</p>
                  {selected.recentWorks.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No recent work entries.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {selected.recentWorks.map((work) => (
                        <li key={work.id}>
                          {work.createdAt.slice(0, 10)} — {work.title} ({work.status})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Update status</label>
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as QueryStatus)} className={inputClass}>
                  <option value="in_review">In Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">HR response *</label>
              <textarea required rows={4} value={hrResponse} onChange={(e) => setHrResponse(e.target.value)} className={inputClass} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save response
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
