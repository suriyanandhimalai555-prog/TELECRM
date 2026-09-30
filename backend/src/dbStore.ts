import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { User, WorkUpdate, WorkAttachment, EditHistory, WorkStatus, WorkStats, WorkFilters, UserRole, EmployeeQuery, QueryFilters, QueryStatus, QueryType, EodRecord, EodReport, EodStatus, EodSubmissionGate, EodEnablement, EodSubmissionStatus, AppNotification, EmployeeQueryDetail } from './types.js';
import {
  getAppTimezone,
  getEodWindowMeta,
  getTodayInAppTimezone,
  getUtcRangeForLocalDate,
} from './eodWindow.js';

// Seed Managing Director details (the internal permission role  super_admin)
export const SEED_ADMIN_EMAIL = 'md@company.com';
export const SEED_ADMIN_PASSWORD = 'md@1230';
const MANAGING_DIRECTOR_NAME = 'Managing Director';
const HUMAN_RESOURCES_EMAIL = 'manager@company.com';
const HUMAN_RESOURCES_NAME = 'Human Resources';

// Helper mappers from Prisma models to application Types
function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeOptional(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function assertEmployeeIdAvailable(employeeId: string, excludeUserId?: string) {
  const existing = await prisma.user.findFirst({
    where: {
      employeeId: { equals: employeeId, mode: 'insensitive' },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
  if (existing) {
    throw new Error('Employee ID is already assigned to another user');
  }
}

export function isHrRole(role?: UserRole | string | null): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'manager';
}

function mapPrismaQuery(query: any): EmployeeQuery {
  return {
    id: query.id,
    userId: query.userId,
    userName: query.userName,
    userEmail: query.userEmail,
    department: query.department,
    queryType: query.queryType as QueryType,
    subject: query.subject,
    description: query.description,
    relatedDate: toIsoDate(query.relatedDate),
    status: query.status as QueryStatus,
    hrResponse: query.hrResponse || null,
    respondedBy: query.respondedBy || null,
    respondedByName: query.respondedByName || null,
    respondedAt: query.respondedAt
      ? query.respondedAt instanceof Date
        ? query.respondedAt.toISOString()
        : new Date(query.respondedAt).toISOString()
      : null,
    createdAt: query.createdAt instanceof Date ? query.createdAt.toISOString() : new Date(query.createdAt).toISOString(),
    updatedAt: query.updatedAt instanceof Date ? query.updatedAt.toISOString() : new Date(query.updatedAt).toISOString(),
  };
}

function mapPrismaNotification(n: any): AppNotification {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    linkTab: n.linkTab || null,
    linkId: n.linkId || null,
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString(),
  };
}

function mapPrismaEod(record: any, user?: any): EodRecord {
  return {
    id: record.id,
    userId: record.userId,
    date: toIsoDate(record.date) || '',
    status: record.status as EodStatus,
    reason: record.reason || null,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString(),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : new Date(record.updatedAt).toISOString(),
    userName: user?.fullName,
    department: user?.department,
    employeeId: user?.employeeId || null,
  };
}

function mapPrismaUser(user: any): User & { passwordHash: string } {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    role: user.role as UserRole,
    department: user.department,
    state: user.state || null,
    employeeId: user.employeeId || null,
    mobileNumber: user.mobileNumber || null,
    managerId: user.managerId || null,
    managerName: user.managerName || null,
    isActive: user.isActive,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt).toISOString(),
  };
}

function mapPrismaAttachment(att: any): WorkAttachment {
  return {
    id: att.id,
    workId: att.workId,
    fileName: att.fileName,
    fileUrl: att.fileUrl,
    fileSize: Number(att.fileSize),
    fileType: att.fileType,
    uploadedAt: att.uploadedAt instanceof Date ? att.uploadedAt.toISOString() : new Date(att.uploadedAt).toISOString(),
  };
}

function mapPrismaEditHistory(hist: any): EditHistory {
  let changesParsed: any[] = [];
  if (Array.isArray(hist.changes)) {
    changesParsed = hist.changes;
  } else if (typeof hist.changes === 'string') {
    try {
      changesParsed = JSON.parse(hist.changes);
    } catch {
      changesParsed = [];
    }
  }

  return {
    id: hist.id,
    workId: hist.workId,
    editedBy: hist.editedBy,
    editedByName: hist.editedByName,
    changes: changesParsed,
    editedAt: hist.editedAt instanceof Date ? hist.editedAt.toISOString() : new Date(hist.editedAt).toISOString(),
  };
}

