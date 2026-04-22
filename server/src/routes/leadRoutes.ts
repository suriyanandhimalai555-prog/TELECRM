import express from 'express';
import * as leadController from '../controllers/leadController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticateToken, leadController.getLeads);
router.get('/export', authenticateToken, leadController.exportLeads);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), leadController.createLead);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), leadController.updateLead);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), leadController.deleteLead);
router.post('/import', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), leadController.importLeads);
router.post('/:id/reassign', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), leadController.reassignLead);

export default router;
