import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Clock, Camera, Pencil, Trash2, X } from 'lucide-react';

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_full_name?: string;
  role?: string;
  check_in: string;
  check_out: string | null;
  lat: number | null;
  lng: number | null;
  date: string;
  photo?: string | null;
  status?: string;
}

async function captureSelfie(): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.style.position = 'fixed';
  video.style.top = '0';
  video.style.left = '0';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  video.srcObject = stream;
  document.body.appendChild(video);

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Video failed to load'));
    setTimeout(() => reject(new Error('Camera timed out')), 5000);
  });
  await video.play();
  // wait one extra frame to make sure decoding has actually started
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 640;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

  stream.getTracks().forEach(t => t.stop());
  document.body.removeChild(video);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export default function StateAttendance() {
  const { user } = useOutletContext<{ user: any }>();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ check_in: '', check_out: '', status: 'full_day' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canViewAll = user.role === 'master' || user.role === 'admin' || user.role === 'coordinator' || user.role === 'state_head';
  const canEdit = user.role === 'master' || user.role === 'admin';

  const fetchToday = useCallback(async () => {
    try {
      const res = await stateApi.get('/attendance/today');
      setToday(res.data.attendance);
    } catch { }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!canViewAll) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await stateApi.get('/attendance/all', { params: filterDate ? { date: filterDate } : {} });
      setAllRecords(res.data.attendance || []);
    } catch { }
    finally { setLoading(false); }
  }, [filterDate, canViewAll]);

  useEffect(() => { fetchToday(); }, [fetchToday]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCheckIn = async () => {
    setError('');
    setActing(true);

    let photo: string | null = null;
    try {
      photo = await captureSelfie();
    } catch {
      setError("Camera access is required to check in. Allow camera access for this site and try again.");
      setActing(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Location is not supported on this device');
      setActing(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await stateApi.post('/attendance/checkin', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            photo,
          });
          await fetchToday();
          fetchAll();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Check-in failed');
        } finally {
          setActing(false);
        }
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError('Location access is blocked. Click the location icon in your browser\'s address bar and allow it for this site, then try again.');
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setError('Getting your location timed out. Check your device\'s location settings and try again.');
        } else {
          setError('Could not get your location. Check your device\'s location settings and try again.');
        }
        setActing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckOut = async () => {
    setError('');
    setActing(true);
    try {
      await stateApi.post('/attendance/checkout');
      await fetchToday();
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActing(false);
    }
  };

  const asUTC = (t: string) => t.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(t) ? t : t + 'Z';
  const formatTime = (t: string | null) => t ? new Date(asUTC(t)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-';

  const IST_OFFSET_MIN = 5 * 60 + 30;
  const localTimeInputValue = (t: string | null) => {
    if (!t) return '';
    return new Date(asUTC(t)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  };
  const istToUtcISO = (dateStr: string, timeStr: string): string | null => {
    if (!timeStr) return null;
    const [hh, mm] = timeStr.split(':').map(Number);
    const utcMs = Date.parse(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`) - IST_OFFSET_MIN * 60000;
    return new Date(utcMs).toISOString();
  };
  const openEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditForm({
      check_in: localTimeInputValue(rec.check_in),
      check_out: localTimeInputValue(rec.check_out),
      status: rec.status || 'full_day',
    });
  };
  const handleEditSave = async () => {
    if (!editingRecord) return;
    setSaving(true);
    try {
      const dateStr = editingRecord.date.slice(0, 10);
      await stateApi.put(`/attendance/${editingRecord.id}`, {
        check_in: istToUtcISO(dateStr, editForm.check_in),
        check_out: editForm.check_out ? istToUtcISO(dateStr, editForm.check_out) : null,
        status: editForm.status,
      });
      setEditingRecord(null);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await stateApi.delete(`/attendance/${id}`);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (rec: { status?: string }) => {
    if (!rec.status) return null;
    const isHalf = rec.status === 'half_day';
    return (
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${isHalf ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
        {isHalf ? 'Half Day' : 'Full Day'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Attendance</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">GPS + selfie check-in and check-out</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                {today?.check_in ? `Checked in at ${formatTime(today.check_in)}` : 'Not checked in yet'}
                {today && statusBadge(today)}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {today?.check_out ? `Checked out at ${formatTime(today.check_out)}` : today?.check_in ? 'Currently active' : 'Ready when you are'}
              </p>
            </div>
          </div>
          {!today || today.check_out ? (
            <button onClick={handleCheckIn} disabled={acting}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-6 py-3 rounded-xl transition-colors disabled:opacity-40">
              <Camera size={16} /> {acting ? 'Capturing...' : 'Check In'}
            </button>
          ) : (
            <button onClick={handleCheckOut} disabled={acting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[11px] px-6 py-3 rounded-xl transition-colors disabled:opacity-40">
              <Clock size={16} /> {acting ? 'Saving...' : 'Check Out'}
            </button>
          )}
        </div>
      </div>

      {canViewAll && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filter Date</span>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[10px] font-black uppercase" />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-[10px] font-black text-blue-500 uppercase">Clear</button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    {[...['Photo', 'User', 'Role', 'Check In', 'Check Out', 'Status', 'Location', 'Date'], ...(canEdit ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        {rec.photo ? (
                          <img src={rec.photo} onClick={() => setPreviewPhoto(rec.photo!)}
                            className="w-9 h-9 rounded-lg object-cover cursor-pointer border border-gray-200" />
                        ) : <span className="text-[9px] text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-gray-900">{rec.user_full_name || rec.user_name}</td>
                      <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">{rec.role?.replace('_', ' ') || '-'}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-700">{formatTime(rec.check_in)}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-700">{formatTime(rec.check_out)}</td>
                      <td className="px-6 py-4">{statusBadge(rec)}</td>
                      <td className="px-6 py-4 text-[9px] font-bold text-gray-400">
                        {rec.lat && rec.lng ? (
                          <a href={`https://maps.google.com/?q=${rec.lat},${rec.lng}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                            {Number(rec.lat).toFixed(4)}, {Number(rec.lng).toFixed(4)}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase">{new Date(rec.date).toLocaleDateString()}</td>
                      {canEdit && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(rec.id)} disabled={deletingId === rec.id}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {allRecords.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 9 : 8} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                        {loading ? 'Loading...' : 'No attendance records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {previewPhoto && (
        <div onClick={() => setPreviewPhoto(null)} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer">
          <img src={previewPhoto} className="max-w-sm max-h-[80vh] rounded-2xl border-4 border-white" />
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Attendance</h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {editingRecord.user_full_name || editingRecord.user_name} &middot; {new Date(editingRecord.date).toLocaleDateString()}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check In</label>
                <input type="time" value={editForm.check_in} onChange={e => setEditForm(f => ({ ...f, check_in: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-xs font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Check Out</label>
                <input type="time" value={editForm.check_out} onChange={e => setEditForm(f => ({ ...f, check_out: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-xs font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-xs font-bold uppercase">
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingRecord(null)} className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
