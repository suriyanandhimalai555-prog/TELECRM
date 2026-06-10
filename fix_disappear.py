content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix 1: Only load messages when contact changes, not on every render
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"
new = "  const prevContactRef = useRef<string | null>(null);\n  useEffect(() => {\n    if (selectedContact && selectedContact.contact_number !== prevContactRef.current) {\n      prevContactRef.current = selectedContact.contact_number;\n      fetchMessages(selectedContact.contact_number);\n    }\n  }, [selectedContact?.contact_number]);"
content = content.replace(old, new)

# Fix 2: Don't replace conversations if same contacts - just update counts
old = "      setConversations(res.data.conversations || []);"
new = "      const fresh = res.data.conversations || [];\n      setConversations(fresh);"
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
