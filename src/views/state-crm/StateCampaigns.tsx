import { useState, useEffect, useCallback } from 'react';
import stateApi from '../../services/stateApi';
import { Plus, Target, Edit2, Trash2, X } from 'lucide-react';

export default function StateCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'COLD_CALLING', phone_number: '', status: 'ACTIVE' });

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await stateApi.get('/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch {
      console.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await stateApi.put(`/campaigns/${editing.id}`, formData);
      } else {
        await stateApi.post('/campaigns', formData);
      }
      setShowModal(false);
      setEditing(null);
      fetchCampaigns();
    } catch {
      alert('Failed to save campaign');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await stateApi.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch {
      alert('Failed to delete campaign');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">
            Active Campaigns
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Strategic outreach management</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormData({ name: '', type: 'COLD_CALLING', phone_number: '', status: 'ACTIVE' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} className="mr-2" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight">{campaign.name}</h3>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mt-0.5">{campaign.type?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditing(campaign);
                    setFormData({ name: campaign.name, type: campaign.type, phone_number: campaign.phone_number || '', status: campaign.status });
                    setShowModal(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(campaign.id)} className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone Number</span>
                <span className="text-[10px] font-black text-gray-900 tracking-wider font-mono">{campaign.phone_number || 'UNKNOWN'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {campaign.status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border-2 border-dashed border-gray-100 text-center">
            {loading ? <div className="text-gray-400 text-xs">Loading...</div> : <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Campaigns Found</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editing ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Campaign Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                  <option value="COLD_CALLING">Cold Calling</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="PROMOTIONAL">Promotional</option>
                  <option value="SURVEY">Survey</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                <input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600">Discard</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20">
                  {editing ? 'Save Changes' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
