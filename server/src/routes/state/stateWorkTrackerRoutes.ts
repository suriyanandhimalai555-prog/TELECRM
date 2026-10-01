import { Router } from 'express';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';
import * as c from '../../controllers/state/stateWorkTrackerController';

const router = Router();
const reviewers = requireStateRole(...c.REVIEWER_ROLES);

router.use(authenticateState);
router.get('/categories', c.getCategories);
router.get('/stats', c.getStats);
router.get('/mine', c.listMine);
router.get('/review', reviewers, c.listReview);
router.post('/review/bulk', reviewers, c.bulkReview);
router.post('/', c.createWork);
router.put('/:id', c.updateWork);
router.post('/:id/review', reviewers, c.reviewOne);
router.get('/:id/history', c.getHistory);

export default router;
