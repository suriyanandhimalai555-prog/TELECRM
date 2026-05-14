import express from 'express';
import * as reportController from '../controllers/reportController';
import { authenticate } from "../middleware/auth";

const router = express.Router();

// ── New single combined endpoint ──────────────────────────────────────────────
router.get('/all', authenticate, reportController.getAllReports);

// ── Existing endpoints (kept for backward compat) ─────────────────────────────
router.get('/stats', authenticate, reportController.getStats);
router.get('/dashboard-stats', authenticate, reportController.getDashboardStats);
router.get('/call-summary', authenticate, reportController.getCallSummary);
router.get('/lead-conversion', authenticate, reportController.getLeadConversion);
router.get('/project-stats', authenticate, reportController.getProjectStats);
router.get('/team-performance', authenticate, reportController.getTeamPerformance);
router.get('/whatsapp-summary', authenticate, reportController.getWhatsAppSummary);
router.get('/custom-report', authenticate, reportController.getCustomReport);

export default router;