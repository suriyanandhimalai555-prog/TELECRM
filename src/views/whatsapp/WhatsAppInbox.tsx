import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, MessageSquare, Phone, Send, Check, CheckCheck, Filter, User, Clock, Circle, Smile, X, ChevronRight, RefreshCw, Paperclip, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../hooks/useSearch';
import { socket } from '../../services/socket';

interface Message {
  id: number;
  message_id: string;
  from_number: string;
  to_number: string;
  message_text: string;
  direction: 'inbound' | 'outbound';
  status: string;
  contact_name: string;
  timestamp: string;
  is_read: boolean;
}

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
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [resolvedContacts, setResolvedContacts] = useState<Set<string>>(new Set());

  const handleResolve = () => {
    if (!selectedContact) return;
    setResolvedContacts(prev => new Set([...prev, selectedContact.contact_number]));
    setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
    setSelectedContact(null);
    setMessages([]);
    setShowContactInfo(false);
  };

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
        components: []
      });
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      await fetchMessages(selectedContact.contact_number);
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
          api.put(`/whatsapp/mark-read/${currentContactNum}`).catch(() => {});
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

  // Socket listeners
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

  // Auto-refresh polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedContact) {
        fetchMessages(selectedContact.contact_number);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedContact]);

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
    setShowContactInfo(false);
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
    const messageText = input.trim();
    setInput('');
    setSending(true);
    try {
      await api.post('/whatsapp/send', {
        to: selectedContact.contact_number,
        message: messageText,
        contactName: selectedContact.contact_name
      });
      await fetchMessages(selectedContact.contact_number);
    } catch (err) {
      console.error('Failed to send message');
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTimeSince = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      {/* Left Sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={20} className="text-green-600" />
              WhatsApp
            </h2>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSyncTemplates}
                disabled={syncingTemplates}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Sync Templates"
              >
                <RefreshCw size={16} className={syncingTemplates ? 'animate-spin' : ''} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Filter"
              >
                <Filter size={16} />
              </motion.button>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <MessageSquare size={40} className="mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Messages will appear here</p>
            </div>
          ) : (
            conversations.map(conv => (
              <motion.div
                key={conv.contact_number}
                whileHover={{ backgroundColor: '#f9fafb' }}
                onClick={() => selectContact(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                  selectedContact?.contact_number === conv.contact_number ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(conv.contact_name || conv.contact_number)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {conv.contact_name || conv.contact_number}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {getTimeSince(conv.last_timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 flex-shrink-0 font-bold">
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
      {selectedContact ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Chat */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                  {getInitials(selectedContact.contact_name || selectedContact.contact_number)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {selectedContact.contact_name || selectedContact.contact_number}
                  </h3>
                  <p className="text-xs text-gray-400">{selectedContact.contact_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Timer */}
                <div className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 flex items-center gap-1">
                  <Clock size={12} />
                  {getTimeSince(selectedContact.last_timestamp)}
                </div>
                {/* Resolve Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResolve}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Check size={14} /> Resolve
                </motion.button>
                {/* Contact Info Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors ${
                    showContactInfo
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-700 hover:bg-gray-800 text-white'
                  }`}
                >
                  <User size={14} /> Contact Info
                </motion.button>
                {/* Template Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTemplateModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Send Template"
                >
                  <MoreVertical size={18} />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageSquare size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                (() => {
                  let lastDate = '';
                  return messages.map((msg) => {
                    const msgDate = formatDate(msg.timestamp);
                    const showDate = msgDate !== lastDate;
                    lastDate = msgDate;
                    return (
                      <div key={msg.message_id || msg.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-3">
                            <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200">
                              {msgDate}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            msg.direction === 'outbound'
                              ? 'bg-green-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.message_text}</p>
                            <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-xs ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                                {formatTime(msg.timestamp)}
                              </span>
                              {msg.direction === 'outbound' && (
                                msg.status === 'read'
                                  ? <CheckCheck size={12} className="text-blue-200" />
                                  : msg.status === 'delivered'
                                  ? <CheckCheck size={12} className="text-green-200" />
                                  : <Check size={12} className="text-green-200" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Smile size={20} />
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 border-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </motion.button>
              </form>
            </div>
          </div>

          {/* Contact Info Panel */}
          <AnimatePresence>
            {showContactInfo && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0"
              >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Contact Info</h3>
                  <button onClick={() => setShowContactInfo(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Avatar */}
                  <div className="flex flex-col items-center pt-2">
                    <div className="w-20 h-20 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-2xl mb-3">
                      {getInitials(selectedContact.contact_name || selectedContact.contact_number)}
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">
                      {selectedContact.contact_name || 'Unknown'}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{selectedContact.contact_number}</p>
                  </div>

                  {/* Info Cards */}
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Phone Number</p>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-green-600" />
                        <p className="text-sm font-semibold text-gray-900">+{selectedContact.contact_number}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Last Seen</p>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-green-600" />
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedContact.last_timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Messages</p>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-green-600" />
                        <p className="text-sm font-semibold text-gray-900">{messages.length} messages</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <Circle size={14} className="text-green-500 fill-green-500" />
                        <p className="text-sm font-semibold text-green-600">Active</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleResolve}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} /> Mark as Resolved
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowTemplateModal(true)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <ChevronRight size={16} /> Send Template
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
          <MessageSquare size={64} className="mb-4 opacity-20" />
          <h3 className="text-xl font-semibold text-gray-500 mb-2">Select a conversation</h3>
          <p className="text-sm text-gray-400">Choose from your existing conversations or start a new one</p>
        </div>
      )}

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 text-lg">Send Template</h3>
                <button onClick={() => setShowTemplateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No templates found.</p>
                    <button onClick={handleSyncTemplates} className="mt-2 text-sm text-green-600 hover:underline">
                      Sync Templates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                          selectedTemplate?.id === t.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.language}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{t.category}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendTemplate}
                  disabled={!selectedTemplate || sending}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {sending ? 'Sending...' : 'Send Template'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}