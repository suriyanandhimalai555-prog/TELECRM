import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    { icon: "👥", title: "Lead Management", desc: "Capture, score, and auto-assign leads from 30+ sources including Facebook, website forms, and Indiamart." },
    { icon: "💬", title: "WhatsApp Automation", desc: "Bulk campaigns, auto-replies, drip sequences across 3 WhatsApp Business accounts without getting blocked." },
    { icon: "📞", title: "Call Management", desc: "One-click calling, IVR tracking, call recording, and automatic follow-up scheduling." },
    { icon: "📊", title: "Sales Pipeline", desc: "Visual Kanban board to move deals across stages. Know exactly where every opportunity stands." },
    { icon: "🤖", title: "Workflow Automation", desc: "Auto-assign leads by source or location, send reminders, trigger follow-up sequences without manual effort." },
    { icon: "📍", title: "Field Force Tracking", desc: "GPS attendance, live location check-in, beat planning, and team performance monitoring." },
    { icon: "🔗", title: "Integrations", desc: "Facebook Ads, Website, Zapier, Pabbly, Indiamart, JustDial, and 30+ platforms connected natively." },
    { icon: "📈", title: "Reports & Analytics", desc: "100+ built-in reports, custom dashboards, and real-time performance tracking per team or individual." },
  ];

  const industries = [
    { icon: "🏢", name: "B2B Companies" },
    { icon: "🏠", name: "Real Estate" },
    { icon: "💰", name: "Financial Services" },
    { icon: "🎓", name: "Education" },
    { icon: "✈️", name: "Tours & Travel" },
    { icon: "👔", name: "Recruitment" },
    { icon: "🏥", name: "Healthcare" },
    { icon: "🛍️", name: "General B2C" },
  ];

  const plans = [
    { plan: "Starter", price: "₹499", per: "/user/month", features: ["Lead Management", "WhatsApp CRM", "Call Tracking", "Basic Reports", "Email Support"], highlight: false },
    { plan: "Pro", price: "₹999", per: "/user/month", features: ["Everything in Starter", "3 WhatsApp Accounts", "Workflow Automation", "Field Force Tracking", "Advanced Reports", "Priority Support"], highlight: true },
    { plan: "Enterprise", price: "Custom", per: "", features: ["Everything in Pro", "Custom Integrations", "Dedicated Account Manager", "Custom Development", "SLA Support"], highlight: false },
  ];

  return (
    <div style={{ fontFamily: "\'DM Sans\', \'Segoe UI\', sans-serif" }} className="min-h-screen bg-white text-gray-900">

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-md" : "bg-white/80 backdrop-blur-md"} border-b border-gray-100`}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <img src="/logo.png" alt="AVG CRM" className="h-10 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Industries", ].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">{link}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm font-bold text-gray-600 hover:text-blue-600 px-3 py-2 transition-colors hidden sm:block">Log in</button>
            <button onClick={() => navigate("/login")} className="text-sm font-bold bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-200">Free Trial →</button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 -z-10" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">All-in-One Sales CRM</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight tracking-tight mb-6">
            Result Driven<br />
            <span className="text-blue-600">Sales CRM</span> Software
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Automate leads · Run WhatsApp campaigns · Track your field team · Close deals faster. Built for Indian & UAE sales teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => navigate("/login")} className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:-translate-y-0.5">
              Request Demo & Free Trial
            </button>
            <button onClick={() => navigate("/login")} className="px-8 py-4 bg-white text-blue-600 font-bold text-sm rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all">
              Login to CRM →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">No credit card required · 14-day free trial · Cancel anytime</p>

          <div className="mt-16 mx-auto max-w-4xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs text-gray-400 font-mono">app.avgcrm.com/dashboard</span>
              </div>
              <div className="bg-gray-50 p-6 grid grid-cols-4 gap-4">
                {[
                  { label: "Total Leads", value: "1,248", color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Open Deals", value: "342", color: "text-green-600", bg: "bg-green-50" },
                  { label: "Won This Month", value: "₹24.8L", color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Follow-ups Due", value: "56", color: "text-orange-600", bg: "bg-orange-50" },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                    <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 px-6 pb-6 grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Leads</p>
                  {[
                    { name: "Rajesh Kumar", source: "Facebook", status: "New", color: "bg-blue-100 text-blue-700" },
                    { name: "Priya Mehta", source: "Website", status: "Contacted", color: "bg-yellow-100 text-yellow-700" },
                    { name: "Amit Sharma", source: "Indiamart", status: "Qualified", color: "bg-green-100 text-green-700" },
                  ].map(lead => (
                    <div key={lead.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{lead.name[0]}</div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{lead.name}</p>
                          <p className="text-[10px] text-gray-400">{lead.source}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.color}`}>{lead.status}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pipeline</p>
                  {[
                    { stage: "New", count: 48, pct: 80 },
                    { stage: "Contacted", count: 31, pct: 55 },
                    { stage: "Qualified", count: 19, pct: 35 },
                    { stage: "Won", count: 12, pct: 22 },
                  ].map(s => (
                    <div key={s.stage} className="mb-2">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] text-gray-500">{s.stage}</span>
                        <span className="text-[10px] font-bold text-gray-700">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2 block">Everything You Need</span>
            <h2 className="text-4xl font-black text-gray-900 mb-4">All The CRM Features You Need</h2>
            <p className="text-gray-400 max-w-xl mx-auto">One platform to increase leads, accelerate sales, and measure every rep's performance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(f => (
              <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all">
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="font-black text-gray-900 text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-green-600 mb-3 block">WhatsApp CRM</span>
              <h2 className="text-4xl font-black text-gray-900 mb-5">WhatsApp Marketing,<br />Automated</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">Connect up to 3 WhatsApp Business accounts and run full marketing automation without ever getting your number blocked.</p>
              <ul className="space-y-3 mb-8">
                {["Send bulk campaigns with personalised messages", "Auto-welcome new leads with brochures & videos", "Drip sequences to nurture leads over time", "Team inbox with full conversation history", "Track delivery, read receipts, and reply rates"].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-black flex-shrink-0 mt-0.5">✓</span>
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate("/login")} className="px-6 py-3 bg-green-500 text-white font-bold text-sm rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100">
                Try WhatsApp CRM →
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
              <div className="bg-green-500 px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-black">💬</div>
                <div>
                  <p className="font-black text-white text-sm">WhatsApp Inbox</p>
                  <p className="text-[10px] text-green-100">3 accounts · 142 unread</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { name: "Ravi Kumar", msg: "Hi, interested in your Real Estate CRM", time: "2m", unread: 2 },
                  { name: "Priya S", msg: "Can you send me the pricing?", time: "11m", unread: 1 },
                  { name: "Amit Jain", msg: "When can we schedule a demo?", time: "34m", unread: 3 },
                  { name: "Neha R", msg: "Got your brochure, looks good!", time: "1h", unread: 0 },
                ].map(chat => (
                  <div key={chat.name} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">{chat.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{chat.name}</p>
                      <p className="text-xs text-gray-400 truncate">{chat.msg}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-400">{chat.time}</p>
                      {chat.unread > 0 && <span className="inline-block mt-1 w-4 h-4 bg-green-500 text-white text-[9px] font-black rounded-full text-center leading-4">{chat.unread}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 flex items-center gap-2">
                <input className="flex-1 text-xs bg-white rounded-lg px-3 py-2 border border-gray-200 outline-none" placeholder="Type a message..." />
                <button className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs">➤</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2 block">Industry Solutions</span>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Customized For Your Industry</h2>
            <p className="text-gray-400">Purpose-built workflows for how your business actually sells.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {industries.map(ind => (
              <button key={ind.name} onClick={() => navigate("/login")} className="bg-gray-50 rounded-2xl p-6 text-center hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group">
                <span className="text-4xl mb-3 block">{ind.icon}</span>
                <p className="font-black text-sm text-gray-700 group-hover:text-blue-600 transition-colors">{ind.name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>


      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-40" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Transform Your Sales?</h2>
          <p className="text-blue-200 mb-10 text-lg">Join 1,000+ companies using AVG CRM to grow faster.</p>
          <button onClick={() => navigate("/login")} className="px-10 py-4 bg-white text-blue-600 font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-blue-50 transition-all shadow-2xl">
            Start Your Free Trial Today →
          </button>
          <p className="text-blue-300 text-xs mt-4">No credit card · Setup in minutes · Full support included</p>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <p className="font-black text-xl mb-3">AVG<span className="text-blue-400">CRM</span></p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">All-in-One Sales CRM for growing businesses across India and UAE.</p>
              <p className="text-xs text-gray-500">📍 Bengaluru, Karnataka</p>
              <p className="text-xs text-gray-500 mt-1">📞 +91 77958 08804</p>
              <a href="https://avgcrm.com" className="text-xs text-blue-400 mt-1 block hover:text-blue-300">🌐 avgcrm.com</a>
            </div>
            {[
              { heading: "Features", links: ["Lead Management", "WhatsApp CRM", "Call Management", "Field Force Tracking", "Workflow Automation"] },
              { heading: "Industries", links: ["Real Estate", "Education", "Financial Services", "B2B Sales", "Healthcare"] },
              { heading: "Company", links: ["About Us", , "Support", "Privacy Policy", "Terms of Service"] },
            ].map(col => (
              <div key={col.heading}>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">{col.heading}</p>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-gray-600">© 2026 AVG CRM by Agilavetri Primetech Private Limited. All rights reserved.</p>
            <p className="text-[10px] text-gray-600">Made in Bengaluru 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
