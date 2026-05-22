import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('server/src/routes/whatsappRoutes.ts', 'utf8');
code = code.replace(
  `router.delete('/message/:id', authenticate, deleteMessage);`,
  `router.delete('/message/:id', authenticate, deleteMessage);
router.delete('/conversation/:phone', authenticate, deleteConversation);`
);
writeFileSync('server/src/routes/whatsappRoutes.ts', code);
console.log('✅ Route added!');
