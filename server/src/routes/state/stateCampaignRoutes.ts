import { Router } from 'express';
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../../controllers/state/stateCampaignController';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';

const router = Router();
router.get('/', authenticateState, listCampaigns);
router.post('/', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head'), createCampaign);
router.put('/:id', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head'), updateCampaign);
router.delete('/:id', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head'), deleteCampaign);

export default router;
