import express from 'express';
import * as noteController from '../controllers/noteController';
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get('/', authenticate, noteController.getNotes);
router.post('/', authenticate, noteController.createNote);
router.delete('/:id', authenticate, noteController.deleteNote);

export default router;
