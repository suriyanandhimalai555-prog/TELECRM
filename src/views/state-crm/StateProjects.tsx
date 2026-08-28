import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface StateProject {
  id: number;
  name: string;
  description: string;
  status: string;
  state_id: number;
  default_owner_id: number | null;
  default_owner_name?: string;
  lead_count: number;
  task_count: number;
  created_at: string;
}

interface StateOption { id: number; name: string; }

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

export default function StateProjects() {
  const { user } = useOutletContext<{ user: any }>();
  const [projects, setProjects] = useState<StateProject[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<StateProject | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StateProject | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'ACTIVE', state_id: user.state_id || '' });

  const canManage = user.role === 'master' || user.role === 'admin' || user.role === 'coordinator';

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/projects');
      setProjects(res.data.projects || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    stateApi.get('/states').then(res => setStates(res.data.states || [])).catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingProject(null);
    setForm({ name: '', description: '', status: 'ACTIVE', state_id: user.state_id || '' });
    setShowModal(true);
  };

  const openEditModal = (project: StateProject) => {
    setEditingProject(project);
    setForm({ name: project.name || '', description: project.description || '', status: project.status || 'ACTIVE', state_id: project.state_id });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await stateApi.put(`/projects/${editingProject.id}`, form);
      } else {
        await stateApi.post('/projects', form);
      }
      setShowModal(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save project');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await stateApi.delete(`/projects/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchProjects();
    } catch { }
  };

  const filteredProjects = projects.filter(p =>
    !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Active <span className="text-blue-500">Projects</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of state campaigns</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg focus:outline-none transition-all text-xs font-bold"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[10px] font-black text-gray-300 uppercase">Loading...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-[10px] font-black text-gray-300 uppercase bg-white rounded-xl border border-gray-100">No projects found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative">
              {canManage && (
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button onClick={() => openEditModal(project)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteConfirm(project)} className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight pr-16">{project.name}</h3>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${project.status === 'ACTIVE' ? 'bg-green-100/50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>{project.status}</span>
              <p className="text-xs text-gray-500 mt-3 line-clamp-2">{project.description || 'No project description provided.'}</p>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <span>{project.lead_count || 0} Leads</span>
                <span>{project.task_count || 0} Tasks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingProject ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">State</label>
                  <select required value={form.state_id} onChange={e => setForm({ ...form, state_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    <option value="" disabled>Select a state</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Discard</button>
                <button type="submit" className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20">
                  {editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10 border border-gray-100">
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">Delete Project?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove "{deleteConfirm.name}". Proceed with caution.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
