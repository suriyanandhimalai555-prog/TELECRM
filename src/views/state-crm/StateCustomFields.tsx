import { useState, useEffect } from "react";
import stateApi from "../../services/stateApi";

const FIELD_TYPES = ["text", "number", "date", "select", "checkbox"];

export default function StateCustomFields() {
  const [fields, setFields] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    stateApi.get("/custom-fields").then(r => setFields(r.data.fields || []));
  }, []);

  const handleAdd = async () => {
    if (!name) return alert("Enter field name");
    setLoading(true);
    try {
      const res = await stateApi.post("/custom-fields", {
        field_name: name, field_type: type,
        field_options: options, is_required: required
      });
      setFields(prev => [...prev, res.data.field]);
      setName(""); setType("text"); setOptions(""); setRequired(false);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    await stateApi.delete(`/custom-fields/${id}`);
    setFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Custom Fields</h1>
      <p className="text-gray-400 text-sm mb-6">Add custom fields to your lead forms</p>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Add New Field</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Field Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Budget, City"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Field Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-blue-400">
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {type === "select" && (
          <div className="mb-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Options (comma separated)</label>
            <input value={options} onChange={e => setOptions(e.target.value)} placeholder="Option1, Option2, Option3"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-blue-400" />
          </div>
        )}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[11px] text-gray-600">
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
            Required field
          </label>
          <button onClick={handleAdd} disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-600 disabled:opacity-50">
            {loading ? "Adding..." : "Add Field"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Your Custom Fields ({fields.length})</h2>
        {fields.length === 0 ? (
          <p className="text-center text-gray-400 text-[11px] py-4">No custom fields yet</p>
        ) : (
          <div className="space-y-2">
            {fields.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{f.field_type}</span>
                  <p className="text-[11px] font-black text-gray-900">{f.field_name}</p>
                  {f.is_required && <span className="text-[9px] text-red-500 font-black">*Required</span>}
                </div>
                <button onClick={() => handleDelete(f.id)}
                  className="text-[10px] text-red-500 font-black uppercase hover:text-red-700">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
