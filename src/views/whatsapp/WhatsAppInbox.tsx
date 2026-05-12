import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MessageSquare, MoreVertical, Send, Check, CheckCheck,
  Filter, User, Smile, Paperclip, Layout, RefreshCw, X,
  Eye, FileText, Download, Image as ImageIcon, Music, MapPin,
  ExternalLink, Phone, Clock, Trash2, Archive,
  ZoomIn, Play, SortDesc, Inbox, Info,
  AlertCircle, XCircle, Star, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import { socket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  contact_number: string;
  contact_name: string;
  last_message: string;
  last_timestamp: string;
  last_direction: 'inbound' | 'outbound';
  last_status: string;
  unread_count: number;
  lead_id?: number;
}

interface WhatsAppTemplate {
  id: number;
  name: string;
  category: string;
  language: string;
  components: any;
  status: string;
}

type ParsedMessage =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaId: string }
  | { type: 'document'; mediaId: string; filename: string; mimeType: string }
  | { type: 'audio'; mediaId: string }
  | { type: 'video'; mediaId: string }
  | { type: 'sticker'; mediaId: string }
  | { type: 'location'; lat: string; lng: string; name: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMessage(text: string): ParsedMessage {
  if (!text) return { type: 'text', text: '' };
  if (text.startsWith('[image:')) return { type: 'image', mediaId: text.slice(7, -1) };
  if (text.startsWith('[document:')) {
    const inner = text.slice(10, -1).split(':');
    return { type: 'document', mediaId: inner[0], filename: inner[1] || 'document', mimeType: inner[2] || 'application/octet-stream' };
  }
  if (text.startsWith('[audio:')) return { type: 'audio', mediaId: text.slice(7, -1) };
  if (text.startsWith('[video:')) return { type: 'video', mediaId: text.slice(7, -1) };
  if (text.startsWith('[sticker:')) return { type: 'sticker', mediaId: text.slice(9, -1) };
  if (text.startsWith('[location:')) {
    const inner = text.slice(10, -1);
    const colonIdx = inner.indexOf(':');
    const coords = colonIdx > -1 ? inner.slice(0, colonIdx) : inner;
    const locName = colonIdx > -1 ? inner.slice(colonIdx + 1) : '';
    const [lat, lng] = coords.split(',');
    return { type: 'location', lat: lat || '', lng: lng || '', name: locName };
  }
  return { type: 'text', text };
}

function previewMessage(text: string): string {
  if (!text) return '';
  if (text.startsWith('[image:')) return '📷 Image';
  if (text.startsWith('[document:')) return '📄 Document';
  if (text.startsWith('[audio:')) return '🎵 Voice message';
  if (text.startsWith('[video:')) return '🎥 Video';
  if (text.startsWith('[sticker:')) return '😊 Sticker';
  if (text.startsWith('[location:')) return '📍 Location';
  return text;
}

function mediaUrl(mediaId: string): string {
  return `${window.location.origin}/api/whatsapp/media/${mediaId}`;
}

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all inline-flex items-center gap-0.5">
          {part}<ExternalLink size={10} className="shrink-0" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','🙏','❤️','🔥','👍','👎','🎉','😢','😡','🤝','💪','✅','❌','⭐','🚀','💯','📞','📱','💬'];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50 w-60">
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => { onSelect(e); onClose(); }}
            className="text-lg hover:bg-gray-100 rounded-lg p-1 transition-colors leading-none">{e}</button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Media Preview Modal ──────────────────────────────────────────────────────
function MediaPreviewModal({ url, type, filename, onClose }: {
  url: string; type: string; filename?: string; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
        onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 right-0 flex gap-2 z-10">
          <a href={url} download={filename}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <Download size={18} />
          </a>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="mt-12 w-full flex items-center justify-center">
          {type === 'image' && <img src={url} alt={filename} className="max-h-[75vh] max-w-full rounded-xl object-contain" />}
          {type === 'video' && <video src={url} controls autoPlay className="max-h-[75vh] max-w-full rounded-xl" />}
          {type === 'audio' && (
            <div className="bg-white/10 rounded-xl p-8 flex flex-col items-center gap-4">
              <Music size={48} className="text-white" />
              <audio src={url} controls className="w-full" />
            </div>
          )}
          {type === 'document' && (
            <div className="bg-white/10 rounded-xl p-12 flex flex-col items-center gap-4 text-white">
              <FileText size={64} />
              <p className="font-bold text-lg">{filename || 'Document'}</p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
                <ExternalLink size={16} /> Open Document
              </a>
            </div>
          )}
        </div>
        {filename && <p className="mt-4 text-white/60 text-sm">{filename}</p>}
      </motion.div>
    </motion.div>
  );
}

