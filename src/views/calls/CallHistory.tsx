import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Call, Lead, Campaign, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { 
  Search, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  FileText,
  Table as TableIcon,
  Plus,
  X,
  MessageCircle,
  Phone,
  Pencil,
  Trash2
} from 'lucide-react';
import WhatsAppChat from '../../components/WhatsApp/WhatsAppChat';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchTerm, setSearchTerm } = useSearch();
  const [searchParams] = useSearchParams();
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    campaign: 'all',
    agent: 'all',
    startDate: '',
    endDate: ''
  });

  const [showLogModal, setShowLogModal] = useState(false);
  const [editingCallId, setEditingCallId] = useState<number | null>(null);
  const [historyPopup, setHistoryPopup] = useState<{ name: string; calls: any[] } | null>(null);
  const [activeWhatsApp, setActiveWhatsApp] = useState<{ phone: string; name: string } | null>(null);
  const [logFormData, setLogFormData] = useState({
    lead_id: '',
    caller: '',
    type: 'OUTGOING',
    status: 'CONNECTED',
    duration_seconds: 0,
    outcome: '',
    notes: '',
    campaign_id: ''
  });
  const [leads, setLeads] = useState<Lead[]>([]);

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchData = useCallback(async (search?: string) => {
    try {
      const [callsRes, campaignsRes, agentsRes, leadsRes] = await Promise.all([
        api.get('/calls', { params: { search } }),
        api.get('/campaigns'),
        user?.role !== 'EMPLOYEE' && user?.role !== undefined ? api.get('/settings/users') : Promise.resolve({ data: [] }),
        api.get('/leads')
      ]);
      setCalls(callsRes.data);
      setCampaigns(campaignsRes.data);
      setAgents(agentsRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      console.error('Failed to fetch call history');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchData, searchTerm]);

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + logFormData.duration_seconds * 1000);
      
      await api.post('/calls', {
        ...logFormData,
        lead_id: logFormData.lead_id ? Number(logFormData.lead_id) : null,
        campaign_id: logFormData.campaign_id ? Number(logFormData.campaign_id) : null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });
      
      triggerFlash('white');
      setShowLogModal(false);
      setLogFormData({
        lead_id: '', caller: '', type: 'OUTGOING', status: 'CONNECTED',
        duration_seconds: 0, outcome: '', notes: '', campaign_id: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to log call');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const deduplicatedCalls = Array.isArray(calls) ? calls.reduce((acc: any[], call: any) => {
    const exists = acc.find(c => c.lead_id === call.lead_id);
    if (!exists) acc.push(call);
    return acc;
  }, []) : [];

  const filteredCalls = deduplicatedCalls.filter(call => {
    const matchesSearch = true; // Handled server-side
    
    const matchesStatus = filters.status === 'all' || call.status === filters.status;
    const matchesCampaign = filters.campaign === 'all' || call.campaign_id === Number(filters.campaign);
    const matchesAgent = filters.agent === 'all' || call.agent_id === Number(filters.agent);
    
    const callDate = new Date(call.start_time);
    const matchesStartDate = !filters.startDate || callDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || callDate <= new Date(filters.endDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesCampaign && matchesAgent && matchesStartDate && matchesEndDate;
  });

  const exportCSV = () => {
    const data = filteredCalls.map(call => ({
      Caller: call.caller, Lead: call.lead_name || 'N/A', Agent: call.agent_name,
      Type: call.type, Status: call.status, Duration: formatDuration(call.duration_seconds),
      Campaign: call.campaign_name || 'N/A', Outcome: call.outcome || 'N/A',
      Time: new Date(call.start_time).toLocaleString(), Notes: call.notes || ''
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call_log_${new Date().toISOString()}.csv`;
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Call Records', 14, 15);
    const head = [['Caller', 'Lead', 'Agent', 'Type', 'Status', 'Duration', 'Outcome', 'Time']];
    const body = filteredCalls.map(call => [
      call.caller, call.lead_name || 'N/A', call.agent_name, call.type, call.status,
      formatDuration(call.duration_seconds), call.outcome || 'N/A', new Date(call.start_time).toLocaleString()
    ]);
    autoTable(doc, { head, body, startY: 20, theme: 'striped', styles: { fontSize: 8 } });
    doc.save(`call_log_${new Date().toISOString()}.pdf`);
  };

  return (
    <div className="space-y-6 relative pb-12">
      {flash === 'white' && <div className="ui-screen-flash" />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Extraction <span className="text-aura-red">History</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 ml-1">Reviewing engagement records from the void</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={exportCSV}
            className="flex items-center px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all shadow-sm"
          >
            <TableIcon size={14} className="mr-2" />
            CSV Data
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={exportPDF}
            className="flex items-center px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all shadow-sm"
          >
            <FileText size={14} className="mr-2" />
            PDF Report
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowLogModal(true)}
            className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-red/20 tracking-tighter"
          >
            <Plus size={16} className="mr-2" />
            New Entry
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Filter identities..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red rounded-lg focus:outline-none text-xs font-bold text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center bg-gray-50/50 rounded-lg border border-transparent px-2">
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0 w-full"
            />
            <span className="mx-1 text-gray-300">-</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="bg-transparent border-none text-[10px] font-black uppercase py-1 focus:ring-0 w-full"
            />
          </div>
          
          {['status', 'campaign', 'agent'].map(f => (
            <select 
              key={f} value={(filters as any)[f]}
              onChange={(e) => setFilters({...filters, [f]: e.target.value})}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red text-gray-500 rounded-lg focus:outline-none text-[10px] font-black uppercase appearance-none cursor-pointer"
            >
              <option value="all">All {f === 'status' ? 'Statuses' : f === 'campaign' ? 'Campaigns' : 'Agents'}</option>
              {f === 'status' && ['CONNECTED', 'BUSY', 'NO_ANSWER', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
              {f === 'campaign' && campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              {f === 'agent' && agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Signal', 'Subject', 'Operator', 'Sync Time', 'State', 'Result', 'Timestamp', 'Chat'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredCalls.map((call, index) => (
                  <motion.tr 
                    key={call.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-aura-red/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className={cn(
                        "p-2 rounded-lg border w-fit shadow-sm transition-transform group-hover:scale-110",
                        call.type === 'INCOMING' ? "bg-aura-red/10 border-aura-red/20 text-aura-red" : 
                        call.type === 'OUTGOING' ? "bg-green-600/10 border-green-600/20 text-green-600" : "bg-gray-100 border-gray-200 text-gray-400"
                      )}>
                        {call.type === 'INCOMING' ? <PhoneIncoming size={14} /> : 
                         call.type === 'OUTGOING' ? <PhoneOutgoing size={14} /> : <PhoneMissed size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-gray-900 lowercase tracking-tight">
                       {call.lead_name || 'Classified Identity'}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-black text-aura-red uppercase tracking-tighter">{call.agent_name}</td>
                    <td className="px-6 py-4 text-xs font-black text-gray-400 font-mono tracking-tighter">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase border",
                        call.status === 'CONNECTED' ? "bg-green-600/10 text-green-600 border-green-600/20" : "bg-aura-red/10 text-aura-red border-aura-red/20"
                      )}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest">{call.outcome || 'No Signal'}</td>
                    <td className="px-6 py-4 text-[9px] font-semibold text-gray-400 font-mono">
                      {new Date(call.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { const phone = (call.lead_mobile || call.lead_whatsapp || '').replace(/[^0-9]/g, ''); if(phone) window.open(`tel:${phone}`,'_self'); }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Phone Call">
                          <Phone size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { const ph = (call.lead_whatsapp || call.lead_mobile || '').replace(/[^0-9]/g, ''); setActiveWhatsApp({ phone: ph, name: call.lead_name || 'Customer' }); }}
                          className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="WhatsApp Chat">
                          <MessageCircle size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={async () => {
                            const res = await api.get('/calls', { params: { lead_id: call.lead_id } });
                            setHistoryPopup({ name: call.lead_name || 'Customer', calls: res.data });
                          }}
                          className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                          title="History">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { setLogFormData({ lead_id: call.lead_id?.toString() || '', caller: call.agent_name || '', type: call.type || 'OUTGOING', status: call.status || 'CONNECTED', duration_seconds: call.duration_seconds || 0, outcome: call.outcome || '', notes: call.notes || '', campaign_id: call.campaign_id?.toString() || '' }); setEditingCallId(call.id); setShowLogModal(true); }}
                          className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit">
                          <Pencil size={14} />
                        </motion.button>
                        {user?.role === 'ADMIN' && (
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => { if(confirm('Delete this call record?')) api.delete(`/calls/${call.id}`).then(() => setCalls(prev => prev.filter(c => c.id !== call.id))); }}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete">
                            <Trash2 size={14} />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    {loading ? (
                       <div className="flex flex-col items-center space-y-3">
                          <div className="ui-standard-spinner" />
                          <p className="text-[9px] font-black text-aura-red uppercase tracking-widest">Querying Data Clusters...</p>
                       </div>
                    ) : (
                       <div className="text-gray-400">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No data found in current dimension</p>
                       </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Call Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Manual Call Entry</h3>
                <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleLogCall} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Target Contact</label>
                  <select 
                    value={logFormData.lead_id}
                    onChange={(e) => {
                      const lead = leads.find(l => l.id === Number(e.target.value));
                      setLogFormData({...logFormData, lead_id: e.target.value, caller: lead ? lead.mobile : logFormData.caller});
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red appearance-none"
                  >
                    <option value="">Select Lead</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.contact_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Phone Frequency</label>
                  <input type="text" required value={logFormData.caller} onChange={(e) => setLogFormData({...logFormData, caller: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Type</label>
                    <select value={logFormData.type} onChange={(e) => setLogFormData({...logFormData, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold">
                      <option value="INCOMING">Incoming</option>
                      <option value="OUTGOING">Outgoing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                    <select value={logFormData.status} onChange={(e) => setLogFormData({...logFormData, status: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold">
                      <option value="CONNECTED">Connected</option>
                      <option value="BUSY">Busy</option>
                      <option value="NO_ANSWER">No Answer</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Abort</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20">
                    Seal Entry
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Chat */}
      <AnimatePresence>
        {historyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setHistoryPopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-[480px] z-10 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900">{historyPopup.name} — Call History</h3>
              <button onClick={() => setHistoryPopup(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {historyPopup.calls.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No call history found</p>
            ) : (
              <div className="space-y-2">
                {historyPopup.calls.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-black text-gray-900">{c.agent_name || c.caller}</p>
                      <p className="text-[10px] text-gray-400">{new Date(c.start_time).toLocaleString()}</p>
                      {c.notes && <p className="text-[10px] text-gray-500 mt-0.5">{c.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-green-600">{Math.floor(c.duration_seconds/60)}:{String(c.duration_seconds%60).padStart(2,'0')}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${c.status === 'CONNECTED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeWhatsApp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveWhatsApp(null)} />
            <div className="relative z-10 shadow-2xl">
              <button
                onClick={() => setActiveWhatsApp(null)}
                className="absolute -top-3 -right-3 z-20 bg-white rounded-full p-1.5 shadow-lg border border-gray-100 text-gray-500 hover:text-red-500 transition-colors">
                <X size={16} />
              </button>
              <WhatsAppChat 
                phone={activeWhatsApp.phone} 
                name={activeWhatsApp.name} 
                onClose={() => setActiveWhatsApp(null)} 
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
