import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, CheckSquare, StickyNote, MessageSquare, 
  Target, BarChart3, Settings, ChevronLeft, ChevronRight,
  Briefcase, Building2, UserCog, ChevronDown, Phone,
  GitBranch, Contact, Plug, Bell, BellRing, Workflow, Shield, ShieldCheck, MapPin, Clock, TrendingUp, Sliders,
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
    location.pathname.includes("/app/whatsapp")
  );

  const masterAdminNav = [
    { name: 'Dashboard',  path: '/app',          icon: LayoutDashboard },
    { name: 'Companies',  path: '/app/companies', icon: Building2 },
    { name: 'Users',      path: '/app/users',     icon: UserCog },
    { name: 'Reports',    path: '/app/reports',   icon: BarChart3 },
    { name: 'Settings',   path: '/app/settings',  icon: Settings },
  ];

  const companyNav = [
    { name: 'Dashboard',  path: '/app',          icon: LayoutDashboard, roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Users',      path: '/app/users',     icon: UserCog,         roles: ['company_admin'] },
    { name: 'Leads',      path: '/app/leads',     icon: Users,           roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Tasks',      path: '/app/tasks',     icon: CheckSquare,     roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Projects',   path: '/app/projects',  icon: Briefcase,       roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Notes',      path: '/app/notes',     icon: StickyNote,      roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Calls',      path: '/app/calls',     icon: Phone,           roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'WhatsApp',   path: '/app/whatsapp',  icon: MessageSquare,   roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'], isWA: true },
    { name: 'Campaigns',  path: '/app/campaigns', icon: Target,          roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Reports',    path: '/app/reports',   icon: BarChart3,       roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Pipeline',     path: '/app/pipeline',      icon: GitBranch,  roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Contacts',     path: '/app/contacts',      icon: Contact,    roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Workflow',     path: '/app/workflow',      icon: Workflow,   roles: ['company_admin','ADMIN'] },
    { name: 'Integrations', path: '/app/integrations',  icon: Plug,       roles: ['company_admin','ADMIN'] },
    { name: 'Notifications',path: '/app/notifications', icon: Bell,       roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Admin',        path: '/app/admin',         icon: Shield,     roles: ['company_admin','ADMIN'] },
    { name: 'Team',          path: '/app/team',          icon: Users,      roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Reminders',     path: '/app/reminders',    icon: BellRing,   roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Lead Scoring',  path: '/app/lead-scoring', icon: TrendingUp, roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Custom Fields', path: '/app/custom-fields',icon: Sliders,    roles: ['company_admin','ADMIN'] },
    { name: 'Roles',         path: '/app/roles',         icon: ShieldCheck,roles: ['company_admin','ADMIN'] },
    { name: 'Attendance',    path: '/app/attendance',    icon: Clock,      roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Ad Campaigns', path: '/app/adcampaigns', icon: Target, roles: ['company_admin','ADMIN','MANAGER'] },
    { name: 'Field Force',   path: '/app/fieldforce',    icon: MapPin,     roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
    { name: 'Settings',     path: '/app/settings',      icon: Settings,   roles: ['company_admin','ADMIN','MANAGER','employee','EMPLOYEE'] },
  ];

  const isMasterAdmin = user?.role === 'master_admin';
  const isEmployee = user?.role === 'EMPLOYEE' || user?.role === 'employee';
  const hasWA2 = ['company_admin','ADMIN','MANAGER'].includes(user?.role || '');
  const navItems = isMasterAdmin
    ? masterAdminNav
    : companyNav.filter(item => !user || item.roles.includes(user.role));

  const isWAActive = location.pathname.includes("/app/whatsapp");

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 80) }}
      className={cn(
        "bg-white border-r border-gray-100 flex flex-col h-full shadow-sm",
        "fixed inset-y-0 left-0 z-50 md:relative md:z-20",
        "transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
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
          onClick={() => { setIsOpen(!isOpen); localStorage.setItem('sidebarOpen', String(!isOpen)); }}
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
                  <NavLink
                    to={user?.company_id === 11 ? "/app/whatsapp3" : user?.company_id === 12 ? "/app/whatsapp4" : "/app/whatsapp"}
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
                          {(user?.company_id !== 8 && user?.company_id !== 11 && user?.company_id !== 12) && (
                          <NavLink
                            to="/app/whatsapp"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                            WA Account 1
                          </NavLink>
                          )}
                          {(user?.company_id !== 8 && user?.company_id !== 11 && user?.company_id !== 12) && (
                          <NavLink
                            to="/app/whatsapp2"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                            WA Account 2
                          </NavLink>
                          )}
                          {(user?.company_id === 11) && (
                          <NavLink
                            to="/app/whatsapp3"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                            Almanzar Digital
                          </NavLink>
                          )}
                          {(user?.company_id === 12) && (
                          <NavLink
                            to="/app/whatsapp4"
                            className={({ isActive }) => cn(
                              "flex items-center px-4 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest mt-1",
                              isActive ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                            )}
                          >
                            <span className="w-2 h-2 rounded-full bg-orange-400 mr-2" />
                            Almanzar Primetech LLC
                          </NavLink>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <NavLink
                    to="/app/whatsapp"
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
              {user?.company_name && <p className="text-[8px] font-bold text-blue-400 truncate uppercase tracking-widest">{user?.company_name}</p>}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
