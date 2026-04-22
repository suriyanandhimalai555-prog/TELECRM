import { Router } from 'express';
import { sendMessage, getHistory, getConversations, markAsRead, verifyWebhook, handleWebhook } from '../controllers/whatsappController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public webhook routes (Meta needs these accessible)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Protected API routes
router.post('/send', authenticateToken, sendMessage);
router.get('/history/:phone', authenticateToken, getHistory);
router.get('/conversations', authenticateToken, getConversations);
router.put('/mark-read/:phone', authenticateToken, markAsRead);

export default router;
