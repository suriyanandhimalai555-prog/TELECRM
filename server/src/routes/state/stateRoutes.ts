import {
  listWhatsappNumbers, createWhatsappNumber, deleteWhatsappNumber,
  getConversations, getHistory, markAsRead, sendMessage,
  verifyWebhook, handleWebhook,
} from '../../controllers/state/stateWhatsappController';
import { Router } from 'express';
import { authenticateState, requireStateRole, requireStatePermission } from '../../middleware/stateAuth';
import { listStates, createState } from '../../controllers/state/stateController';
import { listDistricts, listTaluks, createTaluk, deleteTaluk } from '../../controllers/state/stateGeoController';
import { listLeads, createLead, updateLead, deleteLead } from '../../controllers/state/stateLeadController';
import { dashboardStats, getStats, getCallSummary, getLeadConversion, getTeamPerformance } from '../../controllers/state/stateReportController';
import { listTasks, createTask, updateTask, deleteTask } from '../../controllers/state/stateTaskController';
import { listContacts, createContact, updateContact, deleteContact } from '../../controllers/state/stateContactController';
import { listCalls, createCall, uploadRecording, serveRecording } from '../../controllers/state/stateCallController';
import multer from 'multer';
const callUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
import { listProjects, createProject, updateProject, deleteProject, getOwnerImpact, assignOwner } from '../../controllers/state/stateProjectController';
import { listNotes, createNote, deleteNote } from '../../controllers/state/stateNoteController';
import {
  checkIn, checkOut, todayStatus, listAttendance, myHistory,
  createLeaveRequest, listLeaveRequests, updateLeaveRequestStatus,
  getSalarySummary, listSalarySummaries,
  getAttendanceSettings, updateAttendanceSettings,
} from '../../controllers/state/stateAttendanceController';
import { getPermissionMatrix, updatePermission } from '../../controllers/state/statePermissionController';

const router = Router();

router.get('/states', authenticateState, listStates);
router.post('/states', authenticateState, requireStateRole('master', 'admin'), createState);
router.get('/districts', authenticateState, listDistricts);
router.get('/taluks', authenticateState, listTaluks);
router.post('/taluks', authenticateState, requireStateRole('master', 'admin'), createTaluk);
router.delete('/taluks/:id', authenticateState, requireStateRole('master', 'admin'), deleteTaluk);

router.get('/leads', authenticateState, requireStatePermission('view_leads'), listLeads);
router.post('/leads', authenticateState, requireStatePermission('create_leads'), createLead);
router.put('/leads/:id', authenticateState, requireStatePermission('edit_leads'), updateLead);
router.delete('/leads/:id', authenticateState, requireStatePermission('delete_leads'), deleteLead);

router.get('/roles/permissions', authenticateState, requireStateRole('master', 'admin', 'hr'), getPermissionMatrix);
router.put('/roles/permissions', authenticateState, requireStateRole('master', 'admin'), updatePermission);
router.get('/reports/dashboard-stats', authenticateState, dashboardStats);
router.get('/reports/stats', authenticateState, getStats);
router.get('/reports/call-summary', authenticateState, getCallSummary);
router.get('/reports/lead-conversion', authenticateState, getLeadConversion);
router.get('/reports/team-performance', authenticateState, getTeamPerformance);
router.get('/tasks', authenticateState, listTasks);
router.post('/tasks', authenticateState, createTask);
router.put('/tasks/:id', authenticateState, updateTask);
router.delete('/tasks/:id', authenticateState, deleteTask);
router.get('/contacts', authenticateState, listContacts);
router.post('/contacts', authenticateState, createContact);
router.put('/contacts/:id', authenticateState, updateContact);
router.delete('/contacts/:id', authenticateState, deleteContact);

router.get('/calls', authenticateState, listCalls);
router.post('/calls', authenticateState, createCall);
router.post('/calls/:id/recording', authenticateState, callUpload.single('file'), uploadRecording);
router.get('/calls/recording/:filename', authenticateState, serveRecording);

router.get('/projects', authenticateState, listProjects);
router.post('/projects', authenticateState, requireStateRole('master', 'admin', 'coordinator'), createProject);
router.put('/projects/:id', authenticateState, requireStateRole('master', 'admin', 'coordinator'), updateProject);
router.delete('/projects/:id', authenticateState, requireStateRole('master', 'admin'), deleteProject);
router.get('/projects/:id/owner-impact', authenticateState, requireStateRole('master', 'admin', 'coordinator'), getOwnerImpact);
router.put('/projects/:id/assign-owner', authenticateState, requireStateRole('master', 'admin', 'coordinator'), assignOwner);

router.get('/notes', authenticateState, listNotes);
router.post('/notes', authenticateState, createNote);
router.delete('/notes/:id', authenticateState, deleteNote);

router.post('/attendance/checkin', authenticateState, checkIn);
router.post('/attendance/checkout', authenticateState, checkOut);
router.get('/attendance/today', authenticateState, todayStatus);
router.get('/attendance/all', authenticateState, listAttendance);
router.get('/attendance/history', authenticateState, myHistory);

router.post('/leave', authenticateState, createLeaveRequest);
router.get('/leave', authenticateState, listLeaveRequests);
router.put('/leave/:id', authenticateState, requireStateRole('master', 'admin', 'coordinator', 'state_head'), updateLeaveRequestStatus);

router.get('/salary/me', authenticateState, getSalarySummary);
router.get('/salary/all', authenticateState, requireStateRole('master', 'admin', 'coordinator', 'state_head'), listSalarySummaries);

router.get('/attendance/settings', authenticateState, getAttendanceSettings);
router.put('/attendance/settings', authenticateState, requireStateRole('master', 'admin'), updateAttendanceSettings);

export default router;
router.get('/whatsapp/numbers', authenticateState, requireStatePermission('view_whatsapp'), listWhatsappNumbers);
router.post('/whatsapp/numbers', authenticateState, requireStateRole('master', 'admin'), createWhatsappNumber);
router.delete('/whatsapp/numbers/:id', authenticateState, requireStateRole('master', 'admin'), deleteWhatsappNumber);

router.get('/whatsapp/conversations', authenticateState, requireStatePermission('view_whatsapp'), getConversations);
router.get('/whatsapp/history/:phoneNumberId/:contact', authenticateState, requireStatePermission('view_whatsapp'), getHistory);
router.put('/whatsapp/read/:phoneNumberId/:contact', authenticateState, requireStatePermission('view_whatsapp'), markAsRead);
router.post('/whatsapp/send', authenticateState, requireStatePermission('send_whatsapp'), sendMessage);

// Public webhook endpoints — Meta calls these directly, no app auth token is sent
router.get('/whatsapp/webhook', verifyWebhook);
router.post('/whatsapp/webhook', handleWebhook);
