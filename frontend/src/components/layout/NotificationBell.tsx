import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../services/api';
import { AppNotification } from '../../types';

interface NotificationBellProps {
  onNavigate: (tab: string, linkId?: string | null) => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, countRes] = await Promise.all([api.notifications.list(), api.notifications.unreadCount()]);
      setItems(list);
      setUnread(countRes.count);
    } catch {
      // Keep previous notifications if polling fails
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleOpenItem = async (item: AppNotification) => {
    try {
      if (!item.isRead) await api.notifications.markRead(item.id);
    } catch {
      // Continue navigation even if mark-read fails
    }
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - (item.isRead ? 0 : 1)));
    setOpen(false);
    if (item.linkTab) onNavigate(item.linkTab, item.linkId);
  };

  const handleMarkAll = async () => {
    try {
      await api.notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={handleMarkAll} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[24rem]">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenItem(item)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    item.isRead ? '' : 'bg-indigo-50/70 dark:bg-indigo-950/30'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
