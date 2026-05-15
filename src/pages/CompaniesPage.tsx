import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Company, WhatsAppAccount } from '../types/auth';
import { Building2, Plus, Trash2, ChevronDown, ChevronUp, MessageSquare, UserCog, X, Check, Pencil, Phone, Mail } from 'lucide-react';

interface CompanyAdmin {
  id: number; name: string; email: string; role: string; phone?: string;
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [waAccounts, setWaAccounts] = useState<Record<number, WhatsAppAccount[]>>({});
  const [companyAdmins, setCompanyAdmins] = useState<Record<number, CompanyAdmin[]>>({});
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddWA, setShowAddWA] = useState<number | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState<number | null>(null);
  const [waForm, setWaForm] = useState({ label: '', phone_number: '', phone_number_id: '', access_token: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const loadCompanies = () => apiGet<Company[]>('/companies').then(setCompanies);
  useEffect(() => { loadCompanies(); }, []);

  const expandCompany = async (id: number) => {
    const isOpen = expanded === id;
    setExpanded(isOpen ? null : id);
    if (!isOpen) {
      const [acc, admins] = await Promise.all([
        apiGet<WhatsAppAccount[]>(`/companies/${id}/whatsapp`).catch(() => []),
        apiGet<CompanyAdmin[]>(`/users?company_id=${id}`).catch(() => []),
      ]);
      setWaAccounts(prev => ({ ...prev, [id]: acc }));
      setCompanyAdmins(prev => ({ ...prev, [id]: (admins as CompanyAdmin[]).filter(u => u.role === 'company_admin') }));
    }
  };

  const addCompany = async () => {
    if (!newCompanyName.trim()) return;
    setLoading(true);
    await apiPost('/companies', { company_name: newCompanyName });
    setNewCompanyName(''); setShowAddCompany(false);
    await loadCompanies();
    setLoading(false);
  };

  const saveEditCompany = async (id: number) => {
    if (!editName.trim()) return;
    await apiPost(`/companies/${id}/rename`, { company_name: editName });
    setEditingId(null);
    loadCompanies();
  };

  const deleteCompany = async (id: number) => {
    if (!confirm('Delete this company and ALL its data? This cannot be undone.')) return;
    await apiDelete(`/companies/${id}`);
    loadCompanies();
  };

  const addWAAccount = async (compId: number) => {
    if (!waForm.label || !waForm.phone_number_id || !waForm.access_token) {
      alert('Label, Phone Number ID and Access Token are required.'); return;
    }
    setLoading(true);
    const acc = await apiPost<WhatsAppAccount>(`/companies/${compId}/whatsapp`, waForm);
    setWaAccounts(prev => ({ ...prev, [compId]: [...(prev[compId] || []), acc] }));
    setWaForm({ label: '', phone_number: '', phone_number_id: '', access_token: '' });
    setShowAddWA(null);
    setLoading(false);
  };

  const deleteWAAccount = async (compId: number, waId: number) => {
    await apiDelete(`/companies/${compId}/whatsapp/${waId}`);
    setWaAccounts(prev => ({ ...prev, [compId]: prev[compId].filter(a => a.id !== waId) }));
  };

  const addCompanyAdmin = async (compId: number) => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      alert('Name, email and password are required.'); return;
    }
    setLoading(true);
    try {
      await apiPost('/users', { ...adminForm, role: 'company_admin', company_id: compId });
      const admins = await apiGet<CompanyAdmin[]>(`/users?company_id=${compId}`);
      setCompanyAdmins(prev => ({ ...prev, [compId]: (admins as CompanyAdmin[]).filter(u => u.role === 'company_admin') }));
      setAdminForm({ name: '', email: '', password: '', phone: '' });
      setShowAddAdmin(null);
    } catch (e: any) { alert(e?.message || 'Failed to create admin'); }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Companies</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{companies.length} tenants</p>
          </div>
        </div>
        <button onClick={() => setShowAddCompany(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Company
        </button>
      </div>

      {showAddCompany && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex gap-3 items-center">
          <input className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm font-medium focus:outline-none focus:border-blue-400" placeholder="Company name" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompany()} autoFocus />
          <button onClick={addCompany} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1"><Check size={15} /> Save</button>
          <button onClick={() => { setShowAddCompany(false); setNewCompanyName(''); }} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"><X size={15} /></button>
        </div>
      )}

      {companies.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">No companies yet</p>
        </div>
      )}

      {companies.map(c => (
        <div key={c.id} className="border border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => expandCompany(c.id)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-sm">{c.company_name.charAt(0).toUpperCase()}</div>
              {editingId === c.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input className="px-2 py-1 rounded-lg border border-blue-300 text-sm font-medium focus:outline-none" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                  <button onClick={() => saveEditCompany(c.id)} className="p-1 rounded bg-blue-600 text-white"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded bg-gray-200 text-gray-600"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{c.company_name}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID #{c.id}</span>
                  {/* Show admin name + WA number inline */}
                  {companyAdmins[c.id]?.[0] && (
                    <span className="text-xs text-purple-600 font-medium">· {companyAdmins[c.id][0].name}</span>
                  )}
                  {waAccounts[c.id]?.[0] && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Phone size={10} />{waAccounts[c.id][0].phone_number}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditingId(c.id); setEditName(c.company_name); }} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => deleteCompany(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
              <div onClick={() => expandCompany(c.id)} className="cursor-pointer">
                {expanded === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>
          </div>

          {expanded === c.id && (
            <div className="border-t border-gray-100 bg-gray-50 p-4 grid gap-4">

              {/* Company Admins */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><UserCog size={15} className="text-purple-500" /><span className="text-xs font-black text-gray-700 uppercase tracking-widest">Company Admins</span></div>
                  <button onClick={() => setShowAddAdmin(showAddAdmin === c.id ? null : c.id)} className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"><Plus size={13} /> Add Admin</button>
                </div>
                {(companyAdmins[c.id] || []).length === 0 && showAddAdmin !== c.id && <p className="text-xs text-gray-400 italic">No company admins yet.</p>}
                {(companyAdmins[c.id] || []).map(admin => (
                  <div key={admin.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-black text-sm flex items-center justify-center">{admin.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">{admin.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{admin.email}</span>
                        {admin.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{admin.phone}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {showAddAdmin === c.id && (
                  <div className="mt-2 bg-white rounded-lg border border-purple-100 p-3 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Full Name" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} />
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Phone Number" value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} />
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Email" type="email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} />
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400" placeholder="Password" type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addCompanyAdmin(c.id)} disabled={loading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700">Create Admin</button>
                      <button onClick={() => setShowAddAdmin(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Accounts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><MessageSquare size={15} className="text-green-500" /><span className="text-xs font-black text-gray-700 uppercase tracking-widest">WhatsApp Accounts</span></div>
                  <button onClick={() => setShowAddWA(showAddWA === c.id ? null : c.id)} className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1"><Plus size={13} /> Add Number</button>
                </div>
                {(waAccounts[c.id] || []).length === 0 && showAddWA !== c.id && <p className="text-xs text-gray-400 italic">No WhatsApp numbers yet.</p>}
                {(waAccounts[c.id] || []).map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center"><MessageSquare size={13} className="text-green-600" /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-700">{acc.label}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{acc.phone_number}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteWAAccount(c.id, acc.id)} className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
                {showAddWA === c.id && (
                  <div className="mt-2 bg-white rounded-lg border border-green-100 p-3 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400" placeholder="Label (e.g. Sales)" value={waForm.label} onChange={e => setWaForm(p => ({ ...p, label: e.target.value }))} />
                      <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400" placeholder="Phone Number (+91...)" value={waForm.phone_number} onChange={e => setWaForm(p => ({ ...p, phone_number: e.target.value }))} />
                    </div>
                    <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400" placeholder="Phone Number ID (from Meta)" value={waForm.phone_number_id} onChange={e => setWaForm(p => ({ ...p, phone_number_id: e.target.value }))} />
                    <input className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-400" placeholder="Access Token (from Meta)" value={waForm.access_token} onChange={e => setWaForm(p => ({ ...p, access_token: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => addWAAccount(c.id)} disabled={loading} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">Save Number</button>
                      <button onClick={() => setShowAddWA(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      ))}
    </div>
  );
}
