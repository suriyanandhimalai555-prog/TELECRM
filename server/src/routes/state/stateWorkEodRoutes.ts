import { Router } from 'express';
import { authenticateState } from '../../middleware/stateAuth';
import * as c from '../../controllers/state/stateWorkEodController';

const router = Router();
router.use(authenticateState);

router.get('/window', c.getWindowStatus);
router.get('/mine', c.getMyEod);
router.post('/mark', c.markEod);
router.post('/absent', c.markAbsent);
router.get('/employees', c.listEmployeeStatus);
router.post('/toggle', c.enableEod);
router.delete('/toggle/:user_id/:date', c.disableEod);

export default router;
