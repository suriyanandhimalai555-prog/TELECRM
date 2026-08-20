var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/controllers/whatsappController.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

// 1. Add import if missing
if (content.indexOf("from '../utils/metaPixel'") === -1) {
  var importAnchor = "import db from '../config/database';";
  if (content.indexOf(importAnchor) === -1) {
    console.error('ASSERTION FAILED: import anchor not found.');
    process.exit(1);
  }
  content = content.replace(importAnchor, importAnchor + "\nimport { sendMetaLeadEvent } from '../utils/metaPixel';");
  console.log('Added sendMetaLeadEvent import.');
} else {
  console.log('Import already present, skipping.');
}

// 2. Find the auto-created-lead log line and add the event call after it
var logMarker = 'Auto-created lead #${lead?.id}';
var idx = content.indexOf(logMarker);
if (idx === -1) {
  console.error('ASSERTION FAILED: could not find auto-created-lead log line.');
  process.exit(1);
}

// find end of that console.log statement's line
var lineEnd = content.indexOf('\n', idx);
if (lineEnd === -1) {
  console.error('ASSERTION FAILED: could not find end of log line.');
  process.exit(1);
}

var insertion = '\n            sendMetaLeadEvent({ phone: from, eventName: "Lead" }).catch(() => {});';
content = content.slice(0, lineEnd) + insertion + content.slice(lineEnd);

fs.writeFileSync(filePath, content);
console.log('Patched: sendMetaLeadEvent now fires for WhatsApp auto-created leads.');
