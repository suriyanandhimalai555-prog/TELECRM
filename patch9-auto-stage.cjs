var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/controllers/whatsappController.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  '      [msgId, phoneId, phone, message, contactName || \'\', companyId, phoneId]',
  '    );',
  '',
  '    res.json({ success: true, messageId: msgId, message: savedRows[0] });'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  '      [msgId, phoneId, phone, message, contactName || \'\', companyId, phoneId]',
  '    );',
  '',
  '    // Auto-move stage from NEW to CONTACTED on first outbound reply',
  '    await db.query(',
  '      \'UPDATE leads SET stage = \\\'CONTACTED\\\', updated_at = CURRENT_TIMESTAMP WHERE company_id = \' + \'$1\' + \' AND stage = \\\'NEW\\\' AND (RIGHT(mobile,10) = RIGHT(\' + \'$2\' + \',10) OR RIGHT(whatsapp,10) = RIGHT(\' + \'$2\' + \',10))\',',
  '      [companyId, phone]',
  '    );',
  '',
  '    res.json({ success: true, messageId: msgId, message: savedRows[0] });'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: sendMessage now auto-moves NEW leads to CONTACTED.');
