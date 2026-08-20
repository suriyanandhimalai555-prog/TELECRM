const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Layout/Sidebar.tsx');
const backupPath = filePath + '.bak-' + Date.now();
let content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, content);
console.log('Backup saved:', backupPath);

const anchor = `                {isEmployee ? (
                  <button
                    onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                    className="w-full flex items-center px-4 py-2.5 rounded-xl transition-all group text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <div className={cn("min-w-[20px]", isOpen ? "mr-3" : "mx-auto")}>
                      <MessageSquare size={18} />
                    </div>
                    {isOpen && <span className="font-black uppercase tracking-widest text-[9px]">WhatsApp</span>}
                  </button>
                ) : hasWA2 ? (`;

assert(content.includes(anchor), 'PATCH FAILED: isEmployee button anchor not found.');

const replacement = `                {isEmployee ? (
                  <NavLink
                    to={user?.company_id === 11 ? "/app/whatsapp3" : user?.company_id === 12 ? "/app/whatsapp4" : "/app/whatsapp"}
                    className={({ isActive }) => cn(
                      "flex items-center px-4 py-2.5 rounded-xl transition-all",
                      isActive ? "bg-green-50 text-green-600 font-bold" : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                    )}
                  >
                    <div className={cn("min-w-[20px]", isOpen ? "mr-3" : "mx-auto")}>
                      <MessageSquare size={18} />
                    </div>
                    {isOpen && <span className="font-black uppercase tracking-widest text-[9px]">WhatsApp</span>}
                  </NavLink>
                ) : hasWA2 ? (`;

content = content.replace(anchor, replacement);
fs.writeFileSync(filePath, content);
console.log('Fixed: Employees now route to internal WhatsApp inbox instead of web.whatsapp.com');

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERTION FAILED:', msg);
    process.exit(1);
  }
}
