import { Router } from 'express';
import db from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get due follow-ups for current user
router.get('/due', authenticate, async (req: any, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.id, l.contact_name, l.mobile, l.stage, l.next_followup, 
             u.name as owner_name
      FROM leads l
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.next_followup IS NOT NULL
        AND l.next_followup <= NOW() + INTERVAL '24 hours'
        AND l.next_followup >= NOW() - INTERVAL '7 days'
        AND (l.owner_id = $1 OR $2 = 'company_admin' OR $2 = 'ADMIN')
        AND l.company_id = $3
      ORDER BY l.next_followup ASC
    `, [req.user.id, req.user.role, req.user.company_id]);
    res.json({ reminders: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all follow-ups (upcoming)
router.get('/upcoming', authenticate, async (req: any, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.id, l.contact_name, l.mobile, l.stage, l.next_followup,
             u.name as owner_name
      FROM leads l
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE l.next_followup IS NOT NULL
        AND l.next_followup >= NOW()
        AND (l.owner_id = $1 OR $2 = 'company_admin' OR $2 = 'ADMIN')
        AND l.company_id = $3
      ORDER BY l.next_followup ASC
      LIMIT 50
    `, [req.user.id, req.user.role, req.user.company_id]);
    res.json({ upcoming: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update follow-up date
router.put('/:id', authenticate, async (req: any, res) => {
  const { next_followup } = req.body;
  try {
    await db.query('UPDATE leads SET next_followup = $1 WHERE id = $2', [next_followup, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
