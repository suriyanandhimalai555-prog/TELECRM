content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

old = "      setMessages(res.data.messages || []);"
new = "      setMessages(Array.isArray(res.data) ? res.data : (res.data.messages || []));"

if old in content:
    content = content.replace(old, new)
    print('✅ Fixed')
else:
    print('❌ Not found')

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
