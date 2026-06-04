import { Router } from 'express';
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
    const fp = require('path').join(process.cwd(), 'server', 'uploads', req.params.filename);
    if (require('fs').existsSync(fp)) return res.sendFile(fp);
    // File not on disk - extract mediaId from filename and proxy from Meta
    const mediaId = req.params.filename.replace(/\.[^.]+$/, '');
    const { Pool } = require('pg');
    const db = require('../config/database').default;
    // Get token from DB
    const tokenRes = await db.query('SELECT access_token FROM whatsapp_accounts WHERE access_token IS NOT NULL ORDER BY id ASC');
    const token = tokenRes.rows[0]?.access_token;
    if (!token) return res.status(404).json({ error: 'No token available' });
    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const metaData = await metaRes.json();
    if (metaData.error || !metaData.url) return res.status(410).json({ error: 'Media expired' });
    const fileRes = await fetch(metaData.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileRes.ok) return res.status(502).json({ error: 'Failed to fetch media' });
    res.setHeader('Content-Type', metaData.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${metaData.filename || req.params.filename}"`);
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
