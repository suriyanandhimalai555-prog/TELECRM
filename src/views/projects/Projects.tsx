import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Project } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchTerm, setSearchTerm } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
  });

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchData = async () => {
    try {
      const projRes = await api.get('/projects');
      setProjects(projRes.data);
      
      // Fetch users only if authorized (ADMIN or MANAGER)
      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        try {
          const usersRes = await api.get('/settings/users');
          setUsers(usersRes.data);
        } catch (err) {
          console.error('Failed to fetch users');
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, formData);
      } else {
        await api.post('/projects', formData);
      }
      triggerFlash('white');
      setShowModal(false);
      setEditingProject(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save project');
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await api.delete(`/projects/${projectToDelete}`);
      triggerFlash('red');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const filteredProjects = Array.isArray(projects) ? projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle2 className="text-aura-green" size={16} />;
      case 'COMPLETED': return <CheckCircle2 className="text-aura-red" size={16} />;
      case 'ON_HOLD': return <Clock className="text-aura-gold" size={16} />;
      default: return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6 relative">
      {flash === 'white' && <div className="anime-screen-flash" />}
      {flash === 'red' && <div className="anime-screen-flash bg-aura-red/30" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Active <span className="text-aura-red">Projects</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of client portfolios</p>
        </motion.div>
        
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingProject(null);
              setFormData({ name: '', description: '', status: 'ACTIVE' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
          >
            <Plus size={16} className="mr-2" />
            New Project
          </motion.button>
        )}
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg focus:outline-none transition-all text-xs font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredProjects.map((project, index) => (
            <motion.div 
              key={project.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-aura-red/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 bg-aura-red/5 rounded-full -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform" />
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-aura-red/10 text-aura-red rounded-xl border border-aura-red/20">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{project.name}</h3>
                    <div className="flex items-center mt-0.5">
                      {getStatusIcon(project.status)}
                      <span className="ml-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{project.status}</span>
                    </div>
                  </div>
                </div>
                
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      onClick={() => {
                        setEditingProject(project);
                        setFormData({
                          name: project.name,
                          description: project.description || '',
                          status: project.status
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </motion.button>
                    {user?.role === 'ADMIN' && (
                      <motion.button 
                        whileHover={{ scale: 1.1, color: 'var(--color-aura-red)' }}
                        onClick={() => {
                          setProjectToDelete(project.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 text-red-200 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-[11px] font-bold text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                {project.description || 'No project description provided.'}
              </p>

              <div className="mb-6">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Assigned Team</div>
                <div className="flex flex-wrap gap-1.5">
                  {users.filter(u => u.assigned_projects?.includes(project.id)).length > 0 ? (
                    users.filter(u => u.assigned_projects?.includes(project.id)).map(u => (
                      <div key={u.id} className="group/avatar relative">
                        <div className="w-7 h-7 rounded-lg bg-aura-red/5 text-aura-red border border-aura-red/20 flex items-center justify-center text-[10px] font-black uppercase shadow-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-gray-900 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-20">
                          {u.name}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">No assignment</span>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Users size={12} className="mr-1.5 opacity-50" />
                    {project.lead_count || 0} Leads
                  </span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1.5 opacity-50" />
                    {project.task_count || 0} Tasks
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {projects.length === 0 && (
          <div className="col-span-full p-12 border-2 border-dashed border-gray-100 rounded-2xl text-center">
            {loading ? <div className="anime-sharingan-spinner mx-auto" /> : <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Projects Found</p>}
          </div>
        )}
      </div>

      {/* Project Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingProject ? 'Edit Project' : 'New Project'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Project Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter project name..." className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Enter details..." className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold h-24 resize-none focus:outline-aura-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-black uppercase focus:outline-aura-red">
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20">
                    {editingProject ? 'Update Project' : 'Create Project'}
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
        title="Delete Project?"
        message="Are you sure you want to permanently remove this project? This will affect mission data."
      />
    </div>
  );
}
