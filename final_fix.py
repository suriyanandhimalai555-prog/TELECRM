content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# THE REAL FIX: Remove fetchMessages from dependency and use ref
old = "  const fetchMessages = useCallback(async (phone: string) => {\n    try {\n      const res = await api.get(`/whatsapp/history/${phone}?account=${accountIndex}`);\n      setMessages(res.data.messages || []);\n    } catch { }\n  }, []);"

new = "  const fetchMessages = useCallback(async (phone: string) => {\n    try {\n      const res = await api.get(`/whatsapp/history/${phone}?account=${accountIndex}`);\n      setMessages(res.data.messages || []);\n    } catch { }\n  }, [accountIndex]);"

content = content.replace(old, new)

# STOP conversations refresh from triggering message reload
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"

new = "  const loadedContactRef = useRef<string | null>(null);\n  useEffect(() => {\n    if (selectedContact?.contact_number && loadedContactRef.current !== selectedContact.contact_number) {\n      loadedContactRef.current = selectedContact.contact_number;\n      fetchMessages(selectedContact.contact_number);\n    }\n  }, [selectedContact?.contact_number]);"

content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
