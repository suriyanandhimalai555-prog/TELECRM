import { useState } from 'react';
import api from '../../lib/api';

export default function Workflow() {
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const autoAssign = async () => {
    setAssigning(true);
    try {
      const res = await api.post('/integrations/workflow/auto-assign');
      setResult(res.data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setAssigning(false);
  };

  const workflows = [
    { name: 'Auto Assign Leads', desc: 'Automatically assign unassigned leads to employees in round-robin', icon: '🔄', action: autoAssign },
    { name: 'New Lead Welcome WhatsApp', desc: 'Send welcome WhatsApp message to new leads automatically', icon: '💬', action: null, coming: true },
    { name: 'Follow-up Reminder', desc: 'Auto-create follow-up tasks for leads with no activity in 3 days', icon: '⏰', action: null, coming: true },
    { name: 'Stage Change Notification', desc: 'Notify manager when lead moves to Negotiation or WON stage', icon: '📊', action: null, coming: true },
    { name: 'Lead Scoring', desc: 'Auto-score leads based on engagement and activity', icon: '⭐', action: null, coming: true },
    { name: 'Duplicate Detection', desc: 'Auto-detect and merge duplicate leads by phone number', icon: '🔍', action: null, coming: true },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Workflow Automation</h1>
      <p className="text-gray-400 text-sm mb-6">Automate repetitive tasks and processes</p>

      {result && (
        <div className={`mb-4 p-4 rounded-2xl ${result.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          <p className="text-[11px] font-black uppercase tracking-widest">
            {result.error ? '❌ Error: ' + result.error : `✅ Assigned ${result.assigned} leads successfully!`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map(w => (
          <div key={w.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{w.icon}</span>
              {w.coming && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-50 text-gray-400">
                  Coming Soon
                </span>
              )}
            </div>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-900 mb-1">{w.name}</h3>
            <p className="text-[11px] text-gray-400 mb-4">{w.desc}</p>
            {w.action && (
              <button
                onClick={w.action}
                disabled={assigning}
                className="w-full py-2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {assigning ? 'Running...' : 'Run Now'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
