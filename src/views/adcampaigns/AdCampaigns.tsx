import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ADS = [
  {
    id: "website",
    name: "Professional Website Development",
    emoji: "🌐",
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-600",
    autoReply: `Hi! 👋 Thank you for your interest in *Professional Website Development* by AVG Prime Tech.

We build stunning, high-performance websites for businesses in Dubai & India.

✅ Custom Design
✅ Mobile Responsive
✅ SEO Optimized
✅ E-commerce Ready
✅ Fast Delivery

💬 Please share your requirements and we'll send you a free quote within 24 hours!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
  {
    id: "mobileapp",
    name: "Custom Mobile App Development",
    emoji: "📱",
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-600",
    autoReply: `Hi! 👋 Thank you for your interest in *Custom Mobile App Development* by AVG Prime Tech.

We build powerful iOS & Android apps for your business.

✅ Native iOS & Android
✅ Cross-platform (Flutter/React Native)
✅ UI/UX Design Included
✅ Backend & API Integration
✅ Post-launch Support

💬 Tell us about your app idea and get a free consultation!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
  {
    id: "playstore",
    name: "Play Store & App Store Publishing",
    emoji: "🚀",
    color: "bg-purple-50 border-purple-200",
    headerColor: "bg-purple-600",
    autoReply: `Hi! 👋 Thank you for contacting AVG Prime Tech about *App Store Publishing*.

We handle complete app submission for Google Play Store & Apple App Store.

✅ App Store Optimization (ASO)
✅ Screenshots & Store Listing
✅ Review & Approval Support
✅ Fast Turnaround
✅ Both Platforms Covered

💬 Share your app details and we'll get started immediately!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
  {
    id: "web3",
    name: "Professional Web3 Development",
    emoji: "⛓️",
    color: "bg-indigo-50 border-indigo-200",
    headerColor: "bg-indigo-600",
    autoReply: `Hi! 👋 Thank you for your interest in *Web3 Development* by AVG Prime Tech.

We build next-generation blockchain & Web3 solutions.

✅ Smart Contract Development
✅ DeFi Platforms
✅ NFT Marketplaces
✅ DAO Development
✅ Wallet Integration

💬 Share your Web3 project idea for a free technical consultation!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
  {
    id: "coinlisting",
    name: "Crypto Coin Listing Support",
    emoji: "🪙",
    color: "bg-yellow-50 border-yellow-200",
    headerColor: "bg-yellow-500",
    autoReply: `Hi! 👋 Thank you for contacting AVG Prime Tech about *Crypto Coin Listing*.

We provide end-to-end support for listing your token on major exchanges.

✅ Exchange Selection & Strategy
✅ Listing Application Support
✅ Market Making Guidance
✅ Compliance & Documentation
✅ CEX & DEX Listing

💬 Share your token details for a free listing consultation!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
  {
    id: "exchange",
    name: "Crypto Exchange Development",
    emoji: "💱",
    color: "bg-orange-50 border-orange-200",
    headerColor: "bg-orange-500",
    autoReply: `Hi! 👋 Thank you for your interest in *Crypto Exchange Development* by AVG Prime Tech.

We build secure, scalable cryptocurrency exchanges.

✅ Centralized Exchange (CEX)
✅ Decentralized Exchange (DEX)
✅ P2P Trading Platform
✅ Admin Dashboard
✅ KYC/AML Integration
✅ Multi-currency Support

💬 Tell us your exchange requirements for a free proposal!

🌐 avgprimetech.com | 📍 Dubai & India`,
  },
];

export default function AdCampaigns() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>(
    Object.fromEntries(ADS.map(a => [a.id, a.autoReply]))
  );
  const navigate = useNavigate();

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(messages[id]);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const selectedAd = ADS.find(a => a.id === selected);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-1">Ad Campaign Messages</h1>
        <p className="text-gray-400 text-sm">AVG Prime Tech — Dubai | India · WhatsApp Account 3 Auto-Replies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {ADS.map(ad => (
          <div key={ad.id}
            className={`rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${ad.color} ${selected === ad.id ? "ring-2 ring-blue-500 shadow-lg" : ""}`}
            onClick={() => setSelected(selected === ad.id ? null : ad.id)}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{ad.emoji}</span>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleCopy(ad.id); }}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
                  {copied === ad.id ? "✅ Copied" : "Copy"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate("/app/whatsapp3"); }}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
                  Send
                </button>
              </div>
            </div>
            <h3 className="font-black text-gray-900 text-sm leading-tight">{ad.name}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Click to view/edit auto-reply message</p>
          </div>
        ))}
      </div>

      {selected && selectedAd && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`${selectedAd.headerColor} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedAd.emoji}</span>
              <div>
                <p className="font-black text-white text-sm">{selectedAd.name}</p>
                <p className="text-[10px] text-white/70">WhatsApp Account 3 Auto-Reply</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(editMode === selected ? null : selected)}
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30">
                {editMode === selected ? "Done" : "Edit"}
              </button>
              <button
                onClick={() => handleCopy(selected)}
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white text-gray-800 rounded-lg hover:bg-gray-50">
                {copied === selected ? "✅ Copied!" : "📋 Copy Message"}
              </button>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Auto-Reply Message</p>
              {editMode === selected ? (
                <textarea
                  value={messages[selected]}
                  onChange={e => setMessages(prev => ({ ...prev, [selected]: e.target.value }))}
                  className="w-full h-64 text-xs text-gray-700 border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-blue-400 resize-none font-mono"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-gray-700 bg-gray-50 rounded-xl p-4 h-64 overflow-y-auto font-sans leading-relaxed">
                  {messages[selected]}
                </pre>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">WhatsApp Preview</p>
              <div className="bg-[#e5ddd5] rounded-xl p-4 h-64 overflow-y-auto">
                <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-xs shadow-sm">
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{messages[selected]}</p>
                  <p className="text-[9px] text-gray-400 text-right mt-1">10:00 AM ✓✓</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">How to use:</p>
                <div className="text-[11px] text-gray-600 space-y-1.5">
                  <p>1️⃣ Click <strong>Copy Message</strong> above</p>
                  <p>2️⃣ Go to <strong>WhatsApp Account 3</strong></p>
                  <p>3️⃣ Set as auto-reply for this ad</p>
                  <p>4️⃣ Or paste manually when replying to leads</p>
                </div>
                <button
                  onClick={() => navigate("/app/whatsapp3")}
                  className="w-full mt-2 py-2.5 bg-green-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-green-600 transition-colors">
                  Open WhatsApp Account 3 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
