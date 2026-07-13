import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#daeaf8] overflow-hidden selection:bg-aura-red selection:text-white">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Background glow for the whole app */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-aura-red/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-aura-red/5 blur-[120px] rounded-full pointer-events-none" />
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
