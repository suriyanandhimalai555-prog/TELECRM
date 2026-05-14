import { Router } from 'express';
import db from '../config/database';
import { authenticate, requireMasterAdmin, requireAdmin, AuthRequest } from '../middleware/auth';
const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const q = req.user?.role === 'master_admin'
    ? await db.query('SELECT * FROM companies ORDER BY created_at DESC')
    : await db.query('SELECT * FROM companies WHERE id = $1', [req.user?.company_id]);
  res.json(q.rows);
});
router.post('/', authenticate, requireMasterAdmin, async (req, res) => {
  const { company_name } = req.body;
  const r = await db.query('INSERT INTO companies (company_name) VALUES ($1) RETURNING *', [company_name]);
  res.json(r.rows[0]);
});
router.delete('/:id', authenticate, requireMasterAdmin, async (req, res) => {
  await db.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});
router.get('/:id/whatsapp', authenticate, async (req: AuthRequest, res) => {
  const compId = parseInt(req.params.id);
  if (req.user?.role === 'company_admin' && req.user.company_id !== compId)
    return res.status(403).json({ message: 'Forbidden' });
  const r = await db.query('SELECT * FROM whatsapp_accounts WHERE company_id = $1 ORDER BY created_at DESC', [compId]);
  res.json(r.rows);
});
router.post('/:id/whatsapp', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const compId = parseInt(req.params.id);
  if (req.user?.role === 'company_admin' && req.user.company_id !== compId)
    return res.status(403).json({ message: 'Forbidden' });
  const { label, phone_number, phone_number_id, access_token } = req.body;
  const r = await db.query(
    `INSERT INTO whatsapp_accounts (company_id,label,phone_number,phone_number_id,access_token,status)
     VALUES ($1,$2,$3,$4,$5,'inactive') RETURNING *`,
    [compId, label, phone_number, phone_number_id, access_token]);
  res.json(r.rows[0]);
});
router.delete('/:id/whatsapp/:waId', authenticate, requireAdmin, async (req, res) => {
  await db.query('DELETE FROM whatsapp_accounts WHERE id = $1', [req.params.waId]);
  res.json({ message: 'Deleted' });
});
export default router;
