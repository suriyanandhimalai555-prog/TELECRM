import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '../services/api';

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

  const addNotification = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Poll for new tasks due today as notifications
  useEffect(() => {
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
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead,
      clearNotifications 
    }}>
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
