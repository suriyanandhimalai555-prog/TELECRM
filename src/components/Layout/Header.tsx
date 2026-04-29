import { useState } from 'react';
import { LogOut, Bell, Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion } from 'motion/react';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ }: HeaderProps) {
  const { logout } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-30 relative overflow-visible">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-aura-red to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
      
      <div className="flex items-center flex-1">
        <div className="relative w-72 max-w-lg group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aura-red transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search Intelligence..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-11 py-2 bg-gray-50/50 border border-transparent focus:border-aura-red/30 rounded-xl focus:outline-none focus:bg-white text-xs font-bold tracking-tight transition-all text-gray-900 placeholder-gray-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-aura-red transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-2 rounded-xl relative transition-all ${isNotificationsOpen ? 'bg-aura-red/10 text-aura-red' : 'text-gray-400 hover:text-aura-red hover:bg-aura-red/5'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-aura-red rounded-full border-2 border-white animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
            )}
          </motion.button>
          
          <NotificationDropdown 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
          />
        </div>
        
        <div className="h-6 w-px bg-gray-100 mx-1"></div>
        
        <motion.button 
          whileHover={{ x: 3, color: 'var(--color-aura-red)' }}
          whileTap={{ scale: 0.95 }}
          onClick={logout}
          className="flex items-center text-gray-400 font-black uppercase tracking-widest text-[10px] group transition-colors px-3 py-2 hover:bg-gray-50 rounded-xl"
        >
          <LogOut size={16} className="mr-2 group-hover:rotate-12 transition-transform" />
          <span>Exit</span>
        </motion.button>
      </div>
    </header>
  );
}
