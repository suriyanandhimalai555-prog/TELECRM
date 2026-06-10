content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix accountLabel
old = "  const accountLabel = accountIndex === 0 ? 'WhatsApp' : accountIndex === 1 ? 'WhatsApp 2' : 'WhatsApp 3';"
new = "  const accountLabel = accountIndex === 0 ? 'WhatsApp' : accountIndex === 1 ? 'WhatsApp 2' : accountIndex === 2 ? 'WhatsApp 3' : 'WhatsApp 4';"
content = content.replace(old, new)

# Fix toggle label - WA3 toggles to WA4, WA4 toggles to WA3
old = "                {`WA ${accountIndex + 1} → WA ${(accountIndex + 1) % 4 + 1}`}"
new = "                {accountIndex === 2 ? 'WA 3 → WA 4' : accountIndex === 3 ? 'WA 4 → WA 3' : `WA ${accountIndex + 1} → WA ${accountIndex + 2}`}"
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('✅ Fixed')
