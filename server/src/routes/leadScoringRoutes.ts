import { Router } from 'express';
import db from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get lead score
router.get('/score/:id', authenticate, async (req: any, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    const lead = rows[0];
    let score = 0;
    if (lead.email) score += 20;
    if (lead.mobile) score += 20;
    if (lead.whatsapp) score += 10;
    if (lead.company) score += 10;
    if (lead.revenue > 0) score += 20;
    if (lead.next_followup) score += 10;
    if (lead.stage === 'Won') score += 10;
    res.json({ score, lead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check duplicates
router.post('/duplicates', authenticate, async (req: any, res) => {
  const { mobile, email, contact_name } = req.body;
  try {
    const { rows } = await db.query(`
      SELECT id, contact_name, mobile, email, stage, created_at
      FROM leads
      WHERE company_id = $1 AND (
        (mobile IS NOT NULL AND mobile = $2) OR
        (email IS NOT NULL AND email = $3) OR
        (contact_name ILIKE $4)
      )
      ORDER BY created_at DESC LIMIT 10
    `, [req.user.company_id, mobile, email, contact_name]);
    res.json({ duplicates: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leads with scores
router.get('/scored', authenticate, async (req: any, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, contact_name, mobile, email, company, stage, revenue, 
             next_followup, whatsapp,
             (CASE WHEN email IS NOT NULL THEN 20 ELSE 0 END +
              CASE WHEN mobile IS NOT NULL THEN 20 ELSE 0 END +
              CASE WHEN whatsapp IS NOT NULL THEN 10 ELSE 0 END +
              CASE WHEN company IS NOT NULL THEN 10 ELSE 0 END +
              CASE WHEN revenue > 0 THEN 20 ELSE 0 END +
              CASE WHEN next_followup IS NOT NULL THEN 10 ELSE 0 END +
              CASE WHEN stage = 'Won' THEN 10 ELSE 0 END) as score
      FROM leads
      WHERE company_id = $1
      ORDER BY score DESC
      LIMIT 50
    `, [req.user.company_id]);
    res.json({ leads: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
