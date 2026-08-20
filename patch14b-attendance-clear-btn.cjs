var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'src/views/attendance/Attendance.tsx');
var content = fs.readFileSync(filePath, 'utf8');

var anchor = 'className="text-[11px] border border-gray-200 rounded-xl px-3py-2 focus:outline-none focus:border-blue-400" />';

var count = content.split(anchor).length - 1;
console.log('Occurrences found:', count);
console.log('Index:', content.indexOf(anchor));
