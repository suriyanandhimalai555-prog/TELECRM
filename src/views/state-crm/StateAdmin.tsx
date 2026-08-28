import { useState, useEffect } from 'react';
import stateApi from '../../services/stateApi';

export default function StateAdmin() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      stateApi.get('/leads').catch(() => ({ data: { leads: [] } })),
      stateApi.get('/tasks').catch(() => ({ data: { tasks: [] } })),
      stateApi.get('/auth/users').catch(() => ({ data: { users: [] } })),
    ]).then(([leadsRes, tasksRes, usersRes]) => {
      const leads = leadsRes.data.leads || leadsRes.data || [];
      const tasks = tasksRes.data.tasks || tasksRes.data || [];
      const users = usersRes.data.users || usersRes.data || [];
      setStats({
        totalLeads: leads.length,
        newLeads: leads.filter((l: any) => l.status === 'new').length,
        convertedLeads: leads.filter((l: any) => l.status === 'converted').length,
        totalTasks: tasks.length,
        overdueTasks: tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE').length,
        totalUsers: users.length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: '👥', color: 'bg-blue-50 text-blue-600' },
    { label: 'New Leads', value: stats.newLeads, icon: '🆕', color: 'bg-green-50 text-green-600' },
    { label: 'Converted', value: stats.convertedLeads, icon: '🏆', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: '✅', color: 'bg-purple-50 text-purple-600' },
    { label: 'Overdue Tasks', value: stats.overdueTasks, icon: '⚠️', color: 'bg-red-50 text-red-600' },
    { label: 'Total Users', value: stats.totalUsers, icon: '👤', color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6">Admin Panel</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label} className={`rounded-2xl p-5 ${card.color} border border-gray-100`}>
              <p className="text-3xl mb-2">{card.icon}</p>
              <p className="text-2xl font-black text-gray-900">{card.value ?? 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
