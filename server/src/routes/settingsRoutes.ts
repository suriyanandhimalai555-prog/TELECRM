import express from 'express';
import * as settingsController from '../controllers/settingsController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/users', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), settingsController.getUsers);
router.post('/users', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), settingsController.createUser);
router.put('/users/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), settingsController.updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), settingsController.deleteUser);

router.post('/client-key', authenticateToken, authorizeRoles('ADMIN'), settingsController.updateClientKey);
router.delete('/clear-all-data', authenticateToken, authorizeRoles('ADMIN'), settingsController.clearAllData);

export default router;
