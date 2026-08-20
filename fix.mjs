import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('src/components/WhatsApp/WhatsAppChat.tsx', 'utf8');
code = code.replace(
  `if (!text) return { type: 'text', text: '' };`,
  `if (!text) return { type: 'text', text: '' };
  if (text === '📎 Media message (type not recorded)') return { type: 'text', text: '📎 Media (not recorded)' };
  if (text === '[unsupported message]') return { type: 'text', text: '⚠️ Unsupported message' };`
);
code = code.replace(
  `if (!text) return '';`,
  `if (!text) return '';
  if (text === '📎 Media message (type not recorded)') return '📎 Media';
  if (text === '[unsupported message]') return '⚠️ Unsupported';`
);
writeFileSync('src/components/WhatsApp/WhatsAppChat.tsx', code);
console.log('✅ Done!');
