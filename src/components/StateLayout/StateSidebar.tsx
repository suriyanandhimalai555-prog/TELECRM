import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CheckSquare, StickyNote, MessageSquare,
  Target, BarChart3, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Briefcase, UserCog, Phone, GitBranch, Contact, Bell, BellRing,
  Shield, ShieldCheck, MapPin, Clock, Sliders, LogOut, Layers,
} from 'lucide-react';

interface StateSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

type NavItem = {
  name: string;
  path?: string;
  icon: any;
  children?: { name: string; path: string; icon: any }[];
};

const navItems: NavItem[] = [
  { name: 'Dashboard',      path: '/state-crm',        icon: LayoutDashboard },
  { name: 'Users',          path: '/state-crm/users',         icon: UserCog },
  { name: 'States',         path: '/state-crm/states',         icon: MapPin },
  { name: 'Leads',          path: '/state-crm/leads',         icon: Users },
  { name: 'Tasks',          path: '/state-crm/tasks',         icon: CheckSquare },
  { name: 'Projects',       path: '/state-crm/projects',         icon: Briefcase },
  { name: 'Notes',          path: '/state-crm/notes',         icon: StickyNote },
  { name: 'Calls',          path: '/state-crm/calls',         icon: Phone },
  { name: 'WhatsApp',       path: '/state-crm/whatsapp',         icon: MessageSquare },
  { name: 'Campaigns',      path: '/state-crm/campaigns',        icon: Target },
  { name: 'Reports',        path: '/state-crm/reports',         icon: BarChart3 },
  { name: 'Pipeline',       path: '/state-crm/pipeline',         icon: GitBranch },
  { name: 'Contacts',       path: '/state-crm/contacts',         icon: Contact },
  { name: 'Notifications',  path: '/state-crm/notifications',    icon: Bell },
  { name: 'Admin',          path: '/state-crm/admin',         icon: Shield },
  { name: 'Team',           path: '/state-crm/team',         icon: Users },
  { name: 'Reminders',      path: '/state-crm/reminders',        icon: BellRing },
  { name: 'Custom Fields',  path: '/state-crm/custom-fields',    icon: Sliders },
  { name: 'Roles',          path: '/state-crm/roles',         icon: ShieldCheck },
  {
    name: 'Attendance',
    icon: Clock,
    children: [
      { name: 'Attendance', path: '/state-crm/attendance', icon: Clock },
      { name: 'Work Sprint', path: '/state-crm/worksprint', icon: Layers },
    ],
  },
  { name: 'Field Force',    path: '/state-crm/fieldforce',       icon: MapPin },
  { name: 'Settings',       path: '/state-crm/settings',         icon: Settings },
];

export default function StateSidebar({ isOpen, setIsOpen, onLogout }: StateSidebarProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<string | null>(() => {
    const active = navItems.find(i => i.children?.some(c => location.pathname.startsWith(c.path)));
    return active ? active.name : null;
  });

  return (
    <aside className={`bg-white border-r border-gray-100 transition-all duration-300 ${isOpen ? 'w-60' : 'w-20'} flex-shrink-0 flex flex-col h-screen sticky top-0`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 flex-shrink-0">
        {isOpen && (
          <div className="flex items-center">
            <img src="/logo.png" alt="AVG CRM" className="w-10 h-10 object-contain mr-2" />
            <span className="text-base font-black text-gray-900 tracking-tighter uppercase">
              STATE<span className="text-red-500">CRM</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 transition-all ${!isOpen && 'mx-auto'}`}
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => {
          if (item.children) {
            const isExpanded = expanded === item.name;
            const childActive = item.children.some(c => location.pathname.startsWith(c.path));
            return (
              <div key={item.name}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    childActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={18} />
                  {isOpen && <span className="truncate flex-1 text-left">{item.name}</span>}
                  {isOpen && <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                </button>
                {isOpen && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-gray-100 pl-3">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'
                          }`
                        }
                      >
                        <child.icon size={14} />
                        <span className="truncate">{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.path === '/state-crm'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                }`
              }
            >
              <item.icon size={18} />
              {isOpen && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50"
        >
          <LogOut size={18} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
