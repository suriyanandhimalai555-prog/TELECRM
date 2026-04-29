import express from 'express';
import * as callController from '../controllers/callController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, callController.getCalls);
router.post('/', authenticateToken, callController.createCall);
router.put('/:id', authenticateToken, callController.updateCall);

export default router;
