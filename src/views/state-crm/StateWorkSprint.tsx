export default function StateWorkSprint() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Work Sprint</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Attendance &amp; payroll system</p>
      </div>
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ minHeight: '80vh' }}>
        <iframe
          src="https://workmate-avgprimetech-com.up.railway.app/"
          title="WorkSprint"
          className="w-full h-full border-0"
          style={{ minHeight: '80vh' }}
          allow="camera; geolocation"
        />
      </div>
    </div>
  );
}
