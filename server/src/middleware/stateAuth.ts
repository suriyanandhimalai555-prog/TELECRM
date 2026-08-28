import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { hasStatePermission } from '../config/permissions';

export interface StateAuthRequest extends Request {
  stateUser?: {
    id: number;
    email: string;
    role: string;
    state_id: number | null;
    coordinatorStates?: number[];
  };
}

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// Roles allowed, from highest to lowest
export const STATE_ROLES = ['master', 'hr', 'admin', 'coordinator', 'state_head', 'sales_manager', 'sales_admin', 'team_member'];

export const authenticateState = (req: StateAuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Hard boundary: a State CRM token must be explicitly marked as such.
    // This makes it structurally impossible for a regular-CRM token to be used here, or vice versa.
    if (decoded.crm !== 'state') {
      return res.status(403).json({ message: 'Invalid CRM context for this token' });
    }
    req.stateUser = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      state_id: decoded.state_id ?? null,
      coordinatorStates: decoded.coordinatorStates || [],
    };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireStateRole = (...roles: string[]) => {
  return (req: StateAuthRequest, res: Response, next: NextFunction) => {
    if (!req.stateUser || !roles.includes(req.stateUser.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

// Returns a SQL WHERE fragment + params to scope any query by state access.
// Master/Admin: no restriction.
// Coordinator: restricted to their assigned states.
// State Head / Sales Manager / Sales Admin / Team Member: restricted to their single state.
export const stateAccessFilter = (req: StateAuthRequest, column: string = 'state_id') => {
  const user = req.stateUser;
  if (!user) return { where: '1=0', params: [] as any[] };
  if (user.role === 'master' || user.role === 'admin') {
    return { where: '1=1', params: [] as any[] };
  }
  if (user.role === 'coordinator') {
    const states = user.coordinatorStates && user.coordinatorStates.length > 0 ? user.coordinatorStates : [-1];
    return { where: `${column} = ANY($STATE_PARAM)`, params: [states] };
  }
  // state_head, sales_manager, sales_admin, team_member
  return { where: `${column} = $STATE_PARAM`, params: [user.state_id ?? -1] };
};

// ── Role hierarchy: each role can see/manage itself + everything downstream ──
export const ROLE_HIERARCHY: Record<string, number> = {
  master: 100,
  admin: 95, // was missing — caused canManage()/requireMinRole() to rank admin at 0
  hr: 90,
  coordinator: 80,
  state_head: 70,
  sales_manager: 60,
  sales_admin: 60, // office admin — parallel rank to sales_manager (office-scoped, not state-scoped)
  team_member: 50, // sales employee
};

// One-directional exceptions to the strict rank order: viewer can manage target
// even though they're equal (or would otherwise fail) rank.
const MANAGE_EXCEPTIONS: Record<string, string[]> = {
  sales_manager: ['sales_admin'], // equal rank, but sales_manager may still create/manage sales_admin
};

// Returns true if `viewerRole` outranks `targetRole`, or via an explicit exception
export function canManage(viewerRole: string, targetRole: string): boolean {
  if (viewerRole === 'master') return true;
  if (MANAGE_EXCEPTIONS[viewerRole]?.includes(targetRole)) return true;
  const viewerRank = ROLE_HIERARCHY[viewerRole] ?? 0;
  const targetRank = ROLE_HIERARCHY[targetRole] ?? 0;
  return viewerRank > targetRank;
}

// Middleware: allow if the user's role outranks minRole in the hierarchy
export function requireMinRole(minRole: string) {
  return (req: StateAuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.stateUser?.role;
    if (!userRole) return res.status(401).json({ message: 'Unauthorized' });
    const userRank = ROLE_HIERARCHY[userRole] ?? 0;
    const minRank = ROLE_HIERARCHY[minRole] ?? 0;
    if (userRank < minRank) return res.status(403).json({ message: 'Insufficient role' });
    next();
  };
}

// Middleware: check a granular permission for the requester's role (DB-backed)
export const requireStatePermission = (key: string) => {
  return async (req: StateAuthRequest, res: Response, next: NextFunction) => {
    if (!req.stateUser) return res.status(401).json({ message: 'Unauthorized' });
    const allowed = await hasStatePermission(req.stateUser.role, key);
    if (!allowed) return res.status(403).json({ message: `Forbidden: missing permission '${key}'` });
    next();
  };
};
