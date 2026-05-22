import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('src/components/WhatsApp/WhatsAppChat.tsx', 'utf8');
code = code.replace(
  `  const handleDeleteAction = (type: 'delete' | 'archive' | 'clear') => {
    if (!selectedContact) return;
    if (type === 'clear') {
      setMessages([]);
    } else {
      setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
      setSelectedContact(null);
    }
    setDeleteModal(null);
  };`,
  `  const handleDeleteAction = async (type: 'delete' | 'archive' | 'clear') => {
    if (!selectedContact) return;
    if (type === 'clear') {
      try {
        const msgs = await api.get('/whatsapp/history/' + selectedContact.contact_number);
        for (const m of msgs.data.messages || []) {
          await api.delete('/whatsapp/message/' + m.id);
        }
      } catch {}
      setMessages([]);
    } else {
      try {
        const msgs = await api.get('/whatsapp/history/' + selectedContact.contact_number);
        for (const m of msgs.data.messages || []) {
          await api.delete('/whatsapp/message/' + m.id);
        }
      } catch {}
      setConversations(prev => prev.filter(c => c.contact_number !== selectedContact.contact_number));
      setSelectedContact(null);
    }
    setDeleteModal(null);
  };`
);
writeFileSync('src/components/WhatsApp/WhatsAppChat.tsx', code);
console.log('✅ Done!');
