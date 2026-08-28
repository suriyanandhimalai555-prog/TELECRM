import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Plus, X, Search, Pencil, Trash2 } from 'lucide-react';

interface StateItem { id: number; name: string; }
interface StateUser {
  id: number;
  email: string;
  name: string;
  role: string;
  state_id: number | null;
  coordinator_states?: number[];
  status: string;
  created_at: string;
}

const ROLES = ['admin', 'hr', 'coordinator', 'state_head', 'sales_manager', 'sales_admin', 'team_member'];

// Mirrors server/src/middleware/stateAuth.ts ROLE_HIERARCHY + MANAGE_EXCEPTIONS.
// Frontend filtering is just UX — the backend is the real enforcement.
const ROLE_RANK: Record<string, number> = {
  master: 100, admin: 95, hr: 90, coordinator: 80, state_head: 70,
  sales_manager: 60, sales_admin: 60, team_member: 50,
};
const MANAGE_EXCEPTIONS: Record<string, string[]> = {
  sales_manager: ['sales_admin'],
};
const canManageRole = (viewerRole: string, targetRole: string) => {
  if (viewerRole === 'master') return true;
  if (MANAGE_EXCEPTIONS[viewerRole]?.includes(targetRole)) return true;
  return (ROLE_RANK[viewerRole] ?? 0) > (ROLE_RANK[targetRole] ?? 0);
};

const roleColor = (role: string) => {
  switch (role) {
    case 'master': return 'bg-purple-100/50 text-purple-700 border border-purple-200';
    case 'admin': return 'bg-red-100/50 text-red-700 border border-red-200';
    case 'coordinator': return 'bg-indigo-100/50 text-indigo-700 border border-indigo-200';
    case 'state_head': return 'bg-blue-100/50 text-blue-700 border border-blue-200';
    case 'sales_manager': return 'bg-yellow-100/50 text-yellow-700 border border-yellow-200';
    case 'sales_admin': return 'bg-orange-100/50 text-orange-700 border border-orange-200';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const emptyForm = {
  name: '', email: '', password: '', role: 'team_member',
  state_id: '', coordinator_states: [] as number[], status: 'active',
};

export default function StateUsers() {
  const { user } = useOutletContext<{ user: any }>();
  const [users, setUsers] = useState<StateUser[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/auth/users');
      setUsers(res.data.users || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      const res = await stateApi.get('/states');
      setStates(res.data.states || []);
    } catch { }
  }, []);

  useEffect(() => { fetchUsers(); fetchStates(); }, [fetchUsers, fetchStates]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openCreate = () => { resetForm(); setError(''); setShowModal(true); };

  const openEdit = (u: StateUser) => {
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role,
      state_id: u.state_id ? String(u.state_id) : '',
      coordinator_states: u.coordinator_states || [],
      status: u.status || 'active',
    });
    setEditingId(u.id);
    setError('');
    setShowModal(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const payload: any = {
          name: form.name,
          role: form.role,
          status: form.status,
        };
        if (form.role === 'coordinator') {
          payload.coordinator_states = form.coordinator_states;
        } else {
          payload.state_id = form.state_id === '' ? null : form.state_id;
        }
        if (form.password) payload.newPassword = form.password;
        await stateApi.put(`/auth/users/${editingId}`, payload);
      } else {
        const payload: any = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        if (form.role === 'coordinator') {
          payload.coordinator_states = form.coordinator_states;
        } else {
          payload.state_id = form.state_id === '' ? null : form.state_id;
        }
        await stateApi.post('/auth/users', payload);
      }
      resetForm();
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stateApi.delete(`/auth/users/${id}`);
      setDeletingId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setDeletingId(null);
    }
  };

  const toggleCoordinatorState = (stateId: number) => {
    setForm(prev => {
      const exists = prev.coordinator_states.includes(stateId);
      return {
        ...prev,
        coordinator_states: exists
          ? prev.coordinator_states.filter(id => id !== stateId)
          : [...prev.coordinator_states, stateId],
      };
    });
  };

  const canManage = user.role === 'master' || user.role === 'admin' || user.role === 'coordinator' || user.role === 'hr' || user.role === 'state_head' || user.role === 'sales_manager';

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stateName = (id: number | null) => states.find(s => s.id === id)?.name || '-';

  const displayState = (u: StateUser) => {
    if (u.role === 'coordinator') {
      const names = (u.coordinator_states || []).map(id => stateName(id));
      if (names.length === 0) return '-';
      if (names.length <= 2) return names.join(', ');
      return `${names[0]}, ${names[1]} +${names.length - 2} more`;
    }
    return stateName(u.state_id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Team <span className="text-blue-500">Users</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of state team members</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search users (name, email)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg focus:outline-none transition-all text-xs font-bold"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Name', 'Email', 'Role', 'State', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${roleColor(u.role)}`}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">{displayState(u)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${u.status === 'active' ? 'bg-green-100/50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                  </td>
                  <td className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {u.role !== 'master' && canManage && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        {deletingId === u.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(u.id)} className="text-[9px] font-black uppercase text-red-600 hover:underline">Confirm</button>
                            <button onClick={() => setDeletingId(null)} className="text-[9px] font-black uppercase text-gray-400 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(u.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? 'Loading...' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900">{editingId ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Email</label>
                <input type="email" required disabled={!!editingId} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                  Password {editingId && <span className="normal-case font-bold text-gray-400">(leave blank to keep current)</span>}
                </label>
                <input type="password" required={!editingId} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, state_id: '', coordinator_states: [] })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  {ROLES.filter(r => canManageRole(user.role, r)).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>

              {form.role === 'coordinator' ? (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    States ({form.coordinator_states.length} selected)
                  </label>
                  <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
                    {states.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs font-bold text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.coordinator_states.includes(s.id)}
                          onChange={() => toggleCoordinatorState(s.id)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                  {form.coordinator_states.length === 0 && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">Select at least one state</p>
                  )}
                </div>
              ) : form.role !== 'admin' && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">State</label>
                  <select value={form.state_id} onChange={e => setForm({ ...form, state_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="">Select a state...</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <button type="submit"
                disabled={form.role === 'coordinator' && form.coordinator_states.length === 0}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-colors">
                {editingId ? 'Save Changes' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
