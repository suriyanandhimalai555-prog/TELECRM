import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MessageSquare, MoreVertical, Send, Check, CheckCheck,
  Filter, User, Smile, Paperclip, Layout, RefreshCw, X, Mic, MicOff,
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

const AVG_AD_MESSAGES: Record<string, { emoji: string; message: string }> = {
  "Website Development": {
    emoji: "🌐",
    message: `Hi! 👋 Thank you for your interest in *Professional Website Development* by AVG Prime Tech.

We build stunning, high-performance websites for businesses in Dubai & India.

✅ Custom Design
✅ Mobile Responsive  
✅ SEO Optimized
✅ E-commerce Ready
✅ Fast Delivery

💬 Please share your requirements and we'll send you a free quote within 24 hours!

📍 AVG Prime Tech — Dubai | India`,
  },
  "Mobile App Development": {
    emoji: "📱",
    message: `Hi! 👋 Thank you for your interest in *Custom Mobile App Development* by AVG Prime Tech.

We build powerful iOS & Android apps for your business.

✅ Native iOS & Android
✅ Cross-platform (Flutter/React Native)
✅ UI/UX Design Included
✅ Backend & API Integration
✅ Post-launch Support

💬 Tell us about your app idea and get a free consultation!

📍 AVG Prime Tech — Dubai | India`,
  },
  "Play Store Publishing": {
    emoji: "🚀",
    message: `Hi! 👋 Thank you for contacting AVG Prime Tech about *App Store Publishing*.

We handle complete app submission for Google Play Store & Apple App Store.

✅ App Store Optimization (ASO)
✅ Screenshots & Store Listing
✅ Review & Approval Support
✅ Fast Turnaround
✅ Both Platforms Covered

💬 Share your app details and we'll get started immediately!

📍 AVG Prime Tech — Dubai | India`,
  },
  "Web3 Development": {
    emoji: "⛓️",
    message: `Hi! 👋 Thank you for your interest in *Web3 Development* by AVG Prime Tech.

We build next-generation blockchain & Web3 solutions.

✅ Smart Contract Development
✅ DeFi Platforms
✅ NFT Marketplaces
✅ DAO Development
✅ Wallet Integration

💬 Share your Web3 project idea for a free technical consultation!

📍 AVG Prime Tech — Dubai | India`,
  },
  "Crypto Coin Listing": {
    emoji: "🪙",
    message: `Hi! 👋 Thank you for contacting AVG Prime Tech about *Crypto Coin Listing*.

We provide end-to-end support for listing your token on major exchanges.

✅ Exchange Selection & Strategy
✅ Listing Application Support
✅ Market Making Guidance
✅ Compliance & Documentation
✅ CEX & DEX Listing

💬 Share your token details for a free listing consultation!

📍 AVG Prime Tech — Dubai | India`,
  },
  "Crypto Exchange Development": {
    emoji: "💱",
    message: `Hi! 👋 Thank you for your interest in *Crypto Exchange Development* by AVG Prime Tech.

We build secure, scalable cryptocurrency exchanges.

✅ Centralized Exchange (CEX)
✅ Decentralized Exchange (DEX)
✅ P2P Trading Platform
✅ Admin Dashboard
✅ KYC/AML Integration
✅ Multi-currency Support

💬 Tell us your exchange requirements for a free proposal!

📍 AVG Prime Tech — Dubai | India`,
  },
};


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
  | { type: 'location'; lat: string; lng: string; name: string }
  | { type: 'call'; callType: string; duration: string }
  | { type: 'reaction'; emoji: string }
  | { type: 'poll'; question: string; options: string[] }
  | { type: 'interactive'; text: string }
  | { type: 'unsupported'; text: string };

