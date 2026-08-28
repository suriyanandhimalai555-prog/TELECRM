import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import StateSidebar from './StateSidebar';

export default function StateLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('state_crm_token');
    const userStr = localStorage.getItem('state_crm_user');
    if (!token || !userStr) {
      navigate('/state-login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('state_crm_token');
    localStorage.removeItem('state_crm_user');
    navigate('/state-login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <StateSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700">{user.name || user.email}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{user.role}</span>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
