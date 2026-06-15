content = open('server/src/controllers/whatsappController.ts').read()

old = "    const reqWithIo = req as any;\n    if (reqWithIo.io) {\n      reqWithIo.io.emit('whatsapp:message', savedRows[0]);\n    }\n\n    res.json({ success: true, messageId: msgId });\n  } catch (err) {\n    console.error('[WA] sendMessage error:', err);\n    res.status(500).json({ error: 'Failed to send' });"

new = "    res.json({ success: true, messageId: msgId, message: savedRows[0] });\n  } catch (err) {\n    console.error('[WA] sendMessage error:', err);\n    res.status(500).json({ error: 'Failed to send' });"

if old in content:
    content = content.replace(old, new)
    print('✅ Fixed')
else:
    print('❌ Not found')

open('server/src/controllers/whatsappController.ts', 'w').write(content)
