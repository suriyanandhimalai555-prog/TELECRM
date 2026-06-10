content = open('server/src/controllers/whatsappController.ts').read()

old = "const PHONE_NUMBER_ID_3 = process.env.WHATSAPP_PHONE_NUMBER_ID_3 || '';\n\n// ─── Helper: pick phone ID by account index ───────────────────────────────────\nfunction getPhoneId(account?: string | number): string {\n  if (String(account) === '3' && PHONE_NUMBER_ID_4) return PHONE_NUMBER_ID_4;\n  if (String(account) === '2' && PHONE_NUMBER_ID_3) return PHONE_NUMBER_ID_3;\n  if (String(account) === '1' && PHONE_NUMBER_ID_2) return PHONE_NUMBER_ID_2;\n  return PHONE_NUMBER_ID;\n}\nconst WHATSAPP_TOKEN_2  = process.env.WA_ACCESS_TOKEN_2 || process.env.WHATSAPP_ACCESS_TOKEN_2 || WHATSAPP_TOKEN;\nconst WHATSAPP_TOKEN_4  = process.env.WA_ACCESS_TOKEN_4 || '';\nconst PHONE_NUMBER_ID_4 = process.env.WHATSAPP_PHONE_NUMBER_ID_4 || '';"

new = "const PHONE_NUMBER_ID_3 = process.env.WHATSAPP_PHONE_NUMBER_ID_3 || '';\nconst PHONE_NUMBER_ID_4 = process.env.WHATSAPP_PHONE_NUMBER_ID_4 || '';\nconst WHATSAPP_TOKEN_2  = process.env.WA_ACCESS_TOKEN_2 || process.env.WHATSAPP_ACCESS_TOKEN_2 || WHATSAPP_TOKEN;\nconst WHATSAPP_TOKEN_4  = process.env.WA_ACCESS_TOKEN_4 || '';\n\n// ─── Helper: pick phone ID by account index ───────────────────────────────────\nfunction getPhoneId(account?: string | number): string {\n  if (String(account) === '3' && PHONE_NUMBER_ID_4) return PHONE_NUMBER_ID_4;\n  if (String(account) === '2' && PHONE_NUMBER_ID_3) return PHONE_NUMBER_ID_3;\n  if (String(account) === '1' && PHONE_NUMBER_ID_2) return PHONE_NUMBER_ID_2;\n  return PHONE_NUMBER_ID;\n}"

if old in content:
    content = content.replace(old, new)
    print('✅ Fixed')
else:
    print('❌ Still not found')

open('server/src/controllers/whatsappController.ts', 'w').write(content)
