content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# FIX 1: Messages disappearing - stop re-fetching messages on every conversation refresh
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"
new = "  const loadedContactRef = useRef<string | null>(null);\n  useEffect(() => {\n    if (selectedContact?.contact_number && loadedContactRef.current !== selectedContact.contact_number) {\n      loadedContactRef.current = selectedContact.contact_number;\n      fetchMessages(selectedContact.contact_number);\n    }\n  }, [selectedContact?.contact_number]);"
content = content.replace(old, new)

# FIX 2: Messages appearing twice - check for duplicates before adding
old = "        setMessages(prev => prev.some(m => m.message_id === newMsg.message_id) ? prev : [...prev, newMsg]);"
new = "        setMessages(prev => {\n          if (prev.some(m => m.message_id === newMsg.message_id)) return prev;\n          if (prev.some(m => m.id === newMsg.id)) return prev;\n          return [...prev, newMsg];\n        });"
content = content.replace(old, new)

# FIX 2b: Also check duplicates in optimistic update
old = "      if (res.data?.message_id) {\n        setMessages(prev => prev.map(m => m.message_id === tempMsg.message_id ? { ...tempMsg, message_id: res.data.message_id, status: 'delivered' } : m));\n      }"
new = "      if (res.data?.message_id) {\n        setMessages(prev => {\n          // Remove temp and add real, avoid duplicates\n          const withoutTemp = prev.filter(m => m.message_id !== tempMsg.message_id);\n          if (withoutTemp.some(m => m.message_id === res.data.message_id)) return withoutTemp;\n          return [...withoutTemp, { ...tempMsg, message_id: res.data.message_id, status: 'delivered' }];\n        });\n      }"
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Both fixes done')
