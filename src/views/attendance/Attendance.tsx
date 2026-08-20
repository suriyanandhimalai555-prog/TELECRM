import { useState, useEffect } from "react";
import api from "../../services/api";

export default function Attendance() {
  const [today, setToday] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchToday();
    fetchAll();
  }, []);

  useEffect(() => {
    fetchAll();
  }, [selectedDate]);

  const fetchToday = async () => {
    try {
      const res = await api.get("/attendance/today");
      setToday(res.data.attendance);
    } catch {}
    setLoading(false);
  };

  const fetchAll = async () => {
    try {
      const url = selectedDate ? `/attendance/all?date=${selectedDate}` : '/attendance/all';
      const res = await api.get(url);
      setAllAttendance(res.data.attendance || []);
    } catch {}
  };

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
      setToday(res.data.attendance);
      fetchAll();
      alert("Checked in successfully at " + new Date().toLocaleTimeString());
    } catch (e: any) {
      alert(e.response?.data?.error || "Check-in failed");
    }
    setTracking(false);
  };

  const handleCheckOut = async () => {
    setTracking(true);
    try {
      const res = await api.post("/attendance/checkout");
      setToday(res.data.attendance);
      fetchAll();
      alert("Checked out successfully at " + new Date().toLocaleTimeString());
    } catch (e: any) {
      alert(e.response?.data?.error || "Check-out failed");
    }
    setTracking(false);
  };

  const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : "-";
  const getDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return "-";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Attendance</h1>
      <p className="text-gray-400 text-sm mb-6">Track daily attendance and working hours</p>

      {/* My Check In/Out */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance Today</h2>
        <div className="flex gap-4 mb-4">
          <button onClick={handleCheckIn} disabled={tracking || !!today?.check_in}
            className="flex-1 py-3 bg-green-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-green-600 disabled:opacity-50">
            {tracking ? "Please wait..." : today?.check_in ? "Already Checked In" : "Check In"}
          </button>
          <button onClick={handleCheckOut} disabled={tracking || !today?.check_in || !!today?.check_out}
            className="flex-1 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-600 disabled:opacity-50">
            {today?.check_out ? "Already Checked Out" : "Check Out"}
          </button>
        </div>
        {today && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Check In</p>
              <p className="text-lg font-black text-green-700">{formatTime(today.check_in)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Check Out</p>
              <p className="text-lg font-black text-red-700">{formatTime(today.check_out)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Duration</p>
              <p className="text-lg font-black text-blue-700">{getDuration(today.check_in, today.check_out)}</p>
            </div>
          </div>
        )}
      </div>

      {/* All Attendance Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Team Attendance</h2>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
            {selectedDate && (<button onClick={() => setSelectedDate("")} className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700 px-2 ml-2">Show All</button>)}
        </div>
        {allAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-[11px] font-black uppercase tracking-widest">No attendance records for this date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Employee</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Role</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Date</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Check In</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Check Out</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Duration</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {allAttendance.map(att => (
                  <tr key={att.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">
                          {att.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900">{att.name || att.user_name}</p>
                          <p className="text-[9px] text-gray-400">{att.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3"><span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{att.role}</span></td>
                    <td className="py-3"><span className="text-[11px] font-bold text-gray-600">{formatDate(att.date)}</span></td>
                    <td className="py-3"><span className="text-[11px] font-bold text-green-600">{formatTime(att.check_in)}</span></td>
                    <td className="py-3"><span className="text-[11px] font-bold text-red-600">{formatTime(att.check_out)}</span></td>
                    <td className="py-3"><span className="text-[11px] font-bold text-blue-600">{getDuration(att.check_in, att.check_out)}</span></td>
                    <td className="py-3">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${att.check_out ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
                        {att.check_out ? "Complete" : "Active"}
                      </span>
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
