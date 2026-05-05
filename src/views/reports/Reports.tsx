import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import api from '../../services/api';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../hooks/useAuth';
import {
  BarChart3, TrendingUp, Users, FileText,
  Table as TableIcon, Calendar, RefreshCw,
  Zap, Dna, Phone, Briefcase, MessageSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#EF4444', '#FCA5A5', '#F59E0B', '#FEE2E2', '#7F1D1D'];

const DATE_RANGES: Record<string, { label: string; startDate: string; endDate: string }> = {
  today: {
    label: 'Today',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  '7d': {
    label: 'Last 7 Days',
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  '30d': {
    label: 'Last 30 Days',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  '90d': {
    label: 'Last 90 Days',
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
};

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('7d');
  const [reportType, setReportType] = useState('calls');
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<any>(null);

  // ── Single API call with date filter ──────────────────────────────────────
  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    try {
      const { startDate, endDate } = DATE_RANGES[range] || DATE_RANGES['7d'];
      const res = await api.get(`/reports/all?startDate=${startDate}&endDate=${endDate}`);
      setAllData(res.data);
    } catch (error) {
      console.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  // ── Derived data from allData ─────────────────────────────────────────────
  const stats      = allData?.stats;
  const calls      = allData?.calls;
  const whatsapp   = allData?.whatsapp;
  const leads      = allData?.leads;
  const projects   = allData?.projects;
  const team       = allData?.team;

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const getMainChartData = () => {
    if (reportType === 'calls')     return calls?.summary || [];
    if (reportType === 'whatsapp')  return whatsapp?.summary || [];
    if (reportType === 'leads')     return leads?.byStage || [];
    if (reportType === 'projects')  return projects?.distribution || [];
    if (reportType === 'team')      return team?.performance || [];
    return [];
  };

  const getMainChartTitle = () => {
    if (reportType === 'whatsapp')  return 'WhatsApp Engagement';
    if (reportType === 'leads')     return 'Lead Status Distribution';
    if (reportType === 'projects')  return 'Project Overview';
    if (reportType === 'team')      return 'Team Call Performance';
    return 'Call Distribution';
  };

  const getXAxisKey = () => {
    if (reportType === 'calls')    return 'date';
    if (reportType === 'whatsapp') return 'date';
    return 'name';
  };

  const getPieChartData = () => {
    if (reportType === 'leads')    return leads?.byStage || [];
    if (reportType === 'projects') return projects?.distribution || [];
    if (reportType === 'team')     return (team?.performance || []).map((d: any) => ({ name: d.name, value: d.total_calls || 0 }));
    if (reportType === 'whatsapp') return (whatsapp?.summary || []).map((d: any) => ({ name: d.date, value: (d.inbound || 0) + (d.outbound || 0) }));
    return (calls?.summary || []).map((d: any) => ({ name: d.date, value: d.total || 0 }));
  };

  const renderBars = () => {
    if (reportType === 'whatsapp') return (
      <>
        <Bar dataKey="inbound"  name="Received" fill="#EF4444" radius={[4,4,0,0]} />
        <Bar dataKey="outbound" name="Sent"     fill="#7F1D1D" radius={[4,4,0,0]} />
      </>
    );
    if (reportType === 'leads' || reportType === 'projects') return (
      <Bar dataKey="value" name={reportType === 'leads' ? 'Leads' : 'Projects'} fill="#EF4444" radius={[4,4,0,0]} />
    );
    if (reportType === 'team') return (
      <>
        <Bar dataKey="total_calls"     name="Total Calls" fill="#EF4444" radius={[4,4,0,0]} />
        <Bar dataKey="connected_calls" name="Connected"   fill="#7F1D1D" radius={[4,4,0,0]} />
      </>
    );
    return (
      <>
        <Bar dataKey="connected" name="Connected" fill="#EF4444" radius={[4,4,0,0]} />
        <Bar dataKey="failed"    name="Failed"    fill="#7F1D1D" radius={[4,4,0,0]} />
      </>
    );
  };

  // ── Export helpers ────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!stats) return;
    const data = [
      { Metric: 'Total Leads',     Value: stats.totalLeads },
      { Metric: 'Connected Calls', Value: stats.connectedCalls },
      { Metric: 'Avg Duration',    Value: `${stats.avgDuration}s` },
      { Metric: 'WhatsApp Msgs',   Value: stats.whatsappMessages },
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.text(`CRM Report — ${DATE_RANGES[dateRange]?.label}`, 14, 15);
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: [
        ['Total Leads',     stats.totalLeads],
        ['Connected Calls', stats.connectedCalls],
        ['Avg Duration',    `${stats.avgDuration}s`],
        ['WhatsApp Msgs',   stats.whatsappMessages],
      ],
      startY: 25,
    });
    doc.save(`report_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="ui-standard-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-aura-red pl-3 uppercase tracking-tight">
            Report & <span className="text-aura-red">Analytics</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            Deep dive into performance metrics
          </p>
        </motion.div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={exportCSV}
            className="flex items-center px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 hover:bg-aura-red hover:text-white transition-all uppercase tracking-widest shadow-sm">
            <TableIcon size={16} className="mr-2" /> Export CSV
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={exportPDF}
            className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-aura-red/20">
            <FileText size={16} className="mr-2" /> Export PDF
          </motion.button>
        </div>
      </div>

      {/* Tab Bar + Date Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-1 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
          {[
            { id: 'calls',    label: 'Calls',    icon: Phone },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'leads',    label: 'Leads',    icon: Users },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'team',     label: 'Team',     icon: Zap },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={cn(
                'flex items-center px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                reportType === type.id
                  ? 'bg-white text-aura-red shadow-sm ring-1 ring-aura-red/10'
                  : 'text-gray-400 hover:text-gray-600'
              )}>
              {type.label}
            </button>
          ))}
        </div>

        {/* Date range — triggers a fresh API call */}
        <div className="flex items-center space-x-2 ml-auto px-3 py-1.5 bg-white rounded-lg border border-gray-100">
          <Calendar size={16} className="text-aura-red" />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads',     value: stats.totalLeads,       icon: Users },
            { label: 'Connected Calls', value: stats.connectedCalls,   icon: Phone },
            { label: 'Avg Duration',    value: `${stats.avgDuration}s`, icon: TrendingUp },
            { label: 'WhatsApp',        value: stats.whatsappMessages,  icon: MessageSquare },
          ].map((card, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{card.value ?? 0}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">{getMainChartTitle()}</h3>
            <BarChart3 className="text-aura-red" size={18} />
          </div>
          <div className="h-72 flex items-center justify-center">
            {getMainChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMainChartData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey={getXAxisKey()} stroke="#9ca3af" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(239,68,68,0.05)' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', fontWeight: 900, textTransform: 'uppercase', fontSize: '9px', color: '#111827' }} />
                  <Legend iconType="circle" />
                  {renderBars()}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-aura-red/5 flex items-center justify-center border border-aura-red/10">
                  <RefreshCw className="text-aura-red" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data for this period</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">
              {reportType === 'projects' ? 'Project Distribution'
                : reportType === 'leads'    ? 'Lead Pipeline'
                : reportType === 'team'     ? 'Team Distribution'
                : reportType === 'whatsapp' ? 'WhatsApp Volume'
                : 'Conversion Pipeline'}
            </h3>
            <Dna className="text-aura-red" size={18} />
          </div>
          <div className="h-72">
            {getPieChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={getPieChartData()} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {getPieChartData().map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', fontWeight: 900, textTransform: 'uppercase', fontSize: '9px' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-aura-red/5 flex items-center justify-center border border-aura-red/10">
                  <RefreshCw className="text-aura-red" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data for this period</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Performance Table */}
        {user?.role !== 'employee' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={cn(
              'bg-white p-6 rounded-2xl shadow-sm border lg:col-span-2 transition-all',
              reportType === 'team' ? 'border-aura-red/30 shadow-aura-red/10' : 'border-gray-100'
            )}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Team Performance</h3>
              <Zap className="text-aura-red" size={18} />
            </div>
            {(team?.performance || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                      <th className="pb-4 px-3">Agent</th>
                      <th className="pb-4 px-3 text-center">Total Calls</th>
                      <th className="pb-4 px-3 text-center">Connected</th>
                      <th className="pb-4 px-3 text-center">Total Leads</th>
                      <th className="pb-4 px-3 text-right">Duration (Mins)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {team.performance.map((agent: any, idx: number) => (
                      <motion.tr key={idx} className="text-xs group hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-3 font-black text-gray-900 uppercase">{agent.name}</td>
                        <td className="py-4 px-3 text-center font-bold text-gray-500">{agent.total_calls}</td>
                        <td className="py-4 px-3 text-center">
                          <span className="bg-aura-red/5 text-aura-red px-2 py-0.5 rounded-full font-black text-[9px]">
                            {agent.connected_calls}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-gray-500">{agent.total_leads}</td>
                        <td className="py-4 px-3 text-right font-bold text-gray-500">
                          {Math.round((agent.total_duration || 0) / 60)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-8">
                No team data for this period
              </p>
            )}
          </motion.div>
        )}

        {/* Projects Table */}
        {reportType === 'projects' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-aura-red/30 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Project Breakdown</h3>
              <Briefcase className="text-aura-red" size={18} />
            </div>
            {(projects?.distribution || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                      <th className="pb-4 px-3">Project</th>
                      <th className="pb-4 px-3 text-right">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projects.distribution.map((project: any, idx: number) => (
                      <tr key={idx} className="text-xs hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-3 font-black text-gray-900 uppercase">{project.name}</td>
                        <td className="py-4 px-3 text-right font-bold text-gray-500">{project.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-8">
                No project data for this period
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}