# Fix Settings.tsx - phone property
content = open('src/views/settings/Settings.tsx').read()
content = content.replace("user.phone", "(user as any).phone")
content = content.replace(
    "role: '' as 'EMPLOYEE' | 'MANAGER' | 'ADMIN'",
    "role: '' as any"
)
content = content.replace(
    ": 'EMPLOYEE' | 'MANAGER' | 'ADMIN'",
    ": any"
)
open('src/views/settings/Settings.tsx', 'w').write(content)
print('Settings fixed')

# Fix CallHistory.tsx
content = open('src/views/calls/CallHistory.tsx').read()
content = content.replace(
    "phone={",
    "// phone={"
)
open('src/views/calls/CallHistory.tsx', 'w').write(content)
print('CallHistory fixed')
