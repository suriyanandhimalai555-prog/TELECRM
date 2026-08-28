import { useState, useEffect, useCallback } from 'react';
import stateApi from '../../services/stateApi';
import { BarChart3, Calendar, RefreshCw, Zap, Dna } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe', '#f59e0b'];

export default function StateReports() {
  const [reportType, setReportType] = useState('calls');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, summaryRes, conversionRes, teamRes] = await Promise.all([
        stateApi.get('/reports/stats').catch(() => ({ data: null })),
        stateApi.get('/reports/call-summary').catch(() => ({ data: [] })),
        stateApi.get('/reports/lead-conversion').catch(() => ({ data: [] })),
        stateApi.get('/reports/team-performance').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data || null);
      setSummaryData(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      setConversionData(Array.isArray(conversionRes.data) ? conversionRes.data : []);
      setTeamData(Array.isArray(teamRes.data) ? teamRes.data : []);
    } catch (err) {
      console.error('Failed to fetch report data', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tooltipStyle = {
    backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #dbeafe',
    boxShadow: '0 10px 30px rgba(15,23,42,0.08)', fontWeight: 900,
    textTransform: 'uppercase' as const, fontSize: '9px', color: '#111827', padding: '12px'
  };

  const getMainChartData = () => {
    if (reportType === 'leads') return conversionData;
    if (reportType === 'team') return teamData;
    return summaryData;
  };

  const getMainChartTitle = () => {
    if (reportType === 'leads') return 'Lead Status Distribution';
    if (reportType === 'team') return 'Team Call Performance';
    return 'Call Distribution';
  };

  const getPieChartData = (): any[] => {
    if (reportType === 'leads') return conversionData;
    if (reportType === 'team') return teamData.map((d: any) => ({ name: d.name, value: Number(d.total_calls) }));
    return conversionData;
  };

  const renderBars = () => {
    if (reportType === 'leads') return <Bar dataKey="value" name="Count" fill="#2563eb" radius={[4,4,0,0]} />;
    if (reportType === 'team') return (
      <>
        <Bar dataKey="total_calls" name="Total Calls" fill="#2563eb" radius={[4,4,0,0]} />
        <Bar dataKey="connected_calls" name="Connected" fill="#60a5fa" radius={[4,4,0,0]} />
      </>
    );
    return (
      <>
        <Bar dataKey="connected" name="Connected" fill="#2563eb" radius={[4,4,0,0]} />
        <Bar dataKey="failed" name="Failed" fill="#60a5fa" radius={[4,4,0,0]} />
      </>
    );
  };

  const getXAxisKey = () => {
    if (reportType === 'leads' || reportType === 'team') return 'name';
    return 'date';
  };

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400 text-xs py-12">Loading...</div>;
  if (error) return (
    <div className="h-full flex items-center justify-center flex-col gap-4 py-12">
      <p className="text-blue-600 font-bold text-xs">{error}</p>
      <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase">Retry</button>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-3 uppercase tracking-tight">
            Report & <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Deep dive into performance metrics</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
          {[
            { id: 'calls', label: 'Calls' },
            { id: 'leads', label: 'Leads' },
            { id: 'team', label: 'Team' },
          ].map(type => (
            <button key={type.id} onClick={() => setReportType(type.id)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                reportType === type.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {type.label}
            </button>
          ))}
        </div>
        <button onClick={fetchData} className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200 text-[10px] font-black text-gray-700 uppercase">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.totalLeads ?? 0 },
            { label: 'Connected Calls', value: stats.connectedCalls ?? 0 },
            { label: 'Avg Duration', value: `${Math.round(stats.avgDuration ?? 0)}s` },
            { label: 'WhatsApp', value: stats.whatsappMessages ?? 0 },
          ].map((card, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">{getMainChartTitle()}</h3>
            <BarChart3 className="text-blue-600" size={18} />
          </div>
          <div className="h-72 flex items-center justify-center">
            {getMainChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMainChartData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                  <XAxis dataKey={getXAxisKey()} stroke="#6b7280" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(37,99,235,0.08)' }} contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#9ca3af', fontSize: '9px', fontWeight: 900 }} />
                  {renderBars()}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border border-blue-200">
                  <RefreshCw className="text-blue-600" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">
              {reportType === 'leads' ? 'Lead Pipeline' : reportType === 'team' ? 'Team Calls' : 'Conversion Pipeline'}
            </h3>
            <Dna className="text-blue-600" size={18} />
          </div>
          <div className="h-72">
            {getPieChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={getPieChartData()} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {getPieChartData().map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle"
                    wrapperStyle={{ color: '#9ca3af', fontSize: '9px', fontWeight: 900 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border border-blue-200">
                  <RefreshCw className="text-blue-600" size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Team Performance</h3>
            <Zap className="text-blue-600" size={18} />
          </div>
          {teamData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                    <th className="pb-4 px-3">Agent</th>
                    <th className="pb-4 px-3 text-center">Total Leads</th>
                    <th className="pb-4 px-3 text-center">Total Calls</th>
                    <th className="pb-4 px-3 text-center">Connected</th>
                    <th className="pb-4 px-3 text-right">Duration (Mins)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamData.map((agent: any, idx: number) => (
                    <tr key={idx} className="text-xs hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-3 font-black text-gray-900 uppercase">{agent.name}</td>
                      <td className="py-4 px-3 text-center font-bold text-gray-600">{agent.total_leads}</td>
                      <td className="py-4 px-3 text-center font-bold text-gray-600">{agent.total_calls}</td>
                      <td className="py-4 px-3 text-center">
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black text-[9px]">{agent.connected_calls}</span>
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
        </div>
      </div>
    </div>
  );
}
