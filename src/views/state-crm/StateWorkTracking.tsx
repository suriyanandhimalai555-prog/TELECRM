import { ExternalLink } from 'lucide-react';

const WORK_TRACKER_URL = 'https://worktracking-avgprimetech-com.up.railway.app/';

export default function StateWorkTracking() {
  return (
    <div className="-m-6 h-[calc(100vh-0px)] flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-widest">Work Tracking</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Work Tracker Enterprise</p>
        </div>
        <a
          href={WORK_TRACKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 hover:bg-indigo-900/50 transition-colors"
        >
          Open in new tab <ExternalLink size={12} />
        </a>
      </div>
      <iframe
        src={WORK_TRACKER_URL}
        title="Work Tracker Enterprise"
        className="flex-1 w-full border-0"
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
    </div>
  );
}
