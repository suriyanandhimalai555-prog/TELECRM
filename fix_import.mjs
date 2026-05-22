import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('server/src/routes/whatsappRoutes.ts', 'utf8');
code = code.replace(
  `import { sendMessage, getHistory, getConversations, markAsRead, deleteMessage, verifyWebhook, handleWebhook, getTemplates, syncTemplates, sendTemplate, bulkSendMessage, proxyMedia, sendMedia } from '../controllers/whatsappController';`,
  `import { sendMessage, getHistory, getConversations, markAsRead, deleteMessage, deleteConversation, verifyWebhook, handleWebhook, getTemplates, syncTemplates, sendTemplate, bulkSendMessage, proxyMedia, sendMedia } from '../controllers/whatsappController';`
);
writeFileSync('server/src/routes/whatsappRoutes.ts', code);
console.log('✅ Import added!');
