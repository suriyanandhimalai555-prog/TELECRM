import express from 'express';
import * as taskController from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticateToken, taskController.getTasks);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), taskController.createTask);
router.put('/:id', authenticateToken, taskController.updateTask);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), taskController.deleteTask);
router.post('/generate-daily', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), taskController.generateDailyTasks);

export default router;
