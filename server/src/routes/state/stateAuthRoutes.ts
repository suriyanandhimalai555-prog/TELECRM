import { Router } from 'express';
import {
  bootstrapMaster,
  login,
  createUser,
  listUsers,
  me,
  updateProfile,
  changePassword,
  adminUpdateUser,
  deleteUser,
} from '../../controllers/state/stateAuthController';
import { authenticateState, requireStateRole } from '../../middleware/stateAuth';

const router = Router();

router.post('/bootstrap-master', bootstrapMaster);
router.post('/login', login);
router.get('/me', authenticateState, me);

router.post('/users', authenticateState, requireStateRole('master', 'admin', 'hr', 'coordinator', 'state_head', 'sales_manager', 'sales_admin'), createUser);
router.get('/users', authenticateState, listUsers);
router.put('/users/:id', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator', 'state_head', 'sales_manager', 'sales_admin'), adminUpdateUser);
router.delete('/users/:id', authenticateState, requireStateRole('master', 'hr', 'admin', 'coordinator'), deleteUser);

router.put('/profile', authenticateState, updateProfile);
router.post('/change-password', authenticateState, changePassword);

export default router;
