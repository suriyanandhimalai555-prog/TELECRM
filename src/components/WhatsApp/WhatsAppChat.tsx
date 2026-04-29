import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Check, CheckCheck, X } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
}

export default function WhatsAppChat({ phone, name, onClose }: { phone: string; name: string; onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/whatsapp/history/${cleanPhone}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!phone) return;
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !phone || sending) return;

    const text = input.trim();
    setSending(true);
    setInput("");

    try {
      await api.post('/whatsapp/send', { 
        to: cleanPhone, 
        message: text, 
        contactName: name 
      });
      fetchHistory();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'read': return <CheckCheck size={12} className="text-red-400" />;
      case 'delivered': return <CheckCheck size={12} className="text-gray-400" />;
      case 'sent': return <Check size={12} className="text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-aura-red p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-black">
            {name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="text-white font-black text-sm uppercase tracking-tight">{name || "Customer"}</div>
            <div className="flex items-center text-white/70 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2" />
              +{phone}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <MessageSquare className="text-white/50" size={20} />
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5] custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Fetching Pulse...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[10px] font-black text-gray-400 uppercase tracking-widest space-y-2 opacity-50">
            <MessageSquare size={32} strokeWidth={3} />
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.direction === 'outbound' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] p-3 shadow-sm",
                m.direction === 'outbound' 
                  ? "bg-aura-red text-white rounded-t-2xl rounded-bl-2xl" 
                  : "bg-white text-gray-800 rounded-t-2xl rounded-br-2xl"
              )}>
                <p className="text-xs font-bold leading-relaxed">{m.message_text}</p>
                <div className={cn("flex items-center justify-end mt-1 space-x-1", m.direction === 'outbound' ? "text-white/60" : "text-gray-400")}>
                  <span className="text-[9px] font-bold">{formatTime(m.timestamp)}</span>
                  {m.direction === 'outbound' && <StatusIcon status={m.status} />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center space-x-2">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Compose message..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-aura-red resize-none transition-all"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-aura-red text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-aura-red/20"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </motion.button>
      </div>
    </div>
  );
}
