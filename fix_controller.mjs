import { readFileSync, writeFileSync } from 'fs';
let code = readFileSync('server/src/controllers/whatsappController.ts', 'utf8');
code = code + `
// ─── Delete All Messages for a Contact ───────────────────────────────────────
export const deleteConversation = async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  try {
    await db.query(
      'DELETE FROM whatsapp_messages WHERE from_number = $1 OR to_number = $1',
      [phone]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};`;
writeFileSync('server/src/controllers/whatsappController.ts', code);
console.log('✅ Controller added!');
