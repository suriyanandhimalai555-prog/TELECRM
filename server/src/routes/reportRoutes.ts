import express from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/stats', authenticateToken, reportController.getStats);
router.get('/dashboard-stats', authenticateToken, reportController.getDashboardStats);
router.get('/call-summary', authenticateToken, reportController.getCallSummary);
router.get('/lead-conversion', authenticateToken, reportController.getLeadConversion);
router.get('/project-stats', authenticateToken, reportController.getProjectStats);
router.get('/team-performance', authenticateToken, reportController.getTeamPerformance);
router.get('/whatsapp-summary', authenticateToken, reportController.getWhatsAppSummary);

export default router;
