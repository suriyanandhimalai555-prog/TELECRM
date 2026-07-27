var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'src/views/whatsapp/WhatsAppInbox.tsx');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  '  const handleDeleteMessage = async (msgId: number | string) => {',
  '    setMessages(prev => prev.filter(m => m.id !== msgId));',
  '    try { await api.delete(`/whatsapp/message/${msgId}`); } catch {}',
  '  };'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  '  const handleDeleteMessage = async (msgId: number | string) => {',
  '    setMessages(prev => prev.filter(m => m.id !== msgId));',
  '    if (typeof msgId === "number" && msgId > 2147483647) return;',
  '    try { await api.delete(`/whatsapp/message/${msgId}`); } catch {}',
  '  };'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: handleDeleteMessage now skips API call for temp/unsent messages.');
