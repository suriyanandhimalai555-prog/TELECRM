import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function Reminders() {
  const [due, setDue] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/reminders/due"),
      api.get("/reminders/upcoming"),
    ]).then(([dueRes, upRes]) => {
      setDue(dueRes.data.reminders || []);
      setUpcoming(upRes.data.upcoming || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const isOverdue = (d: string) => new Date(d) < new Date();

  const handleSnooze = async (id: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await api.put(`/reminders/${id}`, { next_followup: tomorrow.toISOString() });
    setDue(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Follow-up Reminders</h1>
      <p className="text-gray-400 text-sm mb-6">Leads that need your attention</p>

      {/* Due Now */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Due Now / Overdue ({due.length})</h2>
        </div>
        {due.length === 0 ? (
          <p className="text-center text-gray-400 text-[11px] py-4">No overdue follow-ups 🎉</p>
        ) : (
          <div className="space-y-3">
            {due.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="text-[12px] font-black text-gray-900">{r.contact_name}</p>
                  <p className="text-[10px] text-gray-500">{r.mobile} • {r.stage}</p>
                  <p className="text-[10px] text-red-500 font-bold mt-1">📅 {formatDate(r.next_followup)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/leads?id=${r.id}`)}
                    className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-600">
                    View Lead
                  </button>
                  <button onClick={() => handleSnooze(r.id)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-300">
                    Snooze 1d
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Upcoming Follow-ups ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="text-center text-gray-400 text-[11px] py-4">No upcoming follow-ups</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Contact</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Stage</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Assigned To</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Follow-up Date</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <p className="text-[11px] font-black text-gray-900">{r.contact_name}</p>
                      <p className="text-[9px] text-gray-400">{r.mobile}</p>
                    </td>
                    <td className="py-3">
                      <span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{r.stage}</span>
                    </td>
                    <td className="py-3">
                      <p className="text-[11px] text-gray-600">{r.owner_name || "Unassigned"}</p>
                    </td>
                    <td className="py-3">
                      <p className={`text-[11px] font-bold ${isOverdue(r.next_followup) ? "text-red-500" : "text-green-600"}`}>
                        {formatDate(r.next_followup)}
                      </p>
                    </td>
                    <td className="py-3">
                      <button onClick={() => navigate(`/leads?id=${r.id}`)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-600">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
