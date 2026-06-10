content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Don't re-fetch messages on interval, only on contact select
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"

new = "  const selectedContactRef = useRef<Conversation | null>(null);\n  useEffect(() => {\n    if (selectedContact && selectedContact.contact_number !== selectedContactRef.current?.contact_number) {\n      selectedContactRef.current = selectedContact;\n      fetchMessages(selectedContact.contact_number);\n    }\n  }, [selectedContact, fetchMessages]);"

if old in content:
    content = content.replace(old, new)
    print('✅ fetchMessages fixed')
else:
    print('❌ Not found')

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
