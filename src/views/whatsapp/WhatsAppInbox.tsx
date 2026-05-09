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
  if (text.startsWith('[reaction:')) {
    const emoji = text.slice(10, -1);
    return { type: 'text', text: emoji };
  }
  if (text === '[reaction]') return { type: 'text', text: '👍' };
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
            isOut ? "bg-white/20" : "bg-green-50")}>
            <FileText size={18} className={isOut ? "text-white" : "text-green-600"} />
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
        <div className="relative rounded-lg overflow-hidden max-w-[280px] cursor-pointer"
          onClick={() => onMediaClick(mediaUrl(parsed.mediaId), 'video')}>
          <video 
            src={mediaUrl(parsed.mediaId)} 
            preload="metadata"
            className="w-full max-h-[220px] rounded-lg bg-black"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <Play size={20} className="text-gray-800 ml-1" fill="currentColor" />
            </div>
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
            isOut ? "bg-white/20" : "bg-green-50")}>
            <MapPin size={18} className={isOut ? "text-white" : "text-green-600"} />
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
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-black text-xl mb-3">
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
              <Icon size={14} className="text-green-600 shrink-0" />
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
                  <div key={i} className="aspect-square bg-green-50 rounded-lg flex flex-col items-center justify-center gap-1 p-1">
                    <FileText size={14} className="text-green-600" />
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
    delete: { title: 'Delete Conversation', desc: 'Permanently delete this conversation. Cannot be undone.', btn: 'Delete', cls: 'bg-green-600 hover:bg-green-700' },
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
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-green-600" />
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; msgId: number | string } | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get('phone');
    if (!phone || loading) return;
    const found = conversations.find(c =>
      c.contact_number === phone ||
      c.contact_number.replace(/\D/g, '') === phone
    );
    if (found) { selectContact(found); navigate('/whatsapp', { replace: true }); return; }
    const placeholder: Conversation = {
      contact_number: phone, contact_name: phone, last_message: '',
      last_timestamp: new Date().toISOString(), last_direction: 'outbound',
      last_status: '', unread_count: 0,
    };
    setSelectedContact(placeholder);
    fetchMessages(phone);
    navigate('/whatsapp', { replace: true });
  }, [location.search, loading, conversations]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplates(res.data.templates || res.data || []);
    } catch { }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get(`/whatsapp/conversations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setConversations((res.data.conversations || []).map((c: any) => ({ ...c, unread_count: Number(c.unread_count) || 0 })));
    } catch { } finally {
      setLoading(false);
    }
  }, [searchTerm]);

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
    const t = setInterval(() => {
      fetchConversations();
      if (selectedContact) fetchMessages(selectedContact.contact_number);
    }, 5000);
    return () => clearInterval(t);
  }, [fetchConversations, fetchMessages, selectedContact]);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact.contact_number);
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    const container = chatEndRef.current?.parentElement;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const selectContact = async (conv: Conversation) => {
    setSelectedContact(conv);
    setShowContactInfo(false);
    if (conv.unread_count > 0) {
      try {
        await api.put(`/whatsapp/mark-read/${conv.contact_number}`);
        setConversations(prev => prev.map(c => c.contact_number === conv.contact_number ? { ...c, unread_count: 0 } : c));
      } catch { }
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
    } catch { } finally { setSending(false); }
  };

  const handleResolve = () => {
    if (!selectedContact) return;
    setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
    setSelectedContact(null);
  };

  const handleDeleteAction = (type: 'delete' | 'archive' | 'clear') => {
    if (!selectedContact) return;
    if (type === 'clear') {
      setMessages([]);
    } else {
      setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
      setSelectedContact(null);
    }
    setDeleteModal(null);
  };

  const handleDeleteMessage = async (msgId: number | string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setCtxMenu(null);
    try { await api.delete(`/whatsapp/message/${msgId}`); } catch {}
  };

  const togglePin = (phone: string) => {
    setPinnedChats(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
  };

  const filteredConversations = conversations
    .filter(c => activeFilter === 'unread' ? c.unread_count > 0 : true)
    .filter(c =>
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_number.includes(searchTerm)
    )
    .sort((a, b) => {
      const ap = pinnedChats.includes(a.contact_number);
      const bp = pinnedChats.includes(b.contact_number);
      return ap === bp ? 0 : ap ? -1 : 1;
    });

  const totalUnread = conversations.reduce((s, c) => s + (Number(c.unread_count) || 0), 0);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDateSeparator = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const StatusIcon = ({ status, direction }: { status: string; direction: string }) => {
    if (direction === 'inbound') return null;
    if (status === 'read') return <CheckCheck size={13} className="text-red-400" />;
    if (status === 'delivered') return <CheckCheck size={13} className="text-gray-400" />;
    if (status === 'sent') return <Check size={13} className="text-gray-400" />;
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                Whats<span className="text-green-600">App</span>
              </h2>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 bg-green-600 text-white text-[9px] font-black rounded-full leading-none">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {/* Filter */}
              <div className="relative" ref={filterRef}>
                <button onClick={() => setShowFilterMenu(v => !v)}
                  className={cn("p-2 rounded-lg transition-colors text-sm",
                    showFilterMenu ? "bg-green-50 text-green-600" : "text-gray-400 hover:text-green-600 hover:bg-green-50")}>
                  <Filter size={15} />
                </button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 w-48 py-1 overflow-hidden">
                      {[
                        { label: 'All Chats', val: 'all' as const, icon: Inbox },
                        { label: `Unread (${totalUnread})`, val: 'unread' as const, icon: MessageSquare },
                      ].map(({ label, val, icon: Icon }) => (
                        <button key={val} onClick={() => { setActiveFilter(val); setShowFilterMenu(false); }}
                          className={cn("w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold transition-colors",
                            activeFilter === val ? "bg-green-50 text-green-600" : "text-gray-700 hover:bg-gray-50")}>
                          <Icon size={13} />{label}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => { fetchConversations(); setShowFilterMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                          <RefreshCw size={13} />Refresh
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* 3-dots */}
              <div className="relative" ref={dotsRef}>
                <button onClick={() => setShowDotsMenu(v => !v)}
                  className={cn("p-2 rounded-lg transition-colors",
                    showDotsMenu ? "bg-green-50 text-green-600" : "text-gray-400 hover:text-green-600 hover:bg-green-50")}>
                  <MoreVertical size={15} />
                </button>
                <AnimatePresence>
                  {showDotsMenu && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 w-48 py-1 overflow-hidden">
                      {[
                        { label: 'Sort by Latest', icon: SortDesc, action: () => {
          setConversations(prev => [...prev].sort((a, b) => new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime()));
        } },
                        { label: 'Sync Templates', icon: RefreshCw, action: handleSyncTemplates },
                      ].map(({ label, icon: Icon, action }) => (
                        <button key={label} onClick={() => { setShowDotsMenu(false); setTimeout(() => action(), 50); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                          <Icon size={13} />{label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Search conversations..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200 text-xs font-bold text-gray-900 transition-all" />
          </div>

          <div className="flex gap-2 mt-2.5">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors",
                  activeFilter === f ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                {f === 'all' ? 'All' : `Unread${totalUnread > 0 ? ` (${totalUnread})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-10 gap-3">
              <div className="w-7 h-7 border-2 border-green-200 border-t-red-500 rounded-full animate-spin" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Loading...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 gap-3">
              <MessageSquare size={28} className="text-gray-200" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {activeFilter === 'unread' ? 'No unread chats' : 'No conversations'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <motion.div key={conv.contact_number}
                whileHover={{ x: 3, backgroundColor: '#f0fdf4' }}
                whileTap={{ scale: 0.98 }}
                animate={selectedContact?.contact_number === conv.contact_number ? { x: 4 } : { x: 0 }}
                onClick={() => selectContact(conv)}
                className={cn(
                  "px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-b border-gray-50 relative",
                  selectedContact?.contact_number === conv.contact_number
                    ? "bg-gradient-to-r from-green-50 to-white border-l-[4px] border-l-green-500 shadow-sm"
                    : "hover:bg-gray-50/80"
                )}>
                {selectedContact?.contact_number === conv.contact_number && (
                  <motion.div
                    layoutId="activeChat"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r-full"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0",
                  conv.last_direction === 'inbound' ? "bg-green-600" : "bg-gray-400"
                )}>
                  {conv.contact_name?.[0]?.toUpperCase() || conv.contact_number.slice(-1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-black text-gray-900 truncate">
                      {pinnedChats.includes(conv.contact_number) && (
                        <Star size={9} className="inline text-yellow-400 mr-1 mb-0.5" fill="currentColor" />
                      )}
                      {conv.contact_name || conv.contact_number}
                    </span>
                    <span className="text-[9px] text-gray-400 shrink-0 ml-2">{formatTime(conv.last_timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 max-w-[80%]">
                      {conv.last_direction === 'outbound' && <StatusIcon status={conv.last_status} direction="outbound" />}
                      {previewMessage(conv.last_message)}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="w-4 h-4 bg-green-600 text-white text-[8px] font-black flex items-center justify-center rounded-full shrink-0">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex min-w-0">
        {selectedContact ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-black text-sm">
                  {selectedContact.contact_name?.[0]?.toUpperCase() || selectedContact.contact_number.slice(-1)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 leading-tight">{selectedContact.contact_name || selectedContact.contact_number}</h3>
                  <p className="text-[10px] text-gray-500">{selectedContact.contact_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleResolve}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[11px] font-black hover:bg-green-600 transition-colors shadow-sm">
                  <Check size={12} /> Resolve
                </button>
                <button onClick={() => setShowContactInfo(v => !v)}
                  className={cn("p-2 rounded-lg transition-colors", showContactInfo ? "bg-green-50 text-green-600" : "text-gray-400 hover:bg-gray-100")}>
                  <Info size={17} />
                </button>
                {/* Chat menu */}
                <div className="relative" ref={chatMenuRef}>
                  <button onClick={() => setShowChatMenu(v => !v)}
                    className={cn("p-2 rounded-lg transition-colors", showChatMenu ? "bg-green-50 text-green-600" : "text-gray-400 hover:bg-gray-100")}>
                    <MoreVertical size={17} />
                  </button>
                  <AnimatePresence>
                    {showChatMenu && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 w-48 py-1 overflow-hidden">
                        <button onClick={() => { togglePin(selectedContact.contact_number); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                          <Star size={13} />{pinnedChats.includes(selectedContact.contact_number) ? 'Unpin Chat' : 'Pin Chat'}
                        </button>
                        <button onClick={() => navigate(`/leads?phone=${selectedContact.contact_number}`)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                          <ExternalLink size={13} />Open in CRM
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { setDeleteModal('clear'); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-50">
                          <XCircle size={13} />Clear Chat
                        </button>
                        <button onClick={() => { setDeleteModal('archive'); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50">
                          <Archive size={13} />Archive
                        </button>
                        <button onClick={() => { setDeleteModal('delete'); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-green-600 hover:bg-green-50">
                          <Trash2 size={13} />Delete Chat
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-[#f0f2f5]">
              <AnimatePresence initial={false}>
                {messages.map((m, idx) => {
                  const isOut = m.direction === 'outbound';
                  const parsed = parseMessage(m.message_text);
                  const showDate = idx === 0 || new Date(m.timestamp).toDateString() !== new Date(messages[idx-1].timestamp).toDateString();
                  return (
                    <div key={m.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="px-3 py-1 bg-white text-gray-400 text-[10px] font-bold rounded-full shadow-sm border border-gray-100">
                          {formatDateSeparator(m.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}
                      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, msgId: m.id }); }}>
                      <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn(
                          "max-w-[68%] p-3 px-3.5 rounded-2xl shadow-sm relative cursor-pointer",
                          isOut ? "bg-green-600 text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
                        )}>
                        <MessageContent parsed={parsed} isOut={isOut}
                          onMediaClick={(url, type, filename) => setMediaPreview({ url, type, filename })} />
                        <div className="flex items-center justify-end mt-1 gap-1">
                          <span className={cn("text-[10px]", isOut ? "text-green-200" : "text-gray-400")}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                          </span>
                          {isOut && <StatusIcon status={m.status} direction="outbound" />}
                        </div>
                      </motion.div>
                    </div>
                    </div>
                  );
                })}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1 shrink-0 pb-1.5">
                  <div className="relative" ref={emojiRef}>
                    <button onClick={() => setShowEmojiPicker(v => !v)}
                      className={cn("p-2 rounded-lg transition-colors", showEmojiPicker ? "text-green-600" : "text-gray-400 hover:text-green-600")}>
                      <Smile size={19} />
                    </button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <EmojiPicker onSelect={e => setInput(prev => prev + e)} onClose={() => setShowEmojiPicker(false)} />
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => setShowTemplateModal(true)} title="Templates"
                    className="p-2 text-gray-400 hover:text-green-600 rounded-lg transition-colors">
                    <Layout size={19} />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedContact) return;
                      e.target.value = '';
                      setUploadingFile(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('to', selectedContact.contact_number);
                        fd.append('contactName', selectedContact.contact_name || selectedContact.contact_number);
                        const res = await api.post('/whatsapp/send-media', fd);
                        // Immediately show in chat
                        const mediaId = res.data.mediaId;
                        const mime = file.type;
                        let msgText = mime.startsWith('image/') ? `[image:${mediaId}]`
                          : mime.startsWith('video/') ? `[video:${mediaId}]`
                          : mime.startsWith('audio/') ? `[audio:${mediaId}]`
                          : `[document:${mediaId}:${file.name}:${mime}]`;
                        setMessages(prev => [...prev, {
                          id: Date.now(), message_id: res.data.messageId,
                          from_number: 'me', to_number: selectedContact.contact_number,
                          message_text: msgText, direction: 'outbound',
                          status: 'sent', timestamp: new Date().toISOString(),
                          contact_name: selectedContact.contact_name
                        } as any]);
                        fetchMessages(selectedContact.contact_number);
                      } catch(err) { console.error('Upload failed', err); }
                      finally { setUploadingFile(false); }
                    }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className={cn("p-2 rounded-lg transition-colors relative", uploadingFile ? "text-red-400 animate-pulse" : "text-gray-400 hover:text-green-600")}>
                    <Paperclip size={19} />
                    {uploadingFile && <span className="absolute top-1 right-1 w-2 h-2 bg-green-600 rounded-full animate-ping" />}
                  </button>
                </div>
                <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden">
                  <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message..."
                    style={{ minHeight: 42, maxHeight: 120, resize: 'none' }}
                    className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none text-gray-900" />
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleSendMessage}
                  disabled={!input.trim() || sending}
                  className="shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 shadow-md hover:bg-green-700 transition-colors">
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send size={16} />}
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-200 mb-5 shadow-md">
              <MessageSquare size={40} strokeWidth={1} />
            </div>
            <h3 className="text-base font-black text-gray-700 mb-1.5">Select a conversation</h3>
            <p className="text-xs text-gray-400 max-w-[200px]">Choose a contact from the sidebar to start messaging</p>
          </div>
        )}

        {/* Message Context Menu */}
        {ctxMenu && (
          <div className="fixed inset-0 z-50" onClick={() => setCtxMenu(null)}>
            <div className="absolute bg-white border border-gray-100 rounded-xl shadow-xl py-1 w-40"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}>
              <button onClick={() => handleDeleteMessage(ctxMenu.msgId)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50">
                <Trash2 size={13} />Delete Message
              </button>
            </div>
          </div>
        )}
        {/* Contact Info Drawer */}
        <AnimatePresence>
          {showContactInfo && selectedContact && (
            <ContactInfoDrawer contact={selectedContact} messages={messages} onClose={() => setShowContactInfo(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Template Modal ── */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden relative z-10 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                    Message <span className="text-green-600">Templates</span>
                  </h3>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Select a pre-approved template</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSyncTemplates} disabled={syncingTemplates}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-[10px] font-black text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors">
                    <RefreshCw size={11} className={cn(syncingTemplates && "animate-spin")} />
                    {syncingTemplates ? 'Syncing...' : 'Sync Meta'}
                  </button>
                  <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex">
                {/* Template list */}
                <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {templates.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Layout size={28} className="mx-auto mb-3 opacity-30" />
                      <p className="text-[9px] font-black uppercase tracking-widest">No templates. Click Sync Meta.</p>
                    </div>
                  ) : templates.map(tpl => (
                    <div key={tpl.id} onClick={() => setSelectedTemplate(tpl)}
                      className={cn("p-3 rounded-xl border cursor-pointer transition-all",
                        selectedTemplate?.id === tpl.id
                          ? "bg-green-50 border-green-300 shadow-sm"
                          : "bg-white border-gray-100 hover:border-green-200")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded">{tpl.category}</span>
                        <span className="text-[8px] text-gray-400">{tpl.language}</span>
                      </div>
                      <h4 className="text-xs font-black text-gray-900">{tpl.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", tpl.status === 'APPROVED' ? "bg-green-400" : "bg-yellow-400")} />
                        <span className="text-[8px] text-gray-400 uppercase">{tpl.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Preview */}
                <div className="flex-1 bg-gray-50 p-5 flex flex-col">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Eye size={11} /> Message Preview
                  </p>
                  <div className="flex-1 flex items-center justify-center">
                    {selectedTemplate ? (
                      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 w-full max-w-xs">
                        {selectedTemplate.components?.map((comp: any, i: number) => (
                          <div key={i} className="mb-3 last:mb-0">
                            {comp.type === 'HEADER' && comp.format === 'TEXT' && (
                              <div className="font-black text-gray-900 text-xs mb-1">{comp.text}</div>
                            )}
                            {comp.type === 'BODY' && (
                              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{comp.text}</div>
                            )}
                            {comp.type === 'FOOTER' && (
                              <div className="text-[10px] text-gray-400 mt-1">{comp.text}</div>
                            )}
                            {comp.type === 'BUTTONS' && (
                              <div className="mt-2 space-y-1">
                                {comp.buttons?.map((btn: any, bi: number) => (
                                  <div key={bi} className="text-center text-[10px] font-bold text-green-600 py-1 bg-green-50 rounded-lg">{btn.text}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-300">
                        <ShieldAlert size={36} className="mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Select a template to preview</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={!selectedTemplate || sending} onClick={handleSendTemplate}
                      className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-xs font-black shadow-lg disabled:opacity-50 hover:bg-green-700 transition-colors">
                      <Send size={13} />{sending ? 'Sending...' : 'Send Message'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteModal type={deleteModal}
            onCancel={() => setDeleteModal(null)}
            onConfirm={() => handleDeleteAction(deleteModal)} />
        )}
      </AnimatePresence>

      {/* ── Media Preview ── */}
      <AnimatePresence>
        {mediaPreview && (
          <MediaPreviewModal url={mediaPreview.url} type={mediaPreview.type}
            filename={mediaPreview.filename} onClose={() => setMediaPreview(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
