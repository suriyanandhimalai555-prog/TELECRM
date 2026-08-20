const fs = require('fs');
const path = process.argv[2];
let content = fs.readFileSync(path, 'utf8');

const oldTeamScope = `    const teamScope    = isAdmin ? '' : isManager
      ? \`AND u.id IN (SELECT id FROM users WHERE reporting_to = \${userId})\`
      : \`AND u.id = \${userId}\`;`;

const newTeamScope = `    const teamScope    = isAdmin ? (companyId ? \`AND u.company_id = \${companyId}\` : '') : isManager
      ? \`AND u.id IN (SELECT id FROM users WHERE reporting_to = \${userId}) AND u.company_id = \${companyId}\`
      : \`AND u.id = \${userId}\`;`;

if (!content.includes(oldTeamScope)) {
  console.error('ANCHOR NOT FOUND: teamScope block');
  process.exit(1);
}
content = content.replace(oldTeamScope, newTeamScope);

const oldStandalone = `export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(\`
      SELECT u.id, u.name, u.role,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.id) AS total_calls,
        SUM(CASE WHEN LOWER(c.status) = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration_seconds), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id
      LEFT JOIN calls c ON c.agent_id = u.id
      WHERE u.role != 'ADMIN'
      GROUP BY u.id, u.name, u.role ORDER BY total_calls DESC\`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getTeamPerformance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};`;

const newStandalone = `export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const companyId = req.user.company_id;
    const role = req.user.role;
    const companyClause = (companyId && role !== 'master_admin') ? \`AND u.company_id = \${companyId}\` : '';
    const result = await db.query(\`
      SELECT u.id, u.name, u.role,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.id) AS total_calls,
        SUM(CASE WHEN LOWER(c.status) = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration_seconds), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id
      LEFT JOIN calls c ON c.agent_id = u.id
      WHERE u.role != 'ADMIN' \${companyClause}
      GROUP BY u.id, u.name, u.role ORDER BY total_calls DESC\`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getTeamPerformance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};`;

if (!content.includes(oldStandalone)) {
  console.error('ANCHOR NOT FOUND: standalone getTeamPerformance');
  process.exit(1);
}
content = content.replace(oldStandalone, newStandalone);

fs.writeFileSync(path, content);
console.log('Patched successfully.');
