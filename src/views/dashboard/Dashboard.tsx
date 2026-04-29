import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  TrendingUp,
  Calendar,
  CheckSquare,
  Zap,
  History,
  Users,
  Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';

const COLORS = ['#ef4444', '#22c55e', '#fbbf24', '#8b5cf6'];

const PowerCounter = ({ value }: { value: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.span className="text-4xl font-black bg-gradient-to-br from-aura-red to-gray-500 bg-clip-text text-transparent tracking-tighter italic">{rounded}</motion.span>;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/reports/dashboard-stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 1000);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-gray-50">
      <div className="ui-standard-spinner" />
      <motion.p 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="text-[10px] font-black text-aura-red uppercase tracking-widest"
      >
        Initializing AVG CRM Interface...
      </motion.p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gray-50">
      <Activity className="text-aura-red animate-pulse" size={48} />
      <div className="text-center">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Connection Lost</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Operational Data Stream Interrupted</p>
      </div>
      <button 
        onClick={() => fetchStats()}
        className="px-6 py-2 bg-aura-red text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-red-600 transition-all"
      >
        Retry Connection
      </button>
    </div>
  );

  const statCards = [
    { name: 'Total Contacts', value: stats.totalContacts || 0, icon: Users, color: 'bg-aura-red', filter: 'all', path: '/leads' },
    { name: 'Sent Today', value: stats.messagesToday || 0, icon: PhoneOutgoing, color: 'bg-green-600', filter: 'all', path: '/whatsapp' },
    { name: 'Unread WA', value: stats.unreadWhatsAppCount || 0, icon: MessageSquare, color: 'bg-fbbf24', filter: 'unread', path: '/whatsapp' },
    { name: 'Calls Made', value: stats.totalCalls, icon: Phone, color: 'bg-aura-red', filter: 'all', path: '/calls' },
  ];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 relative pb-12">
      {refreshing && (
        <div className="fixed top-0 left-0 w-full h-0.5 z-50 overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-full bg-aura-red shadow-[0_0_10px_var(--color-aura-red)]"
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-4xl font-black text-gray-900 border-l-4 border-aura-red pl-4 uppercase tracking-tighter italic">AVG <span className="text-aura-red">DASHBOARD</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 ml-1">Live Operational Framework</p>
        </motion.div>
        
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <Calendar className="text-aura-red" size={16} />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <motion.div 
            key={card.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5, borderColor: 'var(--color-aura-red)' }}
            onClick={() => navigate(card.path)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn(card.color, "p-4 rounded-xl text-white shadow-lg shadow-red-500/20 transform group-hover:scale-110 transition-transform")}>
                <card.icon size={24} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.name}</p>
            </div>
            <div className="mt-2">
              <PowerCounter value={card.value} />
              <div className="mt-2 flex items-center">
                <Activity size={10} className="text-aura-red mr-2 animate-pulse" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Logic Verified</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Duration Stats */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1"
        >
          <h3 className="text-xs font-black text-gray-900 mb-6 uppercase tracking-[0.2em] border-b border-gray-50 pb-4 flex items-center">
            <TrendingUp className="mr-3 text-aura-red" size={18} /> Performance Metrics
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Engagement Time', value: formatDuration(stats.totalDuration), icon: History, color: 'text-aura-red' },
              { label: 'Average Signal Strength', value: formatDuration(stats.avgDuration), icon: Zap, color: 'text-aura-red' },
              { label: 'Pending Directives', value: stats.dailyTasks, icon: CheckSquare, color: 'text-green-600' }
            ].map((item) => (
              <div 
                key={item.label}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all"
              >
                <div className="flex items-center">
                  <item.icon className={cn(item.color, "mr-3")} size={18} />
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter">{item.label}</span>
                </div>
                <span className="text-sm font-black text-gray-900 font-mono italic">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pulse Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2"
        >
          <h3 className="text-xs font-black text-gray-900 mb-6 uppercase tracking-[0.2em] flex items-center">
            <Activity className="mr-3 text-aura-red" size={18} /> Engagement Velocity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.callTypeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#111827', fontSize: '10px', fontWeight: 900 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] flex items-center">
              <History className="mr-3 text-aura-red" size={18} /> Extraction Logs
            </h3>
            <button 
              onClick={() => navigate('/calls')}
              className="text-[9px] font-black text-aura-red uppercase hover:underline tracking-widest"
            >
              Full Access View
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto no-scrollbar">
            {stats.recentCalls.map((call) => (
              <div 
                key={call.id}
                className="p-5 hover:bg-gray-50/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-xl mr-4 flex items-center justify-center border transition-all",
                    call.type === 'INCOMING' ? "bg-aura-red/5 border-aura-red/20 text-aura-red" : 
                    call.type === 'OUTGOING' ? "bg-green-600/5 border-green-600/20 text-green-600" : "bg-gray-100 border-gray-200 text-gray-400"
                  )}>
                    {call.type === 'INCOMING' ? <PhoneIncoming size={16} /> : 
                     call.type === 'OUTGOING' ? <PhoneOutgoing size={16} /> : <PhoneMissed size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 leading-tight uppercase italic">{call.lead_name || 'Classified Identity'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{call.caller}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900 font-mono tracking-tighter uppercase">{formatDuration(call.duration_seconds)}</p>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-2 inline-block border",
                    call.status === 'CONNECTED' ? "bg-green-600/10 text-green-600 border-green-600/20" : "bg-aura-red/10 text-aura-red border-aura-red/20"
                  )}>{call.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* mini Pie */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Operational Distribution</h3>
            <div className="flex space-x-1">
               <div className="w-1.5 h-1.5 rounded-full bg-aura-red" />
               <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
               <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="h-64 relative flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Success', value: 40 },
                    { name: 'Engaged', value: 30 },
                    { name: 'Pending', value: 20 },
                    { name: 'Failed', value: 10 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#111827' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <p className="text-[10px] font-black text-gray-400 uppercase">Core Logic</p>
               <p className="text-xl font-black text-gray-900 italic">SUCCESS</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
