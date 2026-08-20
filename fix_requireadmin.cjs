const fs = require('fs');
const path = process.argv[2];
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['master_admin','company_admin'].includes(req.user?.role || ''))
    return res.status(403).json({ message: 'Forbidden' });
  next();
};`;

const newBlock = `export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['master_admin','company_admin','ADMIN','MANAGER'].includes(req.user?.role || ''))
    return res.status(403).json({ message: 'Forbidden' });
  next();
};`;

if (!content.includes(oldBlock)) {
  console.error('ANCHOR NOT FOUND — file may already be patched or content differs.');
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content);
console.log('Patched successfully.');
