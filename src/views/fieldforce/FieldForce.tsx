import { useState, useEffect } from "react";
import api from "../../services/api";

export default function FieldForce() {
  const [users, setUsers] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);

  useEffect(() => {
    api.get("/users").then(r => {
      const data = r.data;
      if (Array.isArray(data)) setUsers(data);
      else if (data?.users) setUsers(data.users);
      else if (data?.data) setUsers(data.data);
    }).catch(() => {});

    api.get("/attendance/today").then(r => {
      const att = r.data?.attendance;
      if (att) {
        setTodayRecord(att);
        setCheckedIn(true);
        setLocation({ lat: att.lat, lng: att.lng, time: att.check_in });
      }
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
      setLocation({ lat: att.lat, lng: att.lng, time: att.check_in });
      setCheckedIn(true);
      alert("✅ Checked in at " + new Date(att.check_in).toLocaleTimeString());
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
      alert("✅ Checked out at " + new Date(att.check_out).toLocaleTimeString());
    } catch (e: any) {
      alert(e.response?.data?.error || "Check-out failed.");
    }
    setTracking(false);
  };

  const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Field Force Tracking</h1>
      <p className="text-gray-400 text-sm mb-6">Track field agents location and attendance</p>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance</h2>
        <div className="flex gap-4 mb-4">
          <button onClick={handleCheckIn} disabled={tracking || checkedIn}
            className="flex-1 py-3 bg-green-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-green-600 disabled:opacity-50">
            {tracking ? "Please wait..." : checkedIn ? "Checked In ✓" : "Check In"}
          </button>
          <button onClick={handleCheckOut} disabled={tracking || !checkedIn || !!todayRecord?.check_out}
            className="flex-1 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-600 disabled:opacity-50">
            {todayRecord?.check_out ? "Checked Out ✓" : "Check Out"}
          </button>
        </div>

        {todayRecord && (
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Check In</p>
              <p className="text-lg font-black text-green-700">{formatTime(todayRecord.check_in)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Check Out</p>
              <p className="text-lg font-black text-red-700">{formatTime(todayRecord.check_out)}</p>
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

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Members ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-4">No team members found</p>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-900">{user.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-200 text-gray-500">Offline</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
