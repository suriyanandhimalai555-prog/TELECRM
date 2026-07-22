var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'src/views/attendance/Attendance.tsx');
var backupPath = filePath + '.bak-' + Date.now();
var content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

var anchor1 = '  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);';
if (content.indexOf(anchor1) === -1) {
  console.error('ASSERTION FAILED: anchor1 not found.');
  process.exit(1);
}
var replacement1 = '  const [selectedDate, setSelectedDate] = useState("");';
content = content.replace(anchor1, replacement1);

var anchor2Lines = [
  '  const fetchAll = async () => {',
  '    try {',
  '      const res = await api.get(`/attendance/all?date=${selectedDate}`);',
  '      setAllAttendance(res.data.attendance || []);',
  '    } catch {}',
  '  };'
];
var anchor2 = anchor2Lines.join('\n');
if (content.indexOf(anchor2) === -1) {
  console.error('ASSERTION FAILED: anchor2 not found.');
  process.exit(1);
}
var replacement2Lines = [
  '  const fetchAll = async () => {',
  '    try {',
  '      const url = selectedDate ? `/attendance/all?date=${selectedDate}` : \'/attendance/all\';',
  '      const res = await api.get(url);',
  '      setAllAttendance(res.data.attendance || []);',
  '    } catch {}',
  '  };'
];
var replacement2 = replacement2Lines.join('\n');
content = content.replace(anchor2, replacement2);

fs.writeFileSync(filePath, content);
console.log('Patched: Attendance now defaults to showing all history.');
