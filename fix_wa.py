content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# BUG 1: fetchConversations response has wrong structure
# res.data.conversations is probably undefined - it's just res.data (array)
old = "      const newConvs = res.data.conversations || [];"
new = "      const newConvs = Array.isArray(res.data) ? res.data : (res.data.conversations || []);"
content = content.replace(old, new)

# BUG 2: URL param auto-select is running on EVERY conversation refresh
# It keeps resetting selectedContact every 5 seconds
old = "  useEffect(() => {\n    const params = new URLSearchParams(location.search);\n    const phone = params.get(\"phone\");\n    if (!phone || !conversations.length) return;\n    const match = conversations.find(c => c.contact_number.replace(/[^0-9]/g, \"\").endsWith(phone.replace(/[^0-9]/g, \"\")));\n    if (match) {\n      setSelectedContact(match);\n      setTimeout(() => window.history.replaceState({}, '', location.pathname), 1000);\n    }\n  }, [location.search, conversations]);"
new = "  const urlAutoSelectedRef = useRef(false);\n  useEffect(() => {\n    if (urlAutoSelectedRef.current) return;\n    const params = new URLSearchParams(location.search);\n    const phone = params.get(\"phone\");\n    if (!phone || !conversations.length) return;\n    const match = conversations.find(c => c.contact_number.replace(/[^0-9]/g, \"\").endsWith(phone.replace(/[^0-9]/g, \"\")));\n    if (match) {\n      urlAutoSelectedRef.current = true;\n      setSelectedContact(match);\n      setTimeout(() => window.history.replaceState({}, '', location.pathname), 1000);\n    }\n  }, [location.search, conversations]);"
content = content.replace(old, new)

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Done')
