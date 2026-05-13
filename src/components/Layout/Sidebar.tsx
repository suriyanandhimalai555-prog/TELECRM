import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  CheckSquare, 
  StickyNote, 
  MessageSquare, 
  Target, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard',    path: '/',           icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Leads',        path: '/leads',       icon: Users,           roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Call History', path: '/calls',       icon: Phone,           roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Tasks',        path: '/tasks',       icon: CheckSquare,     roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Projects',     path: '/projects',    icon: Briefcase,       roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Notes',        path: '/notes',       icon: StickyNote,      roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'WhatsApp',     path: '/whatsapp',    icon: MessageSquare,   roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'WhatsApp 2',   path: '/whatsapp2',   icon: MessageSquare,   roles: ['ADMIN', 'MANAGER'] },
    { name: 'Campaigns',    path: '/campaigns',   icon: Target,          roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { name: 'Reports',      path: '/reports',     icon: BarChart3,       roles: ['ADMIN', 'MANAGER'] },
    { name: 'Settings',     path: '/settings',    icon: Settings,        roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  ];

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 80 }}
      className="bg-white border-r border-gray-100 flex flex-col h-full relative z-20 shadow-sm"
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center"
          >
            <div className="flex items-center mr-2">
              <img src="/logo.png" alt="AVG CRM" className="w-14 h-14 object-contain" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tighter uppercase">
              AVG<span className="text-aura-red">CRM</span>
            </span>
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-aura-red transition-all",
            !isOpen && "mx-auto"
          )}
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </motion.button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {filteredNavItems.map((item) => {
          const isWhatsAppEmployee = item.path === '/whatsapp' && user?.role === 'EMPLOYEE';

          if (isWhatsAppEmployee) {
            return (
              <button
                key={item.path}
                onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                className="w-full flex items-center px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              >
                <div className={cn("min-w-[20px] transition-transform group-hover:scale-110", isOpen ? "mr-3" : "mx-auto")}>
                  <item.icon size={18} />
                </div>
                {isOpen && (
                  <span className="font-black uppercase tracking-widest text-[9px]">
                    {item.name}
                  </span>
                )}
              </button>
            );
          }

          const isWA2 = item.path === '/whatsapp2';

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                isActive
                  ? isWA2
                    ? "bg-green-50 text-green-600 shadow-sm font-bold"
                    : "bg-blue-50 text-blue-600 shadow-sm font-bold"
                  : isWA2
                    ? "text-gray-500 hover:bg-green-50 hover:text-green-600"
                    : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              )}
            >
              <div className={cn(
                "min-w-[20px] transition-transform group-hover:scale-110 relative",
                isOpen ? "mr-3" : "mx-auto"
              )}>
                <item.icon size={18} />
                {isWA2 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                )}
              </div>
              {isOpen && (
                <span className="font-black uppercase tracking-widest text-[9px]">
                  {item.name}
                </span>
              )}
              {location.pathname === item.path && (
                <motion.div
                  layoutId={isWA2 ? "sidebar-active-wa2" : "sidebar-active"}
                  className={cn(
                    "absolute right-0 top-1/4 bottom-1/4 w-1 rounded-full shadow-sm",
                    isWA2 ? "bg-green-500" : "bg-[#3b9eff]"
                  )}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className={cn(
          "flex items-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors",
          !isOpen && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-lg bg-aura-red/5 text-aura-red font-black text-sm border border-aura-red/10 flex items-center justify-center">
            {user?.name?.charAt(0)}
          </div>
          {isOpen && (
            <div className="ml-3 overflow-hidden">
              <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tighter">{user?.name}</p>
              <p className="text-[8px] font-bold text-gray-400 truncate uppercase tracking-widest">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}