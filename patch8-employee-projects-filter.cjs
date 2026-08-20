const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/src/controllers/projectController.ts');
const backupPath = filePath + '.bak-' + Date.now();
let content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

const anchor = `    if (req.user?.role !== 'master_admin') {
      queryParams.push(req.user?.company_id);
      whereClauses.push(\`p.company_id = $\${queryParams.length}\`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(\`p.company_id = $\${queryParams.length}\`);
    }`;

assert(content.includes(anchor), 'PATCH FAILED: getProjects anchor not found.');

const replacement = `    if (req.user?.role !== 'master_admin') {
      queryParams.push(req.user?.company_id);
      whereClauses.push(\`p.company_id = $\${queryParams.length}\`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(\`p.company_id = $\${queryParams.length}\`);
    }
    // ── NEW: employees only see their assigned projects ──────────────────
    if (req.user?.role === 'EMPLOYEE') {
      queryParams.push(req.user?.id);
      whereClauses.push(\`p.id IN (SELECT project_id FROM user_projects WHERE user_id = $\${queryParams.length})\`);
    }`;

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: getProjects now filters to assigned projects for EMPLOYEE role.');

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERTION FAILED:', msg);
    process.exit(1);
  }
}
