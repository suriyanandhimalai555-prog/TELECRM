var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/controllers/whatsappController.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  'export const deleteMessage = async (req: Request, res: Response) => {',
  '  const { id } = req.params;',
  '  const companyId = (req as any).user?.company_id;',
  '  const userRole = (req as any).user?.role;',
  '  try {'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  'export const deleteMessage = async (req: Request, res: Response) => {',
  '  const { id } = req.params;',
  '  const companyId = (req as any).user?.company_id;',
  '  const userRole = (req as any).user?.role;',
  '  var idNum = parseInt(id, 10);',
  '  if (!Number.isInteger(idNum) || idNum > 2147483647 || idNum < 1) {',
  '    return res.json({ success: true });',
  '  }',
  '  try {'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: deleteMessage now validates id range before querying.');
