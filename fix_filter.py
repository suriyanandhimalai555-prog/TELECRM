# Fix 1: Add project_id to Conversation interface
content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

old = """  lead_id?: number;
}"""
new = """  lead_id?: number;
  project_id?: number;
}"""
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Frontend fixed')
