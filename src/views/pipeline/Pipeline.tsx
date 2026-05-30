import { useState, useEffect } from 'react';
import api from '../../lib/api';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 border-gray-300',
  CONTACTED: 'bg-blue-50 border-blue-300',
  QUALIFIED: 'bg-yellow-50 border-yellow-300',
  PROPOSAL: 'bg-purple-50 border-purple-300',
  NEGOTIATION: 'bg-orange-50 border-orange-300',
  WON: 'bg-green-50 border-green-300',
  LOST: 'bg-red-50 border-red-300',
};

export default function Pipeline() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<any>(null);

  useEffect(() => {
    api.get('/leads').then(r => { setLeads(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const getLeadsByStage = (stage: string) => leads.filter(l => l.stage === stage);

  const handleDrop = async (stage: string) => {
    if (!dragging || dragging.stage === stage) return;
    try {
      await api.put(`/leads/${dragging.id}`, { ...dragging, stage });
      setLeads(prev => prev.map(l => l.id === dragging.id ? { ...l, stage } : l));
    } catch {}
    setDragging(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading pipeline...</div>;

  return (
    <div className="p-6 h-full overflow-hidden">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-6">Sales Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {STAGES.map(stage => (
          <div
            key={stage}
            className={`flex-shrink-0 w-64 rounded-2xl border-2 ${COLORS[stage]} p-3`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600">{stage}</h3>
              <span className="text-[10px] font-black bg-white rounded-full px-2 py-0.5 text-gray-500">{getLeadsByStage(stage).length}</span>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {getLeadsByStage(stage).map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead)}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                >
                  <p className="text-[11px] font-black text-gray-900 truncate">{lead.contact_name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{lead.mobile}</p>
                  {lead.revenue > 0 && (
                    <p className="text-[10px] font-bold text-green-600 mt-1">₹{lead.revenue?.toLocaleString()}</p>
                  )}
                  <p className="text-[9px] text-gray-300 mt-1">{lead.source}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