function mapPrismaWork(work: any): WorkUpdate {
  const attachments = Array.isArray(work.attachments) ? work.attachments.map(mapPrismaAttachment) : [];
  const editHistory = Array.isArray(work.editHistory) ? work.editHistory.map(mapPrismaEditHistory) : [];

  return {
    id: work.id,
    userId: work.userId,
    userName: work.userName,
    userRole: work.userRole as UserRole,
    userEmail: work.userEmail,
    department: work.department,
    title: work.title,
    description: work.description,
    hoursSpent: Number(work.hoursSpent),
    category: work.category,
    status: work.status as WorkStatus,
    reviewerId: work.reviewerId || null,
    reviewerName: work.reviewerName || null,
    reviewComment: work.reviewComment || null,
    reviewedAt: work.reviewedAt ? (work.reviewedAt instanceof Date ? work.reviewedAt.toISOString() : new Date(work.reviewedAt).toISOString()) : null,
    createdAt: work.createdAt instanceof Date ? work.createdAt.toISOString() : new Date(work.createdAt).toISOString(),
    updatedAt: work.updatedAt instanceof Date ? work.updatedAt.toISOString() : new Date(work.updatedAt).toISOString(),
    attachments,
    editHistory,
  };
}

// ==================== INITIALIZATION & SEEDING ====================

export async function initializeDatabase() {
  try {
    // Check connection and seed default admin if not present
    let existingAdmin = await prisma.user.findFirst({
      where: { email: { equals: SEED_ADMIN_EMAIL, mode: 'insensitive' } },
    });

    // Migrate the original demonstration account to the current seed credentials.
    if (!existingAdmin) {
      existingAdmin = await prisma.user.findFirst({
        where: { email: { equals: 'admin@company.com', mode: 'insensitive' } },
      });
      if (existingAdmin) {
        const passwordHash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, bcrypt.genSaltSync(10));
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { email: SEED_ADMIN_EMAIL, passwordHash, isActive: true },
        });
      }
    }

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, salt);

      await prisma.user.create({
        data: {
          id: 'usr-admin',
          email: SEED_ADMIN_EMAIL.toLowerCase(),
          passwordHash,
          fullName: MANAGING_DIRECTOR_NAME,
          role: 'super_admin',
          department: 'Executive',
          managerId: null,
          managerName: null,
          isActive: true,
        },
      });
      console.log('[Prisma] Seeded default Super Admin user.');
    } else if (existingAdmin.fullName !== MANAGING_DIRECTOR_NAME) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { fullName: MANAGING_DIRECTOR_NAME },
      });
    }

    // Keep the built-in HR account and all employees assigned to it in sync.
    // The role remains `manager` internally because it controls review permissions.
    const humanResourcesUser = await prisma.user.findFirst({
      where: { email: { equals: HUMAN_RESOURCES_EMAIL, mode: 'insensitive' } },
    });
    if (humanResourcesUser && humanResourcesUser.fullName !== HUMAN_RESOURCES_NAME) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: humanResourcesUser.id },
          data: { fullName: HUMAN_RESOURCES_NAME },
        }),
        prisma.user.updateMany({
          where: { managerId: humanResourcesUser.id },
          data: { managerName: HUMAN_RESOURCES_NAME },
        }),
      ]);
    }
  } catch (err: any) {
    console.warn('[Prisma] Database initialization notice:', err?.message || err);
  }
}

// ==================== USER OPERATIONS ====================

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    if (!user) return null;
    return mapPrismaUser(user);
  } catch (err) {
    console.error('[Prisma] Error in findUserByEmail:', err);
    return null;
  }
}

export async function findUserById(id: string): Promise<(User & { passwordHash: string }) | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return mapPrismaUser(user);
  } catch (err) {
    console.error('[Prisma] Error in findUserById:', err);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const mapped = mapPrismaUser(u);
      const { passwordHash, ...safeUser } = mapped;
      return safeUser;
    });
  } catch (err) {
    console.error('[Prisma] Error in getAllUsers:', err);
    return [];
  }
}

export async function createUser(userData: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department: string;
  state: string;
  managerId?: string | null;
  employeeId?: string | null;
  mobileNumber?: string | null;
}): Promise<User> {
  const normalizedEmail = userData.email.toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const employeeId = normalizeOptional(userData.employeeId);
  if (employeeId) {
    await assertEmployeeIdAvailable(employeeId);
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(userData.password, salt);

  let managerName: string | null = null;
  if (userData.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: userData.managerId } });
    if (manager) managerName = manager.fullName;
  }

  const id = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const createdUser = await prisma.user.create({
    data: {
      id,
      email: normalizedEmail,
      passwordHash,
      fullName: userData.fullName,
      role: userData.role,
      department: userData.department,
      state: userData.state,
      employeeId,
      mobileNumber: normalizeOptional(userData.mobileNumber),
      managerId: userData.managerId || null,
      managerName,
      isActive: true,
    },
  });

  const mapped = mapPrismaUser(createdUser);
  const { passwordHash: _, ...safeUser } = mapped;
  return safeUser;
}

