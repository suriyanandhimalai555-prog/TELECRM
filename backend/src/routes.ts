import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  changePassword,
  getWorkUpdates,
  getWorkUpdateById,
  createWorkUpdate,
  updateWorkUpdate,
  reviewWorkUpdate,
  bulkReviewWorkUpdates,
  getWorkStats,
  resetAndSeedDb,
  createEmployeeQuery,
  getEmployeeQueries,
  getEmployeeQueryById,
  respondToEmployeeQuery,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  markAbsentLeave,
  getEodReport,
  getMyEodSubmissionGate,
  enableEodSubmission,
  disableEodSubmission,
} from './dbStore.js';
import { authenticateToken, requireRole, generateTokens, verifyRefreshToken, AuthenticatedRequest } from './auth.js';
import { WorkFilters, WorkStatus, UserRole, QueryFilters, QueryStatus, QueryType } from './types.js';
import { getTodayInAppTimezone } from './eodWindow.js';

const router = Router();

// ==================== AUTH ROUTES ====================

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is deactivated. Contact an administrator.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { passwordHash: _, ...safeUser } = user;
    const tokens = generateTokens(safeUser);

    return res.json({
      user: safeUser,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  const safeUser = await verifyRefreshToken(refreshToken);
  if (!safeUser) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }

  const tokens = generateTokens(safeUser);
  return res.json({
    user: safeUser,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

// POST /api/auth/register (admin/super_admin only)
router.post('/auth/register', authenticateToken, requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, fullName, role, department, state, managerId, employeeId, mobileNumber } = req.body;

    if (!email || !password || !fullName || !role || !department || !state) {
      return res.status(400).json({ message: 'Missing required registration fields' });
    }

    const newUser = await createUser({
      email,
      password,
      fullName,
      role: role as UserRole,
      department,
      state,
      managerId,
      employeeId,
      mobileNumber,
    });

    return res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to register user' });
  }
});

// PUT /api/auth/profile (available to every signed-in user)
router.put('/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, email, state, employeeId, mobileNumber } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ message: 'Full name and email are required' });
    }

    if (mobileNumber && !/^\d{10}$/.test(String(mobileNumber).trim())) {
      return res.status(400).json({ message: 'Mobile number must be a 10-digit number' });
    }

    const user = await updateUser(req.user!.id, {
      fullName,
      email,
      state,
      employeeId: employeeId ?? null,
      mobileNumber: mobileNumber ?? null,
    });
    return res.json({ user });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Profile update failed' });
  }
});

// PUT /api/auth/password
router.put('/auth/password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Current password, new password, and confirmation are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }
    await changePassword(req.user!.id, currentPassword, newPassword);
    return res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Password update failed' });
  }
});

// GET /api/auth/me
router.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// ==================== WORK UPDATES ROUTES ====================

// GET /api/works/stats (Dashboard analytics)
router.get('/works/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getWorkStats(req.user);
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to calculate stats' });
  }
});

// GET /api/works (List with advanced filtering & pagination)
router.get('/works', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters: WorkFilters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as WorkStatus | 'all',
      category: req.query.category as string,
      department: req.query.department as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      userId: req.query.userId as string,
    };

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const allFiltered = await getWorkUpdates(filters, req.user);

    const startIndex = 0;
    const endIndex = page * limit;
    const paginatedItems = allFiltered.slice(startIndex, endIndex);

    return res.json({
      items: paginatedItems,
      total: allFiltered.length,
      hasMore: endIndex < allFiltered.length,
      page,
      limit,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch work updates' });
  }
});

// GET /api/works/:id
router.get('/works/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const work = await getWorkUpdateById(req.params.id);
    if (!work) {
      return res.status(404).json({ message: 'Work update not found' });
    }
    return res.json(work);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Error fetching work item' });
  }
});

// POST /api/works (Create daily work entry)
router.post('/works', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, hoursSpent, category, attachments, eodDate } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const hours = parseFloat(hoursSpent);
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      return res.status(400).json({ message: 'Hours spent must be between 0.5 and 24.0' });
    }

    if (!category) {
      return res.status(400).json({ message: 'Category/Project is required' });
    }

    if (attachments && Array.isArray(attachments) && attachments.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed per work update' });
    }

    const created = await createWorkUpdate(req.user!, {
      title: title.trim(),
      description,
      hoursSpent: hours,
      category,
      attachments,
      eodDate,
    });

    return res.status(201).json(created);
  } catch (err: any) {
    const status = /EOD|9:00|7:00|locked|enable|timezone|date/i.test(err.message || '') ? 400 : 500;
    return res.status(status).json({ message: err.message || 'Failed to create work update' });
  }
});

// PUT /api/works/:id (Edit rejected or pending work)
router.put('/works/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, hoursSpent, category, attachments } = req.body;

    if (hoursSpent !== undefined) {
      const hours = parseFloat(hoursSpent);
      if (isNaN(hours) || hours < 0.5 || hours > 24) {
        return res.status(400).json({ message: 'Hours spent must be between 0.5 and 24.0' });
      }
    }

    if (attachments && Array.isArray(attachments) && attachments.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 attachments allowed per work update' });
    }

    const updated = await updateWorkUpdate(req.params.id, req.user!, {
      title,
      description,
      hoursSpent,
      category,
      attachments,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update work update' });
  }
});

