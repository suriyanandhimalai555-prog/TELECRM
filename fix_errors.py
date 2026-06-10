content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix 1: unsupported type
content = content.replace(
    "  | { type: 'interactive'; text: string };",
    "  | { type: 'interactive'; text: string }\n  | { type: 'unsupported'; text: string };"
)

# Fix 2: phone_number_id
content = content.replace(
    "newMsg.phone_number_id && newMsg.phone_number_id !== myPhoneId",
    "(newMsg as any).phone_number_id && (newMsg as any).phone_number_id !== myPhoneId"
)

# Fix 3: newMsg.message
content = content.replace(
    "autoDetectCampaign(newMsg.message || '')",
    "autoDetectCampaign((newMsg as any).message || '')"
)

# Fix 4: is_read
content = content.replace("      is_read: true,\n", "")

open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('All fixes done')
