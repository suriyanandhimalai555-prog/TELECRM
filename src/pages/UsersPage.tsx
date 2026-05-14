import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Company } from '../types/auth';

interface User { id: number; email: string; name: string; role: string; company_id: number; company_name?: string; }
const emptyForm = { email: '', password: '', name: '', role: 'employee', company_id: '' };

export default function UsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const allowedRoles = user?.role === 'master_admin' ? ['master_admin','company_admin','manager','employee'] : ['manager','employee'];
  const loadUsers = () => apiGet<User[]>('/api/users').then(setUsers);
  useEffect(() => {
    loadUsers();
    if (user?.role === 'master_admin') apiGet<Company[]>('/api/companies').then(setCompanies);
  }, []);
  const createUser = async () => {
    const company_id = user?.role === 'master_admin' ? form.company_id : user?.company_id;
    await apiPost('/api/users', { ...form, company_id });
    setForm(emptyForm); setShowForm(false); loadUsers();
  };
  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    await apiDelete(`/api/users/${id}`); loadUsers();
  };
  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <button onClick={() => setShowForm(true)}>+ Add User</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 20, display: 'grid', gap: 10 }}>
          <input placeholder="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {user?.role === 'master_admin' && (
            <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
              <option value=''>Select Company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          )}
          <div>
            <button onClick={createUser}>Create</button>
            <button onClick={() => setShowForm(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <th style={{ padding: '10px 12px' }}>Name</th>
            <th style={{ padding: '10px 12px' }}>Email</th>
            <th style={{ padding: '10px 12px' }}>Role</th>
            {user?.role === 'master_admin' && <th style={{ padding: '10px 12px' }}>Company</th>}
            <th style={{ padding: '10px 12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '10px 12px' }}>{u.name}</td>
              <td style={{ padding: '10px 12px' }}>{u.email}</td>
              <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', fontSize: 12 }}>{u.role}</span></td>
              {user?.role === 'master_admin' && <td style={{ padding: '10px 12px', color: '#6b7280' }}>{u.company_name || '—'}</td>}
              <td style={{ padding: '10px 12px' }}>
                {u.id !== user?.id && <button onClick={() => deleteUser(u.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
