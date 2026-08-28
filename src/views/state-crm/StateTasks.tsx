import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Plus, Search, Edit2, Trash2, X, Calendar, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

interface StateTask {
  id: number;
  title: string;
  description: string;
  status: string;
  due_date: string;
  state_id: number;
  state_name?: string;
  lead_name?: string;
  created_at: string;
}

interface StateOption {
  id: number;
  name: string;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100/50 text-green-700 border border-green-200';
    case 'in_progress': return 'bg-yellow-100/50 text-yellow-700 border border-yellow-200';
    case 'pending': return 'bg-blue-100/50 text-blue-700 border border-blue-200';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function StateTasks() {
  const { user } = useOutletContext<{ user: any }>();
  const [tasks, setTasks] = useState<StateTask[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<StateTask | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StateTask | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'pending', due_date: '', state_id: user.state_id || '' });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/tasks');
      setTasks(res.data.tasks || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    stateApi.get('/states').then(res => setStates(res.data.states || [])).catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingTask(null);
    setForm({ title: '', description: '', status: 'pending', due_date: '', state_id: user.state_id || '' });
    setShowModal(true);
  };

  const openEditModal = (task: StateTask) => {
    setEditingTask(task);
    setForm({ title: task.title || '', description: task.description || '', status: task.status || 'pending', due_date: task.due_date ? task.due_date.slice(0, 10) : '', state_id: task.state_id });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await stateApi.put(`/tasks/${editingTask.id}`, form);
      } else {
        await stateApi.post('/tasks', form);
      }
      setShowModal(false);
      fetchTasks();
    } catch { }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await stateApi.delete(`/tasks/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchTasks();
    } catch { }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const results2 = await Promise.allSettled(rows.map(row => {
            const stateName = (row.State || row.state || '').toString().trim().toLowerCase();
            const matchedState = states.find(s => s.name.toLowerCase() === stateName);
            const state_id = matchedState ? matchedState.id : (user.state_id || '');
            return stateApi.post('/tasks', {
              title: row.Title || row.title || '',
              description: row.Description || row.description || '',
              status: (row.Status || row.status || 'pending').toString().toLowerCase(),
              due_date: row.DueDate || row.due_date || '',
              state_id,
            });
          }));
          const failed = results2.filter(r => r.status === 'rejected').length;
          const succeeded = results2.length - failed;
          fetchTasks();
          if (failed > 0) {
            alert(`Imported ${succeeded} task${succeeded !== 1 ? 's' : ''}. ${failed} row${failed !== 1 ? 's' : ''} failed (missing/invalid state or data).`);
          }
        } catch {
          alert('Failed to import tasks');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    const matchesState = selectedState === 'ALL' || t.state_id?.toString() === selectedState;
    const taskDate = new Date(t.created_at);
    const matchesStartDate = !startDate || taskDate >= new Date(startDate);
    const matchesEndDate = !endDate || taskDate <= new Date(endDate + 'T23:59:59');
    return matchesSearch && matchesStatus && matchesState && matchesStartDate && matchesEndDate;
  });

  const handleExport = () => {
    const csv = Papa.unparse(filteredTasks.map(t => ({
      Title: t.title, Description: t.description, Status: t.status, DueDate: t.due_date, State: t.state_name || '', CreatedAt: t.created_at
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `state_tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Active <span className="text-blue-500">Tasks</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of state follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center px-4 py-2 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-500 hover:bg-blue-50 uppercase tracking-widest"
          >
            <Upload size={14} className="mr-2" />
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv" className="hidden" />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tasks (title)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg focus:outline-none transition-all text-xs font-bold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-gray-50/50 rounded-lg border border-transparent px-2">
              <Calendar size={12} className="text-gray-400 mr-2" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0" />
              <span className="mx-1 text-gray-300">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0" />
            </div>

            <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[10px] font-black uppercase appearance-none">
              <option value="ALL">All States</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[10px] font-black uppercase appearance-none">
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>

            <button onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black text-blue-600 uppercase">
              <Download size={14} className="mr-2" />Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Title', 'Due Date', 'Status', 'State', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 tracking-tight">{task.title}</span>
                      <span className="text-[9px] font-bold text-gray-400 truncate max-w-[220px]">{task.description || 'No description'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-gray-700 uppercase">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">{task.state_name || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => openEditModal(task)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(task)} className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? 'Loading...' : 'No tasks found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Title</label>
                  <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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
                  {editingTask ? 'Update Task' : 'Create Task'}
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
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">Delete Task?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove "{deleteConfirm.title}" from the records. Proceed with caution.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-xl">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
