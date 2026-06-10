content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix 1: Stop auto-refresh from clearing messages
old = "    const refreshInterval = setInterval(fetchConversations, 5000);"
new = "    const refreshInterval = setInterval(() => {\n      fetchConversations();\n    }, 5000);"
content = content.replace(old, new)

# Fix 2: Don't refetch messages when conversations refresh
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"
new = """  const prevContactRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedContact && selectedContact.contact_number !== prevContactRef.current) {
      prevContactRef.current = selectedContact.contact_number;
      fetchMessages(selectedContact.contact_number);
    }
  }, [selectedContact?.contact_number]);"""
content = content.replace(old, new)

# Fix 3: fetchConversations should NOT reset messages
old = "      setConversations(res.data.conversations || []);"
new = """      const fresh = res.data.conversations || [];
      setConversations(prev => {
        if (JSON.stringify(prev.map(c => c.contact_number)) === JSON.stringify(fresh.map((c: any) => c.contact_number))) {
          return prev.map((c, i) => ({ ...fresh[i], unread_count: c.unread_count }));
        }
        return fresh;
      });"""
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
