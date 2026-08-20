content = open('server/src/controllers/whatsappController.ts').read()

old = """const PHONE_NUMBER_ID_3 = process.env.WHATSAPP_PHONE_NUMBER_ID_3 || '';
// ─── Helper: pick phone ID by account index ───────────────────────────────────
function getPhoneId(account?: string | number): string {
  if (String(account) === '3' && PHONE_NUMBER_ID_4) return PHONE_NUMBER_ID_4;
  if (String(account) === '2' && PHONE_NUMBER_ID_3) return PHONE_NUMBER_ID_3;
  if (String(account) === '1' && PHONE_NUMBER_ID_2) return PHONE_NUMBER_ID_2;
  return PHONE_NUMBER_ID;
}
const WHATSAPP_TOKEN_2  = process.env.WA_ACCESS_TOKEN_2 || process.env.WHATSAPP_ACCESS_TOKEN_2 || WHATSAPP_TOKEN;
const WHATSAPP_TOKEN_4  = process.env.WA_ACCESS_TOKEN_4 || '';
const PHONE_NUMBER_ID_4 = process.env.WHATSAPP_PHONE_NUMBER_ID_4 || '';"""

new = """const PHONE_NUMBER_ID_3 = process.env.WHATSAPP_PHONE_NUMBER_ID_3 || '';
const PHONE_NUMBER_ID_4 = process.env.WHATSAPP_PHONE_NUMBER_ID_4 || '';
const WHATSAPP_TOKEN_2  = process.env.WA_ACCESS_TOKEN_2 || process.env.WHATSAPP_ACCESS_TOKEN_2 || WHATSAPP_TOKEN;
const WHATSAPP_TOKEN_4  = process.env.WA_ACCESS_TOKEN_4 || '';
// ─── Helper: pick phone ID by account index ───────────────────────────────────
function getPhoneId(account?: string | number): string {
  if (String(account) === '3' && PHONE_NUMBER_ID_4) return PHONE_NUMBER_ID_4;
  if (String(account) === '2' && PHONE_NUMBER_ID_3) return PHONE_NUMBER_ID_3;
  if (String(account) === '1' && PHONE_NUMBER_ID_2) return PHONE_NUMBER_ID_2;
  return PHONE_NUMBER_ID;
}"""

if old in content:
    content = content.replace(old, new)
    print('✅ Fixed')
else:
    print('❌ Not found - checking for encoding issues')
    # Debug
    idx = content.find('PHONE_NUMBER_ID_3 = process.env')
    print(f'Found at index: {idx}')
    print(repr(content[idx-5:idx+200]))

open('server/src/controllers/whatsappController.ts', 'w').write(content)
