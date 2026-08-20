content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# FIX: Remove duplicate messages in the display
old = "  useEffect(() => {\n    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });\n  }, [messages]);"
new = """  // Deduplicate messages before display
  const deduplicatedMessages = messages.filter((msg, index, self) =>
    index === self.findIndex(m => 
      m.message_id === msg.message_id || 
      (m.message_text === msg.message_text && 
       m.direction === msg.direction &&
       Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000)
    )
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);"""
content = content.replace(old, new)

# Replace messages.map with deduplicatedMessages.map
content = content.replace(
    "              {messages.map((m, idx) => {",
    "              {deduplicatedMessages.map((m, idx) => {"
)
content = content.replace(
    "                const showDate = idx === 0 || new Date(m.timestamp).toDateString() !== new Date(messages[idx-1].timestamp).toDateString();",
    "                const showDate = idx === 0 || new Date(m.timestamp).toDateString() !== new Date(deduplicatedMessages[idx-1].timestamp).toDateString();"
)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
