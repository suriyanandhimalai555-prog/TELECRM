import { Router } from 'express';
import { 
  sendMessage, 
  getHistory, 
  getConversations, 
  markAsRead, 
  verifyWebhook, 
  handleWebhook,
  getTemplates,
  syncTemplates,
  sendTemplate,
  bulkSendMessage,
  proxyMedia,
  sendMedia
} from '../controllers/whatsappController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

// Public webhook routes
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);
router.get('/media/:mediaId', proxyMedia);

// Protected API routes
router.post('/send', authenticateToken, sendMessage);
router.get('/history/:phone', authenticateToken, getHistory);
router.get('/conversations', authenticateToken, getConversations);
router.put('/mark-read/:phone', authenticateToken, markAsRead);
router.get('/templates', authenticateToken, getTemplates);
router.post('/templates/sync', authenticateToken, syncTemplates);
router.post('/templates/send', authenticateToken, sendTemplate);
router.post('/bulk-send', authenticateToken, bulkSendMessage);
router.post('/send-media', authenticateToken, upload.single('file'), sendMedia);

export default router;
