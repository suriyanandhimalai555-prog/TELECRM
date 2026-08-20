import { Router } from 'express';
import { getMessages } from '../controllers/messagesController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMessages);

export default router;
