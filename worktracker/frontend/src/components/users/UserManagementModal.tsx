import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { api } from '../../services/api';
import { RoleBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import { Search, UserPlus, Shield, CheckCircle2, XCircle, Edit, Building, Mail, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { addToast } = useToast();

  // Form states for Add / Edit
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [department, setDepartment] = useState('Engineering');
  const [state, setState] = useState('');
  const [managerId, setManagerId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (err: any) {
      addToast('error', 'Users Error', err.message || 'Failed to load user list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setEmail('');
    setPassword('Employee123!');
    setFullName('');
    setRole('employee');
    setDepartment('Engineering');
    setState('');
    setManagerId('');
    setEmployeeId('');
    setMobileNumber('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setEmail(u.email);
    setPassword('');
    setFullName(u.fullName);
    setRole(u.role);
    setDepartment(u.department);
    setState(u.state || '');
    setManagerId(u.managerId || '');
    setEmployeeId(u.employeeId || '');
    setMobileNumber(u.mobileNumber || '');
    setIsAddModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || !department || !state) {
      addToast('error', 'Validation Error', 'All mandatory user fields must be provided.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedUser) {
        await api.users.update(selectedUser.id, {
          email,
          fullName,
          role,
          department,
          state,
          managerId: managerId || null,
          employeeId: employeeId || null,
          mobileNumber: mobileNumber || null,
          ...(password ? { password } : {}),
        });
        addToast('success', 'User Updated', `Account for ${fullName} updated successfully.`);
      } else {
        await api.users.create({
          email,
          password: password || 'Employee123!',
          fullName,
          role,
          department,
          state,
          managerId: managerId || null,
          employeeId: employeeId || null,
          mobileNumber: mobileNumber || null,
        });
        addToast('success', 'User Created', `Account created for ${fullName}.`);
      }
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      addToast('error', 'Operation Failed', err.message || 'Could not save user details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.users.update(u.id, { isActive: !u.isActive });
      addToast(
        'info',
        'User Status Changed',
        `Account for ${u.fullName} is now ${!u.isActive ? 'Active' : 'Deactivated'}.`
      );
      fetchUsers();
    } catch (err: any) {
      addToast('error', 'Status Change Failed', err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase()) ||
      u.state?.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">User Management & Role Permissions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage employee access roles, Human Resources hierarchies, and department assignments
          </p>
        </div>

        <Button id="add-new-user-btn" variant="primary" onClick={handleOpenAdd} icon={<UserPlus className="w-4 h-4" />}>
          Add New User
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="user-search-input"
          type="text"
          placeholder="Filter users by name, email, department, state or role..."
          value={search}
          onChange={(e: { target: { value: any; }; }) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">State</th>
                <th className="px-5 py-3.5">Human Resources</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-snug">{u.fullName}</p>
                        <p className="text-xs text-slate-400 flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{u.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{u.department}</td>
                  <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{u.state || '—'}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{u.managerName || '—'}</td>
                  <td className="px-5 py-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                        <XCircle className="w-3 h-3 mr-1" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        u.isActive
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={selectedUser ? 'Edit User Details' : 'Create New User Account'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Full Name *</label>
            <input
              id="user-fullname-input"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Mobile Number</label>
              <input
                type="tel"
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Email Address *</label>
            <input
              id="user-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">
              Password {selectedUser && '(Leave blank to keep existing password)'}
            </label>
            <div className="relative">
              <input
                id="user-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder={selectedUser ? '••••••••' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Role *</label>
              <select
                id="user-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
              >
                <option value="employee">Employee</option>
                <option value="manager">HR</option>
                {/* <option value="admin">Admin</option> */}
                <option value="super_admin">Managing Director</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Department *</label>
              <select
                id="user-department-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
              >
                <option value="Developer">Developer</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Operations">Operations</option>
                <option value="Executive">Executive</option>
                <option value="Tele Caller">Tele Caller</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Block Chain">Block Chain</option>
                <option value="Mobile App Development">Mobile App Developer</option>
                <option value="Video Editing">Video Editor</option>
                <option value="Devops">Devops</option>
                <option value="Data Entry">Data Entry</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Developer">Developer</option>

              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">State belongs to *</label>
            <select
              id="user-state-select"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((stateName) => (
                <option key={stateName} value={stateName}>{stateName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Assigned Human Resources</label>
            <select
              id="user-manager-select"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
            >
              <option value="">None (No Human Resources assigned)</option>
              {users
                .filter((u) => ['manager', 'admin', 'super_admin'].includes(u.role) && u.id !== selectedUser?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.role.replace('_', ' ')})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button id="save-user-btn" type="submit" variant="primary" isLoading={isSubmitting}>
              {selectedUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
