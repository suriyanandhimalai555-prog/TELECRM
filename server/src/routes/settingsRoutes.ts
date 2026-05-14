import express from 'express';
import * as settingsController from '../controllers/settingsController';
import { authenticate } from "../middleware/auth";
import { authorizeRoles } from '../middleware/role';

const router = express.Router();

router.get('/users', authenticate, authorizeRoles('ADMIN', 'MANAGER'), settingsController.getUsers);
router.post('/users', authenticate, authorizeRoles('ADMIN', 'MANAGER'), settingsController.createUser);
router.put('/users/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), settingsController.updateUser);
router.delete('/users/:id', authenticate, authorizeRoles('ADMIN', 'MANAGER'), settingsController.deleteUser);

router.post('/client-key', authenticate, authorizeRoles('ADMIN'), settingsController.updateClientKey);
router.delete('/clear-all-data', authenticate, authorizeRoles('ADMIN'), settingsController.clearAllData);

export default router;
