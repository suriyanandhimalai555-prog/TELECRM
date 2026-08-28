import { useState, useEffect, useCallback } from 'react';
import stateApi from '../../services/stateApi';
import { Plus, X } from 'lucide-react';

interface StateItem {
  id: number;
  name: string;
}

export default function StateStatesPage() {
  const [states, setStates] = useState<StateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fetchStates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stateApi.get('/states');
      setStates(res.data.states || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStates(); }, [fetchStates]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await stateApi.post('/states', { name });
      setShowModal(false);
      setName('');
      fetchStates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add state');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">States</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add State
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400 font-bold uppercase tracking-widest">Loading...</div>
        ) : states.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 font-bold uppercase tracking-widest">No states added yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {states.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-gray-900">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900">Add State</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">State Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <button type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-colors">
                Add State
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
