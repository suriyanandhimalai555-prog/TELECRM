import { Router } from 'express';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';
import * as c from '../../controllers/state/stateLateController';

const router = Router();
router.use(authenticateState);
router.post('/', c.createLate);
router.get('/', c.listLate);
router.put('/:id', requireStateRole(...c.REVIEW_ROLES), c.reviewLate);

export default router;
