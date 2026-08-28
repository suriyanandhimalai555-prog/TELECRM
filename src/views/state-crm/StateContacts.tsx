import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { Plus, Search, Edit2, Trash2, X, Download, Upload, Phone, MessageSquare } from 'lucide-react';
import Papa from 'papaparse';

interface StateContact {
  id: number;
  name: string;
  email: string;
  phone: string;
  state_id: number;
  state_name?: string;
  lead_name?: string;
  created_at: string;
}

interface StateOption {
  id: number;
  name: string;
}

export default function StateContacts() {
  const { user } = useOutletContext<{ user: any }>();
  const [contacts, setContacts] = useState<StateContact[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<StateContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StateContact | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', state_id: user.state_id || '' });

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/contacts');
      setContacts(res.data.contacts || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    stateApi.get('/states').then(res => setStates(res.data.states || [])).catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingContact(null);
    setForm({ name: '', email: '', phone: '', state_id: user.state_id || '' });
    setShowModal(true);
  };

  const openEditModal = (contact: StateContact) => {
    setEditingContact(contact);
    setForm({ name: contact.name || '', email: contact.email || '', phone: contact.phone || '', state_id: contact.state_id });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await stateApi.put(`/contacts/${editingContact.id}`, form);
      } else {
        await stateApi.post('/contacts', form);
      }
      setShowModal(false);
      fetchContacts();
    } catch { }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await stateApi.delete(`/contacts/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchContacts();
    } catch { }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const results2 = await Promise.allSettled(rows.map(row => {
            const stateName = (row.State || row.state || '').toString().trim().toLowerCase();
            const matchedState = states.find(s => s.name.toLowerCase() === stateName);
            const state_id = matchedState ? matchedState.id : (user.state_id || '');
            return stateApi.post('/contacts', {
              name: row.Name || row.name || '',
              email: row.Email || row.email || '',
              phone: row.Phone || row.phone || '',
              state_id,
            });
          }));
          const failed = results2.filter(r => r.status === 'rejected').length;
          const succeeded = results2.length - failed;
          fetchContacts();
          if (failed > 0) {
            alert(`Imported ${succeeded} contact${succeeded !== 1 ? 's' : ''}. ${failed} row${failed !== 1 ? 's' : ''} failed (missing/invalid state or data).`);
          }
        } catch {
          alert('Failed to import contacts');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = selectedState === 'ALL' || c.state_id?.toString() === selectedState;
    return matchesSearch && matchesState;
  });

  const handleExport = () => {
    const csv = Papa.unparse(filteredContacts.map(c => ({
      Name: c.name, Email: c.email, Phone: c.phone, State: c.state_name || '', CreatedAt: c.created_at
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `state_contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizedPhone = (phone: string) => {
    let raw = (phone || '').replace(/[^0-9]/g, '');
    if (raw.startsWith('91') && raw.length === 12) raw = raw.slice(2);
    if (raw.startsWith('0') && raw.length === 11) raw = raw.slice(1);
    return '91' + raw;
  };

  const callContact = (contact: StateContact) => {
    const phone = normalizedPhone(contact.phone);
    if (phone) {
      const a = document.createElement('a');
      a.href = `tel:+${phone}`;
      a.click();
    }
  };

  const openWhatsApp = (contact: StateContact) => {
    const phone = normalizedPhone(contact.phone);
    if (phone) window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-500 pl-3 uppercase tracking-tight">Active <span className="text-blue-500">Contacts</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management of state contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center px-4 py-2 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-500 hover:bg-blue-50 uppercase tracking-widest"
          >
            <Upload size={14} className="mr-2" />
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv" className="hidden" />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search contacts (name, phone, email)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg focus:outline-none transition-all text-xs font-bold"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
              className="px-3 py-2 bg-gray-50/50 border border-transparent focus:border-blue-400 rounded-lg text-[10px] font-black uppercase appearance-none">
              <option value="ALL">All States</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <button onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black text-blue-600 uppercase">
              <Download size={14} className="mr-2" />Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Contact', 'Phone', 'State', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 tracking-tight">{contact.name}</span>
                      <span className="text-[9px] font-bold text-gray-400 truncate max-w-[180px]">{contact.email || 'No Email'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-gray-700 tracking-wider font-mono">{contact.phone}</td>
                  <td className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">{contact.state_name || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => callContact(contact)} title="Call" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Phone size={14} />
                      </button>
                      <button onClick={() => openWhatsApp(contact)} title="WhatsApp" className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg">
                        <MessageSquare size={14} />
                      </button>
                      <button onClick={() => openEditModal(contact)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(contact)} className="p-1.5 text-blue-200 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[10px] font-black text-gray-300 uppercase">
                    {loading ? 'Loading...' : 'No contacts found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-blue-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">State</label>
                  <select required value={form.state_id} onChange={e => setForm({ ...form, state_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold appearance-none">
                    <option value="" disabled>Select a state</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Discard</button>
                <button type="submit" className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20">
                  {editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10 border border-gray-100">
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">Delete Contact?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove "{deleteConfirm.name}" from the records. Proceed with caution.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-xl">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
