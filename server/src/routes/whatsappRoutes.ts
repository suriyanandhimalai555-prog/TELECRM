import { Router } from 'express';
import { sendMessage, getHistory, getConversations, markAsRead, deleteMessage, verifyWebhook, handleWebhook, getTemplates, syncTemplates, sendTemplate, bulkSendMessage, proxyMedia, sendMedia } from '../controllers/whatsappController';
import { authenticate } from "../middleware/auth";
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);
router.get('/media/:mediaId', proxyMedia);
router.post('/send', authenticate, sendMessage);
router.get('/history/:phone', authenticate, getHistory);
router.get('/conversations', authenticate, getConversations);
router.put('/mark-read/:phone', authenticate, markAsRead);
router.delete('/message/:id', authenticate, deleteMessage);
router.get('/templates', authenticate, getTemplates);
router.post('/templates/sync', authenticate, syncTemplates);
router.post('/templates/send', authenticate, sendTemplate);
router.post('/bulk-send', authenticate, bulkSendMessage);
router.post('/send-media', authenticate, upload.single('file'), sendMedia);

export default router;
