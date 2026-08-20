import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

export default function FieldForce() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [tracking, setTracking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  useEffect(() => {
    api.get('/settings/users').then(r => {
      const data = r.data;
      const list = Array.isArray(data) ? data : data?.users || [];
      setUsers(list);
    }).catch(() => {});

    api.get("/attendance/today").then(r => {
      const att = r.data?.attendance;
      if (att) {
        setTodayRecord(att);
        setCheckedIn(!att.check_out);
        setLocation({ lat: att.lat, lng: att.lng });
      }
    }).catch(() => {});

    api.get("/attendance/history").then(r => {
      const data = r.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.history) ? data.history : [];
      setHistory(list);
    }).catch(() => {});

    api.get("/attendance/all").then(r => {
      const data = r.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.attendance) ? data.attendance : [];
      setAllAttendance(list);
    }).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    setTracking(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      const res = await api.post("/attendance/checkin", {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      const att = res.data.attendance;
      setTodayRecord(att);
      setLocation({ lat: att.lat, lng: att.lng });
      setCheckedIn(true);
    } catch (e: any) {
      alert(e.response?.data?.error || "Check-in failed. Enable location access.");
    }
    setTracking(false);
  };

  const handleCheckOut = async () => {
    setTracking(true);
    try {
      const res = await api.post("/attendance/checkout");
      const att = res.data.attendance;
      setTodayRecord(att);
      setCheckedIn(false);
    } catch (e: any) {
      alert(e.response?.data?.error || "Check-out failed.");
    }
    setTracking(false);
  };

  const fmt = (ts: string) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  const fmtDate = (ts: string) => ts ? new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : "-";
  const duration = (cin: string, cout: string) => {
    if (!cin || !cout) return "-";
    const mins = Math.round((new Date(cout).getTime() - new Date(cin).getTime()) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Field Force Tracking</h1>
      <p className="text-gray-400 text-sm mb-6">Track field agents location and attendance</p>

      {/* My Attendance */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance</h2>
        <div className="flex gap-4 mb-4">
          <button onClick={handleCheckIn} disabled={tracking || checkedIn}
            className="flex-1 py-3 bg-green-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors">
            {tracking ? "Please wait..." : checkedIn ? "Checked In ✓" : "Check In"}
          </button>
          <button onClick={handleCheckOut} disabled={tracking || !checkedIn || !!todayRecord?.check_out}
            className="flex-1 py-3 bg-red-400 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors">
            {todayRecord?.check_out ? "Checked Out ✓" : "Check Out"}
          </button>
        </div>

        {todayRecord && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Check In</p>
              <p className="text-lg font-black text-green-700">{fmt(todayRecord.check_in)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Check Out</p>
              <p className="text-lg font-black text-red-700">{fmt(todayRecord.check_out)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Status</p>
              <p className="text-sm font-black text-blue-700">{todayRecord.check_out ? "Complete" : "Active"}</p>
            </div>
          </div>
        )}

        {location && (
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Location</p>
            <p className="text-[11px] text-gray-600">Lat: {Number(location.lat).toFixed(6)}, Lng: {Number(location.lng).toFixed(6)}</p>
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer"
              className="text-[10px] text-blue-500 underline mt-1 block">View on Google Maps</a>
          </div>
        )}
      </div>

      {/* My Attendance History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance History</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((rec: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-[11px] font-black text-gray-900">{fmtDate(rec.check_in)}</p>
                  <p className="text-[9px] text-gray-400">{fmt(rec.check_in)} → {fmt(rec.check_out)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-blue-600">{duration(rec.check_in, rec.check_out)}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${rec.check_out ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                    {rec.check_out ? "Complete" : "Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Members ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-4">No team members found</p>
        ) : (
          <div className="space-y-2">
            {users.map(user => {
              const todayAtt = allAttendance.find((a: any) => a.user_id === user.id);
              return (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-900">{user.name}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest">{user.role}</p>
                      <p className="text-[9px] text-gray-300">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {todayAtt ? (
                      <>
                        <p className="text-[9px] text-gray-500">In: {fmt(todayAtt.check_in)}</p>
                        <p className="text-[9px] text-gray-500">Out: {fmt(todayAtt.check_out)}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${todayAtt.check_out ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                          {todayAtt.check_out ? "Done" : "Active"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Not Checked In</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Team Attendance History */}
      {allAttendance.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Attendance History</h2>
          <div className="space-y-2">
            {allAttendance.slice(0, 20).map((rec: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">
                    {rec.user_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-900">{rec.user_name || "Unknown"}</p>
                    <p className="text-[9px] text-gray-400">{fmtDate(rec.check_in)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-gray-500">{fmt(rec.check_in)} → {fmt(rec.check_out)}</p>
                  <p className="text-[9px] font-black text-blue-600">{duration(rec.check_in, rec.check_out)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
