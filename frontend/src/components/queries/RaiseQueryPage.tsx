import React, { useEffect, useState } from 'react';
import { HelpCircle, Send } from 'lucide-react';
import { api } from '../../services/api';
import { EmployeeQuery, QUERY_TYPES, QueryType } from '../../types';
import { Button } from '../common/Button';
import { QueryStatusBadge } from '../common/Badge';
import { useToast } from '../../contexts/ToastContext';

interface RaiseQueryPageProps {
  highlightId?: string | null;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const RaiseQueryPage: React.FC<RaiseQueryPageProps> = ({ highlightId }) => {
  const { addToast } = useToast();
  const [queryType, setQueryType] = useState<QueryType>('eod_missed');
  const [subject, setSubject] = useState('');
  const [relatedDate, setRelatedDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queries, setQueries] = useState<EmployeeQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      setQueries(await api.queries.list());
    } catch (error: any) {
      addToast('error', 'Queries Error', error.message || 'Could not load your queries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.queries.create({
        queryType,
        subject,
        description,
        relatedDate: relatedDate || null,
      });
      addToast('success', 'Query Submitted', 'HR has been notified of your request.');
      setSubject('');
      setDescription('');
      setRelatedDate('');
      setQueryType('eod_missed');
      await loadQueries();
    } catch (error: any) {
      addToast('error', 'Submit Failed', error.message || 'Could not submit query.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = (value: string) => QUERY_TYPES.find((t) => t.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Raise a Query</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send a request to HR (missed EOD, leave correction, attendance, and more) and track its status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <HelpCircle className="h-5 w-5" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white">New request</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Subject / Type *</label>
            <select required value={queryType} onChange={(e) => setQueryType(e.target.value as QueryType)} className={inputClass}>
              {QUERY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Date (if relevant)</label>
            <input type="date" value={relatedDate} onChange={(e) => setRelatedDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Subject *</label>
          <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Forgot to mark EOD on 12 Aug" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Description *</label>
          <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the issue so HR can follow up." className={inputClass} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" isLoading={isSubmitting} icon={<Send className="h-4 w-4" />}>
            Submit Query
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Your submitted queries</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading queries…</p>
        ) : queries.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            You have not raised any queries yet.
          </p>
        ) : (
          queries.map((query) => (
            <div
              key={query.id}
              id={`query-${query.id}`}
              className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 space-y-2 ${
                highlightId === query.id
                  ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{query.subject}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {typeLabel(query.queryType)}
                    {query.relatedDate ? ` · ${query.relatedDate}` : ''}
                    {` · ${new Date(query.createdAt).toLocaleString()}`}
                  </p>
                </div>
                <QueryStatusBadge status={query.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{query.description}</p>
              {query.hrResponse && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">HR response{query.respondedByName ? ` · ${query.respondedByName}` : ''}</p>
                  {query.hrResponse}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
