import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { User as UserIcon, Shield, Lock, X, Edit2, Trash2, Plus } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  master: 'Master Admin',
  hr: 'HR',
  admin: 'Admin',
  coordinator: 'Coordinator',
  state_head: 'State Head',
  sales_manager: 'Sales Manager',
  sales_admin: 'Office Admin',
  team_member: 'Sales Employee',
};

const ASSIGNABLE_ROLES = ['hr', 'coordinator', 'state_head', 'sales_manager', 'sales_admin', 'team_member'];
const MANAGER_ROLES = ['master', 'hr', 'coordinator', 'state_head', 'sales_manager'];

export default function StateSettings() {
  const { user } = useOutletContext<{ user: any }>();
  const canManageUsers = MANAGER_ROLES.includes(user.role);
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  const [profileData, setProfileData] = useState({ name: user.name || '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', newPassword: '', status: 'active' });

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  };

  const fetchUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setLoadingUsers(true);
    try {
      const res = await stateApi.get('/auth/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await stateApi.put('/auth/profile', profileData);
      showFlash('Profile updated');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await stateApi.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showFlash('Password changed');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, newPassword: '', status: u.status || 'active' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { name: editForm.name, role: editForm.role, status: editForm.status };
      if (editForm.newPassword) payload.newPassword = editForm.newPassword;
      await stateApi.put(`/auth/users/${editingUser.id}`, payload);
      showFlash('User updated');
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await stateApi.delete(`/auth/users/${u.id}`);
      showFlash('User deleted');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      {flash && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg">
          {flash}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 border-l-4 border-blue-500 pl-3">
          Settings
        </h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          Manage your profile and team access
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-56 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
              activeTab === 'profile' ? 'bg-white text-gray-900 border-blue-500 shadow-sm' : 'bg-gray-50/50 text-gray-500 border-transparent hover:bg-gray-100/60'
            }`}
          >
            <UserIcon size={16} className={`mr-3 ${activeTab === 'profile' ? 'text-blue-500' : 'text-gray-400'}`} />
            Profile
          </button>
          {canManageUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                activeTab === 'users' ? 'bg-white text-gray-900 border-blue-500 shadow-sm' : 'bg-gray-50/50 text-gray-500 border-transparent hover:bg-gray-100/60'
              }`}
            >
              <Shield size={16} className={`mr-3 ${activeTab === 'users' ? 'text-blue-500' : 'text-gray-400'}`} />
              Users
            </button>
          )}
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-8 space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-black border border-blue-100">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">{user.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest">{user.email}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 pt-6 border-t border-gray-50">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="e.g. 919876543210"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs focus:outline-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="space-y-4 pt-6 border-t border-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center">
                  <Lock size={14} className="mr-2" /> Change Password
                </h4>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs focus:outline-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs focus:outline-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {savingPassword ? 'Saving...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && canManageUsers && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <div className="flex items-center">
                  <Shield className="mr-3 text-blue-600" size={22} />
                  <h3 className="text-lg font-black text-gray-900 uppercase">Manage Users</h3>
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center text-xs text-gray-400 font-bold py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="pb-3 px-2">User</th>
                        <th className="pb-3 px-2">Role</th>
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map((u) => (
                        <tr key={u.id} className="text-xs hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="font-black text-gray-900">{u.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${u.status === 'disabled' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {u.id !== user.id && (
                              <div className="flex items-center justify-end space-x-1">
                                <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase">Edit User</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Reset Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-blue-500/20">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
