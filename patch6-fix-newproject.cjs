const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/views/projects/Projects.tsx');
const backupPath = filePath + '.bak-' + Date.now();
let content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

const anchor = `              setFormData({ name: '', description: '', status: 'ACTIVE' });`;
assert(content.includes(anchor), 'PATCH FAILED: anchor not found.');

const replacement = `              setFormData({ name: '', description: '', status: 'ACTIVE', default_owner_id: '' });`;
content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('Fixed: New Project button now resets default_owner_id too.');

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERTION FAILED:', msg);
    process.exit(1);
  }
}