// ─── Props ────────────────────────────────────────────────────────────────────
interface WhatsAppInboxProps {
  accountIndex?: 0 | 1 | 2 | 3;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMessage(text: string): ParsedMessage {
  if (!text) return { type: 'text', text: '' };
  if (text === '[unsupported]' || text === '[unsupported message]' || text.startsWith('[unsupported')) {
    return { type: 'unsupported', text: '' };
  }
  if (text.startsWith('[image:')) return { type: 'image', mediaId: text.slice(7, -1) };
  if (text.startsWith('[document:')) {
    const inner = text.slice(10, -1);
    if (inner.startsWith('cached:')) {
      const withoutCached = inner.slice(7);
      const colonIdx = withoutCached.indexOf(':', withoutCached.indexOf('/api'));
      const cachedUrl = 'cached:' + withoutCached.slice(0, colonIdx);
      const rest = withoutCached.slice(colonIdx + 1).split(':');
      return { type: 'document', mediaId: cachedUrl, filename: rest[1] || 'document', mimeType: rest[2] || 'application/octet-stream' };
    }
    const parts = inner.split(':');
    return { type: 'document', mediaId: parts[0], filename: parts[1] || 'document', mimeType: parts[2] || 'application/octet-stream' };
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
  if (text.startsWith('[call:')) {
    const inner = text.slice(6, -1); // e.g. "missed:0" or "connected:120"
    const parts = inner.split(':');
    return { type: 'call', callType: parts[0] || 'unknown', duration: parts[1] || '0' };
  }
  if (text.startsWith('[reaction:')) {
    const inner = text.slice(10, -1); // e.g. "👍:msgid123"
    const emoji = inner.split(':')[0];
    return { type: 'reaction', emoji };
  }
  if (text.startsWith('[poll:')) {
    const inner = text.slice(6, -1); // e.g. "Question|Option1|Option2"
    const [question, ...options] = inner.split('|');
    return { type: 'poll', question: question || '', options };
  }
  if (text.startsWith('Button:') || text.startsWith('Selected:') || text.startsWith('Form reply:')) {
    return { type: 'interactive', text };
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
  if (text.startsWith('[reaction:')) {
    const emoji = text.slice(10, -1).split(':')[0];
    return `Reacted ${emoji}`;
  }
  if (text.startsWith('[location:')) return '📍 Location';
  if (text.startsWith('[call:')) {
    const inner = text.slice(6, -1);
    return inner.startsWith('missed') ? '📵 Missed Call' : '📞 Call';
  }
  if (text.startsWith('[poll:')) return '📊 Poll';
  return text;
}

const WA_BASE = 'https://telecrm-copy-production.up.railway.app';
function mediaUrl(mediaId: string): string {
  if (mediaId.startsWith('cached:')) {
    return WA_BASE + mediaId.slice('cached:'.length);
  }
  return WA_BASE + `/api/whatsapp/media/${mediaId}`;
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
    case 'interactive':
      return (
        <div className={cn("flex items-start gap-2", tc)}>
          <span className="text-lg">🔘</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Interactive</p>
            <p className="text-xs font-semibold">{parsed.text}</p>
          </div>
        </div>
      );

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

    case 'call': {
      const isMissed = parsed.callType === 'missed';
      const durationSec = Number(parsed.duration || 0);
      return (
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl border min-w-[160px]",
          isMissed ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            isMissed ? "bg-red-100" : "bg-green-100"
          )}>
            <Phone size={15} className={isMissed ? "text-red-500" : "text-green-600"} />
          </div>
          <div>
            <p className={cn("text-xs font-black", isMissed ? "text-red-600" : "text-green-700")}>
              {isMissed ? 'Missed Call' : 'Voice Call'}
            </p>
            {durationSec > 0 && (
              <p className="text-[10px] text-gray-400">
                {Math.floor(durationSec / 60)}m {durationSec % 60}s
              </p>
            )}
          </div>
        </div>
      );
    }

    case 'reaction':
      return (
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{parsed.emoji}</span>
          <span className={cn("text-[10px] font-bold", isOut ? "text-white/70" : "text-gray-400")}>Reaction</span>
        </div>
      );

    case 'poll':
      return (
        <div className={cn(
          "rounded-xl p-3 border min-w-[180px]",
          isOut ? "bg-white/10 border-white/20" : "bg-gray-50 border-gray-200"
        )}>
          <p className={cn("text-xs font-black mb-2 flex items-center gap-1.5", tc)}>
            📊 {parsed.question}
          </p>
          <div className="space-y-1">
            {(parsed.options || []).map((opt, i) => (
              <div key={i} className={cn(
                "text-[11px] px-2.5 py-1.5 rounded-lg border",
                isOut ? "border-white/20 text-white/80" : "border-gray-200 text-gray-600 bg-white"
              )}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      );

    default: {
      const rawText = (parsed as any).text || '';
      const rawType = (parsed as any).type || '';
      if (rawText) {
        return (
          <div className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", tc)}>
            {linkifyText(rawText)}
          </div>
        );
      }
      // Show a friendly label instead of blank/unsupported
      const typeLabels: Record<string, string> = {
        'system': '🔔 System message',
        'ephemeral': '⏱ Disappearing message',
        'unsupported': '⚠️ Unsupported message',
      };
      return (
        <div className={cn("text-xs italic opacity-60", tc)}>
          {typeLabels[rawType] || `📎 ${rawType || 'message'}`}
        </div>
      );
    }
  }
}

// ─── Contact Info Drawer ──────────────────────────────────────────────────────
function ContactInfoDrawer({ contact, messages, onClose, accountIndex = 0, contactCampaigns, saveCampaignTag, AD_CAMPAIGNS }: {
  contact: Conversation; messages: Message[]; onClose: () => void; accountIndex?: number;
  contactCampaigns: Record<string, string>; saveCampaignTag: (p: string, c: string) => void; AD_CAMPAIGNS: any[];
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
          {accountIndex === 2 && (
            <div className="mt-3 w-full px-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Ad Campaign</p>
              <select
                value={contactCampaigns[contact.contact_number] || ''}
                onChange={e => saveCampaignTag(contact.contact_number, e.target.value)}
                className="w-full text-[11px] font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 text-gray-700">
                <option value="">🎯 Select Ad Campaign</option>
                {AD_CAMPAIGNS.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          )}
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

const ACCOUNT_PHONE_IDS: Record<number, string> = {
  0: "1093345597202562",  // WA1 - AVG Prime Tech
  1: "1093345597202562",  // WA2 - AVG Prime Tech
  2: "1106116902589892",  // WA3 - Dubai (ALMANZAR)
  3: "1070621209476657",  // WA4 - India (ALMANZAR)
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhatsAppInbox({ accountIndex = 0 }: WhatsAppInboxProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const PINNED_KEY = `wa_pinned_chats_${accountIndex}`;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedAd, setSelectedAd] = useState<string>('');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [contactCampaigns, setContactCampaigns] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('wa3_campaigns') || '{}'); } catch { return {}; }
  });

  const AD_CAMPAIGNS = [
    { id: 'website', label: 'Website Development', emoji: '🌐', keywords: ['website', 'web development', 'web design', 'landing page', 'wordpress'] },
    { id: 'mobileapp', label: 'App Development', emoji: '📱', keywords: ['app', 'mobile app', 'android', 'ios', 'flutter', 'application'] },
    { id: 'playstore', label: 'Play Store & App Store Listing', emoji: '🚀', keywords: ['play store', 'app store', 'publish', 'listing', 'store listing'] },
    { id: 'web3', label: 'Web3 Development', emoji: '⛓️', keywords: ['web3', 'blockchain', 'smart contract', 'nft', 'defi', 'dao', 'solidity'] },
    { id: 'coinlisting', label: 'Crypto Coin Listing', emoji: '🪙', keywords: ['coin listing', 'token listing', 'list coin', 'list token', 'exchange listing'] },
    { id: 'exchange', label: 'Crypto Exchange Development', emoji: '💱', keywords: ['exchange', 'crypto exchange', 'trading platform', 'dex', 'cex', 'p2p'] },
  ];

  const autoDetectCampaign = (message: string): string => {
    const lower = message.toLowerCase();
    for (const ad of AD_CAMPAIGNS) {
      if (ad.keywords.some(k => lower.includes(k))) return ad.id;
    }
    return '';
  };

  const saveCampaignTag = (phone: string, campaignId: string) => {
    const updated = { ...contactCampaigns, [phone]: campaignId };
    setContactCampaigns(updated);
    localStorage.setItem('wa3_campaigns', JSON.stringify(updated));
  };
  const { searchTerm, setSearchTerm } = useSearch();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [deleteModal, setDeleteModal] = useState<'delete' | 'archive' | 'clear' | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; filename?: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
  });

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [syncingTemplates, setSyncingTemplates] = useState(false);

