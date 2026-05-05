import express from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// ✅ NEW: Single endpoint that returns ALL report data in one call
// Usage: GET /api/reports/all?startDate=2026-01-01&endDate=2026-12-31
router.get('/all', authenticateToken, reportController.getAllReports);

// Legacy endpoints (kept for backward compatibility)
router.get('/stats', authenticateToken, reportController.getStats);
router.get('/dashboard-stats', authenticateToken, reportController.getDashboardStats);
router.get('/call-summary', authenticateToken, reportController.getCallSummary);
router.get('/lead-conversion', authenticateToken, reportController.getLeadConversion);
router.get('/project-stats', authenticateToken, reportController.getProjectStats);
router.get('/team-performance', authenticateToken, reportController.getTeamPerformance);
router.get('/whatsapp-summary', authenticateToken, reportController.getWhatsAppSummary);
router.get('/custom-report', authenticateToken, reportController.getCustomReport);

export default router;