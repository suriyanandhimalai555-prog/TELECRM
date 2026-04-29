import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
    company: '',
    tags: '',
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

  const fetchLeads = useCallback(async (search?: string) => {
    try {
      const res = await api.get('/leads', { params: { search } });
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
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
      fetchLeads(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchLeads, searchTerm]);

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, [fetchUsers, fetchProjects]);

  const handleBulkSend = async () => {
    if (!bulkMessage.trim() || selectedLeadIds.length === 0 || sendingBulk) return;
    setSendingBulk(true);
    try {
      const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
      const contacts = selectedLeads.map(l => ({
        to: l.whatsapp || l.mobile,
        contactName: l.contact_name
      }));
      
      await api.post('/whatsapp/bulk-send', {
        contacts,
        message: bulkMessage
      });
      
      triggerFlash('white');
      setShowBulkModal(false);
      setBulkMessage('');
      setSelectedLeadIds([]);
      alert('Bulk messages transmission initiated');
    } catch (error) {
      console.error('Bulk send failed');
      alert('Failed to send bulk messages');
    } finally {
      setSendingBulk(false);
    }
  };

  const toggleLeadSelection = (id: number) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

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
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save lead';
      alert(msg);
      console.error('Failed to save lead:', msg);
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
    const matchesProject = selectedProject === 'ALL' || lead.project_id?.toString() === selectedProject;
    const matchesStage = selectedStage === 'ALL' || lead.stage === selectedStage;
    const matchesUser = selectedUser === 'ALL' || lead.owner_id?.toString() === selectedUser;
    
    const leadDate = new Date(lead.created_at);
    const matchesStartDate = !startDate || leadDate >= new Date(startDate);
    const matchesEndDate = !endDate || leadDate <= new Date(endDate + 'T23:59:59');
    
    return matchesProject && matchesStage && matchesUser && matchesStartDate && matchesEndDate;
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
      {flash === 'white' && <div className="ui-screen-flash" />}
      {flash === 'red' && <div className="ui-screen-flash bg-aura-red/30" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Active <span className="text-aura-red">Leads</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of potential accounts</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          {selectedLeadIds.length > 0 && (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setShowBulkModal(true)}
              className="flex items-center px-4 py-2 bg-aura-gold text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-gold/20"
            >
              <MessageSquare size={14} className="mr-2" />
              Bulk Message ({selectedLeadIds.length})
            </motion.button>
          )}
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
                    company: '', tags: '',
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

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search leads (name, phone, email, company, tags)..." 
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
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg text-[10px] font-black uppercase appearance-none"
            >
              <option value="ALL">All Statuses</option>
              {['NEW', 'CONTACTED', 'FOLLOW_UP', 'HOT', 'RECENTLY_WON', 'LOST'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-aura-gold/5 border border-aura-gold/10 rounded-lg text-[10px] font-black text-aura-gold uppercase"
            >
              <Download size={14} className="mr-2" />
              Export
            </motion.button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleAllSelection}
                    className="accent-aura-red"
                  />
                </th>
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
                    className={cn("hover:bg-aura-red/[0.02] transition-colors", selectedLeadIds.includes(lead.id) && "bg-aura-red/[0.04]")}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="accent-aura-red"
                      />
                    </td>
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
                                  company: lead.company || '',
                                  tags: lead.tags || '',
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
                    {loading ? <div className="ui-standard-spinner mx-auto" /> : 'No leads found'}
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
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Name', key: 'contact_name', type: 'text' },
                    { label: 'Mobile', key: 'mobile', type: 'text' },
                    { label: 'WhatsApp', key: 'whatsapp', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'Company', key: 'company', type: 'text' },
                    { label: 'Tags', key: 'tags', type: 'text' },
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
                    {editingLead ? 'Update Lead' : 'Create Lead'}
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
        title="Delete Lead?"
        message="This will permanently remove the lead from the records. Proceed with caution."
      />

      {/* Bulk Message Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Bulk Message</h3>
                <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Targeting {selectedLeadIds.length} contact frequencies</p>
                   <textarea 
                     rows={5}
                     value={bulkMessage}
                     onChange={(e) => setBulkMessage(e.target.value)}
                     placeholder="Type your message here..."
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-aura-red transition-all"
                   />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600">Discard</button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    onClick={handleBulkSend}
                    disabled={!bulkMessage.trim() || sendingBulk}
                    className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20 disabled:opacity-50"
                  >
                    {sendingBulk ? 'Sending...' : 'Send Messages'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
