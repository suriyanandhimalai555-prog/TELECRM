import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Search, Trash2 } from 'lucide-react';

interface StateNote {
  id: number;
  content: string;
  type: string;
  lead_id: number | null;
  lead_name?: string;
  user_name?: string;
  created_at: string;
}

interface LeadOption { id: number; name: string; }

const CATEGORIES = ['FOLLOW_UP', 'WHATSAPP'];

export default function StateNotes() {
  const { user } = useOutletContext<{ user: any }>();
  const [notes, setNotes] = useState<StateNote[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadId, setLeadId] = useState('');
  const [category, setCategory] = useState('FOLLOW_UP');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/notes');
      setNotes(res.data.notes || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    stateApi.get('/leads').then(res => setLeads(res.data.leads || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await stateApi.post('/notes', { content, type: category, lead_id: leadId || null });
      setContent('');
      fetchNotes();
    } catch {
      alert('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stateApi.delete(`/notes/${id}`);
      fetchNotes();
    } catch { }
  };

  const filteredNotes = notes.filter(n =>
    !searchTerm || n.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Notes <span className="text-blue-500">Archive</span></h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Recording state team interactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 h-fit">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Add New Note</h2>
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Relate to Lead</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
              <option value="">General Note</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${category === c ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                  {c.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Note Content</label>
            <textarea rows={5} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
          </div>
          <button onClick={handleSave} disabled={!content.trim() || saving}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg focus:outline-none transition-all text-xs font-bold"
              />
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12 text-[10px] font-black text-gray-300 uppercase">Loading...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-[10px] font-black text-gray-300 uppercase bg-white rounded-xl border border-gray-100">No notes found</div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{note.type.replace('_', '-')}</span>
                      {note.lead_name && <span className="text-[9px] font-bold text-gray-400 uppercase">{note.lead_name}</span>}
                    </div>
                    <button onClick={() => handleDelete(note.id)} className="text-blue-200 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-700">{note.content}</p>
                  <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase">{note.user_name || 'Unknown'} · {new Date(note.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
