import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Campaign } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { 
  Plus, 
  Target, 
  Phone, 
  Activity, 
  Edit2, 
  Trash2,
  X
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<number | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    type: 'COLD_CALLING',
    phone_number: '',
    status: 'ACTIVE'
  });

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch (error) {
      console.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await api.put(`/campaigns/${editingCampaign.id}`, formData);
      } else {
        await api.post('/campaigns', formData);
      }
      triggerFlash('white');
      setShowModal(false);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to save campaign');
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    try {
      await api.delete(`/campaigns/${campaignToDelete}`);
      triggerFlash('red');
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign');
    }
  };

  return (
    <div className="space-y-6 relative">
      {flash === 'white' && <div className="anime-screen-flash" />}
      {flash === 'red' && <div className="anime-screen-flash bg-aura-red/30" />}

      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">Active <span className="text-aura-red">Campaigns</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Strategic outreach management</p>
        </motion.div>
        
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingCampaign(null);
              setFormData({ name: '', type: 'COLD_CALLING', phone_number: '', status: 'ACTIVE' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-aura-red/20"
          >
            <Plus size={16} className="mr-2" />
            New Campaign
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {campaigns.map((campaign, index) => (
            <motion.div 
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-aura-red/5 text-aura-red rounded-xl border border-aura-red/10">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight italic">{campaign.name}</h3>
                      <span className="text-[9px] font-black text-aura-red uppercase tracking-widest block mt-0.5">{campaign.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        onClick={() => {
                          setEditingCampaign(campaign);
                          setFormData({
                            name: campaign.name,
                            type: campaign.type,
                            phone_number: campaign.phone_number || '',
                            status: campaign.status
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1, color: 'var(--color-aura-red)' }}
                        onClick={() => {
                          setCampaignToDelete(campaign.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 text-red-200 hover:text-aura-red hover:bg-aura-red/5 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone Number</span>
                    <span className="text-[10px] font-black text-gray-900 tracking-wider font-mono">{campaign.phone_number || 'UNKNOWN'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Current Status</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                      campaign.status === 'ACTIVE' ? "bg-aura-green/10 text-aura-green" : "bg-gray-100 text-gray-500"
                    )}>
                      {campaign.status}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Contacts</p>
                    <p className="text-xl font-black text-gray-900 tracking-tighter leading-none">1,284</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Success Rate</p>
                    <p className="text-xl font-black text-aura-red tracking-tighter leading-none">12.4%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {campaigns.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border-2 border-dashed border-gray-100 text-center">
            {loading ? <div className="anime-sharingan-spinner mx-auto" /> : <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Campaigns Found</p>}
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Campaign Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    <option value="COLD_CALLING">Cold Calling</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="PROMOTIONAL">Promotional</option>
                    <option value="SURVEY">Survey</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                  <input type="text" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-aura-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Discard</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-aura-red/20">
                    {editingCampaign ? 'Save Changes' : 'Launch Campaign'}
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
        title="Cease Fire?"
        message="This will dissolve the campaign permanently. The warriors will be scattered."
      />
    </div>
  );
}
