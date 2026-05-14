import express from 'express';
import * as callController from '../controllers/callController';
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get('/', authenticate, callController.getCalls);
router.post('/', authenticate, callController.createCall);
router.put('/:id', authenticate, callController.updateCall);
router.delete('/:id', authenticate, callController.deleteCall);

export default router;
