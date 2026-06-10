# Fix WhatsAppInbox ContactInfoDrawer missing props
content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

old = "function ContactInfoDrawer({ contact, messages, onClose, accountIndex = 0 }: {\n  contact: Conversation; messages: Message[]; onClose: () => void; accountIndex?: number;\n}) {"
new = "function ContactInfoDrawer({ contact, messages, onClose, accountIndex = 0, contactCampaigns, saveCampaignTag, AD_CAMPAIGNS }: {\n  contact: Conversation; messages: Message[]; onClose: () => void; accountIndex?: number;\n  contactCampaigns: Record<string, string>; saveCampaignTag: (p: string, c: string) => void; AD_CAMPAIGNS: any[];\n}) {"
content = content.replace(old, new)

# Fix ContactInfoDrawer usage - add missing props
old = "<ContactInfoDrawer contact={selectedContact} messages={messages} onClose={() => setShowContactInfo(false)} accountIndex={accountIndex} />"
new = "<ContactInfoDrawer contact={selectedContact} messages={messages} onClose={() => setShowContactInfo(false)} accountIndex={accountIndex} contactCampaigns={contactCampaigns} saveCampaignTag={saveCampaignTag} AD_CAMPAIGNS={AD_CAMPAIGNS} />"
content = content.replace(old, new)

# Fix server whatsappController number->string
srvContent = open('server/src/controllers/whatsappController.ts').read()
srvContent = srvContent.replace(
    "const idx = Math.min(Number(account) || 0, waRes.rows.length - 1);",
    "const idx = Math.min(Number(account) || 0, waRes.rows.length - 1); // idx is number"
)
srvContent = srvContent.replace(
    "const waAcc = waRes.rows[idx];",
    "const waAcc = waRes.rows[String(idx)] || waRes.rows[idx];"
)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('WhatsAppInbox fixed')

# Fix server controller
srv = open('server/src/controllers/whatsappController.ts').read()
srv = srv.replace(
    "const idx = Math.min(Number(account) || 0, waRes.rows.length - 1); const waAcc = waRes.rows[idx];",
    "const idx = Math.min(Number(account) || 0, waRes.rows.length - 1); const waAcc = waRes.rows[idx as any];"
)
open('server/src/controllers/whatsappController.ts', 'w').write(srv)
print('Server controller fixed')
