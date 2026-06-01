import { useState } from "react";

const WA_NUMBER = "917795808804"; // AVG Prime Tech WhatsApp number - update this

const AD_CAMPAIGNS = [
  {
    id: "website",
    emoji: "🌐",
    name: "Website Development",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-600",
    prefilledMsg: "Hi! I am interested in Website Development services by AVG Prime Tech. Please share more details.",
    description: "Professional Website Development for Your Business",
  },
  {
    id: "mobileapp",
    emoji: "📱",
    name: "App Development",
    color: "bg-green-50 border-green-200",
    badge: "bg-green-600",
    prefilledMsg: "Hi! I am interested in Mobile App Development services by AVG Prime Tech. Please share more details.",
    description: "Custom Mobile App Development",
  },
  {
    id: "playstore",
    emoji: "🚀",
    name: "Play Store & App Store Listing",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-600",
    prefilledMsg: "Hi! I am interested in Play Store & App Store Publishing services by AVG Prime Tech. Please share more details.",
    description: "Play Store & App Store Publishing Service",
  },
  {
    id: "web3",
    emoji: "⛓️",
    name: "Web3 Development",
    color: "bg-indigo-50 border-indigo-200",
    badge: "bg-indigo-600",
    prefilledMsg: "Hi! I am interested in Web3 Development services by AVG Prime Tech. Please share more details.",
    description: "Professional Web3 Development Services",
  },
  {
    id: "coinlisting",
    emoji: "🪙",
    name: "Crypto Coin Listing",
    color: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-500",
    prefilledMsg: "Hi! I am interested in Crypto Coin Listing Support by AVG Prime Tech. Please share more details.",
    description: "Crypto Coin Listing Support",
  },
  {
    id: "exchange",
    emoji: "💱",
    name: "Crypto Exchange Development",
    color: "bg-orange-50 border-orange-200",
    badge: "bg-orange-500",
    prefilledMsg: "Hi! I am interested in Crypto Exchange Development by AVG Prime Tech. Please share more details.",
    description: "Crypto Exchange Development Services",
  },
];

export default function AdCampaigns() {
  const [copied, setCopied] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState(WA_NUMBER);
  const [editingNumber, setEditingNumber] = useState(false);

  const getWALink = (msg: string) =>
    `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

  const copyLink = (id: string, msg: string) => {
    navigator.clipboard.writeText(getWALink(msg));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-1">Ad Campaign Links</h1>
          <p className="text-gray-400 text-sm">AVG Prime Tech — Each ad gets a unique WhatsApp link. Customers auto-route to the right campaign.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-[10px] font-black text-gray-400 uppercase">WA Number:</span>
          {editingNumber ? (
            <input value={waNumber} onChange={e => setWaNumber(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setEditingNumber(false)}
              className="text-xs font-bold text-gray-700 outline-none w-32" autoFocus />
          ) : (
            <button onClick={() => setEditingNumber(true)} className="text-xs font-bold text-blue-600 hover:underline">
              +{waNumber}
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 flex gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-black text-blue-900 text-sm mb-1">How it works</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Copy the link for each ad and paste it in your Facebook/Instagram ad as the WhatsApp click button URL.
            When a customer clicks the ad and messages you, their message will contain the service name —
            the CRM <strong>automatically tags</strong> that conversation under the correct campaign in WhatsApp Account 3.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {AD_CAMPAIGNS.map(ad => (
          <div key={ad.id} className={`rounded-2xl border-2 p-5 ${ad.color}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{ad.emoji}</span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{ad.name}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{ad.description}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Pre-filled Customer Message</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{ad.prefilledMsg}</p>
            </div>

            <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">WhatsApp Link for this Ad</p>
              <p className="text-[10px] text-gray-500 font-mono break-all">{getWALink(ad.prefilledMsg).slice(0, 60)}...</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => copyLink(ad.id, ad.prefilledMsg)}
                className={`flex-1 py-2.5 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all ${ad.badge} hover:opacity-90`}>
                {copied === ad.id ? "✅ Copied!" : "📋 Copy Link"}
              </button>
              <a href={getWALink(ad.prefilledMsg)} target="_blank" rel="noreferrer"
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center text-sm">
                🔗
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-4">📋 How to set up in Facebook Ads Manager</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Copy the link", desc: "Click 'Copy Link' for the service you are running ads for (e.g. Website Development)" },
            { step: "2", title: "Paste in Ad", desc: "In Facebook Ads Manager → Ad level → WhatsApp button URL → paste the copied link" },
            { step: "3", title: "Auto-sorted in CRM", desc: "When customer clicks and messages, it auto-appears under that campaign filter in WhatsApp Account 3" },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">{s.step}</div>
              <div>
                <p className="font-black text-gray-900 text-sm">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
