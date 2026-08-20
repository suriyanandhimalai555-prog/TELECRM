var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'server/src/controllers/leadController.ts');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  '    if (whereClauses.length > 0) {',
  '      baseQuery += ` WHERE ${whereClauses.join(\' AND \')}`;',
  '    }',
  '    baseQuery += ` ORDER BY l.created_at DESC`;',
  '    const leadsResult = await db.query(baseQuery, queryParams);',
  '    res.json(leadsResult.rows);'
];
var anchor = anchorLines.join('\n');

if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  '    if (whereClauses.length > 0) {',
  '      baseQuery += ` WHERE ${whereClauses.join(\' AND \')}`;',
  '    }',
  '    baseQuery += ` ORDER BY l.created_at DESC`;',
  '    var page = parseInt(req.query.page as string, 10);',
  '    var pageSize = parseInt(req.query.pageSize as string, 10);',
  '    if (page && pageSize) {',
  '      var countQuery = `SELECT COUNT(*) FROM leads l LEFT JOIN users u ON l.owner_id = u.id` + (whereClauses.length > 0 ? ` WHERE ${whereClauses.join(\' AND \')}` : \'\');',
  '      var countResult = await db.query(countQuery, queryParams);',
  '      var total = parseInt(countResult.rows[0].count, 10);',
  '      var offset = (page - 1) * pageSize;',
  '      var pagedParams = queryParams.slice();',
  '      pagedParams.push(pageSize, offset);',
  '      baseQuery += ` LIMIT $${pagedParams.length - 1} OFFSET $${pagedParams.length}`;',
  '      const leadsResult = await db.query(baseQuery, pagedParams);',
  '      res.set(\'X-Total-Count\', String(total));',
  '      return res.json(leadsResult.rows);',
  '    }',
  '    const leadsResult = await db.query(baseQuery, queryParams);',
  '    res.json(leadsResult.rows);'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: getLeads now supports optional page/pageSize pagination.');
