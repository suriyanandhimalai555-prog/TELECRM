import { useState, useEffect, useCallback, useRef } from 'react';
import stateApi from '../../services/stateApi';
import { Search, PhoneIncoming, PhoneOutgoing, PhoneMissed, Plus, X, Upload, Mic } from 'lucide-react';

export default function StateCalls() {
  const [calls, setCalls] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLogModal, setShowLogModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [logFormData, setLogFormData] = useState({
    lead_id: '', caller: '', type: 'OUTGOING', status: 'CONNECTED',
    duration_seconds: 0, outcome: '', notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [callsRes, leadsRes] = await Promise.all([
        stateApi.get('/calls'),
        stateApi.get('/leads'),
      ]);
      setCalls(callsRes.data.calls || callsRes.data || []);
      setLeads(leadsRes.data.leads || leadsRes.data || []);
    } catch {
      console.error('Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + logFormData.duration_seconds * 1000);
      await stateApi.post('/calls', {
        ...logFormData,
        lead_id: logFormData.lead_id ? Number(logFormData.lead_id) : null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });
      setShowLogModal(false);
      setLogFormData({ lead_id: '', caller: '', type: 'OUTGOING', status: 'CONNECTED', duration_seconds: 0, outcome: '', notes: '' });
      fetchData();
    } catch {
      alert('Failed to log call');
    }
  };

  const handleUploadRecording = async (callId: number, file: File) => {
    setUploadingId(callId);
    const form = new FormData();
    form.append('file', file);
    try {
      await stateApi.post(`/calls/${callId}/recording`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchData();
    } catch {
      alert('Failed to upload recording');
    } finally {
      setUploadingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor((seconds || 0) / 60);
    const secs = Math.floor((seconds || 0) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || (call.caller || '').includes(searchTerm) || (call.lead_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Call History</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Review engagement records — recordings uploaded manually</p>
        </div>
        <button onClick={() => setShowLogModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20">
          <Plus size={16} className="mr-2" />
          New Entry
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search calls..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-500 rounded-lg focus:outline-none text-xs font-bold text-gray-900" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-500 text-gray-500 rounded-lg focus:outline-none text-[10px] font-black uppercase appearance-none cursor-pointer">
            <option value="all">All Statuses</option>
            {['CONNECTED', 'BUSY', 'NO_ANSWER', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Type', 'Lead', 'Agent', 'Duration', 'Status', 'Outcome', 'Time', 'Recording'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCalls.map((call) => (
                <tr key={call.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className={`p-2 rounded-lg border w-fit ${
                      call.type === 'INCOMING' ? 'bg-green-50 border-green-100 text-green-600' :
                      call.type === 'OUTGOING' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                      {call.type === 'INCOMING' ? <PhoneIncoming size={14} /> : call.type === 'OUTGOING' ? <PhoneOutgoing size={14} /> : <PhoneMissed size={14} />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-gray-900">{call.lead_name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-[10px] font-black text-blue-600 uppercase">{call.agent_name || call.caller}</td>
                  <td className="px-6 py-4 text-xs font-black text-gray-400 font-mono">{formatDuration(call.duration_seconds)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                      call.status === 'CONNECTED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>{call.status}</span>
                  </td>
                  <td className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase">{call.outcome || '-'}</td>
                  <td className="px-6 py-4 text-[9px] font-semibold text-gray-400 font-mono">{call.start_time ? new Date(call.start_time).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4">
                    {call.recording_url ? (
                      <audio controls src={`/api/state/calls/recording/${call.recording_url}`} className="h-8 max-w-[180px]" />
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="audio/*"
                          ref={(el) => { fileInputRefs.current[call.id] = el; }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRecording(call.id, f); }}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRefs.current[call.id]?.click()}
                          disabled={uploadingId === call.id}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {uploadingId === call.id ? <><Mic size={11} className="animate-pulse" /> Uploading...</> : <><Upload size={11} /> Add Recording</>}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    {loading ? 'Loading...' : 'No call records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowLogModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Log Call</h3>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleLogCall} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Lead</label>
                <select value={logFormData.lead_id}
                  onChange={(e) => {
                    const lead = leads.find(l => l.id === Number(e.target.value));
                    setLogFormData({ ...logFormData, lead_id: e.target.value, caller: lead ? lead.phone : logFormData.caller });
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                  <option value="">Select Lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Phone Number</label>
                <input type="text" required value={logFormData.caller} onChange={(e) => setLogFormData({ ...logFormData, caller: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Type</label>
                  <select value={logFormData.type} onChange={(e) => setLogFormData({ ...logFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold">
                    <option value="INCOMING">Incoming</option>
                    <option value="OUTGOING">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Status</label>
                  <select value={logFormData.status} onChange={(e) => setLogFormData({ ...logFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold">
                    <option value="CONNECTED">Connected</option>
                    <option value="BUSY">Busy</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Duration (seconds)</label>
                <input type="number" value={logFormData.duration_seconds} onChange={(e) => setLogFormData({ ...logFormData, duration_seconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500" />
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">You can attach a recording from the call list after saving.</p>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
