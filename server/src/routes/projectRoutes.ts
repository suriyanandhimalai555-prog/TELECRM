import express from 'express';
import * as projectController from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticateToken, projectController.getProjects);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), projectController.createProject);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), projectController.updateProject);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), projectController.deleteProject);

export default router;
