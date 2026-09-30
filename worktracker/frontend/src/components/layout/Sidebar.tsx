import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  CheckSquare,
  Users,
  Settings,
  HelpCircle,
  Inbox,
  Home,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  pendingCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

function buildNavItems(role: string): NavItem[] {
  const isMD = ['super_admin', 'admin'].includes(role);
  const isHR = role === 'manager';
  const isEmployee = role === 'employee';

  const items: NavItem[] = [
    { id: 'home', label: 'Dashboard', icon: Home, description: 'EOD status overview' },
  ];

  if (isMD) {
    items.push(
      { id: 'approvals', label: 'Team Approvals', icon: CheckSquare, description: 'Review pending submissions' },
      { id: 'works', label: 'Daily Work History', icon: FileText, description: 'Log and track work entries' },
      { id: 'dashboard', label: 'Analytics & Stats', icon: BarChart3, description: 'Hours & productivity metrics' },
      { id: 'users', label: 'User Management', icon: Users, description: 'Roles, teams & permissions' },
    );
  } else if (isHR) {
    items.push(
      { id: 'employee-list', label: 'Employee List', icon: Users, description: 'View and create employees' },
      { id: 'works', label: 'Daily Work History', icon: FileText, description: 'Log and track work entries' },
      { id: 'approvals', label: 'Team Approvals', icon: CheckSquare, description: 'Review pending submissions' },
      { id: 'employee-queries', label: 'Employee Queries', icon: Inbox, description: 'Helpdesk requests from staff' },
      { id: 'dashboard', label: 'Analytics & Stats', icon: BarChart3, description: 'Hours & productivity metrics' },
    );
  } else if (isEmployee) {
    items.push(
      { id: 'dashboard', label: 'Analytics & Stats', icon: BarChart3, description: 'Hours & productivity metrics' },
      { id: 'raise-query', label: 'Raise a Query', icon: HelpCircle, description: 'Send a request to HR' },
    );
  }

  items.push({ id: 'profile', label: 'Profile', icon: Settings, description: 'Manage your profile' });

  return items;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  pendingCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = buildNavItems(user.role);

  const sidebarContent = (
    <div className="flex flex-col h-full py-5 px-4 space-y-6">
      <nav className="flex-1 space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isApprovalTab = item.id === 'approvals';

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 text-left ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div>
                  <span className="text-sm block leading-tight">{item.label}</span>
                </div>
              </div>

              {isApprovalTab && pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
        <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Signed in as</p>
        <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{user.fullName}</p>
        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{user.department} Dept.</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-full bg-white dark:bg-slate-900 h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
