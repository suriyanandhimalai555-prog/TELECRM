content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix: don't reset selected contact on refresh
old = "  const fetchConversations = useCallback(async () => {\n    try {\n      const params = new URLSearchParams();\n      if (searchTerm) params.set('search', searchTerm);\n      params.set('account', String(accountIndex));\n      const res = await api.get(`/whatsapp/conversations?${params.toString()}`);\n      setConversations(res.data.conversations || []);\n    } catch { } finally { setLoading(false); }\n  }, [searchTerm, accountIndex]);"

new = "  const fetchConversations = useCallback(async () => {\n    try {\n      const params = new URLSearchParams();\n      if (searchTerm) params.set('search', searchTerm);\n      params.set('account', String(accountIndex));\n      const res = await api.get(`/whatsapp/conversations?${params.toString()}`);\n      const newConvs = res.data.conversations || [];\n      setConversations(prev => {\n        // Merge: keep selected contact's unread count at 0 if currently selected\n        return newConvs.map((c: any) => {\n          const existing = prev.find(p => p.contact_number === c.contact_number);\n          if (existing && existing.unread_count === 0) {\n            return { ...c, unread_count: 0 };\n          }\n          return c;\n        });\n      });\n    } catch { } finally { setLoading(false); }\n  }, [searchTerm, accountIndex]);"

if old in content:
    content = content.replace(old, new)
    print('✅ fetchConversations fixed')
else:
    print('❌ Not found - trying alternate fix')

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
