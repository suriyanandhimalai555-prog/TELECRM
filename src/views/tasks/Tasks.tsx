import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Task, Lead, User, Project } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Phone, 
  Calendar,
  Trash2,
  Edit2,
  RefreshCw,
  Users,
  X,
  Briefcase,
  Search
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { searchTerm, setSearchTerm } = useSearch();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    lead_id: 0,
    user_id: user?.id || 0,
    project_id: '',
    type: 'CALL',
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'OPEN'
  });

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchTasks = useCallback(async (search?: string) => {
    try {
      const res = await api.get('/tasks', { params: { search } });
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
      if (res.data.length > 0) setFormData(prev => ({ ...prev, lead_id: res.data[0].id }));
    } catch (error) {
      console.error('Failed to fetch leads');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== 'EMPLOYEE' && user?.role !== undefined) {
      try {
        const res = await api.get('/settings/users');
        setUsers(res.data);
      } catch (error) {
        console.error('Failed to fetch users');
      }
    }
  }, [user?.role]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTasks, searchTerm]);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
    fetchProjects();
  }, [fetchLeads, fetchUsers, fetchProjects]);

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      triggerFlash('white');
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task status');
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      triggerFlash('red');
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, {
          ...formData,
          project_id: formData.project_id ? Number(formData.project_id) : null
        });
      } else {
        await api.post('/tasks', {
          ...formData,
          project_id: formData.project_id ? Number(formData.project_id) : null
        });
      }
      triggerFlash('white');
      setShowModal(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Failed to save task');
    }
  };

  const handleGenerateDaily = async () => {
    setGenerating(true);
    try {
      await api.post('/tasks/generate-daily');
      triggerFlash('white');
      fetchTasks();
    } catch (error) {
      alert('Failed to generate daily tasks');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CLOSED': return <CheckCircle2 className="text-aura-red" size={18} />;
      case 'OVERDUE': return <Clock className="text-aura-red" size={18} />;
      default: return <Circle className="text-gray-300" size={18} />;
    }
  };

  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const matchesProject = selectedProject === 'ALL' || task.project_id?.toString() === selectedProject;
    const matchesUser = selectedUser === 'ALL' || task.user_id?.toString() === selectedUser;
    const matchesStatus = selectedStatus === 'ALL' || task.status === selectedStatus;
    
    const taskDate = new Date(task.due_date);
    const matchesStartDate = !startDate || taskDate >= new Date(startDate);
    const matchesEndDate = !endDate || taskDate <= new Date(endDate + 'T23:59:59');

    const matchesSearch = true; // Handled server-side
    
    return matchesProject && matchesUser && matchesStatus && matchesStartDate && matchesEndDate && matchesSearch;
  }) : [];

  return (
    <div className="space-y-6 relative">
      {flash === 'white' && <div className="ui-screen-flash" />}
      {flash === 'red' && <div className="ui-screen-flash bg-aura-red/30" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Task <span className="text-aura-red">& To-dos</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your daily activities</p>
        </motion.div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateDaily}
                disabled={generating}
                className="flex items-center px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-aura-red hover:bg-aura-red/5 transition-all uppercase shadow-sm"
              >
                <RefreshCw size={16} className={cn("mr-2", generating && "animate-spin")} />
                Generate Daily
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingTask(null);
                  setFormData({
                    lead_id: leads[0]?.id || 0,
                    user_id: user?.id || 0,
                    project_id: '',
                    type: 'CALL',
                    due_date: new Date().toISOString().split('T')[0],
                    notes: '',
                    status: 'OPEN'
                  });
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
              >
                <Plus size={16} className="mr-2" />
                Add Task
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg focus:outline-none transition-all text-xs font-bold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gray-50/50 rounded-lg border border-transparent px-2">
              <Calendar size={12} className="text-gray-400 mr-2" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0"
              />
              <span className="mx-1 text-gray-300">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0"
              />
            </div>
            
            <select 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
            >
              <option value="ALL">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
            >
              <option value="ALL">All Projects</option>
              {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task List */}
        <div className="lg:col-span-3 space-y-3">
          <AnimatePresence>
            {filteredTasks.map((task, index) => (
              <motion.div 
                key={task.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group",
                  task.status === 'CLOSED' && "opacity-60 bg-gray-50"
                )}
              >
                <div className="flex items-center space-x-4">
                  <motion.button 
                    whileTap={{ scale: 0.8 }}
                    onClick={() => handleStatusChange(task.id, task.status)}
                    className="flex-shrink-0"
                  >
                    {getStatusIcon(task.status)}
                  </motion.button>
                  <div className="flex flex-col">
                    <h3 className={cn(
                      "text-sm font-black uppercase tracking-tight",
                      task.status === 'CLOSED' ? "text-gray-400 line-through" : "text-gray-900"
                    )}>
                      {task.type} <span className="text-aura-red opacity-50">•</span> {task.lead_name}
                    </h3>
                    <div className="flex items-center mt-1 space-x-4">
                      <div className="flex items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        <Calendar size={12} className="mr-1 opacity-50" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                      {task.project_name && (
                        <div className="flex items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          <Briefcase size={12} className="mr-1 opacity-50" />
                          {task.project_name}
                        </div>
                      )}
                      <div className="flex items-center text-[9px] font-black text-aura-red uppercase italic tracking-wider">
                        {task.user_name}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || task.user_id === user?.id) && (
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      onClick={() => {
                        setEditingTask(task);
                        setFormData({
                          lead_id: task.lead_id,
                          user_id: task.user_id,
                          type: task.type,
                          due_date: task.due_date.split('T')[0],
                          notes: task.notes || '',
                          status: task.status,
                          project_id: task.project_id?.toString() || ''
                        });
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </motion.button>
                  )}
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <motion.button 
                      whileHover={{ scale: 1.1, color: 'var(--color-aura-red)' }}
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-red-200 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <div className="p-10 border-2 border-dashed border-gray-100 rounded-2xl text-center">
              {loading ? <div className="ui-standard-spinner mx-auto" /> : <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No tasks assigned</p>}
            </div>
          )}
        </div>

        {/* mini Stats */}
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Task Snapshot</h3>
            <div className="space-y-3">
              {[
                { label: 'Pending', count: filteredTasks.filter(t => t.status === 'OPEN').length, color: 'text-aura-red' },
                { label: 'Overdue', count: filteredTasks.filter(t => t.status === 'OVERDUE').length, color: 'text-aura-red' },
                { label: 'Done', count: filteredTasks.filter(t => t.status === 'CLOSED').length, color: 'text-aura-green' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{stat.label}</span>
                  <span className={cn("text-xs font-black", stat.color)}>{stat.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Target Lead</label>
                  <select required value={formData.lead_id} onChange={(e) => setFormData({...formData, lead_id: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red">
                    <option value="">Select a Lead</option>
                    {Array.isArray(leads) && leads.map(l => <option key={l.id} value={l.id}>{l.contact_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Task Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red">
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                      <option value="EMAIL">Email</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Due Date</label>
                    <input type="date" required value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Project</label>
                  <select value={formData.project_id} onChange={(e) => setFormData({...formData, project_id: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red">
                    <option value="">No Project</option>
                    {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20">
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task?"
        message="Are you sure you want to remove this task? This action cannot be undone."
      />
    </div>
  );
}