export async function updateUser(
  id: string,
  updates: Partial<User & { password?: string }>
): Promise<User> {
  const currentUser = await prisma.user.findUnique({ where: { id } });
  if (!currentUser) throw new Error('User not found');

  const normalizedEmail = updates.email ? updates.email.toLowerCase().trim() : null;
  const emailChanged = normalizedEmail && normalizedEmail !== currentUser.email.toLowerCase().trim();
  if (emailChanged) {
    const existing = await findUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) throw new Error('Email already in use');
  }

  let employeeId = currentUser.employeeId;
  if (updates.employeeId !== undefined) {
    employeeId = normalizeOptional(updates.employeeId);
    if (employeeId) {
      await assertEmployeeIdAvailable(employeeId, id);
    }
  }

  let managerName: string | null = currentUser.managerName;
  if (updates.managerId !== undefined) {
    if (updates.managerId) {
      const manager = await prisma.user.findUnique({ where: { id: updates.managerId } });
      managerName = manager ? manager.fullName : null;
    } else {
      managerName = null;
    }
  }

  let passwordHash = currentUser.passwordHash;
  if (updates.password) {
    const salt = bcrypt.genSaltSync(10);
    passwordHash = bcrypt.hashSync(updates.password, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      email: normalizedEmail ?? currentUser.email,
      passwordHash,
      fullName: updates.fullName ?? currentUser.fullName,
      role: updates.role ?? currentUser.role,
      department: updates.department ?? currentUser.department,
      ...(updates.state !== undefined ? { state: updates.state } : {}),
      ...(updates.employeeId !== undefined ? { employeeId } : {}),
      ...(updates.mobileNumber !== undefined ? { mobileNumber: normalizeOptional(updates.mobileNumber) } : {}),
      managerId: updates.managerId !== undefined ? updates.managerId : currentUser.managerId,
      managerName,
      isActive: updates.isActive !== undefined ? updates.isActive : currentUser.isActive,
    },
  });

  // `managerName` is stored for fast display, so update it for everyone assigned
  // to this person whenever their displayed name changes.
  if (updates.fullName !== undefined && updates.fullName !== currentUser.fullName) {
    await prisma.user.updateMany({
      where: { managerId: id },
      data: { managerName: updatedUser.fullName },
    });
  }

  const mapped = mapPrismaUser(updatedUser);
  const { passwordHash: _, ...safeUser } = mapped;
  return safeUser;
}

// ==================== WORK UPDATES OPERATIONS ====================

export async function getWorkUpdates(filters: WorkFilters = {}, currentUser?: User): Promise<WorkUpdate[]> {
  try {
    const where: any = {};

    // Role-based access control filters
    if (currentUser) {
      if (currentUser.role === 'employee') {
        where.userId = currentUser.id;
      } else if (currentUser.role === 'manager') {
        where.OR = [
          { userId: currentUser.id },
          { user: { managerId: currentUser.id } },
          { department: currentUser.department },
        ];
      }
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters.department && filters.department !== 'all') {
      where.department = filters.department;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { userName: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (filters.startDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      const endDateObj = new Date(filters.endDate);
      endDateObj.setHours(23, 59, 59, 999);
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: endDateObj,
      };
    }

    // Sort column
    let orderBy: any = { createdAt: 'desc' };
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    if (filters.sortBy === 'hours_spent') {
      orderBy = { hoursSpent: sortOrder };
    } else if (filters.sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (filters.sortBy === 'title') {
      orderBy = { title: sortOrder };
    } else if (filters.sortBy === 'created_at') {
      orderBy = { createdAt: sortOrder };
    }

    const works = await prisma.workUpdate.findMany({
      where,
      orderBy,
      include: {
        attachments: { orderBy: { uploadedAt: 'asc' } },
        editHistory: { orderBy: { editedAt: 'desc' } },
      },
    });

    return works.map(mapPrismaWork);
  } catch (err) {
    console.error('[Prisma] Error in getWorkUpdates:', err);
    return [];
  }
}

export async function getWorkUpdateById(id: string): Promise<WorkUpdate | null> {
  try {
    const work = await prisma.workUpdate.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { uploadedAt: 'asc' } },
        editHistory: { orderBy: { editedAt: 'desc' } },
      },
    });

    if (!work) return null;
    return mapPrismaWork(work);
  } catch (err) {
    console.error('[Prisma] Error in getWorkUpdateById:', err);
    return null;
  }
}

