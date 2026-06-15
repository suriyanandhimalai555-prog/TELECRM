content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# FIX 1: Messages disappearing - only load messages when contact changes
old = "  useEffect(() => {\n    if (selectedContact) fetchMessages(selectedContact.contact_number);\n  }, [selectedContact, fetchMessages]);"
new = """  const prevContactRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedContact?.contact_number && prevContactRef.current !== selectedContact.contact_number) {
      prevContactRef.current = selectedContact.contact_number;
      fetchMessages(selectedContact.contact_number);
    }
  }, [selectedContact?.contact_number]);"""
content = content.replace(old, new)

# FIX 2: Messages sent twice - remove duplicate from socket + optimistic update
old = "        setMessages(prev => prev.some(m => m.message_id === newMsg.message_id) ? prev : [...prev, newMsg]);"
new = """        setMessages(prev => {
          if (prev.some(m => m.message_id === newMsg.message_id)) return prev;
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Remove temp message if real one arrives
          const withoutTemp = prev.filter(m => !m.message_id?.startsWith('temp_'));
          return [...withoutTemp, newMsg];
        });"""
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