// POST /api/works/:id/review (Manager / Admin approval or rejection)
router.post(
  '/works/:id/review',
  authenticateToken,
  requireRole('super_admin', 'admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, comment } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
      }

      if (status === 'rejected') {
        if (!comment || comment.trim().length < 20) {
          return res.status(400).json({ message: 'Rejection comment is mandatory and must be at least 20 characters long.' });
        }
      }

      const reviewed = await reviewWorkUpdate(req.params.id, req.user!, status as 'approved' | 'rejected', comment || '');

      return res.json(reviewed);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || 'Review action failed' });
    }
  }
);

// POST /api/works/bulk-review (Bulk approve / reject)
router.post(
  '/works/bulk-review',
  authenticateToken,
  requireRole('super_admin', 'admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids, status, comment } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Array of work IDs is required for bulk review' });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      if (status === 'rejected' && (!comment || comment.trim().length < 20)) {
        return res.status(400).json({ message: 'Bulk rejection requires a comment of at least 20 characters.' });
      }

      const updatedWorks = await bulkReviewWorkUpdates(ids, req.user!, status as 'approved' | 'rejected', comment || '');

      return res.json({ message: `Successfully ${status} ${updatedWorks.length} work items`, items: updatedWorks });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || 'Bulk review failed' });
    }
  }
);

// ==================== USER MANAGEMENT ROUTES ====================

// GET /api/users (Admin / Super Admin / Manager listing)
router.get('/users', authenticateToken, requireRole('super_admin', 'admin', 'manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch users' });
  }
});

// POST /api/users (Create user)
router.post('/users', authenticateToken, requireRole('super_admin', 'admin', 'manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, fullName, role, department, state, managerId, employeeId, mobileNumber } = req.body;

    if (!email || !password || !fullName || !role || !department || !state) {
      return res.status(400).json({ message: 'All mandatory fields are required' });
    }

    if (req.user!.role === 'manager' && role !== 'employee') {
      return res.status(403).json({ message: 'HR can only create employee accounts' });
    }

    const user = await createUser({ email, password, fullName, role, department, state, managerId, employeeId, mobileNumber });
    return res.status(201).json(user);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'User creation failed' });
  }
});

// PUT /api/users/:id (Update user)
router.put('/users/:id', authenticateToken, requireRole('super_admin', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'User update failed' });
  }
});

// ==================== EMPLOYEE QUERIES ====================

router.post('/queries', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queryType, subject, description, relatedDate } = req.body;
    const created = await createEmployeeQuery(req.user!, { queryType, subject, description, relatedDate });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to submit query' });
  }
});

router.get('/queries', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters: QueryFilters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as QueryStatus | 'all',
      queryType: req.query.queryType as QueryType | 'all',
      userId: req.query.userId as string,
      search: req.query.search as string,
    };
    const items = await getEmployeeQueries(filters, req.user);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch queries' });
  }
});

router.get('/queries/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = await getEmployeeQueryById(req.params.id, req.user!);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    return res.json(query);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to fetch query' });
  }
});

router.put('/queries/:id', authenticateToken, requireRole('super_admin', 'admin', 'manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, hrResponse } = req.body;
    const updated = await respondToEmployeeQuery(req.params.id, req.user!, { status, hrResponse });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update query' });
  }
});

// ==================== NOTIFICATIONS ====================

router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await getNotifications(req.user!.id);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch notifications' });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await getUnreadNotificationCount(req.user!.id);
    return res.json({ count });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch unread count' });
  }
});

router.put('/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await markAllNotificationsRead(req.user!.id);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to mark notifications read' });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await markNotificationRead(req.params.id, req.user!.id);
    return res.json(item);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to mark notification read' });
  }
});

// ==================== EOD TRACKING ====================

router.post('/eod/absent-leave', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, reason } = req.body;
    const record = await markAbsentLeave(req.user!, date, reason);
    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to mark absent/leave' });
  }
});

router.get('/eod/report', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || getTodayInAppTimezone();
    const isEmployee = req.user!.role === 'employee';
    const report = await getEodReport(date, {
      department: isEmployee ? undefined : (req.query.department as string),
      userId: isEmployee ? req.user!.id : (req.query.userId as string),
    });
    return res.json(report);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to load EOD report' });
  }
});

router.get('/eod/submission-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || undefined;
    const gate = await getMyEodSubmissionGate(req.user!, date);
    return res.json(gate);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to load EOD submission status' });
  }
});

router.post(
  '/eod/enable',
  authenticateToken,
  requireRole('super_admin', 'admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, date, note } = req.body;
      const enablement = await enableEodSubmission(req.user!, userId, date, note);
      return res.status(201).json(enablement);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || 'Failed to enable EOD submission' });
    }
  }
);

router.post(
  '/eod/disable',
  authenticateToken,
  requireRole('super_admin', 'admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, date } = req.body;
      const result = await disableEodSubmission(req.user!, userId, date);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || 'Failed to disable EOD submission' });
    }
  }
);

// ==================== MIGRATION & SEED ROUTES ====================

// POST /api/migrate/json-to-pg
router.post('/migrate/json-to-pg', authenticateToken, requireRole('super_admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { migrateJsonToPostgres } = await import('./migrateJsonToPg.js');
    const result = await migrateJsonToPostgres();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Migration execution failed' });
  }
});

router.post('/seed/reset', async (req, res) => {
  try {
    await resetAndSeedDb();
    return res.json({ message: 'Database reset and seeded successfully with default users and work updates' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Reset failed' });
  }
});

export default router;
