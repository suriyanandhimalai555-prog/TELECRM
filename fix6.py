# Fix Settings.tsx - u.phone and u.role type issues
content = open('src/views/settings/Settings.tsx').read()

# Fix u.phone - cast u to any
content = content.replace(
    "{u.phone && <div className=\"text-[9px] text-blue-600 font-mono tracking-wider\">📞 {u.phone}</div>}",
    "{(u as any).phone && <div className=\"text-[9px] text-blue-600 font-mono tracking-wider\">📞 {(u as any).phone}</div>}"
)
content = content.replace(
    "phone: u.phone || '',",
    "phone: (u as any).phone || '',"
)
content = content.replace(
    "role: u.role,",
    "role: u.role as any,"
)

open('src/views/settings/Settings.tsx', 'w').write(content)
print('Settings fixed')

# Fix server whatsappController - parseInt returns number but push expects string
content = open('server/src/controllers/whatsappController.ts').read()
content = content.replace(
    "params.push(parseInt(req.query.company_id as string));",
    "params.push(String(parseInt(req.query.company_id as string)));"
)
open('server/src/controllers/whatsappController.ts', 'w').write(content)
print('Server fixed')
