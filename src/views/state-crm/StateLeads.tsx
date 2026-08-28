import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Plus, Search, Edit2, Trash2, X, Calendar, Download, Upload, Phone, MessageSquare } from 'lucide-react';
import Papa from 'papaparse';

interface StateLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  state_id: number;
  state_name?: string;
  created_at: string;
}

interface StateOption {
  id: number;
  name: string;
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-blue-100/50 text-blue-700 border border-blue-200';
    case 'contacted': return 'bg-indigo-100/50 text-indigo-700 border border-indigo-200';
    case 'qualified': return 'bg-yellow-100/50 text-yellow-700 border border-yellow-200';
    case 'converted': return 'bg-green-100/50 text-green-700 border border-green-200';
    case 'lost': return 'bg-red-100/50 text-red-700 border border-red-200';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatCallTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export default function StateLeads() {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: any }>();
  const [leads, setLeads] = useState<StateLead[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<StateLead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StateLead | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', status: 'new', state_id: user.state_id || '' });

  const [callPopup, setCallPopup] = useState<StateLead | null>(null);
  const [historyPopup, setHistoryPopup] = useState<{ lead: StateLead; calls: any[] } | null>(null);
  const [activeCall, setActiveCall] = useState<{ lead: StateLead; seconds: number; interval: any } | null>(() => {
    try {
      const saved = localStorage.getItem('stateActiveCall');
      if (saved) {
        const parsed = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
        return { lead: parsed.lead, seconds: elapsed, interval: null };
      }
    } catch {}
    return null;
  });

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/leads');
      setLeads(res.data.leads || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    stateApi.get('/states').then(res => setStates(res.data.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCall && activeCall.interval === null) {
      const saved = localStorage.getItem('stateActiveCall');
      const startTime = saved ? JSON.parse(saved).startTime : Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setActiveCall(prev => prev ? { ...prev, seconds: elapsed } : null);
        localStorage.setItem('stateActiveCall', JSON.stringify({ lead: activeCall.lead, seconds: elapsed, startTime }));
      }, 1000);
      setActiveCall(prev => prev ? { ...prev, interval } : null);
    }
  }, []);

  const openAddModal = () => {
    setEditingLead(null);
    setForm({ name: '', email: '', phone: '', status: 'new', state_id: user.state_id || '' });
    setShowModal(true);
  };

  const openEditModal = (lead: StateLead) => {
    setEditingLead(lead);
    setForm({ name: lead.name || '', email: lead.email || '', phone: lead.phone || '', status: lead.status || 'new', state_id: lead.state_id });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await stateApi.put(`/leads/${editingLead.id}`, form);
      } else {
        await stateApi.post('/leads', form);
      }
      setShowModal(false);
      fetchLeads();
    } catch { }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await stateApi.delete(`/leads/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchLeads();
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
            return stateApi.post('/leads', {
              name: row.Name || row.name || '',
              email: row.Email || row.email || '',
              phone: row.Phone || row.phone || '',
              status: (row.Status || row.status || 'new').toString().toLowerCase(),
              state_id,
            });
          }));
          const failed = results2.filter(r => r.status === 'rejected').length;
          const succeeded = results2.length - failed;
          fetchLeads();
          if (failed > 0) {
            alert(`Imported ${succeeded} lead${succeeded !== 1 ? 's' : ''}. ${failed} row${failed !== 1 ? 's' : ''} failed (missing/invalid state or data).`);
          }
        } catch {
          alert('Failed to import leads');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchTerm ||
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || l.status === selectedStatus;
    const matchesState = selectedState === 'ALL' || l.state_id?.toString() === selectedState;
    const leadDate = new Date(l.created_at);
    const matchesStartDate = !startDate || leadDate >= new Date(startDate);
    const matchesEndDate = !endDate || leadDate <= new Date(endDate + 'T23:59:59');
    return matchesSearch && matchesStatus && matchesState && matchesStartDate && matchesEndDate;
  });

  const handleExport = () => {
    const csv = Papa.unparse(filteredLeads.map(l => ({
      Name: l.name, Email: l.email, Phone: l.phone, Status: l.status, State: l.state_name || '', CreatedAt: l.created_at
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `state_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizedPhone = (lead: StateLead) => {
    let raw = (lead.phone || '').replace(/[^0-9]/g, '');
    if (raw.startsWith('91') && raw.length === 12) raw = raw.slice(2);
    if (raw.startsWith('0') && raw.length === 11) raw = raw.slice(1);
    return '91' + raw;
  };

  const startCall = (lead: StateLead) => {
    if (activeCall) {
      clearInterval(activeCall.interval);
      stateApi.post('/calls', {
        lead_id: activeCall.lead.id,
        caller: user?.name || user?.email || 'Agent',
        type: 'OUTGOING',
        status: 'CONNECTED',
        duration_seconds: activeCall.seconds,
        outcome: 'COMPLETED',
        notes: `Call with ${activeCall.lead.name}`,
        start_time: new Date(Date.now() - activeCall.seconds * 1000).toISOString(),
        end_time: new Date().toISOString(),
      }).catch((err: any) => console.error('Call save error:', err));
      setActiveCall(null);
      localStorage.removeItem('stateActiveCall');
      return;
    }
    const callStartTime = Date.now();
    localStorage.setItem('stateActiveCall', JSON.stringify({ lead, seconds: 0, startTime: callStartTime }));
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      setActiveCall(prev => prev ? { ...prev, seconds: elapsed } : null);
      localStorage.setItem('stateActiveCall', JSON.stringify({ lead, seconds: elapsed, startTime: callStartTime }));
    }, 1000);
    setActiveCall({ lead, seconds: 0, interval });
    const phone = normalizedPhone(lead);
    if (phone) {
      const a = document.createElement('a');
      a.href = `tel:+${phone}`;
      a.click();
    }
  };

  const openWhatsApp = (lead: StateLead) => {
    const phone = normalizedPhone(lead);
    if (phone) window.open(`https://wa.me/${phone}`, '_blank');
  };

  const openCallHistory = async (lead: StateLead) => {
    try {
      const res = await stateApi.get('/calls', { params: { lead_id: lead.id } });
      setHistoryPopup({ lead, calls: res.data.calls || [] });
    } catch {
      setHistoryPopup({ lead, calls: [] });
    }
  };

  return (
    <div className="space-y-6 relative">
      {historyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setHistoryPopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-[480px] z-10 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-gray-900">{historyPopup.lead.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{historyPopup.lead.phone}</p>
              </div>
              <button onClick={() => setHistoryPopup(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {historyPopup.calls.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No call history found</p>
            ) : (
              <div className="space-y-2">
                {historyPopup.calls.map((call: any) => (
                  <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-black text-gray-900">{call.agent_name || call.caller}</p>
                      <p className="text-[10px] text-gray-400">{call.start_time ? new Date(call.start_time).toLocaleString() : '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-blue-600">{Math.floor((call.duration_seconds || 0) / 60)}:{String((call.duration_seconds || 0) % 60).padStart(2, '0')}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${call.status === 'CONNECTED' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>{call.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {callPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCallPopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-72 z-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-900 mb-1">{callPopup.name}</h3>
            <p className="text-xs text-gray-400 font-mono mb-5">{callPopup.phone}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setCallPopup(null); startCall(callPopup); }}
                className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-sm transition-colors">
                <Phone size={18} /> Call via Phone
              </button>
              <button onClick={() => { setCallPopup(null); openWhatsApp(callPopup); }}
                className="flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors">
                <MessageSquare size={18} /> Message via WhatsApp
              </button>
            </div>
            <button onClick={() => setCallPopup(null)} className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 font-bold">CANCEL</button>
          </div>
        </div>
      )}

      {activeCall && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <div>
            <p className="text-xs font-bold">{activeCall.lead.name}</p>
            <p className="text-lg font-black">{formatCallTime(activeCall.seconds)}</p>
          </div>
          <button onClick={() => startCall(activeCall.lead)} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm font-bold">End & Save</button>
          <button onClick={() => { clearInterval(activeCall.interval); setActiveCall(null); localStorage.removeItem('stateActiveCall'); }}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold">Cancel</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Active <span className="text-blue-500">Leads</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of state accounts</p>
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
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search leads (name, phone, email)..."
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
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                {['Contact', 'Phone', 'Status', 'State', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 tracking-tight">{lead.name}</span>
                      <span className="text-[9px] font-bold text-gray-400 truncate max-w-[180px]">{lead.email || 'No Email'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black text-gray-700 tracking-wider font-mono">{lead.phone}</span>
                      {lead.phone && (
                        <button onClick={() => openWhatsApp(lead)} title="Open WhatsApp" className="text-green-500 hover:text-green-600 transition-colors">
                          <MessageSquare size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(lead.status)}`}>{lead.status}</span>
                  </td>
                  <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">{lead.state_name || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => setCallPopup(lead)} title="Call"
                        className={`p-1.5 rounded-lg transition-colors ${activeCall?.lead.id === lead.id ? 'text-red-500 bg-red-50 animate-pulse' : 'text-blue-600 hover:bg-blue-50'}`}>
                        <Phone size={14} />
                      </button>
                      <button onClick={() => openCallHistory(lead)} title="Call History"
                        className="p-1.5 rounded-lg transition-colors text-blue-400 hover:bg-blue-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </button>
                      <button onClick={() => openEditModal(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(lead)} className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? 'Loading...' : 'No leads found'}
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
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
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
                  {editingLead ? 'Update Lead' : 'Create Lead'}
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
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">Delete Lead?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove "{deleteConfirm.name}" from the records. Proceed with caution.</p>
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
