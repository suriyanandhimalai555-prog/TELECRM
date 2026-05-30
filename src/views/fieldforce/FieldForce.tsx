import { useState, useEffect } from "react";
import api from "../../services/api";

export default function FieldForce() {
  const [users, setUsers] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    api.get("/users").then(r => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    const saved = localStorage.getItem("field_checkin");
    if (saved) { setLocation(JSON.parse(saved)); setCheckedIn(true); }
  }, []);

  const handleCheckIn = async () => {
    setTracking(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, time: new Date().toISOString() };
      setLocation(loc);
      setCheckedIn(true);
      localStorage.setItem("field_checkin", JSON.stringify(loc));
    } catch {
      alert("Location access denied. Please enable location.");
    }
    setTracking(false);
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setLocation(null);
    localStorage.removeItem("field_checkin");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Field Force Tracking</h1>
      <p className="text-gray-400 text-sm mb-6">Track field agents location and attendance</p>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance</h2>
        <div className="flex gap-4">
          <button onClick={handleCheckIn} disabled={tracking || checkedIn}
            className="flex-1 py-3 bg-green-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-green-600 disabled:opacity-50">
            {tracking ? "Getting Location..." : checkedIn ? "Checked In" : "Check In"}
          </button>
          <button onClick={handleCheckOut} disabled={!checkedIn}
            className="flex-1 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-600 disabled:opacity-50">
            Check Out
          </button>
        </div>
        {location && (
          <div className="mt-4 p-3 bg-green-50 rounded-xl">
            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Current Location</p>
            <p className="text-[11px] text-green-600 mt-1">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
            <p className="text-[10px] text-green-400">Checked in at {new Date(location.time).toLocaleTimeString()}</p>
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer"
              className="text-[10px] text-blue-500 underline mt-1 block">View on Google Maps</a>
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Members</h2>
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                  {user.name?.charAt(0)}
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
      </div>
    </div>
  );
}
