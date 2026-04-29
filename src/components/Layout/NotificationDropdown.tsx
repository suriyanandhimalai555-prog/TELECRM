import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Trash2, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotifications, Notification } from '../../context/NotificationContext';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertCircle className="text-aura-red" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center">
                <Bell size={18} className="text-aura-red mr-2" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                  Intelligence <span className="text-aura-red">Feed</span>
                </h3>
                {unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-aura-red text-white text-[8px] font-black rounded-md">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={markAllAsRead}
                  className="p-1 text-gray-400 hover:text-aura-red transition-colors"
                  title="Mark all as read"
                >
                  <Check size={16} />
                </button>
                <button 
                  onClick={clearNotifications}
                  className="p-1 text-gray-400 hover:text-aura-red transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto no-scrollbar py-2">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-2 ${n.read ? 'border-transparent' : 'border-aura-red bg-aura-red/[0.02]'}`}
                  >
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[10px] font-black uppercase tracking-tight ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 leading-tight mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[8px] text-gray-300 mt-1 uppercase font-black">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <Bell className="mx-auto text-gray-200 mb-3" size={32} />
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                    The frequency is silent
                  </p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-50 bg-gray-50/30 text-center">
                <button 
                  className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-aura-red transition-colors"
                  onClick={onClose}
                >
                  Close Transmissions
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
