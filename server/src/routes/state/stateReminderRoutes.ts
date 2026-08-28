import { Router } from 'express';
import { getDue, getUpcoming, updateFollowup } from '../../controllers/state/stateReminderController';
import { authenticateState } from '../../middleware/stateAuth';

const router = Router();
router.get('/due', authenticateState, getDue);
router.get('/upcoming', authenticateState, getUpcoming);
router.put('/:id', authenticateState, updateFollowup);

export default router;
