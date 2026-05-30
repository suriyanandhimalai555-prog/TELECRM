import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TeamManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/leads')])
      .then(([usersRes, leadsRes]) => {
        setUsers(usersRes.data || []);
        setLeads(leadsRes.data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const getLeadCount = (userId: number) => leads.filter((l: any) => l.owner_id === userId).length;
  const getWonCount = (userId: number) => leads.filter((l: any) => l.owner_id === userId && l.stage === 'WON').length;
  const getRevenue = (userId: number) => leads.filter((l: any) => l.owner_id === userId).reduce((s: number, l: any) => s + (l.revenue || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6">Team Management</h1>
      <div className="grid grid-cols-1 gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">{user.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{user.role}</p>
                  <p className="text-[10px] text-gray-300">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xl font-black text-blue-600">{getLeadCount(user.id)}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Leads</p>
                </div>
                <div>
                  <p className="text-xl font-black text-green-600">{getWonCount(user.id)}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Won</p>
                </div>
                <div>
                  <p className="text-xl font-black text-yellow-600">₹{getRevenue(user.id).toLocaleString()}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Revenue</p>
                </div>
                <div>
                  <p className="text-xl font-black text-purple-600">
                    {getLeadCount(user.id) > 0 ? Math.round((getWonCount(user.id) / getLeadCount(user.id)) * 100) : 0}%
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Win Rate</p>
                </div>
              </div>
            </div>
          </div>
        ))}
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
