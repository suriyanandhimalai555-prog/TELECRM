import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Note, Lead } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Clock, 
  Search,
  Save,
  Check,
  RefreshCw,
  Zap,
  BookOpen
} from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';
import { cn } from '../../lib/utils';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchTerm, setSearchTerm } = useSearch();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [flash, setFlash] = useState<'white' | 'red' | null>(null);
  const [newNote, setNewNote] = useState<{
    content: string;
    lead_id: string;
    type: 'FOLLOW_UP' | 'WHATSAPP';
  }>({ content: '', lead_id: '', type: 'FOLLOW_UP' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();

  const triggerFlash = (type: 'white' | 'red') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  };

  const fetchNotes = useCallback(async (search?: string) => {
    try {
      const res = await api.get('/notes', { params: { search } });
      setNotes(res.data);
    } catch (error) {
      console.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchNotes, searchTerm]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim()) return;

    setSaving(true);
    try {
      await api.post('/notes', {
        content: newNote.content,
        lead_id: newNote.lead_id ? Number(newNote.lead_id) : null,
        type: newNote.type
      });
      setNewNote({ content: '', lead_id: '', type: 'FOLLOW_UP' });
      setSaved(true);
      triggerFlash('white');
      setTimeout(() => setSaved(false), 2000);
      fetchNotes();
    } catch (error) {
      console.error('Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;
    try {
      await api.delete(`/notes/${noteToDelete}`);
      triggerFlash('red');
      fetchNotes();
    } catch (error) {
      console.error('Failed to delete note');
    }
  };

  const filteredNotes = Array.isArray(notes) ? notes : [];

  return (
    <div className="h-full flex flex-col space-y-8 relative">
      {flash === 'white' && <div className="ui-screen-flash" />}
      {flash === 'red' && <div className="ui-screen-flash bg-aura-red/30" />}

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-4xl font-black text-gray-900 border-l-8 border-aura-red pl-4 uppercase italic tracking-tighter">Notes <span className="text-aura-red">Archive</span></h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-2 italic px-5 leading-none">Recording the ancient echoes of interaction</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Note Creation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-1 space-y-6"
        >
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 ui-aura-glow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 bg-aura-red/5 rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
            
            <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center uppercase italic border-b border-gray-100 pb-4">
              <Plus size={24} className="mr-3 text-aura-red" />
              Add New Note
            </h3>
            <form onSubmit={handleCreateNote} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Relate to Lead</label>
                <select 
                  value={newNote.lead_id}
                  onChange={(e) => setNewNote({...newNote, lead_id: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 focus:border-aura-red rounded-xl focus:outline-none text-sm font-bold uppercase transition-all text-gray-900"
                >
                  <option value="">General Note</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.contact_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewNote({...newNote, type: 'FOLLOW_UP'})}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all italic",
                      newNote.type === 'FOLLOW_UP' 
                        ? "bg-aura-red text-white border-aura-red shadow-lg shadow-aura-red/20 scale-105" 
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-aura-red/30"
                    )}
                  >
                    Follow-up
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewNote({...newNote, type: 'WHATSAPP'})}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all italic",
                      newNote.type === 'WHATSAPP' 
                        ? "bg-aura-green text-white border-aura-green shadow-lg shadow-aura-green/20 scale-105" 
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-aura-green/30"
                    )}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Note Content</label>
                <textarea 
                  required
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  placeholder="Inscribe your thoughts..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 focus:border-aura-red rounded-xl focus:outline-none h-48 resize-none text-sm font-bold placeholder:text-gray-400 transition-all text-gray-900"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center py-4 px-6 bg-aura-red text-white rounded-xl font-black uppercase italic text-xs tracking-[0.2em] shadow-lg shadow-aura-red/20 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin mr-3" />
                ) : saved ? (
                  <Check size={18} className="mr-3" />
                ) : (
                  <Save size={18} className="mr-3" />
                )}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Note'}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Notes List */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center group ui-aura-glow"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aura-red transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none text-sm font-black italic text-gray-900 placeholder-gray-400 transition-all"
              />
            </div>
            <div className="ml-4 p-2 bg-gray-50 rounded-xl text-gray-400 border border-gray-100">
               < BookOpen size={20} />
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
            <AnimatePresence>
              {filteredNotes.map((note, index) => (
                <motion.div 
                  key={note.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:border-aura-red/20 transition-all ui-observation cursor-default relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-aura-red/5 group-hover:bg-aura-red/10 transition-colors" />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "p-4 rounded-[1.5rem] shadow-lg transform rotate-[-5deg] group-hover:rotate-0 transition-transform",
                        note.type === 'WHATSAPP' ? "bg-aura-green text-white" : "bg-aura-red text-white"
                      )}>
                        {note.type === 'WHATSAPP' ? <MessageSquare size={22} /> : <StickyNote size={22} />}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-gray-900 italic tracking-tighter uppercase leading-none">
                          {note.lead_name ? `Client: ${note.lead_name}` : 'General Resonance'}
                        </h4>
                        <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black mt-2 italic">
                          <Clock size={12} className="mr-2 text-aura-red" />
                          {new Date(note.created_at).toLocaleString()} • Observer {note.user_name}
                        </div>
                      </div>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || note.user_id === user?.id) && (
                      <motion.button 
                        whileHover={{ scale: 1.2, color: 'var(--color-aura-red)', rotate: 15 }}
                        onClick={() => {
                          setNoteToDelete(note.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-3 text-gray-300 hover:bg-aura-red/5 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-0 top-0 w-1 h-full bg-gray-100 rounded-full" />
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-[1.8] font-bold italic pl-6">
                      {note.content}
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-end space-x-2">
                     <Zap size={14} className="text-aura-red/20" />
                     <span className="text-[9px] font-black text-gray-300 uppercase italic tracking-widest">Energy Stabilized</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredNotes.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 bg-gray-50/30 rounded-[3rem] border-4 border-dashed border-gray-100">
                {loading ? (
                  <div className="ui-standard-spinner" />
                ) : (
                  <>
                    <Zap size={48} className="text-gray-100 mb-4" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic leading-none">The Void Reflects Nothingness</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Banish Wisdom?"
        message="This inscription will be burned from the eternal records. Proceed?"
      />
    </div>
  );
}