export async function createWorkUpdate(
  user: User,
  data: {
    title: string;
    description: string;
    hoursSpent: number;
    category: string;
    attachments?: { fileName: string; fileUrl: string; fileSize: number; fileType: string }[];
    eodDate?: string;
  }
): Promise<WorkUpdate> {
  const eodDate = data.eodDate || getTodayInAppTimezone();
  if (user.role === 'employee') {
    await assertEmployeeCanSubmitEod(user.id, eodDate);
  }

  const workId = `work-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const createdWork = await prisma.workUpdate.create({
    data: {
      id: workId,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      userEmail: user.email,
      department: user.department,
      title: data.title,
      description: data.description,
      hoursSpent: Number(data.hoursSpent),
      category: data.category,
      status: 'pending',
      attachments: {
        create: (data.attachments || []).map((att, i) => ({
          id: `att-${Date.now()}-${i}`,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: BigInt(att.fileSize || 0),
          fileType: att.fileType,
        })),
      },
    },
    include: {
      attachments: { orderBy: { uploadedAt: 'asc' } },
      editHistory: { orderBy: { editedAt: 'desc' } },
    },
  });

  await upsertEodRecord(user.id, eodDate, 'marked');

  return mapPrismaWork(createdWork);
}

export async function updateWorkUpdate(
  id: string,
  editor: User,
  data: {
    title?: string;
    description?: string;
    hoursSpent?: number;
    category?: string;
    attachments?: { fileName: string; fileUrl: string; fileSize: number; fileType: string }[];
  }
): Promise<WorkUpdate> {
  const work = await getWorkUpdateById(id);
  if (!work) throw new Error('Work update not found');

  if (editor.role === 'employee' && work.userId !== editor.id) {
    throw new Error('Not authorized to edit this work update');
  }

  if (editor.role === 'employee' && work.status === 'approved') {
    throw new Error('Cannot edit an approved work update');
  }

  const changes: { field: string; oldValue: any; newValue: any }[] = [];

  let newTitle = work.title;
  if (data.title !== undefined && data.title !== work.title) {
    changes.push({ field: 'Title', oldValue: work.title, newValue: data.title });
    newTitle = data.title;
  }

  let newDescription = work.description;
  if (data.description !== undefined && data.description !== work.description) {
    changes.push({ field: 'Description', oldValue: 'Updated text content', newValue: 'Updated text content' });
    newDescription = data.description;
  }

  let newHours = work.hoursSpent;
  if (data.hoursSpent !== undefined && Number(data.hoursSpent) !== work.hoursSpent) {
    changes.push({ field: 'Hours Spent', oldValue: work.hoursSpent, newValue: Number(data.hoursSpent) });
    newHours = Number(data.hoursSpent);
  }

  let newCategory = work.category;
  if (data.category !== undefined && data.category !== work.category) {
    changes.push({ field: 'Category', oldValue: work.category, newValue: data.category });
    newCategory = data.category;
  }

  let newStatus: WorkStatus = work.status;
  if (work.status === 'rejected') {
    changes.push({ field: 'Status', oldValue: 'rejected', newValue: 'pending' });
    newStatus = 'pending';
  }

  // Update attachments if provided
  if (data.attachments !== undefined) {
    await prisma.workAttachment.deleteMany({ where: { workId: id } });
  }

  await prisma.workUpdate.update({
    where: { id },
    data: {
      title: newTitle,
      description: newDescription,
      hoursSpent: newHours,
      category: newCategory,
      status: newStatus,
      reviewerId: newStatus === 'pending' ? null : undefined,
      reviewerName: newStatus === 'pending' ? null : undefined,
      reviewComment: newStatus === 'pending' ? null : undefined,
      reviewedAt: newStatus === 'pending' ? null : undefined,
      ...(data.attachments !== undefined
        ? {
            attachments: {
              create: data.attachments.map((att, i) => ({
                id: `att-${Date.now()}-${i}`,
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: BigInt(att.fileSize || 0),
                fileType: att.fileType,
              })),
            },
          }
        : {}),
      ...(changes.length > 0
        ? {
            editHistory: {
              create: {
                id: `edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                editedBy: editor.id,
                editedByName: editor.fullName,
                changes,
              },
            },
          }
        : {}),
    },
  });

  return (await getWorkUpdateById(id))!;
}

export async function reviewWorkUpdate(
  id: string,
  reviewer: User,
  status: 'approved' | 'rejected',
  comment: string
): Promise<WorkUpdate> {
  const work = await getWorkUpdateById(id);
  if (!work) throw new Error('Work update not found');

  if (status === 'rejected' && (!comment || comment.trim().length < 20)) {
    throw new Error('Rejection comment must be at least 20 characters long.');
  }

  const now = new Date();

  await prisma.workUpdate.update({
    where: { id },
    data: {
      status,
      reviewerId: reviewer.id,
      reviewerName: reviewer.fullName,
      reviewComment: comment,
      reviewedAt: now,
    },
  });

  return (await getWorkUpdateById(id))!;
}

export async function bulkReviewWorkUpdates(
  ids: string[],
  reviewer: User,
  status: 'approved' | 'rejected',
  comment: string
): Promise<WorkUpdate[]> {
  if (status === 'rejected' && (!comment || comment.trim().length < 20)) {
    throw new Error('Rejection comment must be at least 20 characters long.');
  }

  const results: WorkUpdate[] = [];
  for (const id of ids) {
    try {
      const updated = await reviewWorkUpdate(id, reviewer, status, comment);
      results.push(updated);
    } catch (e) {
      console.warn(`Failed to bulk review work ${id}:`, e);
    }
  }
  return results;
}

// ==================== STATS & ANALYTICS ====================

