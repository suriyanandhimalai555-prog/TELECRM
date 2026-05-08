import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search,
  MessageSquare,
  MoreVertical,
  Send,
  Check,
  CheckCheck,
  Filter,
  User,
  Info,
  Smile,
  Paperclip,
  RotateCcw,
  ChevronDown,
  ShieldAlert,
  Layout,
  RefreshCw,
  X,
  Eye,
  FileText,
  Download,
  Image as ImageIcon,
  Music,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Tag,
  Clock,
  Star,
  Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { Message } from '../../types';
import { socket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

interface ContactInfo {
  contact_name: string;
  contact_number: string;
  email?: string;
  tags?: string;
  notes?: string;
  last_interaction?: string;
  media_count?: number;
}

type ParsedMessage =
  | { type: 'text';     text: string }
  | { type: 'image';    mediaId: string }
  | { type: 'document'; mediaId: string; filename: string; mimeType: string }
  | { type: 'audio';    mediaId: string }
  | { type: 'video';    mediaId: string }
  | { type: 'sticker';  mediaId: string }
  | { type: 'location'; lat: string; lng: string; name: string }
  | { type: 'reaction'; emoji: string; targetId: string };

function parseMessage(text: string): ParsedMessage {
  if (text.startsWith('[image:'))    return { type: 'image',    mediaId: text.slice(7, -1) };
  if (text.startsWith('[audio:'))    return { type: 'audio',    mediaId: text.slice(7, -1) };
  if (text.startsWith('[video:'))    return { type: 'video',    mediaId: text.slice(7, -1) };
  if (text.startsWith('[sticker:'))  return { type: 'sticker',  mediaId: text.slice(9, -1) };
  if (text.startsWith('[reaction:')) {
    const inner = text.slice(10, -1);
    const [emoji, targetId] = inner.split(':');
    return { type: 'reaction', emoji, targetId };
  }
  if (text.startsWith('[document:')) {
    const inner = text.slice(10, -1);
    const parts = inner.split(':');
    return { type: 'document', mediaId: parts[0], filename: parts[1] || 'document', mimeType: parts[2] || 'application/octet-stream' };
  }
  if (text.startsWith('[location:')) {
    const inner = text.slice(10, -1);
    const colonIdx = inner.indexOf(':');
    const coords = colonIdx > -1 ? inner.slice(0, colonIdx) : inner;
    const locName = colonIdx > -1 ? inner.slice(colonIdx + 1) : '';
    const [lat, lng] = coords.split(',');
    return { type: 'location', lat, lng, name: locName };
  }
  return { type: 'text', text };
}

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all flex items-center gap-1">
          {part}<ExternalLink size={10} className="inline shrink-0" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function mediaUrl(mediaId: string): string {
  return `https://telecrm-production.up.railway.app/api/whatsapp/media/${mediaId}`;
}

function MessageContent({ parsed, isOut }: { parsed: ParsedMessage; isOut: boolean }) {
  const [imgError, setImgError] = useState(false);
  const textColor = isOut ? 'text-white' : 'text-gray-800';

  switch (parsed.type) {
    case 'image':
      return imgError ? (
        <div className={cn("flex items-center gap-2 text-xs font-bold", textColor)}>
          <ImageIcon size={16} /> Image unavailable
        </div>
      ) : (
        <div className="relative group/img">
          <img src={mediaUrl(parsed.mediaId)} alt="Received image"
            className="max-w-[240px] max-h-[240px] rounded-lg object-cover cursor-pointer"
            onError={() => setImgError(true)}
            onClick={() => window.open(mediaUrl(parsed.mediaId), '_blank')} />
          <a href={mediaUrl(parsed.mediaId)} download
            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity" title="Download">
            <Download size={14} />
          </a>
        </div>
      );

    case 'document':
      return (
        <div onClick={() => window.open(mediaUrl(parsed.mediaId), '_blank')}
          className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
            isOut ? "bg-white/10 border-white/20 hover:bg-white/20 text-white" : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800")}>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isOut ? "bg-white/20" : "bg-aura-red/10")}>
            <FileText size={20} className={isOut ? "text-white" : "text-aura-red"} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("text-xs font-bold truncate", textColor)}>{parsed.filename}</div>
            <div className={cn("text-[10px] mt-0.5", isOut ? "text-white/60" : "text-gray-400")}>
              {parsed.mimeType.split('/')[1]?.toUpperCase() || 'FILE'} · Tap to download
            </div>
          </div>
          <Download size={16} className={isOut ? "text-white/70" : "text-gray-400"} />
        </div>
      );

    case 'audio':
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className={cn("flex items-center gap-2 text-xs font-bold mb-1", textColor)}>
            <Music size={14} /> Voice message
          </div>
          <audio controls src={mediaUrl(parsed.mediaId)} className="w-full h-8 accent-aura-red" style={{ minWidth: 200 }}>
            Your browser does not support audio.
          </audio>
        </div>
      );

    case 'video':
      return (
        <div className="relative group/vid">
          <video controls src={mediaUrl(parsed.mediaId)} className="max-w-[240px] max-h-[200px] rounded-lg">
            Your browser does not support video.
          </video>
          <a href={mediaUrl(parsed.mediaId)} download
            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover/vid:opacity-100 transition-opacity" title="Download">
            <Download size={14} />
          </a>
        </div>
      );

    case 'sticker':
      return (
        <img src={mediaUrl(parsed.mediaId)} alt="Sticker" className="w-24 h-24 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      );

    case 'reaction':
      return (
        <div className="flex items-center gap-2">
          <span className="text-2xl">{parsed.emoji}</span>
          <span className={cn("text-[10px]", isOut ? "text-white/60" : "text-gray-400")}>Reaction</span>
        </div>
      );

    case 'location': {
      const mapsUrl = `https://maps.google.com/?q=${parsed.lat},${parsed.lng}`;
      return (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
            isOut ? "bg-white/10 border-white/20 hover:bg-white/20 text-white" : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800")}>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isOut ? "bg-white/20" : "bg-aura-red/10")}>
            <MapPin size={20} className={isOut ? "text-white" : "text-aura-red"} />
          </div>
          <div className="min-w-0">
            <div className={cn("text-xs font-bold", textColor)}>{parsed.name || 'Shared Location'}</div>
            <div className={cn("text-[10px] mt-0.5", isOut ? "text-white/60" : "text-gray-400")}>
              {parsed.lat}, {parsed.lng} · Open in Maps
            </div>
          </div>
          <ExternalLink size={14} className={isOut ? "text-white/70" : "text-gray-400"} />
        </a>
      );
    }

    case 'text':
    default:
      return (
        <div className={cn("text-[14px] leading-relaxed whitespace-pre-wrap break-words", textColor)}>
          {linkifyText(parsed.text)}
        </div>
      );
  }
}