// ─── Message Content ──────────────────────────────────────────────────────────
function MessageContent({ parsed, isOut, onMediaClick }: {
  parsed: ParsedMessage; isOut: boolean;
  onMediaClick: (url: string, type: string, filename?: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const tc = isOut ? 'text-white' : 'text-gray-800';

  switch (parsed.type) {
    case 'image':
      return imgError ? (
        <div className={cn("flex items-center gap-2 text-xs font-bold", tc)}>
          <ImageIcon size={16} /> Image unavailable
        </div>
      ) : (
        <div className="relative group/img cursor-pointer"
          onClick={() => onMediaClick(mediaUrl(parsed.mediaId), 'image')}>
          <img src={mediaUrl(parsed.mediaId)} alt="Image" onError={() => setImgError(true)}
            className="max-w-[220px] max-h-[220px] rounded-lg object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
            <ZoomIn className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" size={22} />
          </div>
        </div>
      );

    case 'document':
      return (
        <div onClick={() => onMediaClick(mediaUrl(parsed.mediaId), 'document', parsed.filename)}
          className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
            isOut ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-gray-50 border-gray-200 hover:bg-gray-100")}>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isOut ? "bg-white/20" : "bg-red-50")}>
            <FileText size={18} className={isOut ? "text-white" : "text-red-500"} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("text-xs font-bold truncate", tc)}>{parsed.filename}</div>
            <div className={cn("text-[10px]", isOut ? "text-white/60" : "text-gray-400")}>
              {parsed.mimeType.split('/')[1]?.toUpperCase() || 'FILE'} · Tap to open
            </div>
          </div>
          <Download size={14} className={isOut ? "text-white/70" : "text-gray-400"} />
        </div>
      );

    case 'audio':
      return (
        <div className="flex flex-col gap-2 min-w-[180px]">
          <div className={cn("flex items-center gap-2 text-xs font-bold", tc)}>
            <Music size={13} /> Voice message
          </div>
          <audio controls src={mediaUrl(parsed.mediaId)} className="w-full h-8" style={{ minWidth: 180 }} />
        </div>
      );

    case 'video':
      return (
        <div className="relative cursor-pointer"
          onClick={() => onMediaClick(mediaUrl(parsed.mediaId), 'video')}>
          <video src={mediaUrl(parsed.mediaId)} className="max-w-[220px] max-h-[180px] rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <Play size={28} className="text-white" fill="white" />
          </div>
        </div>
      );

    case 'sticker':
      return <img src={mediaUrl(parsed.mediaId)} alt="Sticker" className="w-20 h-20 object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;

    case 'location': {
      const mapsUrl = `https://maps.google.com/?q=${parsed.lat},${parsed.lng}`;
      return (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
            isOut ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-gray-50 border-gray-200 hover:bg-gray-100")}>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isOut ? "bg-white/20" : "bg-red-50")}>
            <MapPin size={18} className={isOut ? "text-white" : "text-red-500"} />
          </div>
          <div className="min-w-0">
            <div className={cn("text-xs font-bold", tc)}>{parsed.name || 'Location'}</div>
            <div className={cn("text-[10px]", isOut ? "text-white/60" : "text-gray-400")}>Open in Maps</div>
          </div>
        </a>
      );
    }

    default:
      return (
        <div className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", tc)}>
          {linkifyText((parsed as any).text || '')}
        </div>
      );
  }
}

// ─── Contact Info Drawer ──────────────────────────────────────────────────────
function ContactInfoDrawer({ contact, messages, onClose }: {
  contact: Conversation; messages: Message[]; onClose: () => void;
}) {
  const mediaMessages = messages.filter(m =>
    m.message_text.startsWith('[image:') ||
    m.message_text.startsWith('[video:') ||
    m.message_text.startsWith('[document:')
  );

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-72 border-l border-gray-100 bg-white flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Contact Info</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col items-center border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xl mb-3">
            {contact.contact_name?.[0]?.toUpperCase() || contact.contact_number.slice(-1)}
          </div>
          <h4 className="font-black text-gray-900 text-sm text-center">{contact.contact_name || contact.contact_number}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{contact.contact_number}</p>
        </div>
        <div className="p-4 space-y-2.5 border-b border-gray-100">
          {[
            { icon: Phone, label: 'Phone', value: contact.contact_number },
            { icon: Clock, label: 'Last Message', value: new Date(contact.last_timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) },
            ...(contact.lead_id ? [{ icon: User, label: 'Lead ID', value: `#${contact.lead_id}` }] : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
              <Icon size={14} className="text-red-500 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase">{label}</p>
                <p className="text-xs font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4">
          <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Shared Media ({mediaMessages.length})
          </h5>
          {mediaMessages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No media shared yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaMessages.slice(0, 9).map((m, i) => {
                const p = parseMessage(m.message_text);
                if (p.type === 'image') return (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={mediaUrl(p.mediaId)} className="w-full h-full object-cover" alt="" />
                  </div>
                );
                if (p.type === 'video') return (
                  <div key={i} className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                    <Play size={16} className="text-white" />
                  </div>
                );
                if (p.type === 'document') return (
                  <div key={i} className="aspect-square bg-red-50 rounded-lg flex flex-col items-center justify-center gap-1 p-1">
                    <FileText size={14} className="text-red-500" />
                    <span className="text-[7px] text-gray-500 truncate w-full text-center">{p.filename}</span>
                  </div>
                );
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ type, onConfirm, onCancel }: {
  type: 'delete' | 'archive' | 'clear'; onConfirm: () => void; onCancel: () => void;
}) {
  const cfg = {
    delete: { title: 'Delete Conversation', desc: 'Permanently delete this conversation. Cannot be undone.', btn: 'Delete', cls: 'bg-red-500 hover:bg-red-600' },
    archive: { title: 'Archive Conversation', desc: 'Move this conversation to archive.', btn: 'Archive', cls: 'bg-gray-500 hover:bg-gray-600' },
    clear: { title: 'Clear Chat', desc: 'All messages will be cleared from view.', btn: 'Clear', cls: 'bg-orange-500 hover:bg-orange-600' },
  }[type];
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <h3 className="font-black text-gray-900 text-sm">{cfg.title}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">{cfg.desc}</p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={cn("flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors", cfg.cls)}>{cfg.btn}</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhatsAppInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { searchTerm, setSearchTerm } = useSearch();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI toggles
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [deleteModal, setDeleteModal] = useState<'delete' | 'archive' | 'clear' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; filename?: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);

  // Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const emojiRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false);
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) setShowDotsMenu(false);
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setShowChatMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplates(res.data.templates || res.data || []);
    } catch { }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get(`/whatsapp/conversations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setConversations(res.data.conversations || []);
    } catch { } finally {
      setLoading(false);
    }
  }, [searchTerm]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get("phone");
    if (!phone || !conversations.length) return;
    const match = conversations.find(c => c.contact_number.replace(/[^0-9]/g, "").endsWith(phone.replace(/[^0-9]/g, "")));
    if (match) setSelectedContact(match);
  }, [location.search, conversations]);

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}`);
      setMessages(res.data.messages || []);
    } catch { }
  }, []);

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try { await api.post('/whatsapp/templates/sync'); await fetchTemplates(); } catch { }
    finally { setSyncingTemplates(false); }
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
    } catch { } finally { setSending(false); }
  };

  const handleMessage = useCallback((newMsg: Message) => {
    setConversations(prev => {
      const contactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
      const existing = prev.find(c => c.contact_number === contactNum);
      let unread = existing?.unread_count || 0;
      if (newMsg.direction === 'inbound' && (!selectedContact || selectedContact.contact_number !== contactNum)) unread++;
      const updated: Conversation = {
        contact_number: contactNum,
        contact_name: newMsg.contact_name || existing?.contact_name || '',
        last_message: newMsg.message_text,
        last_timestamp: newMsg.timestamp,
        last_direction: newMsg.direction,
        last_status: newMsg.status,
        unread_count: unread,
      };
      return [updated, ...prev.filter(c => c.contact_number !== contactNum)];
    });
    if (selectedContact) {
      const contactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
      if (contactNum === selectedContact.contact_number) {
        setMessages(prev => prev.some(m => m.message_id === newMsg.message_id) ? prev : [...prev, newMsg]);
        if (newMsg.direction === 'inbound') api.put(`/whatsapp/mark-read/${contactNum}`).catch(() => {});
      }
    }
  }, [selectedContact]);

  const handleRead = useCallback(({ phone }: { phone: string }) => {
    setConversations(prev => prev.map(c => c.contact_number === phone ? { ...c, unread_count: 0 } : c));
  }, []);

  const handleStatus = useCallback(({ message_id, status }: { message_id: string; status: string }) => {
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