  const emojiRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

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
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      params.set('account', String(accountIndex));
      const res = await api.get(`/whatsapp/conversations?${params.toString()}`);
      const newConvs = Array.isArray(res.data) ? res.data : (res.data.conversations || []);
      setConversations(prev => {
        // Merge: keep selected contact's unread count at 0 if currently selected
        return newConvs.map((c: any) => {
          const existing = prev.find(p => p.contact_number === c.contact_number);
          if (existing && existing.unread_count === 0) {
            return { ...c, unread_count: 0 };
          }
          return c;
        });
      });
    } catch { } finally { setLoading(false); }
  }, [searchTerm, accountIndex]);

  const urlAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (urlAutoSelectedRef.current) return;
    const params = new URLSearchParams(location.search);
    const phone = params.get("phone");
    if (!phone || !conversations.length) return;
    const match = conversations.find(c => c.contact_number.replace(/[^0-9]/g, "").endsWith(phone.replace(/[^0-9]/g, "")));
    if (match) {
      urlAutoSelectedRef.current = true;
      setSelectedContact(match);
      setTimeout(() => window.history.replaceState({}, '', location.pathname), 1000);
    }
  }, [location.search, conversations]);

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/history/${phone}?account=${accountIndex}`);
      setMessages(res.data.messages || []);
    } catch { }
  }, [accountIndex]);

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
        components: [],
        account: accountIndex,
      });
      setShowTemplateModal(false);
      setSelectedTemplate(null);
    } catch { } finally { setSending(false); }
  };

  const handleMessage = useCallback((newMsg: Message) => {
    const myPhoneId = ACCOUNT_PHONE_IDS[accountIndex];
    if (!myPhoneId || ((newMsg as any).phone_number_id && (newMsg as any).phone_number_id !== myPhoneId)) return;
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
      // Auto-detect campaign from first inbound message
      if (newMsg.direction === 'inbound' && accountIndex === 2) {
        setContactCampaigns(prev => {
          if (prev[contactNum]) return prev;
          const detected = autoDetectCampaign((newMsg as any).message || '');
          if (detected) {
            const updated2 = { ...prev, [contactNum]: detected };
            localStorage.setItem('wa3_campaigns', JSON.stringify(updated2));
            return updated2;
          }
          return prev;
        });
      }
      return [updated, ...prev.filter(c => c.contact_number !== contactNum)];
    });
    if (selectedContact) {
      const contactNum = newMsg.direction === 'inbound' ? newMsg.from_number : newMsg.to_number;
      if (contactNum === selectedContact.contact_number) {
        setMessages(prev => prev.some(m => m.message_id === newMsg.message_id) ? prev : [...prev, newMsg]);
        if (newMsg.direction === 'inbound') api.put(`/whatsapp/mark-read/${contactNum}`).catch(() => {});
      }
    }
  }, [selectedContact, accountIndex]);

  const handleRead = useCallback(({ phone }: { phone: string }) => {
    setConversations(prev => prev.map(c => c.contact_number === phone ? { ...c, unread_count: 0 } : c));
  }, []);

  const handleStatus = useCallback(({ message_id, status }: { message_id: string; status: string }) => {
    setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, status } : m));
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    const refreshInterval = setInterval(() => {
      fetchConversations();
    }, 5000);
    socket.on('whatsapp:message', handleMessage);
    socket.on('connect', fetchConversations);
    socket.on('whatsapp:read', handleRead);
    socket.on('whatsapp:status', handleStatus);
    return () => {
      clearInterval(refreshInterval);
      socket.off('whatsapp:message', handleMessage);
      socket.off('connect', fetchConversations);
      socket.off('whatsapp:read', handleRead);
      socket.off('whatsapp:status', handleStatus);
    };
  }, [fetchConversations, fetchTemplates, handleMessage, handleRead, handleStatus]);

  const selectedContactRef = useRef<Conversation | null>(null);
  useEffect(() => {
    if (selectedContact && selectedContact.contact_number !== selectedContactRef.current?.contact_number) {
      selectedContactRef.current = selectedContact;
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
    // Optimistic update - show message instantly
    const tempMsg: Message = {
      id: Date.now(),
      message_id: `temp_${Date.now()}`,
      message_text: text,
      direction: 'outbound',
      status: 'sent',
      timestamp: new Date().toISOString(),
      contact_name: selectedContact.contact_name,
      from_number: '',
      to_number: selectedContact.contact_number,
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const res = await api.post('/whatsapp/send', {
        to: selectedContact.contact_number,
        message: text,
        contactName: selectedContact.contact_name,
        account: accountIndex,
      });
      // Replace temp message with real one if returned
      if (res.data?.message_id) {
        setMessages(prev => prev.map(m => m.message_id === tempMsg.message_id ? { ...tempMsg, message_id: res.data.message_id, status: 'delivered' } : m));
      }
    } catch {
      // Remove temp message on failure
      setMessages(prev => prev.filter(m => m.message_id !== tempMsg.message_id));
      setInput(text);
    } finally { setSending(false); }
  };

  const handleResolve = () => {
    if (!selectedContact) return;
    setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
    setSelectedContact(null);
  };

  const handleDeleteAction = async (type: 'delete' | 'archive' | 'clear') => {
    if (!selectedContact) return;
    const phone = selectedContact.contact_number.replace(/[^0-9]/g, '');
    if (type === 'clear') {
      try {
        await api.delete(`/whatsapp/conversation/${phone}`);
      } catch {}
      setMessages([]);
    } else {
      try {
        await api.delete(`/whatsapp/conversation/${phone}`);
      } catch {}
      setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
      setSelectedContact(null);
      // conversation removed from view only
    }
    setDeleteModal(null);
  };

  const handleDeleteMessage = async (msgId: number | string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await api.delete(`/whatsapp/message/${msgId}`); } catch {}
  };

  const togglePin = (phone: string) => {
    setPinnedChats(prev => {
      const next = prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone];
      try { localStorage.setItem(PINNED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const filteredConversations = conversations
    .filter(c => activeFilter === 'unread' ? c.unread_count > 0 : true)
    .filter(c => campaignFilter !== 'all' ? contactCampaigns[c.contact_number] === campaignFilter : true)
    .filter(c =>
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_number.includes(searchTerm)
    )
    .sort((a, b) => {
      const ap = pinnedChats.includes(a.contact_number);
      const bp = pinnedChats.includes(b.contact_number);
      if (ap !== bp) return ap ? -1 : 1;
      return new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime();
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
    if (status === 'read') return <CheckCheck size={13} className="text-blue-400" />;
    if (status === 'delivered') return <CheckCheck size={13} className="text-gray-400" />;
    if (status === 'sent') return <Check size={13} className="text-gray-400" />;
    return null;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const file = new File([audioBlob], 'voice_message.ogg', { type: 'audio/ogg' });
        if (!selectedContact) return;
        setUploadingFile(true);
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('to', selectedContact.contact_number);
          fd.append('contactName', selectedContact.contact_name || selectedContact.contact_number);
          fd.append('account', String(accountIndex));
          await api.post('/whatsapp/send-media', fd);
          fetchMessages(selectedContact.contact_number);
        } catch(err) { console.error('Voice upload failed', err); }
        finally { setUploadingFile(false); }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch(err) { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; msgId: number | string } | null>(null);

  const accountLabel = accountIndex === 0 ? 'WhatsApp' : accountIndex === 1 ? 'WhatsApp 2' : 'WhatsApp 3';
  const accountColor = accountIndex === 0 ? 'text-blue-600' : accountIndex === 1 ? 'text-green-600' : 'text-purple-600';

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      <div className="w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                Whats<span className={accountColor}>App{accountIndex === 1 ? ' 2' : ''}</span>
              </h2>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full leading-none">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { const routes = ['/app/whatsapp','/app/whatsapp2','/app/whatsapp3','/app/whatsapp4']; navigate(routes[(accountIndex + 1) % 4]); }}
                className="px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors mr-1"
                title={accountIndex === 0 ? 'Switch to WhatsApp 2' : 'Switch to WhatsApp 1'}
              >
                {`WA ${accountIndex + 1} → WA ${(accountIndex + 1) % 4 + 1}`}
              </button>
              <div className="relative" ref={filterRef}>
                <button onClick={() => setShowFilterMenu(v => !v)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
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
                            activeFilter === val ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50")}>
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
              <div className="relative" ref={dotsRef}>
                <button onClick={() => setShowDotsMenu(v => !v)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <MoreVertical size={15} />
                </button>
                <AnimatePresence>
                  {showDotsMenu && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 w-48 py-1 overflow-hidden">
                      {[
                        { label: 'Export Conversations', icon: Download, action: () => { if (!conversations.length) return; const rows = ["Name,Number,Last Message,Last Time,Unread", ...conversations.map(c => '"' + (c.contact_name || '') + '","' + c.contact_number + '","' + (c.last_message || '').replace(/"/g, "'") + '","' + c.last_timestamp + '","' + (Number(c.unread_count) || 0) + '"')].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" })); a.download = "whatsapp_conversations.csv"; a.click(); } },
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
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none text-xs font-bold text-gray-900" />
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors",
                  activeFilter === f ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                {f === 'all' ? 'All' : `Unread${totalUnread > 0 ? ` (${totalUnread})` : ''}`}
              </button>
            ))}
            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="text-[10px] font-black bg-white border-2 border-blue-200 rounded-full px-2 py-1 focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer uppercase">
              <option value="all">🎯 All Ads</option>
              <option value="website">🌐 Website Dev</option>
              <option value="mobileapp">📱 App Dev</option>
              <option value="playstore">🚀 Play Store</option>
              <option value="web3">⛓️ Web3</option>
              <option value="coinlisting">🪙 Coin Listing</option>
              <option value="exchange">💱 Crypto Exchange</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 gap-3">
              <MessageSquare size={28} className="text-gray-200" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No conversations</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isPinned = pinnedChats.includes(conv.contact_number);
              return (
                <div key={conv.contact_number}
                  onClick={() => selectContact(conv)}
                  className={cn("px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-gray-50 transition-all hover:bg-gray-50",
                    selectedContact?.contact_number === conv.contact_number ? "bg-blue-50 border-l-4 border-l-blue-500" : "")}>
                  <div className="relative shrink-0">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm",
                      conv.last_direction === 'inbound' ? "bg-blue-500" : "bg-gray-400")}>
                      {conv.contact_name?.[0]?.toUpperCase() || conv.contact_number.slice(-1)}
                    </div>
                    {isPinned && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-black text-gray-900 truncate flex items-center gap-1">
                        {isPinned && <Star size={9} className="text-yellow-400 shrink-0" fill="currentColor" />}
                        <span className="flex items-center gap-1">
                          {conv.contact_name || conv.contact_number}
                          {accountIndex === 2 && contactCampaigns[conv.contact_number] && (
                            <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                              {AD_CAMPAIGNS.find(a => a.id === contactCampaigns[conv.contact_number])?.emoji}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-[9px] text-gray-400 shrink-0 ml-2">{formatTime(conv.last_timestamp)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-500 truncate max-w-[80%]">{previewMessage(conv.last_message)}</p>
                      {(Number(conv.unread_count) || 0) > 0 && (
                        <span className="w-4 h-4 bg-blue-500 text-white text-[8px] font-black flex items-center justify-center rounded-full shrink-0">
                          {Number(conv.unread_count) > 9 ? '9+' : Number(conv.unread_count)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex-1 flex min-w-0">
        {selectedContact ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
                  {selectedContact.contact_name?.[0]?.toUpperCase() || selectedContact.contact_number.slice(-1)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">{selectedContact.contact_name || selectedContact.contact_number}</h3>
                  <p className="text-[10px] text-gray-500">{selectedContact.contact_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleResolve} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[11px] font-black hover:bg-blue-600 transition-colors">
                  <Check size={12} /> Resolve
                </button>
                <button onClick={() => setShowContactInfo(v => !v)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <Info size={17} />
                </button>
                <div className="relative" ref={chatMenuRef}>
                  <button onClick={() => setShowChatMenu(v => !v)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
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
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { setDeleteModal('clear'); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-50">
                          <XCircle size={13} />Clear Chat
                        </button>
                        <button onClick={() => { setDeleteModal('delete'); setShowChatMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50">
                          <Trash2 size={13} />Delete Chat
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f0f2f5]">
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
                      <div className={cn("max-w-[68%] p-3 px-3.5 rounded-2xl shadow-sm",
                        isOut ? "bg-blue-500 text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm border border-gray-100")}>
                        <MessageContent parsed={parsed} isOut={isOut}
                          onMediaClick={(url, type, filename) => setMediaPreview({ url, type, filename })} />
                        <div className="flex items-center justify-end mt-1 gap-1">
                          <span className={cn("text-[10px]", isOut ? "text-blue-200" : "text-gray-400")}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                          </span>
                          {isOut && <StatusIcon status={m.status} direction="outbound" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1 shrink-0 pb-1.5">
                  <div className="relative" ref={emojiRef}>
                    <button onClick={() => setShowEmojiPicker(v => !v)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Smile size={19} />
                    </button>
                    <AnimatePresence>
                      {showEmojiPicker && <EmojiPicker onSelect={e => setInput(prev => prev + e)} onClose={() => setShowEmojiPicker(false)} />}
                    </AnimatePresence>
                  </div>

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
                        fd.append('account', String(accountIndex));
                        await api.post('/whatsapp/send-media', fd);
                        fetchMessages(selectedContact.contact_number);
                      } catch(err) { console.error('Upload failed', err); }
                      finally { setUploadingFile(false); }
                    }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                    <Paperclip size={19} />
                  </button>
                  <button onClick={isRecording ? stopRecording : startRecording}
                    className={cn("p-2 rounded-lg transition-colors", isRecording ? "text-red-500 bg-red-50 animate-pulse" : "text-gray-400 hover:text-red-500")}>
                    {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
                  </button>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {accountIndex === 2 && (
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedAd}
                        onChange={e => {
                          const ad = e.target.value;
                          setSelectedAd(ad);
                          if (ad && AVG_AD_MESSAGES[ad]) {
                            setInput(AVG_AD_MESSAGES[ad].message);
                          } else {
                            setInput('');
                          }
                        }}
                        className="text-[11px] font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-400 text-gray-700 w-full">
                        <option value="">🎯 Select Ad Campaign...</option>
                        {Object.entries(AVG_AD_MESSAGES).map(([name, val]) => (
                          <option key={name} value={name}>{val.emoji} {name}</option>
                        ))}
                      </select>
                      {selectedAd && (
                        <button onClick={() => { setSelectedAd(''); setInput(''); }}
                          className="text-[10px] text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg border border-gray-200 bg-white whitespace-nowrap">
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  )}
                  <div className="bg-gray-100 rounded-2xl overflow-hidden">
                    <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder={accountIndex === 2 ? "Select an ad above or type a message..." : "Type a message..."}
                      style={{ minHeight: 42, maxHeight: 120, resize: 'none' }}
                      className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none text-gray-900" />
                  </div>
                </div>
                <button onClick={handleSendMessage} disabled={!input.trim() || sending}
                  className="shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 shadow-md hover:bg-blue-600 transition-colors">
                  {sending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                </button>
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
        <AnimatePresence>
          {showContactInfo && selectedContact && (
            <ContactInfoDrawer contact={selectedContact} messages={messages} onClose={() => setShowContactInfo(false)} accountIndex={accountIndex} contactCampaigns={contactCampaigns} saveCampaignTag={saveCampaignTag} AD_CAMPAIGNS={AD_CAMPAIGNS} />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden relative z-10 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-base font-black text-gray-900 uppercase">Message Templates</h3>
                <div className="flex items-center gap-2">
                  <button onClick={handleSyncTemplates} disabled={syncingTemplates}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-[10px] font-black text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                    <RefreshCw size={11} className={cn(syncingTemplates && "animate-spin")} />
                    {syncingTemplates ? 'Syncing...' : 'Sync Meta'}
                  </button>
                  <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-700 p-1">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex">
                <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4 space-y-2">
                  {templates.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-[9px] font-black uppercase">No templates. Click Sync Meta.</p>
                    </div>
                  ) : templates.map(tpl => (
                    <div key={tpl.id} onClick={() => setSelectedTemplate(tpl)}
                      className={cn("p-3 rounded-xl border cursor-pointer transition-all",
                        selectedTemplate?.id === tpl.id ? "bg-blue-50 border-blue-300" : "bg-white border-gray-100 hover:border-blue-200")}>
                      <h4 className="text-xs font-black text-gray-900">{tpl.name}</h4>
                      <span className="text-[8px] text-gray-400 uppercase">{tpl.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-gray-50 p-5 flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    {selectedTemplate ? (
                      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 w-full max-w-xs">
                        {selectedTemplate.components?.map((comp: any, i: number) => (
                          <div key={i} className="mb-3">
                            {comp.type === 'BODY' && <div className="text-xs text-gray-600 whitespace-pre-wrap">{comp.text}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-300">
                        <ShieldAlert size={36} className="mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase">Select a template to preview</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <button disabled={!selectedTemplate || sending} onClick={handleSendTemplate}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-xl text-xs font-black disabled:opacity-50 hover:bg-blue-600 transition-colors">
                      <Send size={13} />{sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModal && (
          <DeleteModal type={deleteModal} onCancel={() => setDeleteModal(null)} onConfirm={() => handleDeleteAction(deleteModal)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mediaPreview && (
          <MediaPreviewModal url={mediaPreview.url} type={mediaPreview.type} filename={mediaPreview.filename} onClose={() => setMediaPreview(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}