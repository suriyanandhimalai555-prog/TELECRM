import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus,
  Search,
  MessageSquare,
  Phone,
  MoreVertical,
  Send,
  Check,
  CheckCheck,
  Filter,
  User,
  Clock,
  Info,
  Circle,
  Smile,
  Paperclip,
  RotateCcw,
  ChevronDown,
  Settings as SettingsIcon,
  ShieldAlert,
  Layout,
  RefreshCw,
  X,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import { socket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';

interface Conversation {
  contact_number: string;
  contact_name: string;
  last_message: string;
  last_timestamp: string;
  last_direction: 'inbound' | 'outbound';
  last_status: string;
  unread_count: number;
}

interface WhatsAppTemplate {
  id: number;
  name: string;
  category: string;
  language: string;
  components: any;
  status: string;
}

export default function WhatsAppInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { searchTerm, setSearchTerm } = useSearch();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to fetch templates');
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get(`/whatsapp/conversations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages');
    }
  }, []);

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      await api.post('/whatsapp/templates/sync');
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to sync templates');
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedContact || sending) return;
    setSending(true);
    try {
      await api.post('/whatsapp/templates/send', {
        to: selectedContact.contact_number,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        components: [] // Basic template for now
      });
      setShowTemplateModal(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const handleMessage = useCallback((newMsg: Message) => {
    setConversations(prev => {
      const contactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
      const existing = prev.find(c => c.contact_number === contactNum);
      
      let newUnreadCount = (existing?.unread_count || 0);
      if (newMsg.direction === 'inbound' && (selectedContact === null || selectedContact.contact_number !== contactNum)) {
        newUnreadCount += 1;
      }

      const updatedConv: Conversation = {
        contact_number: contactNum,
        contact_name: newMsg.contact_name || existing?.contact_name || '',
        last_message: newMsg.message_text,
        last_timestamp: newMsg.timestamp,
        last_direction: newMsg.direction,
        last_status: newMsg.status,
        unread_count: newUnreadCount
      };

      const others = prev.filter(c => c.contact_number !== contactNum);
      return [updatedConv, ...others];
    });

    if (selectedContact) {
      const currentContactNum = selectedContact.contact_number;
      const msgContactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
      
      if (msgContactNum === currentContactNum) {
        setMessages(prev => {
          if (prev.some(m => m.message_id === newMsg.message_id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.direction === 'inbound') {
          api.put(`/whatsapp/mark-read/${currentContactNum}`).catch(err => console.error('Auto mark read failed'));
        }
      }
    }
  }, [selectedContact]);

  const handleRead = useCallback(({ phone }: { phone: string }) => {
    setConversations(prev => prev.map(c => c.contact_number === phone ? { ...c, unread_count: 0 } : c));
  }, []);

  const handleStatus = useCallback(({ message_id, status }: { message_id: string, status: string }) => {
    setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, status } : m));
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    
    socket.on('whatsapp:message', handleMessage);
    socket.on('whatsapp:read', handleRead);
    socket.on('whatsapp:status', handleStatus);

    return () => {
      socket.off('whatsapp:message', handleMessage);
      socket.off('whatsapp:read', handleRead);
      socket.off('whatsapp:status', handleStatus);
    };
  }, [fetchConversations, fetchTemplates, handleMessage, handleRead, handleStatus]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.contact_number);
    }
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectContact = async (conv: Conversation) => {
    setSelectedContact(conv);
    if (conv.unread_count > 0) {
      try {
        await api.put(`/whatsapp/mark-read/${conv.contact_number}`);
        setConversations(prev => prev.map(c => 
          c.contact_number === conv.contact_number ? { ...c, unread_count: 0 } : c
        ));
      } catch (err) {
        console.error('Failed to mark as read');
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !selectedContact || sending) return;

    setSending(true);
    const text = input;
    setInput('');

    try {
      await api.post('/whatsapp/send', {
        to: selectedContact.contact_number,
        message: text,
        contactName: selectedContact.contact_name
      });
      // socket listener will handle the UI update instantly
    } catch (err) {
      console.error('Failed to send pulse');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_number.includes(searchTerm)
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const StatusIcon = ({ status, direction }: { status: string, direction: string }) => {
    if (direction === 'inbound') return null;
    switch (status) {
      case 'read': return <CheckCheck size={14} className="text-aura-red" />;
      case 'delivered': return <CheckCheck size={14} className="text-gray-400" />;
      case 'sent': return <Check size={14} className="text-gray-400" />;
      default: return null;
    }
  };

  const hasKeys = user?.whatsapp_token && user?.whatsapp_phone_id;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden ui-aura-glow">
      {/* Sidebar - Contacts List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Whats <span className="text-aura-red">App</span></h2>
            <div className="flex items-center space-x-2">
               <motion.button whileHover={{ scale: 1.1 }} className="p-2 text-gray-400 hover:text-aura-red transition-colors">
                  <Filter size={18} />
               </motion.button>
               <motion.button whileHover={{ scale: 1.1 }} className="p-2 text-gray-400 hover:text-aura-red transition-colors">
                  <MoreVertical size={18} />
               </motion.button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:border-aura-red rounded-xl focus:outline-none text-xs font-bold transition-all text-gray-900"
            />
          </div>
        </div>

        {/* Contacts Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-8 h-8 border-4 border-aura-red/20 border-t-aura-red rounded-full animate-spin mx-auto" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading messages...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Transmissions Found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <motion.div 
                key={conv.contact_number}
                whileHover={{ x: 4 }}
                onClick={() => selectContact(conv)}
                className={cn(
                  "p-5 flex items-center space-x-4 cursor-pointer transition-all border-b border-gray-50 relative group",
                  selectedContact?.contact_number === conv.contact_number ? "bg-white border-l-4 border-l-aura-red shadow-sm" : "hover:bg-white"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg group-hover:scale-105 transition-transform",
                    conv.last_direction === 'inbound' ? "bg-aura-red shadow-lg shadow-aura-red/20" : "bg-gray-400"
                  )}>
                    {conv.contact_name?.[0]?.toUpperCase() || conv.contact_number.slice(-1)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-black text-gray-900 truncate uppercase mt-0.5">{conv.contact_name || conv.contact_number}</h4>
                    <span className="text-[9px] font-black text-gray-400 uppercase">{formatTime(conv.last_timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-gray-500 truncate leading-none flex items-center max-w-[80%]">
                      {conv.last_direction === 'outbound' && <span className="mr-1"><StatusIcon status={conv.last_status} direction={conv.last_direction} /></span>}
                      {conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-aura-red text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#F8F9FA]">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden text-aura-red/30">
                   <User size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-none mb-1">{selectedContact.contact_name || selectedContact.contact_number}</h3>
                  <div className="text-[12px] font-medium text-gray-500">
                    {selectedContact.contact_number}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-[12px] font-bold border border-gray-200">
                  23h
                </div>
                <motion.button whileHover={{ scale: 1.05 }} className="bg-aura-red text-white px-5 py-2 rounded-lg text-[12px] font-bold flex items-center shadow-sm">
                  <Check size={16} className="mr-2" /> Resolve
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} className="bg-aura-red text-white px-5 py-2 rounded-lg text-[12px] font-bold flex items-center shadow-sm">
                  <Circle size={16} className="mr-2 fill-white" /> Contact Info
                </motion.button>
                <button className="p-2 text-gray-400 hover:text-aura-red transition-colors ml-4">
                  <Search size={22} />
                </button>
                <button className="p-2 text-gray-400 hover:text-aura-red transition-colors">
                  <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs">AP</span>
                </button>
              </div>
            </div>

            {/* Messages Display Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-red-50/20">
               <AnimatePresence initial={false}>
                  {messages.map((m, i) => {
                    const isOut = m.direction === 'outbound';
                    
                    return (
                      <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "max-w-[70%] p-3 px-4 rounded-lg shadow-sm relative group",
                            isOut 
                              ? "bg-aura-red text-white rounded-tr-none" 
                              : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                          )}
                        >
                             <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.message_text}</div>
                             <div className="flex items-center justify-end mt-1 space-x-1">
                                <span className={cn("text-[10px]", isOut ? "text-red-100" : "text-gray-500")}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                                {isOut && <StatusIcon status={m.status} direction={m.direction} />}
                             </div>
                             {/* Triangle arrow for bubbles */}
                             <div className={cn(
                               "absolute top-0 w-3 h-3",
                               isOut ? "-right-2 bg-aura-red [clip-path:polygon(0_0,0_100%,100%_0)]" : "-left-2 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]"
                             )} />
                        </motion.div>
                      </div>
                    );
                  })}
               </AnimatePresence>
               <div ref={chatEndRef} />
            </div>

            {/* Message Input Container */}
            <div className="p-4 bg-[#f0f2f5] border-t border-gray-200 relative">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                 <div className="flex items-center space-x-3 text-gray-500 px-2">
                    <button type="button" onClick={() => setShowTemplateModal(true)} className="hover:text-aura-red transition-colors" title="Templates">
                      <Layout size={24} />
                    </button>
                    <button type="button" className="hover:text-aura-red transition-colors">
                      <Smile size={24} />
                    </button>
                    <button type="button" className="hover:text-aura-red transition-colors">
                      <Paperclip size={24} className="rotate-45" />
                    </button>
                    <button type="button" className="hover:text-aura-red transition-colors">
                      <RotateCcw size={24} />
                    </button>
                 </div>
                 <div className="flex-1 bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                    <textarea 
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                         }
                      }}
                      placeholder="Type a message"
                      className="w-full bg-white px-4 py-4 text-[15px] focus:outline-none resize-none transition-all text-gray-900 custom-scrollbar"
                    />
                 </div>
                 <motion.button 
                   type="submit"
                   whileTap={{ scale: 0.95 }}
                   disabled={!input.trim() || sending}
                   className="text-gray-500 hover:text-aura-red transition-colors px-2"
                 >
                   <ChevronDown size={32} />
                 </motion.button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 bg-gray-100 rounded-[3rem] flex items-center justify-center text-gray-300 mb-8 transform rotate-12">
               <MessageSquare size={64} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Inbox <span className="text-aura-red">Inactive</span></h3>
            <p className="max-w-xs text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed">
              Select a conversation from the sidebar to start messaging.
            </p>
          </div>
        )}
      </div>
      
      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowTemplateModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden relative z-10 border border-gray-100 flex flex-col"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                   <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Message <span className="text-aura-red">Templates</span></h3>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Select a pre-approved message template</p>
                </div>
                <div className="flex items-center space-x-3">
                   <motion.button 
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={handleSyncTemplates}
                     disabled={syncingTemplates}
                     className="flex items-center px-4 py-2 bg-white border border-aura-red/20 rounded-xl text-[10px] font-black text-aura-red hover:bg-aura-red/5 uppercase tracking-widest disabled:opacity-50"
                   >
                     <RefreshCw size={14} className={cn("mr-2", syncingTemplates && "animate-spin")} />
                     {syncingTemplates ? 'Syncing...' : 'Sync Meta'}
                   </motion.button>
                   <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                     <X size={24} />
                   </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Template List */}
                 <div className="w-full md:w-1/2 border-r border-gray-100 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {templates.length === 0 ? (
                      <div className="text-center py-12">
                         <Layout size={48} className="mx-auto text-gray-200 mb-4" />
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No templates available</p>
                      </div>
                    ) : (
                      templates.map((tpl) => (
                        <motion.div 
                          key={tpl.id}
                          whileHover={{ x: 4 }}
                          onClick={() => setSelectedTemplate(tpl)}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer group",
                            selectedTemplate?.id === tpl.id 
                              ? "bg-aura-red/5 border-aura-red shadow-sm" 
                              : "bg-white border-gray-100 hover:border-aura-red/30"
                          )}
                        >
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black text-aura-red uppercase tracking-widest px-2 py-0.5 bg-aura-red/10 rounded-md">{tpl.category}</span>
                              <span className="text-[9px] font-black text-gray-400 uppercase">{tpl.language}</span>
                           </div>
                           <h4 className="text-xs font-black text-gray-900 uppercase">{tpl.name}</h4>
                           <div className="mt-2 flex items-center text-[8px] font-black text-gray-400 uppercase tracking-widest">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full mr-2",
                                tpl.status === 'APPROVED' ? "bg-green-500" : "bg-yellow-500"
                              )} />
                              {tpl.status}
                           </div>
                        </motion.div>
                      ))
                    )}
                 </div>

                 {/* Preview Area */}
                 <div className="flex-1 bg-gray-50/50 p-8 flex flex-col">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                       <Eye size={14} className="mr-2" /> Message Preview
                    </h4>
                    
                    <div className="flex-1 flex items-center justify-center">
                       {selectedTemplate ? (
                         <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ui-aura-glow p-6">
                            {selectedTemplate.components?.map((comp: any, idx: number) => (
                              <div key={idx} className="mb-4 last:mb-0">
                                 {comp.type === 'HEADER' && comp.format === 'TEXT' && (
                                   <div className="text-sm font-black text-gray-900 mb-2 uppercase italic">{comp.text}</div>
                                 )}
                                 {comp.type === 'BODY' && (
                                   <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{comp.text}</div>
                                 )}
                                 {comp.type === 'FOOTER' && (
                                   <div className="text-[10px] text-gray-400 mt-2 italic">{comp.text}</div>
                                 )}
                                 {comp.type === 'BUTTONS' && (
                                   <div className="mt-4 space-y-2">
                                      {comp.buttons.map((btn: any, bIdx: number) => (
                                        <div key={bIdx} className="w-full py-2 bg-gray-50 text-aura-red text-[10px] font-black uppercase text-center rounded-lg border border-gray-100 cursor-not-allowed">
                                           {btn.text}
                                        </div>
                                      ))}
                                   </div>
                                 )}
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="text-center">
                            <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a frequency profile</p>
                         </div>
                       )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                       <motion.button 
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         disabled={!selectedTemplate || sending}
                         onClick={handleSendTemplate}
                         className="flex items-center px-8 py-3 bg-aura-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-aura-red/20 disabled:opacity-50 disabled:grayscale transition-all"
                       >
                         <Send size={16} className="mr-3" />
                         {sending ? 'Sending...' : 'Send Message'}
                       </motion.button>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
