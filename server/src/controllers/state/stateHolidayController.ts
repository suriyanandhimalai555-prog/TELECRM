import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const H = 'state_crm_holidays';
export const MANAGE_ROLES = ['master', 'admin'];

const fail = (res: Response, err: unknown) => {
  console.error('[Holidays]', err);
  res.status(500).json({ message: 'Server error' });
};

const isDate = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// GET /holidays?year=2026
export const listHolidays = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const year = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date());
    const params: any[] = [year];
    let where = `EXTRACT(YEAR FROM h.date)::text = $1`;
    if (!MANAGE_ROLES.includes(u.role)) {
      const states = u.role === 'coordinator' ? (u.coordinatorStates || []) : (u.state_id != null ? [u.state_id] : []);
      params.push(states.length ? states : [-1]);
      where += ` AND (h.state_id IS NULL OR h.state_id = ANY($2::int[]))`;
    }
    const r = await db.query(
      `SELECT h.id, h.name, to_char(h.date,'YYYY-MM-DD') AS date, h.state_id
       FROM ${H} h WHERE ${where} ORDER BY h.date`, params);
    res.json({ year, holidays: r.rows });
  } catch (e) { fail(res, e); }
};

// POST /holidays  { name, from: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }  (applies to all states)
export const createHoliday = async (req: StateAuthRequest, res: Response) => {
  try {
    const { name, from, to } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'Holiday name is required.' });
    if (!isDate(from)) return res.status(400).json({ message: 'Start date must be YYYY-MM-DD.' });
    const end = to ? to : from;
    if (!isDate(end) || end < from) return res.status(400).json({ message: 'End date must be on or after the start date.' });

    const r = await db.query(
      `WITH days AS (SELECT d::date AS d FROM generate_series($2::date, $3::date, '1 day') d)
       INSERT INTO ${H} (state_id, name, date)
       SELECT NULL, $1, d FROM days
       WHERE (SELECT COUNT(*) FROM days) <= 31
         AND NOT EXISTS (SELECT 1 FROM ${H} x WHERE x.date = days.d AND x.state_id IS NULL)
       RETURNING id`, [String(name).trim(), from, end]);
    if (!r.rowCount) return res.status(400).json({ message: 'Nothing added. Dates may already be holidays, or the range is longer than 31 days.' });
    res.json({ message: `${r.rowCount} holiday day(s) added.` });
  } catch (e) { fail(res, e); }
};

// DELETE /holidays/:id
export const deleteHoliday = async (req: StateAuthRequest, res: Response) => {
  try {
    const r = await db.query(`DELETE FROM ${H} WHERE id = $1`, [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ message: 'Holiday not found' });
    res.json({ message: 'Holiday deleted.' });
  } catch (e) { fail(res, e); }
};
