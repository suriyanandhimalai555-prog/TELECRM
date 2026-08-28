import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  check_in: string;
  check_out: string | null;
  lat: number | null;
  lng: number | null;
  photo?: string | null;
}

interface StateUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function StateFieldForce() {
  const { user } = useOutletContext<{ user: any }>();
  const [users, setUsers] = useState<StateUser[]>([]);
  const [tracking, setTracking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  
  // Camera state
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(null);

  const canViewTeam = user.role === 'master' || user.role === 'admin' || user.role === 'coordinator' || user.role === 'state_head';

  useEffect(() => {
    if (canViewTeam) {
      stateApi.get('/auth/users').then(r => setUsers(r.data.users || [])).catch(() => {});
      stateApi.get('/attendance/all').then(r => setAllAttendance(r.data.attendance || [])).catch(() => {});
    }

    stateApi.get('/attendance/today').then(r => {
      const att = r.data?.attendance;
      if (att) {
        setTodayRecord(att);
        setCheckedIn(!att.check_out);
        if (att.lat && att.lng) setLocation({ lat: att.lat, lng: att.lng });
      }
    }).catch(() => {});

    stateApi.get('/attendance/history').then(r => setHistory(r.data.history || [])).catch(() => {});
  }, [canViewTeam]);

  // Camera logic
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showCamera]); 

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setStream(mediaStream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => console.error("Play failed:", err));
        }
      }, 500); 
      
    } catch (err) {
      setError('Could not access camera. Please click the lock icon in the address bar, allow Camera, and refresh.');
      setShowCamera(false);
      setCapturingPhoto(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        stopCamera();

        if (pendingLocation) {
          submitCheckIn(pendingLocation.lat, pendingLocation.lng, photoData);
          setPendingLocation(null);
        }
      }
    } else {
      setError('Camera is not ready. Please wait a moment and try again.');
    }
  };

  const submitCheckIn = async (lat: number, lng: number, photoData: string | null) => {
    setCapturingPhoto(false);
    setTracking(true);
    try {
      const payload: any = { lat, lng };
      if (photoData) {
        payload.photo = photoData;
      }
      const res = await stateApi.post('/attendance/checkin', payload);
      const att = res.data.attendance;
      setTodayRecord(att);
      setLocation({ lat: att.lat, lng: att.lng });
      setCheckedIn(true);
      setPhoto(null);
      setPendingLocation(null);
      setShowCamera(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Check-in failed');
      setPhoto(null);
    } finally {
      setTracking(false);
    }
  };

  const handleCheckIn = () => {
    setError('');
    setCapturingPhoto(true);
    if (!navigator.geolocation) {
      setError('Location is not supported on this device');
      setCapturingPhoto(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPendingLocation(location);
        setShowCamera(true); 
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError("Location access is blocked. Allow it for this site in your browser's address bar and try again.");
        } else {
          setError('Could not get your location. Check your device settings and try again.');
        }
        setCapturingPhoto(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckOut = async () => {
    setError('');
    setTracking(true);
    try {
      const res = await stateApi.post('/attendance/checkout');
      setTodayRecord(res.data.attendance);
      setCheckedIn(false);
      setPhoto(null);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Check-out failed');
    } finally {
      setTracking(false);
    }
  };

  // --- UPDATED TIME FIX (Force +5:30 IST) ---
  const fmt = (ts: string | null) => {
    if (!ts) return '-';
    const date = new Date(ts);
    // Add 5 hours and 30 minutes
    date.setMinutes(date.getMinutes() + 330);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const fmtDate = (ts: string | null) => {
    if (!ts) return '-';
    const date = new Date(ts);
    // Add 5 hours and 30 minutes
    date.setMinutes(date.getMinutes() + 330);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const duration = (cin: string, cout: string | null) => {
    if (!cin || !cout) return '-';
    const mins = Math.round((new Date(cout).getTime() - new Date(cin).getTime()) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const openPhoto = (base64Data: string) => {
    if (!base64Data) return;
    try {
      const [header, data] = base64Data.split(',');
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to open image', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Field <span className="text-blue-500">Force</span></h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Track field agents location and attendance</p>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}

      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-black text-gray-900 mb-4">📸 Take Selfie for Check-in</h3>
            <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 px-4 py-3 bg-blue-500 text-white font-black rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg">📸</span> Capture Selfie
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 px-4 py-3 bg-gray-500 text-white font-black rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Position your face clearly in the frame</p>
          </div>
        </div>
      )}

      {photo && !showCamera && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={photo} alt="Selfie" className="w-14 h-14 rounded-full object-cover border-2 border-green-500" />
              <div>
                <p className="text-sm font-bold text-green-700">✅ Selfie captured!</p>
                <p className="text-xs text-green-600">Photo will be submitted with check-in</p>
              </div>
            </div>
            <button onClick={() => setPhoto(null)} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance</h2>
        <div className="flex gap-4 mb-4">
          <button onClick={handleCheckIn} disabled={tracking || checkedIn}
            className="flex-1 py-3 bg-green-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors">
            {capturingPhoto ? '📸 Taking selfie...' : tracking ? 'Please wait...' : checkedIn ? 'Checked In ✓' : 'Check In'}
          </button>
          <button onClick={handleCheckOut} disabled={tracking || !checkedIn || !!todayRecord?.check_out}
            className="flex-1 py-3 bg-red-400 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors">
            {todayRecord?.check_out ? 'Checked Out ✓' : 'Check Out'}
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
              <p className="text-sm font-black text-blue-700">{todayRecord.check_out ? 'Complete' : 'Active'}</p>
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

      {history.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">My Attendance History</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-[11px] font-black text-gray-900">{fmtDate(rec.check_in)}</p>
                  <p className="text-[9px] text-gray-400">{fmt(rec.check_in)} → {fmt(rec.check_out)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-blue-600">{duration(rec.check_in, rec.check_out)}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${rec.check_out ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {rec.check_out ? 'Complete' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canViewTeam && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Members ({users.length})</h2>
          {users.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-4">No team members found</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const todayAtt = allAttendance.find(a => a.user_id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-gray-900">{u.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">{u.role?.replace('_', ' ')}</p>
                        <p className="text-[9px] text-gray-300">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {todayAtt ? (
                        <>
                          <p className="text-[9px] text-gray-500">In: {fmt(todayAtt.check_in)}</p>
                          <p className="text-[9px] text-gray-500">Out: {fmt(todayAtt.check_out)}</p>
                          {todayAtt.photo && (
                            <img src={todayAtt.photo} alt="Selfie" className="w-8 h-8 rounded-full object-cover border border-gray-200 mx-auto mt-1" />
                          )}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${todayAtt.check_out ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {todayAtt.check_out ? 'Done' : 'Active'}
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
      )}

      {canViewTeam && allAttendance.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Team Attendance History</h2>
          <div className="space-y-2">
            {allAttendance.slice(0, 20).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {rec.photo && (
                    <img src={rec.photo} alt="Selfie" className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 cursor-pointer hover:opacity-80 transition-opacity"
                         onClick={() => openPhoto(rec.photo || '')} />
                  )}
                  <div>
                    <p className="text-[11px] font-black text-gray-900">{rec.user_name || 'Unknown'}</p>
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