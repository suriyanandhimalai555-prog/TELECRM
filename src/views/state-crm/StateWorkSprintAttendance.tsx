import React from 'react';

export default function StateWorkSprintAttendance() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">WorkSprint Attendance</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Integrated WorkSprint attendance view</p>
      </div>
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ minHeight: '80vh' }}>
        <iframe
          src="/WORKSPRINT/frontend/index.html"
          title="WorkSprint Attendance"
          className="w-full h-full border-0"
          style={{ minHeight: '80vh' }}
        />
      </div>
    </div>
  );
}
