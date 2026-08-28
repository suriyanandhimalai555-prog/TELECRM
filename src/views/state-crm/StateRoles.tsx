import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import stateApi from '../../services/stateApi';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface PermissionDef {
  key: string;
  label: string;
  category: string;
}

export default function StateRoles() {
  const { user } = useOutletContext<{ user: any }>();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canEdit = user?.role === 'master' || user?.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await stateApi.get('/roles/permissions');
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setMatrix(data.matrix || {});
    } catch (err) {
      console.error('Failed to fetch permission matrix', err);
      setError('Failed to load roles & permissions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isChecked = (role: string, key: string) => (matrix[role] || []).includes(key);

  const toggle = async (role: string, key: string) => {
    if (!canEdit || role === 'master') return;
    const cellId = `${role}:${key}`;
    const currentlyAllowed = isChecked(role, key);
    const nextAllowed = !currentlyAllowed;

    // optimistic update
    setMatrix(prev => {
      const current = prev[role] || [];
      const updated = nextAllowed ? [...current, key] : current.filter(k => k !== key);
      return { ...prev, [role]: updated };
    });
    setSavingKey(cellId);

    try {
      await stateApi.put('/roles/permissions', { role, permission_key: key, allowed: nextAllowed });
    } catch (err) {
      console.error('Failed to update permission', err);
      // revert on failure
      setMatrix(prev => {
        const current = prev[role] || [];
        const reverted = currentlyAllowed ? [...current, key] : current.filter(k => k !== key);
        return { ...prev, [role]: reverted };
      });
      setError('Failed to save that change. It has been reverted.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingKey(null);
    }
  };

  const categories = Array.from(new Set(permissions.map(p => p.category)));

  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-xs py-12">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 border-l-4 border-blue-600 pl-3 uppercase tracking-tight">
            Roles & <span className="text-blue-600">Permissions</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            Control what each role can access
            {!canEdit && ' · Read-only for your role'}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200 text-[10px] font-black text-gray-700 uppercase">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 p-4 sticky left-0 bg-gray-50">
                  Permission
                </th>
                {roles.map(role => (
                  <th key={role} className="text-center text-[9px] font-black uppercase tracking-widest text-gray-400 p-4 whitespace-nowrap">
                    {role === 'master' && <ShieldCheck size={12} className="inline mr-1 text-blue-600" />}
                    {role.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <>
                  <tr key={`cat-${category}`} className="bg-blue-50/50">
                    <td colSpan={roles.length + 1} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-blue-600">
                      {category}
                    </td>
                  </tr>
                  {permissions.filter(p => p.category === category).map(perm => (
                    <tr key={perm.key} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-[11px] font-bold text-gray-700 sticky left-0 bg-white">
                        {perm.label}
                      </td>
                      {roles.map(role => {
                        const cellId = `${role}:${perm.key}`;
                        const isMaster = role === 'master';
                        return (
                          <td key={role} className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isMaster || isChecked(role, perm.key)}
                              disabled={!canEdit || isMaster || savingKey === cellId}
                              onChange={() => toggle(role, perm.key)}
                              className="w-4 h-4 accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Changes save automatically per checkbox. Master always has full access and cannot be modified.
      </p>
    </div>
  );
}
