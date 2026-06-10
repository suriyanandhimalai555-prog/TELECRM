content = open('server/src/controllers/whatsappController.ts').read()

old = "          // Normalize old ALMANZAR phone ID to correct one\n          if (receivingPhoneId === '1106116902589892') receivingPhoneId = '1070621209476657';"
new = "          // No normalization needed - use phone ID as-is from Meta webhook"

if old in content:
    content = content.replace(old, new)
    print('✅ Fixed - removed wrong phone ID normalization')
else:
    print('❌ Not found')

open('server/src/controllers/whatsappController.ts', 'w').write(content)
