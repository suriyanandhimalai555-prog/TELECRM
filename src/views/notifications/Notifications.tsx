import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Notifications() {
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loginNotifs, setLoginNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'logins' | 'leads' | 'tasks'>('all');

  useEffect(() => {
    Promise.all([
      api.get('/leads').catch(() => ({ data: [] })),
      api.get('/tasks').catch(() => ({ data: [] })),
      api.get('/attendance/login-notifications').catch(() => ({ data: { notifications: [] } })),
    ]).then(([leadsRes, tasksRes, loginRes]) => {
      const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data?.leads || [];
      const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.tasks || [];
      setLeads(leadsData.slice(0, 20));
      setTasks(tasksData.filter((t: any) => !t.completed).slice(0, 20));
      setLoginNotifs(loginRes.data?.notifications || []);
    }).finally(() => setLoading(false));
  }, []);

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const getRoleColor = (role: string) => {
    if (role?.toLowerCase().includes("admin")) return "bg-red-50 text-red-600";
    if (role?.toLowerCase().includes("manager")) return "bg-purple-50 text-purple-600";
    return "bg-blue-50 text-blue-600";
  };

  const tabs = [
    { key: "all", label: "All", count: loginNotifs.length + leads.length + tasks.length },
    { key: "logins", label: "Login Alerts", count: loginNotifs.length },
    { key: "leads", label: "New Leads", count: leads.length },
    { key: "tasks", label: "Pending Tasks", count: tasks.length },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-400 text-sm mb-6">Stay updated on logins, leads and tasks</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key ? "bg-blue-500 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">

          {/* Login Notifications */}
          {(activeTab === "all" || activeTab === "logins") && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">
                🔔 Login Alerts ({loginNotifs.length})
              </h2>
              {loginNotifs.length === 0 ? (
                <p className="text-center text-gray-400 text-[11px] py-4">No login notifications yet</p>
              ) : (
                <div className="space-y-2">
                  {loginNotifs.map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                          {n.user_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900">{n.user_name}</p>
                          <p className="text-[9px] text-gray-400">{n.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${getRoleColor(n.user_role)}`}>
                          {n.user_role}
                        </span>
                        <span className="text-[9px] text-gray-400">{formatTime(n.logged_in_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Leads */}
          {(activeTab === "all" || activeTab === "leads") && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">
                👤 Recent Leads ({leads.length})
              </h2>
              {leads.length === 0 ? (
                <p className="text-center text-gray-400 text-[11px] py-4">No leads yet</p>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 font-black text-sm flex items-center justify-center">
                          {lead.contact_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900">{lead.contact_name}</p>
                          <p className="text-[9px] text-gray-400">{lead.mobile} • {lead.stage}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400">{formatTime(lead.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Tasks */}
          {(activeTab === "all" || activeTab === "tasks") && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">
                ✅ Pending Tasks ({tasks.length})
              </h2>
              {tasks.length === 0 ? (
                <p className="text-center text-gray-400 text-[11px] py-4">No pending tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[11px] font-black text-gray-900">{task.title}</p>
                        <p className="text-[9px] text-gray-400">{task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "No due date"}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                        task.priority === "high" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"
                      }`}>{task.priority || "normal"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
