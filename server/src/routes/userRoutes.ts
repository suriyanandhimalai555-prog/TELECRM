import { Router } from 'express';
import db from '../config/database';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
const router = Router();

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  let query: string; let params: any[] = [];
  if (req.user?.role === 'master_admin') {
    const cid = req.query.company_id;
    query = cid
      ? 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id WHERE u.company_id=$1 ORDER BY u.created_at DESC'
      : 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id ORDER BY u.created_at DESC';
    if (cid) params = [cid];
  } else {
    query = 'SELECT u.*, c.company_name FROM users u LEFT JOIN companies c ON u.company_id=c.id WHERE u.company_id=$1 ORDER BY u.created_at DESC';
    params = [req.user?.company_id];
  }
  const r = await db.query(query, params);
  res.json(r.rows.map((u: any) => ({ ...u, password: undefined })));
});
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { email, password, name, role, company_id } = req.body;
  if (req.user?.role === 'company_admin') {
    if (['master_admin','company_admin'].includes(role))
      return res.status(403).json({ message: 'Cannot create admin roles' });
    if (parseInt(company_id) !== req.user.company_id)
      return res.status(403).json({ message: 'Can only add users to your own company' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = await db.query(
    'INSERT INTO users (email,password,name,role,company_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,company_id',
    [email, hash, name, role, company_id || req.user?.company_id]);
  res.json(r.rows[0]);
});
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const target = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ message: 'Not found' });
  if (req.user?.role === 'company_admin' && target.rows[0].company_id !== req.user.company_id)
    return res.status(403).json({ message: 'Forbidden' });
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});
export default router;
