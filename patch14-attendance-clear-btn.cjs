var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'src/views/attendance/Attendance.tsx');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchorLines = [
  '          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}',
  '            className="text-[11px] border border-gray-200 rounded-xl px-3py-2 focus:outline-none focus:border-blue-400" />'
];
var anchor = anchorLines.join('\n');
if (content.indexOf(anchor) === -1) {
  console.error('ASSERTION FAILED: anchor not found.');
  process.exit(1);
}

var replacementLines = [
  '          <div className="flex items-center gap-2">',
  '            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}',
  '              className="text-[11px] border border-gray-200 rounded-xl px-3py-2 focus:outline-none focus:border-blue-400" />',
  '            {selectedDate && (',
  '              <button onClick={() => setSelectedDate("")}',
  '                className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700 px-2">',
  '                Show All',
  '              </button>',
  '            )}',
  '          </div>'
];
var replacement = replacementLines.join('\n');

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched: added Show All button next to date filter.');
