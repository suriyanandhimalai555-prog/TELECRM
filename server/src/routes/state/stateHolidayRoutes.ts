import { Router } from 'express';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';
import * as c from '../../controllers/state/stateHolidayController';

const router = Router();
const managers = requireStateRole(...c.MANAGE_ROLES);

router.use(authenticateState);
router.get('/', c.listHolidays);
router.post('/', managers, c.createHoliday);
router.delete('/:id', managers, c.deleteHoliday);

export default router;