function previewMessage(text: string): string {
  if (text.startsWith('[image:'))    return '📷 Image';
  if (text.startsWith('[document:')) return '📄 Document';
  if (text.startsWith('[audio:'))    return '🎵 Voice message';
  if (text.startsWith('[video:'))    return '🎥 Video';
  if (text.startsWith('[sticker:'))  return '😊 Sticker';
  if (text.startsWith('[location:')) return '📍 Location';
  if (text.startsWith('[reaction:')) return '😀 Reaction';
  return text;
}

const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','😢','😡','🙏','💪','✅','⭐','💯','🤝','👋'];

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

  // Contact Info Panel
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loadingContactInfo, setLoadingContactInfo] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Filter dropdown
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'inbound' | 'outbound'>('all');

  // 3-dots menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [resolvedContacts, setResolvedContacts] = useState<string[]>([]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setShowEmojiPicker(false);
      setShowFilterMenu(false);
      setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchContactInfo = useCallback(async (conv: Conversation) => {
    setLoadingContactInfo(true);
    try {
      // Try to find lead info from leads endpoint
      const res = await api.get(`/leads?search=${encodeURIComponent(conv.contact_number)}`);
      const lead = res.data?.[0];
      const mediaCount = messages.filter(m => 
        m.message_text.startsWith('[image:') || 
        m.message_text.startsWith('[document:') || 
        m.message_text.startsWith('[video:')
      ).length;

      setContactInfo({
        contact_name: conv.contact_name || lead?.contact_name || 'Unknown',
        contact_number: conv.contact_number,
        email: lead?.email || '',
        tags: lead?.tags || '',
        notes: lead?.notes || '',
        last_interaction: conv.last_timestamp,
        media_count: mediaCount,
      });
    } catch {
      setContactInfo({
        contact_name: conv.contact_name || 'Unknown',
        contact_number: conv.contact_number,
        last_interaction: conv.last_timestamp,
        media_count: 0,
      });
    } finally {
      setLoadingContactInfo(false);
    }
  }, [messages]);

  const handleContactInfoClick = () => {
    if (!selectedContact) return;
    setShowContactInfo(true);
    fetchContactInfo(selectedContact);
  };

  const handleResolve = () => {
    if (!selectedContact) return;
    setResolvedContacts(prev => [...prev, selectedContact.contact_number]);
    setSelectedContact(null);
    setShowContactInfo(false);
    setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplates(res.data.templates || res.data || []);
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
      let newUnreadCount = existing?.unread_count || 0;
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
      return [updatedConv, ...prev.filter(c => c.contact_number !== contactNum)];
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
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedContact) fetchMessages(selectedContact.contact_number);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedContact]);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.contact_number);
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
      } catch {}
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
    } catch (err) {
      console.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.contact_number.includes(searchTerm);
    if (!matchesSearch) return false;
    if (filterMode === 'unread') return c.unread_count > 0;
    if (filterMode === 'inbound') return c.last_direction === 'inbound';
    if (filterMode === 'outbound') return c.last_direction === 'outbound';
    return true;
  });

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
      case 'read':      return <CheckCheck size={14} className="text-aura-red" />;
      case 'delivered': return <CheckCheck size={14} className="text-gray-400" />;
      case 'sent':      return <Check size={14} className="text-gray-400" />;
      default:          return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30 shrink-0">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Whats <span className="text-aura-red">App</span></h2>
            <div className="flex items-center space-x-1 relative">
              {/* Filter Button */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onMouseDown={(e) => { e.stopPropagation(); setShowFilterMenu(p => !p); setShowMoreMenu(false); }}
                  className={cn("p-2 transition-colors rounded-lg", showFilterMenu ? "text-aura-red bg-aura-red/10" : "text-gray-400 hover:text-aura-red")}
                >
                  <Filter size={18} />
                </motion.button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      onMouseDown={e => e.stopPropagation()}
                      className="absolute right-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-[180px] p-2 overflow-hidden"
                    >
                      {[
                        { key: 'all',      label: 'All Chats' },
                        { key: 'unread',   label: 'Unread Only' },
                        { key: 'inbound',  label: 'Received' },
                        { key: 'outbound', label: 'Sent' },
                      ].map(opt => (
                        <button key={opt.key}
                          onClick={() => { setFilterMode(opt.key as any); setShowFilterMenu(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-xs font-bold rounded-xl transition-all",
                            filterMode === opt.key ? "bg-aura-red text-white" : "text-gray-700 hover:bg-gray-50"
                          )}>
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* More Button */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onMouseDown={(e) => { e.stopPropagation(); setShowMoreMenu(p => !p); setShowFilterMenu(false); }}
                  className={cn("p-2 transition-colors rounded-lg", showMoreMenu ? "text-aura-red bg-aura-red/10" : "text-gray-400 hover:text-aura-red")}
                >
                  <MoreVertical size={18} />
                </motion.button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      onMouseDown={e => e.stopPropagation()}
                      className="absolute right-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-[180px] p-2 overflow-hidden"
                    >
                      {[
                        { label: '🔄 Refresh', action: () => { fetchConversations(); setShowMoreMenu(false); } },
                        { label: '📤 Export Chats', action: () => { setShowMoreMenu(false); } },
                        { label: '✅ Mark All Read', action: async () => {
                          for (const c of conversations.filter(x => x.unread_count > 0)) {
                            await api.put(`/whatsapp/mark-read/${c.contact_number}`).catch(() => {});
                          }
                          setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })));
                          setShowMoreMenu(false);
                        }},
                      ].map((item, i) => (
                        <button key={i} onClick={item.action}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
          {filterMode !== 'all' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-black text-aura-red bg-aura-red/10 px-3 py-1 rounded-full uppercase tracking-wider">
                Filter: {filterMode}
              </span>
              <button onClick={() => setFilterMode('all')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

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
                  selectedContact?.contact_number === conv.contact_number
                    ? "bg-white border-l-4 border-l-aura-red shadow-sm"
                    : "hover:bg-white"
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
                      {conv.last_direction === 'outbound' && (
                        <span className="mr-1"><StatusIcon status={conv.last_status} direction={conv.last_direction} /></span>
                      )}
                      {previewMessage(conv.last_message)}
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
      <div className="flex-1 flex flex-col bg-[#F8F9FA] min-w-0">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-aura-red/10 rounded-full flex items-center justify-center text-aura-red font-black text-lg">
                  {selectedContact.contact_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-none mb-1">
                    {selectedContact.contact_name || selectedContact.contact_number}
                  </h3>
                  <div className="text-[12px] font-medium text-gray-500">{selectedContact.contact_number}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-[12px] font-bold border border-gray-200">
                  23h
                </div>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleResolve}
                  className="bg-aura-red text-white px-5 py-2 rounded-lg text-[12px] font-bold flex items-center shadow-sm">
                  <Check size={16} className="mr-2" /> Resolve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleContactInfoClick}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[12px] font-bold flex items-center shadow-sm transition-all",
                    showContactInfo
                      ? "bg-gray-900 text-white"
                      : "bg-aura-red text-white"
                  )}
                >
                  <Info size={16} className="mr-2" /> Contact Info
                </motion.button>
                <button className="p-2 text-gray-400 hover:text-aura-red transition-colors ml-2">
                  <Search size={22} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-red-50/20">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => {
                      const isOut = m.direction === 'outbound';
                      const parsed = parseMessage(m.message_text);

                      // Render reactions differently (no bubble)
                      if (parsed.type === 'reaction') {
                        return (
                          <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                            <div className="text-2xl leading-none" title={`Reaction: ${parsed.emoji}`}>
                              {parsed.emoji}
                            </div>
                          </div>
                        );
                      }

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
                            <MessageContent parsed={parsed} isOut={isOut} />
                            <div className="flex items-center justify-end mt-1.5 space-x-1">
                              <span className={cn("text-[10px]", isOut ? "text-red-100" : "text-gray-500")}>
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                              </span>
                              {isOut && <StatusIcon status={m.status} direction={m.direction} />}
                            </div>
                            <div className={cn(
                              "absolute top-0 w-3 h-3",
                              isOut
                                ? "-right-2 bg-aura-red [clip-path:polygon(0_0,0_100%,100%_0)]"
                                : "-left-2 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]"
                            )} />
                          </motion.div>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-[#f0f2f5] border-t border-gray-200 relative">
                  {/* Emoji Picker */}
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        ref={emojiPickerRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        onMouseDown={e => e.stopPropagation()}
                        className="absolute bottom-20 left-4 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-4 w-64"
                      >
                        <div className="grid grid-cols-5 gap-2">
                          {EMOJI_LIST.map(emoji => (
                            <button key={emoji}
                              onClick={() => insertEmoji(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-all hover:scale-125">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 text-gray-500 px-2">
                      <button type="button" onClick={() => setShowTemplateModal(true)}
                        className="hover:text-aura-red transition-colors" title="Templates">
                        <Layout size={24} />
                      </button>
                      <button type="button"
                        onMouseDown={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
                        className={cn("transition-colors", showEmojiPicker ? "text-aura-red" : "hover:text-aura-red")}
                        title="Emoji">
                        <Smile size={24} />
                      </button>
                      <button type="button" className="hover:text-aura-red transition-colors">
                        <Paperclip size={24} className="rotate-45" />
                      </button>
                      <button type="button" onClick={() => { if (selectedContact) fetchMessages(selectedContact.contact_number); }}
                        className="hover:text-aura-red transition-colors" title="Refresh messages">
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
                      className="text-gray-500 hover:text-aura-red transition-colors px-2 disabled:opacity-40"
                    >
                      {sending ? (
                        <div className="w-6 h-6 border-2 border-aura-red/30 border-t-aura-red rounded-full animate-spin" />
                      ) : (
                        <ChevronDown size={32} />
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
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="border-l border-gray-100 bg-white overflow-hidden flex flex-col shrink-0"
                    style={{ minWidth: 0 }}
                  >
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Contact Info</h4>
                      <button onClick={() => setShowContactInfo(false)}
                        className="text-gray-400 hover:text-gray-700 transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    {loadingContactInfo ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-aura-red/20 border-t-aura-red rounded-full animate-spin" />
                      </div>
                    ) : contactInfo ? (
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Avatar */}
                        <div className="p-6 flex flex-col items-center border-b border-gray-50">
                          <div className="w-20 h-20 bg-aura-red rounded-full flex items-center justify-center text-white font-black text-3xl mb-4 shadow-lg shadow-aura-red/20">
                            {contactInfo.contact_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <h3 className="text-base font-black text-gray-900 uppercase tracking-tight text-center">{contactInfo.contact_name}</h3>
                          <p className="text-xs text-gray-400 font-bold mt-1">{contactInfo.contact_number}</p>
                        </div>

                        {/* Info fields */}
                        <div className="p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Phone size={14} className="text-aura-red" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</div>
                              <div className="text-sm font-bold text-gray-900 mt-0.5">{contactInfo.contact_number}</div>
                            </div>
                          </div>

                          {contactInfo.email && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <Mail size={14} className="text-aura-red" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</div>
                                <div className="text-sm font-bold text-gray-900 mt-0.5">{contactInfo.email}</div>
                              </div>
                            </div>
                          )}

                          {contactInfo.tags && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <Tag size={14} className="text-aura-red" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {contactInfo.tags.split(',').map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-aura-red/10 text-aura-red text-[10px] font-black rounded-full uppercase">
                                      {tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Clock size={14} className="text-aura-red" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Interaction</div>
                              <div className="text-sm font-bold text-gray-900 mt-0.5">
                                {contactInfo.last_interaction ? new Date(contactInfo.last_interaction).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <ImageIcon size={14} className="text-aura-red" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Media Shared</div>
                              <div className="text-sm font-bold text-gray-900 mt-0.5">{contactInfo.media_count || 0} files</div>
                            </div>
                          </div>

                          {contactInfo.notes && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</div>
                              <p className="text-xs text-gray-700 leading-relaxed">{contactInfo.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="p-5 pt-0 space-y-2">
                          <button className="w-full py-2.5 bg-aura-red text-white text-xs font-black uppercase rounded-xl hover:bg-aura-red/90 transition-all">
                            View in Leads
                          </button>
                          <button className="w-full py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-xl hover:bg-gray-200 transition-all">
                            Add Note
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 bg-gray-100 rounded-[3rem] flex items-center justify-center text-gray-300 mb-8 transform rotate-12">
              <MessageSquare size={64} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Inbox <span className="text-aura-red">Inactive</span></h3>
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Message <span className="text-aura-red">Templates</span></h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Select a pre-approved message template</p>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleSyncTemplates} disabled={syncingTemplates}
                    className="flex items-center px-4 py-2 bg-white border border-aura-red/20 rounded-xl text-[10px] font-black text-aura-red hover:bg-aura-red/5 uppercase tracking-widest disabled:opacity-50">
                    <RefreshCw size={14} className={cn("mr-2", syncingTemplates && "animate-spin")} />
                    {syncingTemplates ? 'Syncing...' : 'Sync Meta'}
                  </motion.button>
                  <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 border-r border-gray-100 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                  {templates.length === 0 ? (
                    <div className="text-center py-12">
                      <Layout size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No templates available</p>
                    </div>
                  ) : (
                    templates.map((tpl) => (
                      <motion.div
                        key={tpl.id} whileHover={{ x: 4 }}
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
                          <span className={cn("w-1.5 h-1.5 rounded-full mr-2", tpl.status === 'APPROVED' ? "bg-green-500" : "bg-yellow-500")} />
                          {tpl.status}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="flex-1 bg-gray-50/50 p-8 flex flex-col">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                    <Eye size={14} className="mr-2" /> Message Preview
                  </h4>
                  <div className="flex-1 flex items-center justify-center">
                    {selectedTemplate ? (
                      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-6">
                        {selectedTemplate.components?.map((comp: any, idx: number) => (
                          <div key={idx} className="mb-4 last:mb-0">
                            {comp.type === 'HEADER' && comp.format === 'TEXT' && (
                              <div className="text-sm font-black text-gray-900 mb-2 uppercase">{comp.text}</div>
                            )}
                            {comp.type === 'BODY' && (
                              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{comp.text}</div>
                            )}
                            {comp.type === 'FOOTER' && (
                              <div className="text-[10px] text-gray-400 mt-2">{comp.text}</div>
                            )}
                            {comp.type === 'BUTTONS' && (
                              <div className="mt-4 space-y-2">
                                {comp.buttons.map((btn: any, bIdx: number) => (
                                  <div key={bIdx} className="w-full py-2 bg-gray-50 text-aura-red text-[10px] font-black uppercase text-center rounded-lg border border-gray-100">
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
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a template to preview</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      disabled={!selectedTemplate || sending}
                      onClick={handleSendTemplate}
                      className="flex items-center px-8 py-3 bg-aura-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-aura-red/20 disabled:opacity-50 disabled:grayscale transition-all">
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