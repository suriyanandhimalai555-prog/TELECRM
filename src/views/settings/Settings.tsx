import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { 
  User as UserIcon, 
  Shield, 
  Key, 
  Trash2, 
  Plus, 
  Edit2, 
  Save,
  AlertTriangle,
  Lock,
  Globe,
  X,
  RefreshCw,
  Zap,
  Flame,
  CloudLightning,
  MessageSquare,
  ExternalLink,
  Info
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { user, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    reporting_to: number | null;
    assigned_projects: number[];
  }>({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    reporting_to: null,
    assigned_projects: [] as number[]
  });

  const [keysData, setKeysData] = useState({
    client_key: user?.client_key || '',
    gemini_key: user?.gemini_key || '',
    front_key: user?.front_key || '',
    backend_key: user?.backend_key || '',
    whatsapp_token: user?.whatsapp_token || '',
    whatsapp_phone_id: user?.whatsapp_phone_id || '',
    whatsapp_waba_id: user?.whatsapp_waba_id || ''
  });

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchUsers = async () => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      setLoading(true);
      try {
        const [usersRes, projectsRes] = await Promise.all([
          api.get('/settings/users'),
          api.get('/projects')
        ]);
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
      } catch (error) {
        console.error('Failed to fetch users or projects');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'administration') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      if (profileData.newPassword) {
        await api.post('/auth/change-password', {
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword
        });
      }
      triggerFlash('white');
      setProfileData({ ...profileData, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = { ...userData };
      if (user?.role === 'MANAGER') {
        dataToSave.role = 'EMPLOYEE';
        dataToSave.reporting_to = user.id;
      }
      
      if (editingUser) {
        await api.put(`/settings/users/${editingUser.id}`, dataToSave);
      } else {
        await api.post('/settings/users', dataToSave);
      }
      triggerFlash('white');
      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/settings/users/${userToDelete}`);
      triggerFlash('red');
      fetchUsers();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleUpdateKeys = async () => {
    try {
      await api.post('/settings/client-key', keysData);
      triggerFlash('white');
      refreshUser();
    } catch (error) {
      alert('Failed to update keys');
    }
  };

  const handleClearData = async () => {
    try {
      await api.delete('/settings/clear-all-data');
      triggerFlash('red');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      alert('Failed to clear data');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'], color: 'from-aura-red to-red-600' },
    { id: 'administration', name: 'Users', icon: Shield, roles: ['ADMIN', 'MANAGER'], color: 'from-aura-red to-red-700' },
    { id: 'integrations', name: 'Integrations', icon: Globe, roles: ['ADMIN'], color: 'from-aura-gold to-amber-600' },
    { id: 'danger', name: 'System Reset', icon: AlertTriangle, roles: ['ADMIN'], color: 'from-red-600 to-red-900' },
  ];

  const filteredTabs = tabs.filter(tab => user && tab.roles.includes(user.role));

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      {flash === 'white' && <div className="anime-screen-flash" />}
      {flash === 'red' && <div className="anime-screen-flash bg-aura-red/30" />}

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <h1 className="text-3xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">System <span className="text-aura-red">Settings</span></h1>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Configure your workspace and permissions</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {filteredTabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                activeTab === tab.id 
                  ? "bg-white text-gray-900 border-aura-red shadow-sm" 
                  : "bg-gray-50/30 text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/50"
              )}
            >
              <tab.icon size={16} className={cn("mr-3", activeTab === tab.id ? "text-aura-red" : "text-gray-400")} />
              {tab.name}
            </motion.button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-8"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 rounded-2xl bg-aura-red/5 flex items-center justify-center text-aura-red text-3xl font-black border border-aura-red/10">
                    {user?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">{user?.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                       <span className="px-2 py-0.5 bg-aura-red text-white rounded-lg text-[9px] font-black uppercase">{user?.role}</span>
                       <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest">{user?.email}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-aura-red font-bold text-xs"
                      />
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-gray-50">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center">
                        <Lock size={14} className="mr-2" />
                        Change Password
                      </h4>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Current Password</label>
                      <input 
                        type="password" 
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-aura-red font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">New Password</label>
                      <input 
                        type="password" 
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-aura-red font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-aura-red font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="px-6 py-2 bg-aura-red text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-aura-red/20"
                    >
                      Save Profile
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'administration' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                  <div className="flex items-center">
                    <Shield className="mr-3 text-aura-red" size={24} />
                    <h3 className="text-lg font-black text-gray-900 uppercase">User Management</h3>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEditingUser(null);
                      setUserData({ name: '', email: '', password: '', role: 'EMPLOYEE', reporting_to: null, assigned_projects: [] });
                      setShowUserModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-aura-red text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
                  >
                    <Plus size={14} className="mr-2" />
                    New User
                  </motion.button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="pb-4 px-2">User</th>
                        <th className="pb-4 px-2">Role</th>
                        <th className="pb-4 px-2">Reports To</th>
                        <th className="pb-4 px-2">Assigned Projects</th>
                        <th className="pb-4 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Array.isArray(users) && users.map((u, i) => (
                        <motion.tr 
                          key={u.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="text-xs hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="py-4 px-2">
                            <div className="font-black text-gray-900 lowercase tracking-tight">{u.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono tracking-wider">{u.email}</div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                              u.role === 'ADMIN' ? "bg-aura-red/5 text-aura-red border-aura-red/10" : 
                              u.role === 'MANAGER' ? "bg-aura-red/5 text-aura-red border-aura-red/10" : "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase">
                            {u.reporting_to ? <span className="text-gray-900">{users.find(mgr => mgr.id === u.reporting_to)?.name}</span> : '-'}
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {u.assigned_projects && u.assigned_projects.length > 0 ? (
                                u.assigned_projects.map(pid => {
                                  const p = projects.find(proj => proj.id === pid);
                                  return p ? (
                                    <span key={pid} className="px-1.5 py-0.5 bg-aura-red/10 text-aura-red rounded-md text-[8px] font-black uppercase tracking-tight">
                                      {p.name}
                                    </span>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-[9px] text-gray-300 font-black uppercase">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-right">
                            {(user?.role === 'ADMIN' || (user?.role === 'MANAGER' && u.reporting_to === user.id)) && u.id !== user.id && (
                              <div className="flex items-center justify-end space-x-1">
                                <motion.button 
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserData({
                                      name: u.name,
                                      email: u.email,
                                      password: '',
                                      role: u.role,
                                      reporting_to: u.reporting_to || null,
                                      assigned_projects: u.assigned_projects || []
                                    });
                                    setShowUserModal(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-aura-red hover:bg-aura-red/5 rounded-lg transition-all"
                                >
                                  <Edit2 size={14} />
                                </motion.button>
                                <motion.button 
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => {
                                    setUserToDelete(u.id);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="p-1.5 text-red-200 hover:text-aura-red hover:bg-aura-red/5 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div 
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-8"
              >
                <div className="space-y-2 border-b border-gray-50 pb-6">
                  <h3 className="text-lg font-black text-gray-900 flex items-center uppercase">
                    <Key size={24} className="mr-3 text-aura-gold" />
                    API Configuration
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage external service integrations</p>
                </div>
                
                <div className="space-y-6 max-w-xl">
                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 mb-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center">
                      <Zap size={14} className="mr-2" />
                      Core Systems
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { label: 'Gemini API Key', key: 'gemini_key', placeholder: 'Google AI Studio Secret' },
                        { label: 'Client API Key', key: 'client_key', placeholder: 'Internal Client Key' },
                        { label: 'Front-end Key', key: 'front_key', placeholder: 'Public Portal Key' },
                        { label: 'Back-end Key', key: 'backend_key', placeholder: 'Server Engine Key' }
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">{field.label}</label>
                          <input 
                            type="password" 
                            value={(keysData as any)[field.key]}
                            onChange={(e) => setKeysData({...keysData, [field.key]: e.target.value})}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg focus:outline-aura-gold font-mono text-xs tracking-widest"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpdateKeys}
                      className="px-6 py-2 bg-aura-gold text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-aura-gold/20"
                    >
                      Update Keys
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div 
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-6"
              >
                <div className="p-8 bg-aura-red/[0.02] rounded-2xl border border-aura-red/10 space-y-4">
                  <div className="flex items-center text-aura-red">
                    <Flame size={24} className="mr-3" />
                    <h3 className="text-lg font-black uppercase">System Reset</h3>
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                    The actions below are irreversible. Proceed with extreme caution.
                  </p>
                  
                  <div className="pt-4">
                    <div className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase">Clear All Data</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Nuke all leads, calls, tasks, and history.</p>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowClearConfirm(true)}
                        className="px-6 py-2 bg-aura-red text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
                      >
                        Execute Reset
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" required
                      value={userData.name}
                      onChange={(e) => setUserData({...userData, name: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Email</label>
                    <input 
                      type="email" required
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Password {editingUser && '(Leave blank to keep current)'}</label>
                    <input 
                      type="password" required={!editingUser}
                      value={userData.password}
                      onChange={(e) => setUserData({...userData, password: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Role</label>
                    <select 
                      value={userData.role}
                      disabled={user?.role === 'MANAGER'}
                      onChange={(e) => setUserData({...userData, role: e.target.value as any})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="EMPLOYEE">Employee</option>
                    </select>
                  </div>
                </div>

                {userData.role === 'EMPLOYEE' && (
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Reporting To</label>
                    <select 
                      value={userData.reporting_to || ''}
                      disabled={user?.role === 'MANAGER'}
                      onChange={(e) => setUserData({...userData, reporting_to: e.target.value ? Number(e.target.value) : null})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none text-aura-red"
                    >
                      <option value="">No Manager</option>
                      {Array.isArray(users) && users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Assigned Projects</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 border border-gray-50 rounded-xl bg-gray-50/30">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center space-x-2 text-[10px] font-bold uppercase transition-colors">
                        <input 
                          type="checkbox"
                          checked={userData.assigned_projects.includes(p.id)}
                          onChange={(e) => {
                            const newProjects = e.target.checked 
                              ? [...userData.assigned_projects, p.id]
                              : userData.assigned_projects.filter(id => id !== p.id);
                            setUserData({...userData, assigned_projects: newProjects});
                          }}
                          className="w-4 h-4 rounded border border-gray-200 text-aura-red focus:ring-aura-red"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                  <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white rounded-lg font-black uppercase text-[10px] shadow-lg shadow-aura-red/20">
                    {editingUser ? 'Update User' : 'Create User'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteUser}
        title="Banish Entity?"
        message="This will sever the soul's connection to the nexus. Assigned echoes may wander into the void. Continue?"
      />

      <ConfirmationModal 
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="INITIATE RAGNAROK?"
        message="Total dimensional collapse imminent. All data will be converted back to stardust. This cannot be undone."
        confirmText="Unleash Destruction"
        variant="danger"
      />
    </div>
  );
}
