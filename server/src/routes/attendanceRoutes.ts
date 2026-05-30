import { Router } from 'express';
import db from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Create attendance table
const initAttendance = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      user_name VARCHAR(255),
      check_in TIMESTAMP,
      check_out TIMESTAMP,
      lat NUMERIC,
      lng NUMERIC,
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};
initAttendance();

// Check In
router.post('/checkin', authenticate, async (req: any, res) => {
  const { lat, lng } = req.body;
  const userId = req.user?.id;
  const userName = req.user?.name || req.user?.email;
  try {
    // Check if already checked in today
    const existing = await db.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE AND check_out IS NULL',
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }
    const { rows } = await db.query(
      'INSERT INTO attendance (user_id, user_name, check_in, lat, lng) VALUES ($1, $2, NOW(), $3, $4) RETURNING *',
      [userId, userName, lat, lng]
    );
    res.json({ success: true, attendance: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check Out
router.post('/checkout', authenticate, async (req: any, res) => {
  const userId = req.user?.id;
  try {
    const { rows } = await db.query(
      'UPDATE attendance SET check_out = NOW() WHERE user_id = $1 AND date = CURRENT_DATE AND check_out IS NULL RETURNING *',
      [userId]
    );
    if (!rows.length) return res.status(400).json({ error: 'No active check-in found' });
    res.json({ success: true, attendance: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get today status for current user
router.get('/today', authenticate, async (req: any, res) => {
  const userId = req.user?.id;
  try {
    const { rows } = await db.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY id DESC LIMIT 1',
      [userId]
    );
    res.json({ attendance: rows[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all attendance (admin)
router.get('/all', authenticate, async (req: any, res) => {
  const { date } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name, u.email, u.role 
       FROM attendance a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE ($1::date IS NULL OR a.date = $1::date)
       ORDER BY a.check_in DESC`,
      [date || null]
    );
    res.json({ attendance: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
