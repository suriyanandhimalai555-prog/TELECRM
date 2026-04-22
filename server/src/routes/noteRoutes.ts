import express from 'express';
import * as noteController from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, noteController.getNotes);
router.post('/', authenticateToken, noteController.createNote);
router.delete('/:id', authenticateToken, noteController.deleteNote);

export default router;
