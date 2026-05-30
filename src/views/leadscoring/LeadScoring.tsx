import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function LeadScoring() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/lead-scoring/scored").then(r => setLeads(r.data.leads || [])).finally(() => setLoading(false));
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-50";
    if (score >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Hot";
    if (score >= 40) return "Warm";
    return "Cold";
  };

  const filtered = leads.filter(l =>
    l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.mobile?.includes(search)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Lead Scoring</h1>
      <p className="text-gray-400 text-sm mb-6">Leads ranked by quality score</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Hot Leads</p>
          <p className="text-3xl font-black text-green-700">{leads.filter(l => l.score >= 70).length}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600">Warm Leads</p>
          <p className="text-3xl font-black text-yellow-700">{leads.filter(l => l.score >= 40 && l.score < 70).length}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Cold Leads</p>
          <p className="text-3xl font-black text-red-700">{leads.filter(l => l.score < 40).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">All Leads by Score</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="text-[11px] border border-gray-200 rounded-xl px-3 py-2 focus:outline-none w-48" />
        </div>
        <div className="space-y-2">
          {filtered.map(lead => (
            <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer"
              onClick={() => navigate("/leads")}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center">
                  {lead.contact_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] font-black text-gray-900">{lead.contact_name}</p>
                  <p className="text-[9px] text-gray-400">{lead.mobile} • {lead.stage}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${lead.score}%` }}></div>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${getScoreColor(lead.score)}`}>
                  {getScoreLabel(lead.score)} {lead.score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
