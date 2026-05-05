import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import api from '../../services/api';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../hooks/useAuth';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Table as TableIcon,
  Calendar,
  RefreshCw,
  Zap,
  Dna,
  Phone,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#EF4444', '#F87171', '#FCA5A5', '#F59E0B', '#7F1D1D'];

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('all');
  const [reportType, setReportType] = useState('calls');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [whatsappSummary, setWhatsappSummary] = useState<any[]>([]);

  const getDateRange = (range: string) => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '2020-01-01';
    if (range === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (range === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (range === '90d') {
      const d = new Date(now); d.setDate(d.getDate() - 90);
      start = d.toISOString().split('T')[0];
    } else if (range === 'today') {
      start = end;
    }
    return { start, end };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange(dateRange);
      const [statsRes, summaryRes, conversionRes, projectRes, waSummaryRes] = await Promise.all([
        api.get('/reports/stats').catch(() => ({ data: null })),
        api.get('/reports/call-summary').catch(() => ({ data: [] })),
        api.get('/reports/lead-conversion').catch(() => ({ data: [] })),
        api.get('/reports/project-stats').catch(() => ({ data: [] })),
        api.get('/reports/whatsapp-summary').catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data || null);
      setSummaryData(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      setConversionData(Array.isArray(conversionRes.data) ? conversionRes.data : []);
      setProjectData(Array.isArray(projectRes.data) ? projectRes.data : []);
      setWhatsappSummary(Array.isArray(waSummaryRes.data) ? waSummaryRes.data : []);

      if (user?.role !== 'EMPLOYEE') {
        const teamRes = await api.get('/reports/team-performance').catch(() => ({ data: [] }));
        setTeamData(Array.isArray(teamRes.data) ? teamRes.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch report data', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (!stats) return;
    const data = [
      { Metric: 'Total Leads', Value: stats.totalLeads },
      { Metric: 'Connected Calls', Value: stats.connectedCalls },
      { Metric: 'Total Duration', Value: stats.totalDuration },
      { Metric: 'Avg Duration', Value: stats.avgDuration },
      { Metric: 'WhatsApp Notes', Value: stats.whatsappNotes },
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${new Date().toISOString()}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.text('CRM Performance Report', 14, 15);
    const body = [
      ['Total Leads', String(stats.totalLeads ?? 0)],
      ['Connected Calls', String(stats.connectedCalls ?? 0)],
      ['Total Duration', `${Math.round((stats.totalDuration ?? 0) / 60)} mins`],
      ['Avg Duration', `${Math.round(stats.avgDuration ?? 0)} secs`],
      ['WhatsApp Interactions', String(stats.whatsappNotes ?? 0)],
    ];
    autoTable(doc, { head: [['Metric', 'Value']], body, startY: 25 });
    doc.save(`report_${new Date().toISOString()}.pdf`);
  };

  const getMainChartData = () => {
    if (reportType === 'whatsapp') return Array.isArray(whatsappSummary) ? whatsappSummary : [];
    if (reportType === 'leads') return Array.isArray(conversionData) ? conversionData : [];
    return Array.isArray(summaryData) ? summaryData : [];
  };

  const getMainChartTitle = () => {
    if (reportType === 'whatsapp') return 'WhatsApp Engagement';
    if (reportType === 'leads') return 'Lead Status Distribution';
    if (reportType === 'projects') return 'Project Overview';
    if (reportType === 'team') return 'Team Call Performance';
    return 'Call Distribution';
  };

  const getPieChartData = (): any[] => {
    if (reportType === 'projects') return Array.isArray(projectData) ? projectData : [];
    if (reportType === 'leads') return Array.isArray(conversionData) ? conversionData : [];
    if (reportType === 'whatsapp') return Array.isArray(whatsappSummary)
      ? whatsappSummary.map((d: any) => ({ name: d.date, value: (d.inbound || 0) + (d.outbound || 0) }))
      : [];
    return Array.isArray(conversionData) ? conversionData : [];
  };

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    fontSize: '9px',
    color: '#111827',
    padding: '12px'
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="ui-standard-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <p className="text-red-500 font-bold">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-aura-red text-white rounded-xl text-xs font-black uppercase">
          Retry
        </button>
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
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Deep dive into performance metrics</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportCSV}
            className="flex items-center px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 hover:bg-aura-red hover:text-white transition-all uppercase tracking-widest shadow-sm">
            <TableIcon size={16} className="mr-2" />Export CSV
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportPDF}
            className="flex items-center px-4 py-2 bg-aura-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-aura-red/20">
            <FileText size={16} className="mr-2" />Export PDF
          </motion.button>
        </div>
      </div>

      {/* Tab Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
          {[
            { id: 'calls', label: 'Calls' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'leads', label: 'Leads' },
            { id: 'projects', label: 'Projects' },
            { id: 'team', label: 'Team' },
          ].map(type => (
            <button key={type.id} onClick={() => setReportType(type.id)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                reportType === type.id ? 'bg-aura-red text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {type.label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2 ml-auto px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
          <Calendar size={16} className="text-aura-red" />
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-[10px] font-black text-gray-700 uppercase tracking-widest cursor-pointer">
            <option value="all">All Time</option>
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
            { label: 'Total Leads', value: stats.totalLeads ?? 0 },
            { label: 'Connected Calls', value: stats.connectedCalls ?? 0 },
            { label: 'Avg Duration', value: `${Math.round(stats.avgDuration ?? 0)}s` },
            { label: 'WhatsApp', value: stats.whatsappNotes ?? 0 },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Bar Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">{getMainChartTitle()}</h3>
            <BarChart3 className="text-aura-red" size={18} />
          </div>
          <div className="h-72 flex items-center justify-center">
            {getMainChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMainChartData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(239,68,68,0.08)' }} contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#9ca3af', fontSize: '9px', fontWeight: 900 }} />
                  {reportType === 'whatsapp' ? (
                    <>
                      <Bar dataKey="inbound" name="Received" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outbound" name="Sent" fill="#7F1D1D" radius={[4, 4, 0, 0]} />
                    </>
                  ) : reportType === 'leads' ? (
                    <Bar dataKey="value" name="Leads" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  ) : (
                    <>
                      <Bar dataKey="connected" name="Connected" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" name="Failed" fill="#7F1D1D" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-aura-red/10 flex items-center justify-center border border-aura-red/20">
                  <RefreshCw className="text-aura-red" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">
              {reportType === 'projects' ? 'Project Distribution' : reportType === 'leads' ? 'Lead Pipeline' : 'Conversion Pipeline'}
            </h3>
            <Dna className="text-aura-red" size={18} />
          </div>
          <div className="h-72">
            {getPieChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getPieChartData().map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ color: '#9ca3af', fontSize: '9px', fontWeight: 900 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-16 h-16 rounded-full bg-aura-red/10 flex items-center justify-center border border-aura-red/20">
                  <RefreshCw className="text-aura-red" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Table */}
        {user?.role !== 'EMPLOYEE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={`bg-white p-6 rounded-2xl border lg:col-span-2 shadow-sm transition-all ${
              reportType === 'team' ? 'border-aura-red/50' : 'border-gray-100'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Team Performance</h3>
              <Zap className="text-aura-red" size={18} />
            </div>
            {teamData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                      <th className="pb-4 px-3">Agent</th>
                      <th className="pb-4 px-3 text-center">Total Calls</th>
                      <th className="pb-4 px-3 text-center">Connected</th>
                      <th className="pb-4 px-3 text-right">Duration (Mins)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teamData.map((agent: any, idx: number) => (
                      <tr key={idx} className="text-xs hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-3 font-black text-gray-900 uppercase">{agent.name}</td>
                        <td className="py-4 px-3 text-center font-bold text-gray-600">{agent.total_calls}</td>
                        <td className="py-4 px-3 text-center">
                          <span className="bg-aura-red/20 text-aura-red px-2 py-0.5 rounded-full font-black text-[9px]">{agent.connected_calls}</span>
                        </td>
                        <td className="py-4 px-3 text-right font-bold text-gray-600">{Math.round((agent.total_duration || 0) / 60)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center py-8">No team data available</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}