export async function getWorkStats(currentUser?: User): Promise<WorkStats> {
  const works = await getWorkUpdates({}, currentUser);

  let totalHours = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  const categoryMap = new Map<string, { hours: number; count: number }>();
  const departmentMap = new Map<string, { hours: number; count: number }>();
  const weeklyMap = new Map<string, { hours: number; count: number }>();

  for (const w of works) {
    totalHours += w.hoursSpent;

    if (w.status === 'pending') pendingCount++;
    else if (w.status === 'approved') approvedCount++;
    else if (w.status === 'rejected') rejectedCount++;

    const cat = categoryMap.get(w.category) || { hours: 0, count: 0 };
    cat.hours += w.hoursSpent;
    cat.count += 1;
    categoryMap.set(w.category, cat);

    const dept = departmentMap.get(w.department) || { hours: 0, count: 0 };
    dept.hours += w.hoursSpent;
    dept.count += 1;
    departmentMap.set(w.department, dept);

    const dateStr = new Date(w.createdAt).toISOString().split('T')[0];
    const day = weeklyMap.get(dateStr) || { hours: 0, count: 0 };
    day.hours += w.hoursSpent;
    day.count += 1;
    weeklyMap.set(dateStr, day);
  }

  const totalReviewed = approvedCount + rejectedCount;
  const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 100;
  const activeEmployees = new Set(works.map((w) => w.userId)).size;

  return {
    totalHoursLogged: Math.round(totalHours * 10) / 10,
    pendingReviews: pendingCount,
    approvalRate,
    rejectionCount: rejectedCount,
    approvedCount,
    activeEmployees,
    totalSubmissions: works.length,
    categoryBreakdown: Array.from(categoryMap.entries()).map(([category, val]) => ({
      category,
      hours: Math.round(val.hours * 10) / 10,
      count: val.count,
    })),
    departmentBreakdown: Array.from(departmentMap.entries()).map(([department, val]) => ({
      department,
      hours: Math.round(val.hours * 10) / 10,
      count: val.count,
    })),
    weeklyTrends: Array.from(weeklyMap.entries())
      .map(([date, val]) => ({
        date,
        hours: Math.round(val.hours * 10) / 10,
        count: val.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    statusCounts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const isValid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  const salt = bcrypt.genSaltSync(10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: bcrypt.hashSync(newPassword, salt) },
  });
}

function mapPrismaEodEnablement(record: any): EodEnablement {
  return {
    id: record.id,
    userId: record.userId,
    date: toIsoDate(record.date) || '',
    enabledById: record.enabledById,
    enabledByName: record.enabledByName,
    note: record.note || null,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString(),
  };
}

function submissionMessage(
  status: EodSubmissionStatus,
  dateStr: string,
  window: ReturnType<typeof getEodWindowMeta>
): string {
  const closeLabel = window.closeHour > 12 ? `${window.closeHour - 12}:00 PM` : `${window.closeHour}:00 AM`;
  const openLabel = `${window.openHour}:00 AM`;
  switch (status) {
    case 'submitted':
      return 'EOD already submitted for this date.';
    case 'open':
      return `EOD is open. You can submit between ${openLabel} and ${closeLabel} (${window.timezone}).`;
    case 'before_open':
      return `EOD opens at ${openLabel} (${window.timezone}).`;
    case 'pending':
      return 'HR has enabled EOD submission for this date. Please submit now.';
    case 'locked':
    default:
      if (dateStr === window.today) {
        return `EOD is locked after ${closeLabel}. Contact HR to enable submission.`;
      }
      return 'EOD was missed for this date. Contact HR to enable submission.';
  }
}

export async function getEodEnablement(userId: string, dateStr: string): Promise<EodEnablement | null> {
  const date = parseDateOnly(dateStr);
  const record = await prisma.eodEnablement.findUnique({
    where: { userId_date: { userId, date } },
  });
  return record ? mapPrismaEodEnablement(record) : null;
}

export async function resolveEodSubmissionStatus(
  userId: string,
  dateStr: string,
  options: { eodStatus?: EodStatus | 'not_marked'; hrEnabled?: boolean } = {}
): Promise<{
  submissionStatus: EodSubmissionStatus;
  eodStatus: 'marked' | 'absent_leave' | 'not_marked';
  hrEnabled: boolean;
  canSubmit: boolean;
  canEnable: boolean;
  canDisable: boolean;
  window: ReturnType<typeof getEodWindowMeta>;
}> {
  const window = getEodWindowMeta();
  let eodStatus: 'marked' | 'absent_leave' | 'not_marked' = 'not_marked';

  if (options.eodStatus !== undefined) {
    eodStatus =
      options.eodStatus === 'marked' || options.eodStatus === 'absent_leave' ? options.eodStatus : 'not_marked';
  } else {
    const existing = await prisma.eodRecord.findUnique({
      where: { userId_date: { userId, date: parseDateOnly(dateStr) } },
    });
    if (existing?.status === 'marked' || existing?.status === 'absent_leave') {
      eodStatus = existing.status as EodStatus;
    }
  }

  const hrEnabled =
    typeof options.hrEnabled === 'boolean'
      ? options.hrEnabled
      : Boolean(await getEodEnablement(userId, dateStr));

  if (eodStatus !== 'not_marked') {
    return {
      submissionStatus: 'submitted',
      eodStatus,
      hrEnabled,
      canSubmit: false,
      canEnable: false,
      canDisable: false,
      window,
    };
  }

  if (dateStr > window.today) {
    return {
      submissionStatus: 'locked',
      eodStatus,
      hrEnabled,
      canSubmit: false,
      canEnable: false,
      canDisable: hrEnabled,
      window,
    };
  }

  if (hrEnabled) {
    return {
      submissionStatus: 'pending',
      eodStatus,
      hrEnabled: true,
      canSubmit: true,
      canEnable: false,
      canDisable: true,
      window,
    };
  }

  if (dateStr === window.today) {
    if (window.phase === 'open') {
      return {
        submissionStatus: 'open',
        eodStatus,
        hrEnabled: false,
        canSubmit: true,
        canEnable: false,
        canDisable: false,
        window,
      };
    }
    if (window.phase === 'before_open') {
      return {
        submissionStatus: 'before_open',
        eodStatus,
        hrEnabled: false,
        canSubmit: false,
        canEnable: false,
        canDisable: false,
        window,
      };
    }
  }

  return {
    submissionStatus: 'locked',
    eodStatus,
    hrEnabled: false,
    canSubmit: false,
    canEnable: true,
    canDisable: false,
    window,
  };
}

export async function assertEmployeeCanSubmitEod(userId: string, dateStr: string): Promise<void> {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('A valid EOD date (YYYY-MM-DD) is required');
  }

  const resolved = await resolveEodSubmissionStatus(userId, dateStr);
  if (resolved.canSubmit) return;

  throw new Error(submissionMessage(resolved.submissionStatus, dateStr, resolved.window));
}

export async function getMyEodSubmissionGate(user: User, dateStr?: string): Promise<EodSubmissionGate> {
  const window = getEodWindowMeta();
  const date = dateStr || window.today;
  const enablement = await getEodEnablement(user.id, date);
  const resolved = await resolveEodSubmissionStatus(user.id, date, { hrEnabled: Boolean(enablement) });

  let reason: string | null = null;
  if (resolved.eodStatus !== 'not_marked') {
    const existing = await prisma.eodRecord.findUnique({
      where: { userId_date: { userId: user.id, date: parseDateOnly(date) } },
    });
    reason = existing?.reason || null;
  }

  return {
    date,
    canSubmit: resolved.canSubmit,
    submissionStatus: resolved.submissionStatus,
    eodStatus: resolved.eodStatus,
    hrEnabled: resolved.hrEnabled,
    reason,
    message: submissionMessage(resolved.submissionStatus, date, resolved.window),
    window: resolved.window,
    enablement,
  };
}

export async function enableEodSubmission(
  actor: User,
  userId: string,
  dateStr: string,
  note?: string
): Promise<EodEnablement> {
  if (!isHrRole(actor.role)) {
    throw new Error('Only HR/Admin can enable EOD submission');
  }
  if (!userId) throw new Error('Employee is required');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('A valid date (YYYY-MM-DD) is required');
  }

  const employee = await prisma.user.findUnique({ where: { id: userId } });
  if (!employee || employee.role !== 'employee') {
    throw new Error('EOD enablement is only available for employees');
  }
  if (!employee.isActive) {
    throw new Error('Cannot enable EOD for an inactive employee');
  }

  const window = getEodWindowMeta();
  if (dateStr > window.today) {
    throw new Error('Cannot enable EOD for a future date');
  }

  const date = parseDateOnly(dateStr);
  const existingEod = await prisma.eodRecord.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existingEod?.status === 'marked' || existingEod?.status === 'absent_leave') {
    throw new Error('EOD is already submitted for this employee and date');
  }

  const existingEnablement = await prisma.eodEnablement.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existingEnablement) {
    return mapPrismaEodEnablement(existingEnablement);
  }

  if (dateStr === window.today && window.phase === 'open') {
    throw new Error('EOD is already open for today; enablement is not required');
  }
  if (dateStr === window.today && window.phase === 'before_open') {
    throw new Error('EOD opens at 9:00 AM. Enablement is only needed after the deadline is missed.');
  }

  const created = await prisma.eodEnablement.create({
    data: {
      id: newId('eod-en'),
      userId,
      date,
      enabledById: actor.id,
      enabledByName: actor.fullName,
      note: note?.trim() || null,
    },
  });

  return mapPrismaEodEnablement(created);
}

