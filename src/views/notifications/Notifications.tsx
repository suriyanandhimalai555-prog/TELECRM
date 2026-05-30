import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Notifications() {
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leads'),
      api.get('/tasks'),
    ]).then(([leadsRes, tasksRes]) => {
      const today = new Date();
      const newLeads = (leadsRes.data || []).filter((l: any) => {
        const created = new Date(l.created_at);
        const diff = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return diff < 1;
      });
      const dueTasks = (tasksRes.data || []).filter((t: any) => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        return due <= today && t.status !== 'DONE';
      });
      setLeads(newLeads);
      setTasks(dueTasks);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6">Notifications</h1>
      <div className="space-y-4">
        {leads.length === 0 && tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-black uppercase tracking-widest text-sm">No new notifications</p>
          </div>
        )}
        {leads.map(lead => (
          <div key={lead.id} className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-green-700">New Lead</p>
              <p className="text-sm font-bold text-gray-900">{lead.contact_name}</p>
              <p className="text-[11px] text-gray-400">{lead.mobile} • Source: {lead.source}</p>
              <p className="text-[10px] text-gray-300 mt-1">{new Date(lead.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {tasks.map(task => (
          <div key={task.id} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-red-700">Overdue Task</p>
              <p className="text-sm font-bold text-gray-900">{task.title}</p>
              <p className="text-[11px] text-gray-400">Due: {new Date(task.due_date).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
