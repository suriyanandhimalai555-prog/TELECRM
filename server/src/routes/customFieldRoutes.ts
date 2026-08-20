import { Router } from 'express';
import db from '../config/database';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

const init = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id SERIAL PRIMARY KEY,
      company_id INTEGER,
      field_name VARCHAR(255),
      field_type VARCHAR(50) DEFAULT 'text',
      field_options TEXT,
      is_required BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};
init();

router.get('/', authenticate, async (req: any, res) => {
  const { rows } = await db.query('SELECT * FROM custom_fields WHERE company_id = $1 ORDER BY id', [req.user.company_id]);
  res.json({ fields: rows });
});

router.post('/', authenticate, requireAdmin, async (req: any, res) => {
  const { field_name, field_type, field_options, is_required } = req.body;
  const { rows } = await db.query(
    'INSERT INTO custom_fields (company_id, field_name, field_type, field_options, is_required) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.company_id, field_name, field_type || 'text', field_options, is_required || false]
  );
  res.json({ field: rows[0] });
});

router.delete('/:id', authenticate, requireAdmin, async (req: any, res) => {
  await db.query('DELETE FROM custom_fields WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
  res.json({ success: true });
});

export default router;
