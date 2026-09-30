import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { findUserById } from './dbStore.js';
import { User, UserRole } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'work_tracker_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'work_tracker_super_secret_refresh_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateTokens(user: User) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    const user = await findUserById(decoded.id);
    if (!user || !user.isActive) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  } catch (err) {
    return null;
  }
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Missing Bearer token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User account not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired access token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Role '${req.user.role}' does not have required permissions: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}
