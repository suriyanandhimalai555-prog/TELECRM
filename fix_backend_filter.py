content = open('server/src/controllers/whatsappController.ts').read()

# Add project_id to SELECT
old = "          l.contact_name AS lead_name,\n          l.stage        AS lead_stage,"
new = "          l.contact_name AS lead_name,\n          l.stage        AS lead_stage,\n          l.project_id   AS project_id,"

content = content.replace(old, new)

# Add project_id to outer SELECT
old = "        lead_name,\n        lead_stage,"
new = "        lead_name,\n        lead_stage,\n        project_id,"

content = content.replace(old, new)

open('server/src/controllers/whatsappController.ts', 'w').write(content)
print('Backend fixed')
