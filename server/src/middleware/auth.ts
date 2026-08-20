import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; company_id: number | null; };
}
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.user = decoded;

    if (decoded.role !== 'master_admin' && decoded.company_id) {
      const compCheck = await db.query('SELECT status FROM companies WHERE id = $1', [decoded.company_id]);
      if (compCheck.rows.length > 0 && compCheck.rows[0].status === 'disabled') {
        return res.status(403).json({ message: 'Your company has been disabled' });
      }
    }
    next();
  }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};
export const requireMasterAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'master_admin') return res.status(403).json({ message: 'Forbidden' });
  next();
};
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['master_admin','company_admin','ADMIN','MANAGER'].includes(req.user?.role || ''))
    return res.status(403).json({ message: 'Forbidden' });
  next();
};
export const companyFilter = (req: AuthRequest) => {
  if (req.user?.role === 'master_admin') {
    const id = req.query.company_id ? parseInt(req.query.company_id as string) : null;
    return id ? { where: 'AND company_id = $CID', value: id } : { where: '', value: null };
  }
  return { where: 'AND company_id = $CID', value: req.user?.company_id ?? null };
};
