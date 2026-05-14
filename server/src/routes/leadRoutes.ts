import express from 'express';
import * as leadController from '../controllers/leadController';
import { authenticate } from "../middleware/auth";
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticate, leadController.getLeads);
router.get('/export', authenticate, leadController.exportLeads);
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), leadController.createLead);
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), leadController.updateLead);
router.delete('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), leadController.deleteLead);
router.post('/import', authenticate, authorizeRoles('ADMIN', 'MANAGER'), leadController.importLeads);
router.post('/:id/reassign', authenticate, authorizeRoles('ADMIN', 'MANAGER'), leadController.reassignLead);

export default router;
