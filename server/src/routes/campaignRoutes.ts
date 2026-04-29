import express from 'express';
import * as campaignController from '../controllers/campaignController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticateToken, campaignController.getCampaigns);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), campaignController.createCampaign);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), campaignController.updateCampaign);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), campaignController.deleteCampaign);

export default router;
