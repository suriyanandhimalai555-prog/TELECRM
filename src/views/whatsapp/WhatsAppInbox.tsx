import { useState, useEffect, useRef } from 'react';
import {
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
  ShieldAlert
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

  useEffect(() => {
    fetchConversations();
    
    // Listen for new messages
    socket.on('whatsapp:message', (newMsg: Message) => {
      // Update conversations list (move to top / update last message / unread count)
      setConversations(prev => {
        const contactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
        const existing = prev.find(c => c.contact_number === contactNum);
        
        let newUnreadCount = (existing?.unread_count || 0);
        if (newMsg.direction === 'inbound' && selectedContact?.contact_number !== contactNum) {
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

      // Update current messages if this message belongs to the selected contact
      if (selectedContact) {
        const currentContactNum = selectedContact.contact_number;
        const msgContactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
        
        if (msgContactNum === currentContactNum) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.message_id === newMsg.message_id)) return prev;
            return [...prev, newMsg];
          });
          // Automatically mark as read if chat is open
          if (newMsg.direction === 'inbound') {
            api.put(`/whatsapp/mark-read/${currentContactNum}`).catch(err => console.error('Auto mark read failed'));
          }
        }
      }
    });

    // Listen for read status
    socket.on('whatsapp:read', ({ phone }: { phone: string }) => {
      setConversations(prev => prev.map(c => 
        c.contact_number === phone ? { ...c, unread_count: 0 } : c
      ));
    });

    // Listen for status updates
    socket.on('whatsapp:status', ({ message_id, status }: { message_id: string, status: string }) => {
      setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, status } : m));
      setConversations(prev => prev.map(c => {
        // This is a bit tricky since we don't know which conversation own the message_id easily
        // but we can just update those where last_message might match or just rely on the next fetch
        // For simplicity, we can just fetch conversations again if a status happens, 
        // or just let it be since status is more critical for the chat view than the sidebar.
        return c;
      }));
    });

    return () => {
      socket.off('whatsapp:message');
      socket.off('whatsapp:status');
    };
  }, [selectedContact]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.contact_number);
    }
  }, [selectedContact]);

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

  useEffect(() => {
    fetchConversations();
  }, [searchTerm]);

  const fetchConversations = async () => {
    try {
      const res = await api.get(`/whatsapp/conversations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages');
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
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden anime-aura-glow">
      {/* Sidebar - Contacts List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Whats <span className="text-aura-red">Up</span></h2>
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
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Frequencies...</p>
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
            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Pulse Channel <span className="text-aura-red">Inactive</span></h3>
            <p className="max-w-xs text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed">
              Select a dimensional frequency from the sidebar to begin cross-channel transmission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
