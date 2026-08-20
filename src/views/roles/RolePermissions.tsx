import { useState, useEffect } from "react";
import api from "../../services/api";

const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"];
const PERMISSIONS = [
  { key: "view_leads", label: "View Leads" },
  { key: "create_leads", label: "Create Leads" },
  { key: "edit_leads", label: "Edit Leads" },
  { key: "delete_leads", label: "Delete Leads" },
  { key: "view_reports", label: "View Reports" },
  { key: "manage_users", label: "Manage Users" },
  { key: "view_whatsapp", label: "View WhatsApp" },
  { key: "send_whatsapp", label: "Send WhatsApp" },
  { key: "view_campaigns", label: "View Campaigns" },
  { key: "manage_settings", label: "Manage Settings" },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map(p => p.key),
  MANAGER: ["view_leads","create_leads","edit_leads","view_reports","view_whatsapp","send_whatsapp","view_campaigns"],
  EMPLOYEE: ["view_leads","create_leads","view_whatsapp","send_whatsapp"],
};

export default function RolePermissions() {
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("role_permissions");
    if (saved) setPermissions(JSON.parse(saved));
  }, []);

  const toggle = (role: string, key: string) => {
    setPermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = () => {
    localStorage.setItem("role_permissions", JSON.stringify(permissions));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Role & Permissions</h1>
      <p className="text-gray-400 text-sm mb-6">Control what each role can access</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-[9px] font-black uppercase tracking-widest text-gray-400 p-4">Permission</th>
                {ROLES.map(role => (
                  <th key={role} className="text-center text-[9px] font-black uppercase tracking-widest text-gray-400 p-4">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(perm => (
                <tr key={perm.key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-[11px] font-bold text-gray-700">{perm.label}</td>
                  {ROLES.map(role => (
                    <td key={role} className="p-4 text-center">
                      <input type="checkbox"
                        checked={(permissions[role] || []).includes(perm.key)}
                        onChange={() => toggle(role, perm.key)}
                        className="w-4 h-4 accent-blue-500" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex justify-end">
          <button onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-600">
            {saved ? "✅ Saved!" : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}
