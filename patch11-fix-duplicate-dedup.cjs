var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'src/views/whatsapp/WhatsAppInbox.tsx');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var duplicateBlockLines = [
  '',
  '  // Deduplicate messages before display',
  '  const deduplicatedMessages = messages.filter((msg, index, self) =>',
  '    index === self.findIndex(m => ',
  '      m.message_id === msg.message_id || ',
  '      (m.message_text === msg.message_text && ',
  '       m.direction === msg.direction &&',
  '       Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000)',
  '    )',
  '  );'
];
var duplicateBlock = duplicateBlockLines.join('\n');

var fullDuplicate = duplicateBlock + '\n' + duplicateBlock;

if (content.indexOf(fullDuplicate) === -1) {
  console.error('ASSERTION FAILED: duplicate pair not found as expected.');
  process.exit(1);
}

content = content.replace(fullDuplicate, duplicateBlock);
fs.writeFileSync(filePath, content);
console.log('Patched: removed duplicate deduplicatedMessages declaration.');
