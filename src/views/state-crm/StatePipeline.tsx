import { useState, useEffect } from 'react';
import stateApi from '../../services/stateApi';

const STAGES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const COLORS: Record<string, string> = {
  new: 'bg-gray-100 border-gray-300',
  contacted: 'bg-blue-50 border-blue-300',
  qualified: 'bg-yellow-50 border-yellow-300',
  converted: 'bg-green-50 border-green-300',
  lost: 'bg-red-50 border-red-300',
};

export default function StatePipeline() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<any>(null);

  useEffect(() => {
    stateApi.get('/leads').then(r => {
      setLeads(r.data.leads || r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getLeadsByStage = (stage: string) => leads.filter(l => l.status === stage);

  const handleDrop = async (stage: string) => {
    if (!dragging || dragging.status === stage) return;
    try {
      await stateApi.put(`/leads/${dragging.id}`, { ...dragging, status: stage });
      setLeads(prev => prev.map(l => l.id === dragging.id ? { ...l, status: stage } : l));
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
                  <p className="text-[11px] font-black text-gray-900 truncate">{lead.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{lead.phone}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
