import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';

export default function StateTeam() {
  const { user } = useOutletContext<{ user: any }>();
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([stateApi.get('/auth/users'), stateApi.get('/leads')])
      .then(([usersRes, leadsRes]) => {
        setUsers(usersRes.data.users || []);
        setLeads(leadsRes.data.leads || leadsRes.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getLeadCount = (userId: number) => leads.filter((l: any) => l.assigned_to === userId).length;
  const getWonCount = (userId: number) => leads.filter((l: any) => l.assigned_to === userId && l.status === 'won').length;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Team</h1>
        <p className="text-xs text-gray-400">
          Scoped to your access: {user.role}{user.state_id ? ` · State #${user.state_id}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {users.map(u => {
          const leadCount = getLeadCount(u.id);
          const wonCount = getWonCount(u.id);
          const winRate = leadCount > 0 ? Math.round((wonCount / leadCount) * 100) : 0;
          return (
            <div key={u.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center">
                    {u.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{u.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{u.role?.replace('_', ' ')}</p>
                    <p className="text-[10px] text-gray-300">{u.email}</p>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-xl font-black text-blue-600">{leadCount}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Leads</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{wonCount}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Won</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-purple-600">{winRate}%</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Win Rate</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-black uppercase tracking-widest text-sm">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}
