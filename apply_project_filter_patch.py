#!/usr/bin/env python3
backend_path = "server/src/controllers/whatsappController.ts"
with open(backend_path, "r") as f:
    backend = f.read()

old_inner = """          l.id           AS lead_id,
          l.contact_name AS lead_name,
          l.stage        AS lead_stage"""
new_inner = """          l.id           AS lead_id,
          l.contact_name AS lead_name,
          l.stage        AS lead_stage,
          l.project_id   AS lead_project_id"""
assert old_inner in backend, "Backend inner SELECT anchor not found!"
backend = backend.replace(old_inner, new_inner, 1)

old_outer = """        lead_id,
        lead_name,
        lead_stage"""
new_outer = """        lead_id,
        lead_name,
        lead_stage,
        lead_project_id AS project_id"""
assert old_outer in backend, "Backend outer SELECT anchor not found!"
backend = backend.replace(old_outer, new_outer, 1)

with open(backend_path, "w") as f:
    f.write(backend)
print("✅ Backend patched:", backend_path)

fe_path = "src/views/whatsapp/WhatsAppInbox.tsx"
with open(fe_path, "r") as f:
    fe = f.read()

old_iface = """interface Conversation {
  contact_number: string;
  contact_name: string;
  last_message: string;
  last_timestamp: string;
  last_direction: 'inbound' | 'outbound';
  last_status: string;
  unread_count: number;
  lead_id?: number;
}"""
new_iface = """interface Conversation {
  contact_number: string;
  contact_name: string;
  last_message: string;
  last_timestamp: string;
  last_direction: 'inbound' | 'outbound';
  last_status: string;
  unread_count: number;
  lead_id?: number;
  project_id?: number;
}"""
assert old_iface in fe, "Conversation interface anchor not found!"
fe = fe.replace(old_iface, new_iface, 1)

old_block = """  const AD_CAMPAIGNS = [
    { id: 'website', label: 'Website Development', emoji: '🌐', keywords: ['website', 'web development', 'web design', 'landing page', 'wordpress'] },
    { id: 'mobileapp', label: 'App Development', emoji: '📱', keywords: ['app', 'mobile app', 'android', 'ios', 'flutter', 'application'] },
    { id: 'playstore', label: 'Play Store & App Store Listing', emoji: '🚀', keywords: ['play store', 'app store', 'publish', 'listing', 'store listing'] },
    { id: 'web3', label: 'Web3 Development', emoji: '⛓️', keywords: ['web3', 'blockchain', 'smart contract', 'nft', 'defi', 'dao', 'solidity'] },
    { id: 'coinlisting', label: 'Crypto Coin Listing', emoji: '🪙', keywords: ['coin listing', 'token listing', 'list coin', 'list token', 'exchange listing'] },
    { id: 'exchange', label: 'Crypto Exchange Development', emoji: '💱', keywords: ['exchange', 'crypto exchange', 'trading platform', 'dex', 'cex', 'p2p'] },
  ];
  const autoDetectCampaign = (message: string): string => {
    const lower = message.toLowerCase();
    for (const ad of AD_CAMPAIGNS) {
      if (ad.keywords.some(k => lower.includes(k))) return ad.id;
    }
    return '';
  };"""
new_block = """  const [projectList, setProjectList] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/projects');
        setProjectList(res.data?.projects || res.data || []);
      } catch (e) {
        console.error('[WA] Failed to load projects for filter dropdown:', e);
      }
    })();
  }, []);"""
assert old_block in fe, "AD_CAMPAIGNS block anchor not found!"
fe = fe.replace(old_block, new_block, 1)

old_filter = "    .filter(c => campaignFilter !== 'all' ? contactCampaigns[c.contact_number] === campaignFilter : true)"
new_filter = "    .filter(c => campaignFilter !== 'all' ? String(c.project_id ?? '') === campaignFilter : true)"
assert old_filter in fe, "Filter line anchor not found!"
fe = fe.replace(old_filter, new_filter, 1)

old_select = """            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="text-[10px] font-black bg-white border-2 border-blue-200 rounded-full px-2 py-1 focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer uppercase">
              <option value="all">🎯 All Ads</option>
              <option value="website">🌐 Website Dev</option>
              <option value="mobileapp">📱 App Dev</option>
              <option value="playstore">🚀 Play Store</option>
              <option value="web3">⛓️ Web3</option>
              <option value="coinlisting">🪙 Coin Listing</option>
              <option value="exchange">💱 Crypto Exchange</option>
            </select>"""
new_select = """            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="text-[10px] font-black bg-white border-2 border-blue-200 rounded-full px-2 py-1 focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer uppercase">
              <option value="all">🎯 All Projects</option>
              {projectList.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>"""
assert old_select in fe, "Select JSX anchor not found!"
fe = fe.replace(old_select, new_select, 1)

old_badge = """                          {accountIndex === 2 && contactCampaigns[conv.contact_number] && (
                              {AD_CAMPAIGNS.find(a => a.id === contactCampaigns[conv.contact_number])?.emoji}"""
if old_badge in fe:
    new_badge = """                          {accountIndex === 2 && conv.project_id && (
                              {projectList.find(p => p.id === conv.project_id)?.name?.[0] || '🏷️'}"""
    fe = fe.replace(old_badge, new_badge, 1)
    print("  (badge line patched)")
else:
    print("  (badge line pattern not found verbatim — skipped, check manually around line 1169)")

with open(fe_path, "w") as f:
    f.write(fe)
print("✅ Frontend patched:", fe_path)
