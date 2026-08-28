import { Router } from 'express';
import { listFields, createField, deleteField } from '../../controllers/state/stateCustomFieldController';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';

const router = Router();
router.get('/', authenticateState, listFields);
router.post('/', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head'), createField);
router.delete('/:id', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head'), deleteField);

export default router;
