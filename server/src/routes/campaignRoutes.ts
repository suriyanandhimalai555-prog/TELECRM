import express from 'express';
import * as campaignController from '../controllers/campaignController';
import { authenticate } from "../middleware/auth";
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticate, campaignController.getCampaigns);
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), campaignController.createCampaign);
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), campaignController.updateCampaign);
router.delete('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), campaignController.deleteCampaign);

export default router;
