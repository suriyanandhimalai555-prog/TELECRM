import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { getStateSocket, disconnectStateSocket } from '../../services/stateSocket';
import { Send, Plus, X, Trash2, Settings, MessageSquare, Check, CheckCheck } from 'lucide-react';

interface WhatsappNumber {
  id: number;
  label: string;
  phone_number: string;
  phone_number_id: string;
  waba_id: string;
  state_head_user_id: number;
  state_head_name?: string;
  status: string;
  created_at: string;
}
interface Conversation {
  phone_number_id: string;
  contact_number: string;
  contact_name: string;
  last_message: string;
  last_timestamp: string;
  last_direction: string;
  last_status: string;
}
interface Message {
  id: number;
  phone_number_id: string;
  message_id: string;
  from_number: string;
  to_number: string;
  contact_name: string;
  message_text: string;
  media_type: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  timestamp: string;
}

const emptyNumberForm = { label: '', phone_number: '', phone_number_id: '', waba_id: '', access_token: '', state_head_user_id: '' };

export default function StateWhatsApp() {
  const { user } = useOutletContext<{ user: any }>();
  const isAdmin = user.role === 'master' || user.role === 'admin';

  const [view, setView] = useState<'inbox' | 'numbers'>('inbox');
  const [numbers, setNumbers] = useState<WhatsappNumber[]>([]);
  const [stateHeads, setStateHeads] = useState<{ id: number; name: string }[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [numberForm, setNumberForm] = useState(emptyNumberForm);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await stateApi.get('/whatsapp/numbers');
      setNumbers(res.data || []);
    } catch { }
  }, []);

  const fetchStateHeads = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await stateApi.get('/auth/users');
      setStateHeads((res.data.users || []).filter((u: any) => u.role === 'state_head').map((u: any) => ({ id: u.id, name: u.name })));
    } catch { }
  }, [isAdmin]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/whatsapp/conversations');
      setConversations(res.data.conversations || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async (phoneNumberId: string, contact: string) => {
    try {
      const res = await stateApi.get(`/whatsapp/history/${phoneNumberId}/${contact}`);
      setMessages(res.data.messages || []);
    } catch { }
  }, []);

  useEffect(() => { fetchNumbers(); fetchStateHeads(); fetchConversations(); }, [fetchNumbers, fetchStateHeads, fetchConversations]);

  // Real-time
  useEffect(() => {
    const socket = getStateSocket();
    const onMessage = (msg: Message) => {
      setConversations(prev => {
        const contactNum = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
        const existing = prev.find(c => c.phone_number_id === msg.phone_number_id && c.contact_number === contactNum);
        const updated: Conversation = {
          phone_number_id: msg.phone_number_id,
          contact_number: contactNum,
          contact_name: msg.contact_name || existing?.contact_name || contactNum,
          last_message: msg.message_text,
          last_timestamp: msg.timestamp,
          last_direction: msg.direction,
          last_status: msg.status,
        };
        return [updated, ...prev.filter(c => !(c.phone_number_id === msg.phone_number_id && c.contact_number === contactNum))];
      });
      setSelected(current => {
        if (current) {
          const contactNum = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
          if (current.phone_number_id === msg.phone_number_id && current.contact_number === contactNum) {
            setMessages(prev => prev.some(m => m.message_id === msg.message_id) ? prev : [...prev, msg]);
          }
        }
        return current;
      });
    };
    const onStatus = ({ message_id, status }: { message_id: string; status: string }) => {
      setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, status } : m));
    };
    socket.on('state-whatsapp:message', onMessage);
    socket.on('state-whatsapp:status', onStatus);
    return () => {
      socket.off('state-whatsapp:message', onMessage);
      socket.off('state-whatsapp:status', onStatus);
    };
  }, []);

  useEffect(() => () => { disconnectStateSocket(); }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setSelected(conv);
    await fetchHistory(conv.phone_number_id, conv.contact_number);
    try { await stateApi.put(`/whatsapp/read/${conv.phone_number_id}/${conv.contact_number}`); } catch { }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    setError('');
    try {
      await stateApi.post('/whatsapp/send', { phone_number_id: selected.phone_number_id, to: selected.contact_number, text: input });
      setInput('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await stateApi.post('/whatsapp/numbers', numberForm);
      setNumberForm(emptyNumberForm);
      setShowAddNumber(false);
      fetchNumbers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add number');
    }
  };

  const handleDeleteNumber = async (id: number) => {
    try {
      await stateApi.delete(`/whatsapp/numbers/${id}`);
      fetchNumbers();
    } catch { }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'read') return <CheckCheck size={13} className="text-blue-500" />;
    if (status === 'delivered') return <CheckCheck size={13} className="text-gray-400" />;
    if (status === 'sent') return <Check size={13} className="text-gray-400" />;
    return null;
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">
          Whats<span className="text-blue-500">App</span>
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button onClick={() => setView('inbox')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'inbox' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400'}`}>
              Inbox
            </button>
            <button onClick={() => setView('numbers')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'numbers' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400'}`}>
              <Settings size={12} /> Numbers
            </button>
          </div>
        )}
      </div>

      {view === 'numbers' && isAdmin ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">WhatsApp Numbers</h2>
            <button onClick={() => setShowAddNumber(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] px-3 py-2 rounded-xl transition-colors">
              <Plus size={14} /> Add Number
            </button>
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold">{error}</div>}
          <div className="divide-y divide-gray-50">
            {numbers.length === 0 && <p className="text-[10px] font-black text-gray-300 uppercase py-8 text-center">No numbers added yet</p>}
            {numbers.map(n => (
              <div key={n.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-black text-gray-900">{n.label} — {n.phone_number}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                    Assigned to: {n.state_head_name || `User #${n.state_head_user_id}`}
                  </p>
                </div>
                <button onClick={() => handleDeleteNumber(n.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-220px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0">
            <div className="p-4 border-b border-gray-100 bg-white">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="text-[10px] font-black text-gray-300 uppercase text-center py-10">Loading...</p>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 gap-3">
                  <MessageSquare size={28} className="text-gray-200" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                    {numbers.length === 0 ? 'No WhatsApp number assigned to you yet' : 'No conversations yet'}
                  </p>
                </div>
              ) : conversations.map(c => (
                <div key={`${c.phone_number_id}:${c.contact_number}`} onClick={() => selectConversation(c)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${selected?.contact_number === c.contact_number && selected?.phone_number_id === c.phone_number_id ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-black text-gray-900 truncate">{c.contact_name || c.contact_number}</span>
                    <span className="text-[9px] text-gray-400 shrink-0 ml-2">{formatTime(c.last_timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">{c.last_message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {selected ? (
              <>
                <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                  <h3 className="text-sm font-black text-gray-900">{selected.contact_name || selected.contact_number}</h3>
                  <p className="text-[10px] text-gray-400">{selected.contact_number}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[65%] p-3 rounded-2xl text-sm ${m.direction === 'outbound' ? 'bg-blue-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'}`}>
                        <p>{m.message_text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {formatTime(m.timestamp)}
                          {m.direction === 'outbound' && <StatusIcon status={m.status} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {error && <div className="bg-red-50 border-t border-red-100 text-red-600 px-4 py-2 text-xs font-bold">{error}</div>}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  <button type="submit" disabled={!input.trim() || sending}
                    className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors">
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-300">
                <p className="text-[10px] font-black uppercase tracking-widest">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddNumber && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900">Add WhatsApp Number</h2>
              <button onClick={() => { setShowAddNumber(false); setError(''); }} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>}
            <form onSubmit={handleAddNumber} className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Label</label>
                <input required value={numberForm.label} onChange={e => setNumberForm({ ...numberForm, label: e.target.value })}
                  placeholder="e.g. Karnataka Team"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Phone Number</label>
                <input required value={numberForm.phone_number} onChange={e => setNumberForm({ ...numberForm, phone_number: e.target.value })}
                  placeholder="+91 63668 41491"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Phone Number ID (Meta)</label>
                <input required value={numberForm.phone_number_id} onChange={e => setNumberForm({ ...numberForm, phone_number_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">WABA ID (Meta)</label>
                <input required value={numberForm.waba_id} onChange={e => setNumberForm({ ...numberForm, waba_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Access Token (Meta)</label>
                <input required type="password" value={numberForm.access_token} onChange={e => setNumberForm({ ...numberForm, access_token: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Assign to State Head</label>
                <select required value={numberForm.state_head_user_id} onChange={e => setNumberForm({ ...numberForm, state_head_user_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select a state head...</option>
                  {stateHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                {stateHeads.length === 0 && <p className="text-[10px] font-bold text-red-500 mt-1">No State Head users exist yet — create one first</p>}
              </div>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-colors">
                Add Number
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