export async function disableEodSubmission(actor: User, userId: string, dateStr: string): Promise<{ message: string }> {
  if (!isHrRole(actor.role)) {
    throw new Error('Only HR/Admin can disable EOD submission');
  }
  if (!userId) throw new Error('Employee is required');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('A valid date (YYYY-MM-DD) is required');
  }

  const date = parseDateOnly(dateStr);
  const existing = await prisma.eodEnablement.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!existing) {
    throw new Error('No HR enablement found for this employee and date');
  }

  const eod = await prisma.eodRecord.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (eod?.status === 'marked' || eod?.status === 'absent_leave') {
    throw new Error('Cannot disable EOD after it has already been submitted');
  }

  await prisma.eodEnablement.delete({ where: { id: existing.id } });
  return { message: 'EOD enablement removed. Submission is locked again.' };
}

export async function upsertEodRecord(userId: string, dateStr: string, status: EodStatus, reason?: string | null) {
  const date = parseDateOnly(dateStr);
  const existing = await prisma.eodRecord.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    return prisma.eodRecord.update({
      where: { id: existing.id },
      data: { status, reason: reason ?? existing.reason },
    });
  }

  return prisma.eodRecord.create({
    data: {
      id: newId('eod'),
      userId,
      date,
      status,
      reason: reason || null,
    },
  });
}

