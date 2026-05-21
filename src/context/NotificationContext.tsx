import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../hooks/useAuth';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'System Alert',
      message: 'Welcome to AVG CRM Dashboard. All systems operational.',
      type: 'info',
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      title: 'New Lead',
      message: 'A new lead has been synchronized from the website.',
      type: 'success',
      timestamp: new Date(Date.now() - 3600000),
      read: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const { user } = useAuth();

  // Poll for new tasks due today as notifications
  useEffect(() => {
    if (!user) return;

    const checkTasks = async () => {
      try {
        const res = await api.get('/tasks');
        const tasks = res.data;
        const today = new Date().toISOString().split('T')[0];
        const dueToday = tasks.filter((t: any) => t.status === 'OPEN' && t.due_date.startsWith(today));
        
        if (dueToday.length > 0) {
          addNotification({
            title: 'Tasks Due Today',
            message: `You have ${dueToday.length} tasks scheduled for today.`,
            type: 'warning'
          });
        }
      } catch (err) {
        // Silently fail
      }
    };
    
    checkTasks();
    const interval = setInterval(checkTasks, 300000); // Every 5 mins

    // Listen for WhatsApp messages
    const handlePAMessage = (msg: any) => {
      if (msg.direction === 'inbound') {
        addNotification({
          title: 'WhatsApp Message',
          message: `New message from ${msg.contact_name || msg.contact_number}`,
          type: 'info'
        });
        
        // Browser notification if supported
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`AVG CRM: New message from ${msg.contact_name || msg.contact_number}`, {
            body: msg.message_text
          });
        }
      }
    };

    socket.on('whatsapp:message', handlePAMessage);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearInterval(interval);
      socket.off('whatsapp:message', handlePAMessage);
    };
  }, [addNotification, user]);

  const value = useMemo(() => ({ 
    notifications, 
    unreadCount, 
    addNotification, 
    markAsRead, 
    markAllAsRead,
    clearNotifications 
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
