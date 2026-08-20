import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Company } from '../types/auth';
import { Users, Plus, Trash2, X, Check, Phone, Mail, Building2, Pencil } from 'lucide-react';

interface User { id: number; email: string; name: string; role: string; company_id: number; company_name?: string; phone?: string; }
const emptyForm = { email: '', password: '', name: '', role: 'employee', company_id: '', phone: '' };
const roleColors: Record<string, string> = {
  master_admin: 'bg-red-100 text-red-700',
  company_admin: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-yellow-100 text-yellow-700',
  EMPLOYEE: 'bg-green-100 text-green-700',
  employee: 'bg-green-100 text-green-700',
  manager: 'bg-yellow-100 text-yellow-700',
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '', company_id: '', password: '' });
  const [filterCompany, setFilterCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const allowedRoles = user?.role === 'master_admin'
    ? ['master_admin', 'company_admin', 'ADMIN', 'MANAGER', 'employee']
    : ['MANAGER', 'employee'];

  const loadUsers = () => apiGet<User[]>('/users').then(setUsers);

  useEffect(() => {
    loadUsers();
    if (user?.role === 'master_admin') apiGet<Company[]>('/companies').then(setCompanies);
  }, []);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) { alert('Name, email and password are required.'); return; }
    if (user?.role === 'master_admin' && !form.company_id) { alert('Please select a company.'); return; }
    setLoading(true);
    try {
      const company_id = user?.role === 'master_admin' ? form.company_id : user?.company_id;
      await apiPost('/users', { ...form, company_id });
      setForm(emptyForm); setShowForm(false); await loadUsers();
    } catch (e: any) { alert(e?.message || 'Failed to create user'); }
    setLoading(false);
  };

  const startEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, company_id: String(u.company_id || ''), password: '' });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      await apiPost(`/users/${editingUser.id}/update`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        company_id: editForm.company_id || editingUser.company_id,
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      setEditingUser(null);
      await loadUsers();
    } catch (e: any) { alert(e?.message || 'Failed to update user'); }
    setLoading(false);
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    await apiDelete(`/users/${id}`); loadUsers();
  };

  const filteredUsers = filterCompany ? users.filter(u => String(u.company_id) === filterCompany) : users;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Users size={20} className="text-purple-600" /></div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Users</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{filteredUsers.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'master_admin' && companies.length > 0 && (
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 focus:outline-none focus:border-purple-400 bg-white">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"><Plus size={16} /> Add User</button>
        </div>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" placeholder="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" placeholder="Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" placeholder="Phone Number (optional)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {user?.role === 'master_admin' && (
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-purple-400" value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                <option value="">Select Company *</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={createUser} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-1"><Check size={15} /> Create User</button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-1"><X size={15} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="grid gap-3">
              <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Full Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Phone Number" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              <input className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="New Password (leave blank to keep)" type="password" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {user?.role === 'master_admin' && (
                <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" value={editForm.company_id} onChange={e => setEditForm(p => ({ ...p, company_id: e.target.value }))}>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveEdit} disabled={loading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center justify-center gap-1"><Check size={15} /> Save Changes</button>
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Role</th>
              {user?.role === 'master_admin' && <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Company</th>}
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400"><Users size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-bold">No users found</p></td></tr>
            )}
            {filteredUsers.map(u => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-black text-sm">{u.name.charAt(0).toUpperCase()}</div>
                    <span className="font-bold text-gray-800 text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-xs text-gray-600"><Mail size={11} className="text-gray-400" />{u.email}</div>
                    {u.phone && <div className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} className="text-gray-400" />{u.phone}</div>}
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                {user?.role === 'master_admin' && <td className="px-4 py-3"><div className="flex items-center gap-1 text-xs text-gray-500"><Building2 size={12} className="text-gray-400" />{u.company_name || '—'}</div></td>}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                    {u.id !== user?.id && <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
