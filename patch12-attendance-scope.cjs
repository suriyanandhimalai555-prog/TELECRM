var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/routes/attendanceRoutes.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  '// Get all attendance (admin)',
  'router.get(\'/all\', authenticate, async (req: any, res) => {',
  '  const { date } = req.query;',
  '  try {',
  '    const { rows } = await db.query(',
  '      `SELECT a.*, u.name, u.email, u.role ',
  '       FROM attendance a ',
  '       LEFT JOIN users u ON a.user_id = u.id ',
  '       WHERE ($1::date IS NULL OR a.date = $1::date)',
  '       ORDER BY a.check_in DESC`,',
  '      [date || null]',
  '    );',
  '    res.json({ attendance: rows });',
  '  } catch (err: any) {',
  '    res.status(500).json({ error: err.message });',
  '  }',
  '});'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  '// Get all attendance (admin)',
  'router.get(\'/all\', authenticate, async (req: any, res) => {',
  '  const { date } = req.query;',
  '  const companyId = req.user && req.user.company_id;',
  '  try {',
  '    const { rows } = await db.query(',
  '      `SELECT a.*, u.name, u.email, u.role ',
  '       FROM attendance a ',
  '       LEFT JOIN users u ON a.user_id = u.id ',
  '       WHERE ($1::date IS NULL OR a.date = $1::date)',
  '       AND u.company_id = $2',
  '       ORDER BY a.check_in DESC`,',
  '      [date || null, companyId]',
  '    );',
  '    res.json({ attendance: rows });',
  '  } catch (err: any) {',
  '    res.status(500).json({ error: err.message });',
  '  }',
  '});'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: /all now scoped to company_id.');
