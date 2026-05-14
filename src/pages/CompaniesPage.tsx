import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { Company, WhatsAppAccount } from '../types/auth';

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [waAccounts, setWaAccounts] = useState<Record<number, WhatsAppAccount[]>>({});
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showAddWA, setShowAddWA] = useState<number | null>(null);
  const [waForm, setWaForm] = useState({ label: '', phone_number: '', phone_number_id: '', access_token: '' });

  const loadCompanies = () => apiGet<Company[]>('/api/companies').then(setCompanies);
  useEffect(() => { loadCompanies(); }, []);

  const expandCompany = async (id: number) => {
    setExpanded(expanded === id ? null : id);
    if (!waAccounts[id]) {
      const acc = await apiGet<WhatsAppAccount[]>(`/api/companies/${id}/whatsapp`);
      setWaAccounts(prev => ({ ...prev, [id]: acc }));
    }
  };

  const addCompany = async () => {
    if (!newCompanyName.trim()) return;
    await apiPost('/api/companies', { company_name: newCompanyName });
    setNewCompanyName(''); setShowAddCompany(false); loadCompanies();
  };

  const deleteCompany = async (id: number) => {
    if (!confirm('Delete this company and all its data?')) return;
    await apiDelete(`/api/companies/${id}`); loadCompanies();
  };

  const addWAAccount = async (compId: number) => {
    const acc = await apiPost<WhatsAppAccount>(`/api/companies/${compId}/whatsapp`, waForm);
    setWaAccounts(prev => ({ ...prev, [compId]: [...(prev[compId] || []), acc] }));
    setWaForm({ label: '', phone_number: '', phone_number_id: '', access_token: '' });
    setShowAddWA(null);
  };

  const deleteWAAccount = async (compId: number, waId: number) => {
    await apiDelete(`/api/companies/${compId}/whatsapp/${waId}`);
    setWaAccounts(prev => ({ ...prev, [compId]: prev[compId].filter(a => a.id !== waId) }));
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Companies</h1>
        <button onClick={() => setShowAddCompany(true)}>+ Add Company</button>
      </div>
      {showAddCompany && (
        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <input placeholder="Company name" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} style={{ marginRight: 8 }} />
          <button onClick={addCompany}>Save</button>
          <button onClick={() => setShowAddCompany(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      {companies.map(c => (
        <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }} onClick={() => expandCompany(c.id)}>
            <span style={{ fontWeight: 500 }}>{c.company_name}</span>
            <div>
              <button onClick={e => { e.stopPropagation(); deleteCompany(c.id); }} style={{ marginRight: 8, color: 'red' }}>Delete</button>
              <span>{expanded === c.id ? '▲' : '▼'}</span>
            </div>
          </div>
          {expanded === c.id && (
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>WhatsApp Accounts</strong>
                <button onClick={() => setShowAddWA(c.id)}>+ Add Account</button>
              </div>
              {(waAccounts[c.id] || []).length === 0 && <p style={{ color: '#6b7280', fontSize: 13 }}>No WhatsApp accounts yet.</p>}
              {(waAccounts[c.id] || []).map(acc => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <strong>{acc.label}</strong>
                    <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 13 }}>{acc.phone_number}</span>
                  </div>
                  <button onClick={() => deleteWAAccount(c.id, acc.id)} style={{ color: 'red' }}>Remove</button>
                </div>
              ))}
              {showAddWA === c.id && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <input placeholder="Label" value={waForm.label} onChange={e => setWaForm(p => ({ ...p, label: e.target.value }))} />
                  <input placeholder="Phone Number" value={waForm.phone_number} onChange={e => setWaForm(p => ({ ...p, phone_number: e.target.value }))} />
                  <input placeholder="Phone Number ID (Meta)" value={waForm.phone_number_id} onChange={e => setWaForm(p => ({ ...p, phone_number_id: e.target.value }))} />
                  <input placeholder="Access Token (Meta)" value={waForm.access_token} onChange={e => setWaForm(p => ({ ...p, access_token: e.target.value }))} />
                  <div>
                    <button onClick={() => addWAAccount(c.id)}>Save Account</button>
                    <button onClick={() => setShowAddWA(null)} style={{ marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
