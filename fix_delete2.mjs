import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('src/components/WhatsApp/WhatsAppChat.tsx', 'utf8');
code = code.replace(
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
  };`,
  `  const handleDeleteAction = async (type: 'delete' | 'archive' | 'clear') => {
    if (!selectedContact) return;
    const phone = selectedContact.contact_number;
    if (type === 'clear') {
      try {
        const msgs = await api.get('/whatsapp/history/' + phone);
        for (const m of msgs.data.messages || []) {
          await api.delete('/whatsapp/message/' + m.id);
        }
      } catch {}
      setMessages([]);
    } else {
      try {
        const msgs = await api.get('/whatsapp/history/' + phone);
        for (const m of msgs.data.messages || []) {
          await api.delete('/whatsapp/message/' + m.id);
        }
      } catch {}
      setConversations(prev => prev.filter(c => c.contact_number !== phone));
      setSelectedContact(null);
      // Store deleted contacts in localStorage to prevent re-appearing
      const deleted = JSON.parse(localStorage.getItem('deleted_convos') || '[]');
      deleted.push(phone);
      localStorage.setItem('deleted_convos', JSON.stringify(deleted));
    }
    setDeleteModal(null);
  };`
);

// Filter out deleted convos when fetching
code = code.replace(
  `      setConversations(res.data.conversations || []);`,
  `      const deleted = JSON.parse(localStorage.getItem('deleted_convos') || '[]');
      setConversations((res.data.conversations || []).filter((c: Conversation) => !deleted.includes(c.contact_number)));`
);

writeFileSync('src/components/WhatsApp/WhatsAppChat.tsx', code);
console.log('✅ Done!');
