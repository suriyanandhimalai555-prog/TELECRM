import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import appLogo from '../../assets/images/icon.png';
import { ConfirmModal } from '../common/ConfirmModal';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigate: (tab: string, linkId?: string | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar, setActiveTab, onNavigate }) => {
  const { user, logout, quickSwitch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const userInitials = user?.fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      await api.seed.reset();
      addToast('success', 'Database Reset', 'Sample data and demo users re-seeded successfully.');
      window.location.reload();
    } catch (e: any) {
      addToast('error', 'Reset Error', e.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <img
                src={appLogo}
                alt="WorkTracker Logo"
                className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-700/60 p-0.5 shadow-md shrink-0"
              />
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight block leading-tight">
                  WorkTracker
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider uppercase block">
                  Enterprise Platform
                </span>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3">
            <NotificationBell onNavigate={onNavigate} />

            {/* Dark/Light mode toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* User Profile Info */}
            {user && (
              <div className="flex items-center space-x-3 pl-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  title="Open profile settings"
                  className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800 hover:ring-2 hover:ring-indigo-500 transition-colors"
                >
                  {userInitials}
                </button>
                <button type="button" onClick={() => setActiveTab('profile')} className="hidden md:block text-left hover:opacity-75">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.fullName}</p>
                </button>

                <Button id="logout-btn" variant="ghost" size="sm" onClick={() => setIsLogoutConfirmOpen(true)} icon={<LogOut className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={logout}
        title="Log out?"
        message="Are you sure you want to log out? You will need to sign in again to continue."
        confirmLabel="Log out"
        variant="danger"
      />
    </header>
  );
};
