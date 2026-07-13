import { useState } from 'react';
import { LogOut, Bell, Search, X, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion } from 'motion/react';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { logout } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-6 md:px-8 shrink-0 z-30 relative overflow-visible">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500 to-green-700 shadow-[0_0_10px_rgba(22,163,74,0.5)]" />

      <div className="flex items-center flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 mr-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-aura-red transition-colors shrink-0"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className={`relative flex-1 max-w-lg group ${isSearchOpen ? 'block' : 'hidden sm:block'}`}>
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

        {!isSearchOpen && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl text-gray-400 hover:text-aura-red hover:bg-aura-red/5 transition-colors"
            aria-label="Open search"
          >
            <Search size={18} />
          </button>
        )}
        {isSearchOpen && (
          <button
            onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
            className="sm:hidden p-2 ml-1 rounded-xl text-gray-400 hover:text-aura-red hover:bg-aura-red/5 transition-colors shrink-0"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-1 sm:space-x-4 ml-2">
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

        <div className="h-6 w-px bg-gray-100 mx-1 hidden sm:block"></div>

        <motion.button
          whileHover={{ x: 3, color: 'var(--color-aura-red)' }}
          whileTap={{ scale: 0.95 }}
          onClick={logout}
          className="flex items-center text-gray-400 font-black uppercase tracking-widest text-[10px] group transition-colors px-2 sm:px-3 py-2 hover:bg-gray-50 rounded-xl"
        >
          <LogOut size={16} className="sm:mr-2 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Exit</span>
        </motion.button>
      </div>
    </header>
  );
}
