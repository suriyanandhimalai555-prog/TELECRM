import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Lead, User, Project } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Phone, 
  MessageSquare, 
  Edit2, 
  Trash2,
  Calendar,
  X
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [importing, setImporting] = useState(false);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { searchTerm, setSearchTerm } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    contact_name: '',
    mobile: '',
    whatsapp: '',
    email: '',
    source: 'WEBSITE',
    stage: 'NEW',
    revenue: 0,
    next_followup: '',
    owner_id: user?.id || 0,
    project_id: ''
  });

  // Update owner_id if user changes
  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, owner_id: user.id || prev.owner_id }));
    }
  }, [user]);

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      try {
        const res = await api.get('/settings/users');
        setUsers(res.data);
      } catch (error) {
        console.error('Failed to fetch users');
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, {
          ...formData,
          project_id: formData.project_id ? Number(formData.project_id) : null
        });
      } else {
        await api.post('/leads', {
          ...formData,
          project_id: formData.project_id ? Number(formData.project_id) : null
        });
      }
      triggerFlash('white');
      setShowModal(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Failed to save lead');
    }
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    try {
      await api.delete(`/leads/${leadToDelete}`);
      triggerFlash('red');
      fetchLeads();
    } catch (error) {
      console.error('Failed to delete lead');
    }
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
          await api.post('/leads/import', { leads: results.data });
          triggerFlash('white');
          fetchLeads();
        } catch (error) {
          alert('Failed to import leads');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/leads/export');
      const csv = Papa.unparse(res.data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Failed to export leads');
    }
  };

  const filteredLeads = Array.isArray(leads) ? leads.filter(lead => {
    const contactName = lead.contact_name || '';
    const mobile = lead.mobile || '';
    const email = lead.email || '';
    
    const matchesSearch = contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = selectedProject === 'ALL' || lead.project_id?.toString() === selectedProject;
    const matchesStage = selectedStage === 'ALL' || lead.stage === selectedStage;
    
    return matchesSearch && matchesProject && matchesStage;
  }) : [];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'NEW': return 'bg-blue-100/50 text-blue-700 border border-blue-200';
      case 'CONTACTED': return 'bg-indigo-100/50 text-indigo-700 border border-indigo-200';
      case 'FOLLOW_UP': return 'bg-yellow-100/50 text-yellow-700 border border-yellow-200';
      case 'HOT': return 'bg-orange-100/50 text-orange-700 border border-orange-200';
      case 'RECENTLY_WON': return 'bg-green-100/50 text-green-700 border border-green-200';
      case 'LOST': return 'bg-red-100/50 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 relative">
      {flash === 'white' && <div className="anime-screen-flash" />}
      {flash === 'red' && <div className="anime-screen-flash bg-aura-red/30" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Active <span className="text-aura-red">Leads</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of potential accounts</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center px-4 py-2 bg-white border border-aura-red/20 rounded-xl text-[10px] font-black text-aura-red hover:bg-aura-red/5 uppercase tracking-widest"
              >
                <Upload size={14} className="mr-2" />
                {importing ? 'Importing...' : 'Import CSV'}
              </motion.button>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv" className="hidden" />
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingLead(null);
                  setFormData({
                    contact_name: '', mobile: '', whatsapp: '', email: '',
                    source: 'WEBSITE', stage: 'NEW', revenue: 0, next_followup: '',
                    owner_id: user?.id || 0, project_id: ''
                  });
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
              >
                <Plus size={16} className="mr-2" />
                Add Lead
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg focus:outline-none transition-all text-xs font-bold"
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1.5 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
          >
            <option value="ALL">All Projects</option>
            {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select 
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-1.5 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
          >
            <option value="ALL">All Stages</option>
            {['NEW', 'CONTACTED', 'FOLLOW_UP', 'HOT', 'RECENTLY_WON', 'LOST'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            onClick={handleExport}
            className="flex items-center px-3 py-1.5 bg-aura-gold/5 border border-aura-gold/10 rounded-lg text-[10px] font-black text-aura-gold uppercase"
          >
            <Download size={14} className="mr-2" />
            Export
          </motion.button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Contact', 'Project', 'Mobile', 'Stage', 'Employee', 'Revenue', 'Next Followup', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredLeads.map((lead, index) => (
                  <motion.tr 
                    key={lead.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-aura-red/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 lowercase tracking-tight"># {lead.contact_name}</span>
                        <span className="text-[9px] font-bold text-gray-400 truncate max-w-[150px]">{lead.email || 'No Email'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">
                      {lead.project_name || projects.find(p => p.id === lead.project_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-gray-700 tracking-wider font-mono">{lead.mobile}</span>
                        {lead.whatsapp && (
                          <motion.a whileHover={{ scale: 1.2 }} href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-600">
                            <MessageSquare size={14} />
                          </motion.a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase", getStageColor(lead.stage))}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[9px] font-black text-aura-red uppercase">
                      {lead.owner_name || users.find(u => u.id === lead.owner_id)?.name || 'Admin'}
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-gray-900">${lead.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase">
                      {lead.next_followup ? new Date(lead.next_followup).toLocaleDateString() : 'Not set'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <motion.button whileHover={{ scale: 1.2 }} className="p-1.5 text-aura-red hover:bg-aura-red/5 rounded-lg">
                          <Phone size={14} />
                        </motion.button>
                        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                          <>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              onClick={() => {
                                setEditingLead(lead);
                                setFormData({
                                  contact_name: lead.contact_name,
                                  mobile: lead.mobile,
                                  whatsapp: lead.whatsapp || '',
                                  email: lead.email || '',
                                  source: lead.source,
                                  stage: lead.stage,
                                  revenue: lead.revenue,
                                  next_followup: lead.next_followup ? lead.next_followup.split('T')[0] : '',
                                  owner_id: lead.owner_id,
                                  project_id: lead.project_id?.toString() || ''
                                });
                                setShowModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                            >
                              <Edit2 size={14} />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1, color: 'var(--color-aura-red)' }}
                              onClick={() => {
                                setLeadToDelete(lead.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1.5 text-red-200 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? <div className="anime-sharingan-spinner mx-auto" /> : 'No leads found in this realm'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingLead ? 'Edit Lead' : 'Summon New Lead'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Name', key: 'contact_name', type: 'text' },
                    { label: 'Mobile', key: 'mobile', type: 'text' },
                    { label: 'WhatsApp', key: 'whatsapp', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{f.label}</label>
                      <input 
                        type={f.type} required={f.key !== 'whatsapp' && f.key !== 'email'}
                        value={(formData as any)[f.key]}
                        onChange={(e) => setFormData({...formData, [f.key]: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Project</label>
                    <select 
                      value={formData.project_id}
                      onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none"
                    >
                      <option value="">No Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Source</label>
                    <select 
                      value={formData.source}
                      onChange={(e) => setFormData({...formData, source: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none"
                    >
                      {['WEBSITE', 'FACEBOOK', 'GOOGLE', 'REFERRAL', 'INBOUND_CALL', 'OUTBOUND_CALL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Discard</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20">
                    {editingLead ? 'Update Lead' : 'Summon Lead'}
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
        title="Banish Lead?"
        message="This will erase the lead from the records. Proceed with caution."
      />
    </div>
  );
}
