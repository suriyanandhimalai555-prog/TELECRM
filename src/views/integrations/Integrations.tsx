import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Integrations() {
  const [info, setInfo] = useState<any>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api.get('/integrations/webhook/info').then(r => setInfo(r.data)).catch(() => {});
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const integrations = [
    { name: 'Facebook Lead Ads', icon: '📘', status: 'active', desc: 'Auto-capture leads from Facebook Lead Ad forms' },
    { name: 'Website Webhook', icon: '🌐', status: 'active', desc: 'Capture leads from any website contact form' },
    { name: 'WhatsApp API', icon: '💬', status: 'active', desc: '3 WhatsApp accounts connected' },
    { name: 'Google Ads', icon: '🔍', status: 'coming', desc: 'Auto-capture leads from Google Lead Forms' },
    { name: 'Instagram Ads', icon: '📸', status: 'coming', desc: 'Capture leads from Instagram Lead Ads' },
    { name: 'Email Integration', icon: '📧', status: 'coming', desc: 'Sync emails with leads automatically' },
    { name: 'Pabbly Connect', icon: '🔗', status: 'active', desc: 'Connect 1000+ apps via webhook' },
    { name: 'Zapier', icon: '⚡', status: 'active', desc: 'Automate with 5000+ apps via webhook' },
  ];

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
          ].map(item => (
            <div key={item.key} className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate">{item.value}</code>
                <button
                  onClick={() => copy(item.value, item.key)}
                  className="text-[10px] font-black px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
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

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(item => (
          <div key={item.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{item.icon}</span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                item.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
              }`}>
                {item.status === 'active' ? '✅ Active' : '🔜 Coming Soon'}
              </span>
            </div>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-gray-900 mb-1">{item.name}</h3>
            <p className="text-[11px] text-gray-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
