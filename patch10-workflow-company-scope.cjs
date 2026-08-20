var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/routes/integrationRoutes.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  'router.post(\'/workflow/auto-assign\', authenticate, async (req, res) => {',
  '  try {',
  '    // Get all unassigned leads',
  '    const { rows: leads } = await db.query(',
  '      "SELECT id FROM leads WHERE owner_id IS NULL OR owner_id = 0 ORDER BY created_at ASC"',
  '    );',
  '    // Get all active employees in round-robin',
  '    const { rows: users } = await db.query(',
  '      "SELECT id FROM users WHERE role IN (\'EMPLOYEE\', \'employee\', \'MANAGER\') ORDER BY id"',
  '    );'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  'router.post(\'/workflow/auto-assign\', authenticate, async (req: any, res) => {',
  '  try {',
  '    var companyId = req.user && req.user.company_id;',
  '    if (!companyId) return res.status(400).json({ error: \'No company context for this user\' });',
  '    // Get all unassigned leads, scoped to this company only',
  '    const { rows: leads } = await db.query(',
  '      \'SELECT id FROM leads WHERE (owner_id IS NULL OR owner_id = 0) AND company_id = \' + \'$1\' + \' ORDER BY created_at ASC\',',
  '      [companyId]',
  '    );',
  '    // Get all active employees in round-robin, scoped to this company only',
  '    const { rows: users } = await db.query(',
  '      \'SELECT id FROM users WHERE role IN (\\\'EMPLOYEE\\\', \\\'employee\\\', \\\'MANAGER\\\') AND company_id = \' + \'$1\' + \' ORDER BY id\',',
  '      [companyId]',
  '    );'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: auto-assign now scoped to company_id.');
