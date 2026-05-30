import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Integrations() {
  const [info, setInfo] = useState<any>(null);
  const [copied, setCopied] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [emailConfig, setEmailConfig] = useState({ imap_host: '', imap_user: '', imap_pass: '', imap_port: '993' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.get('/integrations/webhook/info').then(r => setInfo(r.data)).catch(() => {});
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const baseUrl = info?.webhook_url?.replace('/api/integrations/webhook/lead', '') || 'https://www.avgcrm.com';

  const integrations = [
    { name: 'Facebook Lead Ads', icon: '📘', status: 'active', desc: 'Auto-capture leads from Facebook Lead Ad forms', action: null },
    { name: 'Website Webhook', icon: '🌐', status: 'active', desc: 'Capture leads from any website contact form', action: null },
    { name: 'WhatsApp API', icon: '💬', status: 'active', desc: '3 WhatsApp accounts connected', action: null },
    { name: 'Google Ads', icon: '🔍', status: 'active', desc: 'Auto-capture leads from Google Lead Forms', action: 'google' },
    { name: 'Instagram Ads', icon: '📸', status: 'active', desc: 'Capture leads from Instagram Lead Ads', action: 'instagram' },
    { name: 'Email Integration', icon: '📧', status: 'active', desc: 'Sync emails with leads automatically', action: 'email' },
    { name: 'Pabbly Connect', icon: '🔗', status: 'active', desc: 'Connect 1000+ apps via webhook', action: 'pabbly' },
    { name: 'Zapier', icon: '⚡', status: 'active', desc: 'Automate with 5000+ apps via webhook', action: 'zapier' },
  ];

  const handleEmailSave = async () => {
    setSaving(true);
    try {
      await api.post('/integrations/email-config', emailConfig);
      setSavedMsg('✅ Email integration saved!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavedMsg('❌ Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Integrations Hub</h1>
      <p className="text-gray-400 text-sm mb-6">Connect your CRM with external tools and platforms</p>

      {/* Webhook URLs */}
      {info && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Your Webhook URLs</h2>
          {[
            { label: 'Website Lead Capture URL', key: 'webhook_url', value: info.webhook_url },
            { label: 'Facebook Webhook URL', key: 'fb_url', value: info.facebook_webhook },
            { label: 'Facebook Verify Token', key: 'fb_token', value: info.facebook_verify_token },
            { label: 'Google Ads Webhook URL', key: 'google_url', value: `${baseUrl}/api/integrations/google/webhook` },
            { label: 'Instagram Ads Webhook URL', key: 'instagram_url', value: `${baseUrl}/api/integrations/instagram/webhook` },
          ].map(item => (
            <div key={item.key} className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate">{item.value}</code>
                <button onClick={() => copy(item.value, item.key)}
                  className="text-[10px] font-black px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  {copied === item.key ? '✅ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 bg-blue-50 rounded-xl">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">How to use Website Webhook</p>
            <p className="text-[10px] text-blue-600">POST to the URL above with: <code>name, mobile, email, source, company</code></p>
          </div>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(item => (
          <div key={item.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-green-50 text-green-600">
                ✅ Active
              </span>
            </div>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-900 mb-1">{item.name}</h3>
            <p className="text-[11px] text-gray-400 mb-3">{item.desc}</p>
            {item.action && (
              <button onClick={() => setActiveModal(item.action)}
                className="w-full py-2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600">
                Setup / View
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Google Ads Modal */}
      {activeModal === 'google' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-2">🔍 Google Ads Integration</h2>
            <p className="text-sm text-gray-400 mb-4">Connect Google Lead Form Extensions to auto-capture leads</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Step 1 — Copy your Webhook URL</p>
              <div className="flex gap-2">
                <code className="flex-1 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-2 truncate">
                  {baseUrl}/api/integrations/google/webhook
                </code>
                <button onClick={() => copy(`${baseUrl}/api/integrations/google/webhook`, 'g')}
                  className="px-3 py-2 bg-blue-500 text-white text-[10px] font-black rounded-lg">
                  {copied === 'g' ? '✅' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 text-[11px] text-blue-700 space-y-1">
              <p className="font-black uppercase tracking-widest text-[10px] mb-2">Step 2 — Setup in Google Ads</p>
              <p>1. Go to Google Ads → Assets → Lead Forms</p>
              <p>2. Create or edit a Lead Form</p>
              <p>3. Under "Lead delivery" → Select "Webhook"</p>
              <p>4. Paste the URL above</p>
              <p>5. Set Key: <code className="bg-blue-100 px-1 rounded">avgcrm_google_2024</code></p>
            </div>
            <button onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-xl hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Instagram Ads Modal */}
      {activeModal === 'instagram' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-2">📸 Instagram Ads Integration</h2>
            <p className="text-sm text-gray-400 mb-4">Capture leads from Instagram Lead Ads automatically</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Webhook URL</p>
              <div className="flex gap-2">
                <code className="flex-1 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-2 truncate">
                  {baseUrl}/api/integrations/facebook/webhook
                </code>
                <button onClick={() => copy(`${baseUrl}/api/integrations/facebook/webhook`, 'ig')}
                  className="px-3 py-2 bg-blue-500 text-white text-[10px] font-black rounded-lg">
                  {copied === 'ig' ? '✅' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-pink-50 rounded-xl p-4 mb-4 text-[11px] text-pink-700 space-y-1">
              <p className="font-black uppercase tracking-widest text-[10px] mb-2">Setup Steps</p>
              <p>1. Go to Meta Business Suite → Lead Ads</p>
              <p>2. Select your Instagram Ad Account</p>
              <p>3. Go to Lead Ads → CRM Integration</p>
              <p>4. Select "Webhook" and paste URL above</p>
              <p>5. Verify Token: <code className="bg-pink-100 px-1 rounded">avgcrm_fb_2024</code></p>
              <p>6. Subscribe to <code className="bg-pink-100 px-1 rounded">leadgen</code> events</p>
            </div>
            <button onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-xl hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email Integration Modal */}
      {activeModal === 'email' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-2">📧 Email Integration</h2>
            <p className="text-sm text-gray-400 mb-4">Sync incoming emails as leads automatically</p>
            <div className="space-y-3 mb-4">
              {[
                { label: 'IMAP Host', key: 'imap_host', placeholder: 'imap.gmail.com' },
                { label: 'Email Address', key: 'imap_user', placeholder: 'you@gmail.com' },
                { label: 'App Password', key: 'imap_pass', placeholder: '16-digit app password', type: 'password' },
                { label: 'IMAP Port', key: 'imap_port', placeholder: '993' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">{f.label}</label>
                  <input type={f.type || 'text'} placeholder={f.placeholder}
                    value={(emailConfig as any)[f.key]}
                    onChange={e => setEmailConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-blue-400" />
                </div>
              ))}
            </div>
            {savedMsg && <p className="text-center text-[11px] font-bold mb-3">{savedMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setActiveModal(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-xl">
                Close
              </button>
              <button onClick={handleEmailSave} disabled={saving}
                className="flex-1 py-2 bg-blue-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-600 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save & Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pabbly Modal */}
      {activeModal === 'pabbly' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-2">🔗 Pabbly Connect</h2>
            <p className="text-sm text-gray-400 mb-4">Use this webhook URL in Pabbly to send leads to AVG CRM</p>
            <div className="flex gap-2 mb-4">
              <code className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
                {baseUrl}/api/integrations/webhook/lead
              </code>
              <button onClick={() => copy(`${baseUrl}/api/integrations/webhook/lead`, 'pb')}
                className="px-3 py-2 bg-blue-500 text-white text-[10px] font-black rounded-lg">
                {copied === 'pb' ? '✅' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-[11px] text-gray-600 space-y-1 mb-4">
              <p className="font-black text-[10px] uppercase tracking-widest mb-2">Required Fields</p>
              <p>• <code>name</code> — Contact name</p>
              <p>• <code>mobile</code> — Phone number</p>
              <p>• <code>email</code> — Email address</p>
              <p>• <code>source</code> — Lead source</p>
              <p>• <code>company</code> — Company name</p>
            </div>
            <button onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* Zapier Modal */}
      {activeModal === 'zapier' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-2">⚡ Zapier Integration</h2>
            <p className="text-sm text-gray-400 mb-4">Use this webhook URL as a Zapier "Catch Hook" action</p>
            <div className="flex gap-2 mb-4">
              <code className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
                {baseUrl}/api/integrations/webhook/lead
              </code>
              <button onClick={() => copy(`${baseUrl}/api/integrations/webhook/lead`, 'zap')}
                className="px-3 py-2 bg-blue-500 text-white text-[10px] font-black rounded-lg">
                {copied === 'zap' ? '✅' : 'Copy'}
              </button>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-[11px] text-yellow-800 space-y-1 mb-4">
              <p className="font-black text-[10px] uppercase tracking-widest mb-2">Setup in Zapier</p>
              <p>1. Create new Zap</p>
              <p>2. Trigger: Any app (Facebook, Google, etc.)</p>
              <p>3. Action: Webhooks by Zapier → POST</p>
              <p>4. URL: paste the webhook URL above</p>
              <p>5. Map fields: name, mobile, email, source</p>
            </div>
            <button onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
