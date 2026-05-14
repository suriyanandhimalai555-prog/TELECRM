import express from 'express';
import * as projectController from '../controllers/projectController';
import { authenticate } from "../middleware/auth";
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/', authenticate, projectController.getProjects);
router.post('/', authenticate, authorizeRoles('ADMIN', 'MANAGER'), projectController.createProject);
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), projectController.updateProject);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), projectController.deleteProject);

export default router;