export async function markAbsentLeave(user: User, dateStr: string, reason: string): Promise<EodRecord> {
  if (!dateStr) throw new Error('Date is required');
  if (!reason || reason.trim().length < 3) {
    throw new Error('Please provide a reason/note for absence or leave');
  }

  if (user.role === 'employee') {
    await assertEmployeeCanSubmitEod(user.id, dateStr);
  }

  const date = parseDateOnly(dateStr);
  const existing = await prisma.eodRecord.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  if (existing?.status === 'marked') {
    throw new Error('EOD is already marked for this date. Absence/leave cannot replace a submitted work log.');
  }

  const record = await upsertEodRecord(user.id, dateStr, 'absent_leave', reason.trim());
  return mapPrismaEod(record, user);
}

export async function getEodReport(dateStr: string, filters: { department?: string; userId?: string } = {}): Promise<EodReport> {
  if (!dateStr) throw new Error('Date is required');
  const date = parseDateOnly(dateStr);
  const { start, end } = getUtcRangeForLocalDate(dateStr, getAppTimezone());
  const window = getEodWindowMeta();

  const employees = await prisma.user.findMany({
    where: {
      isActive: true,
      role: 'employee',
      ...(filters.department && filters.department !== 'all' ? { department: filters.department } : {}),
      ...(filters.userId ? { id: filters.userId } : {}),
    },
    orderBy: { fullName: 'asc' },
  });

  const employeeIds = employees.map((e) => e.id);

  const eodRecords = await prisma.eodRecord.findMany({
    where: { date, userId: { in: employeeIds } },
  });
  const eodByUser = new Map(eodRecords.map((r) => [r.userId, r]));

  const enablements = await prisma.eodEnablement.findMany({
    where: { date, userId: { in: employeeIds } },
  });
  const enablementByUser = new Map(enablements.map((r) => [r.userId, r]));

  const worksThatDay = await prisma.workUpdate.findMany({
    where: {
      userId: { in: employeeIds },
      createdAt: { gte: start, lt: end },
    },
    select: { userId: true, createdAt: true },
  });
  const workByUser = new Map<string, Date>();
  for (const work of worksThatDay) {
    if (!workByUser.has(work.userId)) workByUser.set(work.userId, work.createdAt);
  }

  const marked: EodReport['marked'] = [];
  const absentLeave: EodReport['absentLeave'] = [];
  const notMarked: EodReport['notMarked'] = [];

  for (const employee of employees) {
    const eod = eodByUser.get(employee.id);
    const workAt = workByUser.get(employee.id);
    const hrEnabled = enablementByUser.has(employee.id);
    const base = {
      userId: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      employeeId: employee.employeeId || null,
    };

    if (eod?.status === 'absent_leave') {
      absentLeave.push({
        ...base,
        eodStatus: 'absent_leave',
        submissionStatus: 'submitted',
        hrEnabled,
        canEnable: false,
        canDisable: false,
        reason: eod.reason,
        markedAt: eod.updatedAt.toISOString(),
      });
    } else if (eod?.status === 'marked' || workAt) {
      marked.push({
        ...base,
        eodStatus: 'marked',
        submissionStatus: 'submitted',
        hrEnabled,
        canEnable: false,
        canDisable: false,
        markedAt: (eod?.updatedAt || workAt)!.toISOString(),
      });
    } else {
      const resolved = await resolveEodSubmissionStatus(employee.id, dateStr, {
        eodStatus: 'not_marked',
        hrEnabled,
      });
      notMarked.push({
        ...base,
        eodStatus: 'not_marked',
        submissionStatus: resolved.submissionStatus,
        hrEnabled: resolved.hrEnabled,
        canEnable: resolved.canEnable,
        canDisable: resolved.canDisable,
      });
    }
  }

  return { date: dateStr, window, marked, absentLeave, notMarked };
}

export async function getEmployeeEodHistory(userId: string, days = 14): Promise<EodRecord[]> {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);

  const records = await prisma.eodRecord.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: 'desc' },
    include: { user: true },
  });
  return records.map((r) => mapPrismaEod(r, r.user));
}

async function notifyUsers(
  userIds: string[],
  payload: { type: string; title: string; message: string; linkTab?: string; linkId?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      id: newId('ntf'),
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkTab: payload.linkTab || null,
      linkId: payload.linkId || null,
    })),
  });
}

