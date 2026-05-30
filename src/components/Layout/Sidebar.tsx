import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, CheckSquare, StickyNote, MessageSquare, 
  Target, BarChart3, Settings, ChevronLeft, ChevronRight,
  Briefcase, Building2, UserCog, ChevronDown, Phone,
  GitBranch, Contact, Plug, Bell, Workflow, Shield, MapPin,
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
  const [waExpanded, setWaExpanded] = useState(
    location.pathname === '/whatsapp' || location.pathname === '/whatsapp2'
  );

  const masterAdminNav = [
    { name: 'Dashboard',  path: '/',          icon: LayoutDashboard },
    { name: 'Companies',  path: '/companies', icon: Building2 },
    { name: 'Users',      path: '/users',     icon: UserCog },
    { name: 'Reports',    path: '/reports',   icon: BarChart3 },
    { name: 'Settings',   path: '/settings',  icon: Settings },
  ];

  const companyNav = [
    { name: 'Dashboard',  path: '/',          icon: LayoutDashboard, roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Users',      path: '/users',     icon: UserCog,         roles: ['company_admin'] },
    { name: 'Leads',      path: '/leads',     icon: Users,           roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Tasks',      path: '/tasks',     icon: CheckSquare,     roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Projects',   path: '/projects',  icon: Briefcase,       roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Notes',      path: '/notes',     icon: StickyNote,      roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Calls',      path: '/calls',     icon: Phone,           roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'WhatsApp',   path: '/whatsapp',  icon: MessageSquare,   roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'], isWA: true },
    { name: 'Campaigns',  path: '/campaigns', icon: Target,          roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Reports',    path: '/reports',   icon: BarChart3,       roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Pipeline',     path: '/pipeline',      icon: GitBranch,  roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Contacts',     path: '/contacts',      icon: Contact,    roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Workflow',     path: '/workflow',      icon: Workflow,   roles: ['company_admin','ADMIN'] },
    { name: 'Integrations', path: '/integrations',  icon: Plug,       roles: ['company_admin','ADMIN'] },
    { name: 'Notifications',path: '/notifications', icon: Bell,       roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Admin',        path: '/admin',         icon: Shield,     roles: ['company_admin','ADMIN'] },
    { name: 'Team',          path: '/team',          icon: Users,      roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Field Force',   path: '/fieldforce',    icon: MapPin,     roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Settings',     path: '/settings',      icon: Settings,   roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
  ];

  const isMasterAdmin = user?.role === 'master_admin';
  const isEmployee = user?.role === 'EMPLOYEE' || user?.role === 'employee';
  const hasWA2 = ['company_admin','ADMIN','MANAGER'].includes(user?.role || '');
  const navItems = isMasterAdmin
    ? masterAdminNav
    : companyNav.filter(item => user && item.roles.includes(user.role));

  const isWAActive = location.pathname === '/whatsapp' || location.pathname === '/whatsapp2';

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 80 }}
      className="bg-white border-r border-gray-100 flex flex-col h-full relative z-20 shadow-sm"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center">
            <img src="/logo.png" alt="AVG CRM" className="w-14 h-14 object-contain mr-2" />
            <span className="text-lg font-black text-gray-900 tracking-tighter uppercase">
              AVG<span className="text-red-500">CRM</span>
            </span>
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn("p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 transition-all", !isOpen && "mx-auto")}
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </motion.button>
      </div>

      {/* Master Admin badge */}
      {isMasterAdmin && isOpen && (
        <div className="px-4 py-2 border-b border-gray-100">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-red-50 text-red-600 rounded-lg">
            Master Admin
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          if ((item as any).isWA) {
            // WhatsApp with dropdown
            return (
              <div key="whatsapp-group">
                {isEmployee ? (
                  <button
                    onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                    className="w-full flex items-center px-4 py-2.5 rounded-xl transition-all group text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <div className={cn("min-w-[20px]", isOpen ? "mr-3" : "mx-auto")}>
                      <MessageSquare size={18} />
                    </div>
                    {isOpen && <span className="font-black uppercase tracking-widest text-[9px]">WhatsApp</span>}
                  </button>
                ) : hasWA2 ? (
                  <>
                    {/* Dropdown trigger */}
                    <button
                      onClick={() => setWaExpanded(!waExpanded)}
                      className={cn(
                        "w-full flex items-center px-4 py-2.5 rounded-xl transition-all group",
                        isWAActive ? "bg-green-50 text-green-600 font-bold" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                      )}
                    >
                      <div className={cn("min-w-[20px]", isOpen ? "mr-3" : "mx-auto")}>
                        <MessageSquare size={18} />
                      </div>
                      {isOpen && (
                        <>
                          <span className="font-black uppercase tracking-widest text-[9px] flex-1 text-left">WhatsApp</span>
                          <ChevronDown size={13} className={cn("transition-transform", waExpanded && "rotate-180")} />
                        </>
                      )}
                    </button>

                    {/* Dropdown items */}
                    <AnimatePresence>
                      {waExpanded && isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden ml-4"
                        >
                          <NavLink
                            to="/whatsapp"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                            WA Account 1
                          </NavLink>
                          <NavLink
                            to="/whatsapp2"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                            WA Account 2
                          </NavLink>
                          <NavLink
                            to="/whatsapp3"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                            WA Account 3
                          </NavLink>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <NavLink
                    to="/whatsapp"
                    className={({ isActive }) => cn(
                      "flex items-center px-4 py-2.5 rounded-xl transition-all",
                      isActive ? "bg-green-50 text-green-600 font-bold" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                    )}
                  >
                    <div className={cn("min-w-[20px]", isOpen ? "mr-3" : "mx-auto")}>
                      <MessageSquare size={18} />
                    </div>
                    {isOpen && <span className="font-black uppercase tracking-widest text-[9px]">WhatsApp</span>}
                  </NavLink>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                isActive
                  ? "bg-blue-50 text-blue-600 shadow-sm font-bold"
                  : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
              )}
            >
              <div className={cn("min-w-[20px] transition-transform group-hover:scale-110 relative", isOpen ? "mr-3" : "mx-auto")}>
                <item.icon size={18} />
              </div>
              {isOpen && <span className="font-black uppercase tracking-widest text-[9px]">{item.name}</span>}
              {location.pathname === item.path && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute right-0 top-1/4 bottom-1/4 w-1 rounded-full bg-[#3b9eff] shadow-sm"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-100">
        <div className={cn("flex items-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors", !isOpen && "justify-center")}>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 font-black text-sm border border-red-100 flex items-center justify-center">
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
