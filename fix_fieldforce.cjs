const fs = require('fs');
const path = process.argv[2];
let content = fs.readFileSync(path, 'utf8');

const oldHistory = `api.get("/attendance/history").then(r => {
      setHistory(r.data?.history || r.data || []);
    }).catch(() => {});`;

const newHistory = `api.get("/attendance/history").then(r => {
      const data = r.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.history) ? data.history : [];
      setHistory(list);
    }).catch(() => {});`;

const oldAll = `api.get("/attendance/all").then(r => {
      setAllAttendance(r.data?.attendance || r.data || []);
    }).catch(() => {});`;

const newAll = `api.get("/attendance/all").then(r => {
      const data = r.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.attendance) ? data.attendance : [];
      setAllAttendance(list);
    }).catch(() => {});`;

if (!content.includes(oldHistory)) { console.error('ANCHOR NOT FOUND: history block'); process.exit(1); }
if (!content.includes(oldAll)) { console.error('ANCHOR NOT FOUND: all block'); process.exit(1); }

content = content.replace(oldHistory, newHistory);
content = content.replace(oldAll, newAll);

fs.writeFileSync(path, content);
console.log('Patched successfully.');
