import express from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate } from "../middleware/auth";
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticate, taskController.getTasks);
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), taskController.createTask);
router.put('/:id', authenticate, taskController.updateTask);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), taskController.deleteTask);
router.post('/generate-daily', authenticate, authorizeRoles('ADMIN', 'MANAGER'), taskController.generateDailyTasks);

export default router;