async function getHrUserIds(): Promise<string[]> {
  const hrs = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['manager', 'admin', 'super_admin'] } },
    select: { id: true },
  });
  return hrs.map((h) => h.id);
}

export async function createEmployeeQuery(
  user: User,
  data: { queryType: QueryType; subject: string; description: string; relatedDate?: string | null }
): Promise<EmployeeQuery> {
  if (!data.subject?.trim()) throw new Error('Subject is required');
  if (!data.description?.trim()) throw new Error('Description is required');
  if (!data.queryType) throw new Error('Query type is required');

  const created = await prisma.employeeQuery.create({
    data: {
      id: newId('qry'),
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      department: user.department,
      queryType: data.queryType,
      subject: data.subject.trim(),
      description: data.description.trim(),
      relatedDate: data.relatedDate ? parseDateOnly(data.relatedDate) : null,
      status: 'pending',
    },
  });

  const hrIds = (await getHrUserIds()).filter((id) => id !== user.id);
  await notifyUsers(hrIds, {
    type: 'query_submitted',
    title: 'New employee query',
    message: `${user.fullName} raised a query: ${created.subject}`,
    linkTab: 'employee-queries',
    linkId: created.id,
  });

  return mapPrismaQuery(created);
}

export async function getEmployeeQueries(filters: QueryFilters = {}, currentUser?: User): Promise<EmployeeQuery[]> {
  const where: any = {};

  if (currentUser && !isHrRole(currentUser.role)) {
    where.userId = currentUser.id;
  } else if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.status && filters.status !== 'all') where.status = filters.status;
  if (filters.queryType && filters.queryType !== 'all') where.queryType = filters.queryType;

  if (filters.startDate) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...(where.createdAt || {}), lte: end };
  }

  if (filters.search) {
    const q = filters.search.trim();
    where.AND = [
      {
        OR: [
          { subject: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { userName: { contains: q, mode: 'insensitive' } },
          { userEmail: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const queries = await prisma.employeeQuery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return queries.map(mapPrismaQuery);
}

export async function getEmployeeQueryById(id: string, currentUser: User): Promise<EmployeeQueryDetail | null> {
  const query = await prisma.employeeQuery.findUnique({ where: { id } });
  if (!query) return null;

  if (!isHrRole(currentUser.role) && query.userId !== currentUser.id) {
    throw new Error('Not authorized to view this query');
  }

  const employeeRaw = await prisma.user.findUnique({ where: { id: query.userId } });
  const employee = employeeRaw ? (() => {
    const mapped = mapPrismaUser(employeeRaw);
    const { passwordHash, ...safe } = mapped;
    return safe;
  })() : null;

  const recentEod = await getEmployeeEodHistory(query.userId, 14);
  const recentWorks = await getWorkUpdates({ userId: query.userId }, { ...currentUser, role: 'super_admin' });

  return {
    ...mapPrismaQuery(query),
    employee,
    recentEod,
    recentWorks: recentWorks.slice(0, 8),
  };
}

export async function respondToEmployeeQuery(
  id: string,
  responder: User,
  data: { status: QueryStatus; hrResponse: string }
): Promise<EmployeeQuery> {
  const query = await prisma.employeeQuery.findUnique({ where: { id } });
  if (!query) throw new Error('Query not found');

  const allowed: QueryStatus[] = ['in_review', 'in_progress', 'resolved', 'rejected'];
  if (!allowed.includes(data.status)) {
    throw new Error('Invalid status. Use In Review, In Progress, Resolved, or Rejected.');
  }

  if (!data.hrResponse || data.hrResponse.trim().length < 3) {
    throw new Error('A response message is required');
  }

  const updated = await prisma.employeeQuery.update({
    where: { id },
    data: {
      status: data.status,
      hrResponse: data.hrResponse.trim(),
      respondedBy: responder.id,
      respondedByName: responder.fullName,
      respondedAt: new Date(),
    },
  });

  const statusLabel = data.status.replace('_', ' ');
  await notifyUsers([query.userId], {
    type: 'query_updated',
    title: 'Query status updated',
    message: `HR marked your query "${query.subject}" as ${statusLabel}.`,
    linkTab: 'raise-query',
    linkId: query.id,
  });

  return mapPrismaQuery(updated);
}

export async function getNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return items.map(mapPrismaNotification);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markNotificationRead(id: string, userId: string): Promise<AppNotification> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error('Notification not found');
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return mapPrismaNotification(updated);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function resetAndSeedDb() {
  await prisma.notification.deleteMany();
  await prisma.employeeQuery.deleteMany();
  await prisma.eodEnablement.deleteMany();
  await prisma.eodRecord.deleteMany();
  await prisma.editHistory.deleteMany();
  await prisma.workAttachment.deleteMany();
  await prisma.workUpdate.deleteMany();
  await prisma.user.deleteMany();
  await initializeDatabase();
}
