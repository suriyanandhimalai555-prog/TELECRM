import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../config/database';
import { sendMessage, getHistory, getConversations, markAsRead, deleteMessage, deleteConversation, verifyWebhook, handleWebhook, getTemplates, syncTemplates, sendTemplate, bulkSendMessage, proxyMedia, sendMedia } from '../controllers/whatsappController';
import { authenticate } from "../middleware/auth";
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);
router.get('/media/:mediaId', proxyMedia);
router.get('/cached-media/:filename', async (req, res) => {
  try {
    const fp = path.join(process.cwd(), 'server', 'uploads', req.params.filename);
    if (fs.existsSync(fp)) return res.sendFile(fp);
    const mediaId = req.params.filename.replace(/\.[^.]+$/, '');
    const tokenRes = await db.query('SELECT access_token FROM whatsapp_accounts WHERE access_token IS NOT NULL ORDER BY id ASC');
    const allTokens = tokenRes.rows.map((r: any) => r.access_token).filter(Boolean);
    let metaData: any = null;
    let chosenToken = '';
    for (const t of allTokens) {
      const r = await fetch('https://graph.facebook.com/v25.0/' + mediaId, { headers: { Authorization: 'Bearer ' + t } });
      const d = await r.json();
      if (!d.error && d.url) { metaData = d; chosenToken = t; break; }
    }
    if (!metaData) return res.status(410).json({ error: 'Media expired or unavailable' });
    const fileRes = await fetch(metaData.url, { headers: { Authorization: 'Bearer ' + chosenToken } });
    if (!fileRes.ok) return res.status(502).json({ error: 'Failed to fetch media' });
    res.setHeader('Content-Type', metaData.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="' + (metaData.filename || req.params.filename) + '"');
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    return res.send(buffer);
  } catch(e) {
    console.error('[WA] cached-media error:', e);
    return res.status(500).json({ error: 'Failed to serve media' });
  }
});
router.post('/send', authenticate, sendMessage);
router.get('/history/:phone', authenticate, getHistory);
router.get('/conversations', authenticate, getConversations);
router.put('/mark-read/:phone', authenticate, markAsRead);
router.delete('/message/:id', authenticate, deleteMessage);
router.delete('/conversation/:phone', authenticate, deleteConversation);
router.get('/templates', authenticate, getTemplates);
router.post('/templates/sync', authenticate, syncTemplates);
router.post('/templates/send', authenticate, sendTemplate);
router.post('/bulk-send', authenticate, bulkSendMessage);
router.post('/send-media', authenticate, upload.single('file'), sendMedia);

export default router;
