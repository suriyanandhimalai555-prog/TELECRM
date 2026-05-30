import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Contacts() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leads').then(r => { setLeads(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l =>
    l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.mobile?.includes(search) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Contacts</h1>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-600 rounded-full">{leads.length} Total</span>
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, phone or email..."
        className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
      />
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(contact => (
            <div key={contact.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                  {contact.contact_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[12px] font-black text-gray-900">{contact.contact_name}</p>
                  <p className="text-[10px] text-gray-400">{contact.stage}</p>
                </div>
              </div>
              <div className="space-y-1">
                {contact.mobile && <p className="text-[11px] text-gray-500">📱 {contact.mobile}</p>}
                {contact.email && <p className="text-[11px] text-gray-500">📧 {contact.email}</p>}
                {contact.company && <p className="text-[11px] text-gray-500">🏢 {contact.company}</p>}
                <p className="text-[10px] text-gray-300">Source: {contact.source}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
