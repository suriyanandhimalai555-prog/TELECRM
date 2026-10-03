import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const L = 'state_crm_late_requests';
export const REVIEW_ROLES = ['master', 'admin', 'coordinator', 'state_head'];
const ALL_ACCESS = ['master', 'admin', 'hr'];

const fail = (res: Response, err: unknown) => {
  console.error('[LateRequests]', err);
  res.status(500).json({ message: 'Server error' });
};

const inScope = (u: any, stateId: number | null) => {
  if (ALL_ACCESS.includes(u.role)) return true;
  if (u.role === 'coordinator') return (u.coordinatorStates || []).includes(stateId);
  return u.state_id != null && u.state_id === stateId;
};

// POST /late  { date: 'YYYY-MM-DD', reason }
export const createLate = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const { date, reason } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    if (!reason || String(reason).trim().length < 5) return res.status(400).json({ message: 'Please give a reason (at least 5 characters).' });

    const att = await db.query(
      `SELECT status, to_char(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata','HH24:MI') AS t
       FROM state_crm_attendance WHERE user_id = $1 AND date = $2::date ORDER BY check_in LIMIT 1`, [u.id, date]);
    if (!att.rows.length) return res.status(400).json({ message: 'No check-in found for that date.' });
    if (!['late', 'half_day'].includes(att.rows[0].status)) return res.status(400).json({ message: 'That day was not marked late or half day.' });

    const dup = await db.query(`SELECT id FROM ${L} WHERE user_id = $1 AND date = $2::date AND status = 'pending'`, [u.id, date]);
    if (dup.rows.length) return res.status(409).json({ message: 'A request for that day is already pending.' });

    const r = await db.query(
      `INSERT INTO ${L} (user_id, state_id, date, reason, check_in_time) VALUES ($1, $2, $3::date, $4, $5) RETURNING id`,
      [u.id, u.state_id ?? null, date, String(reason).trim(), att.rows[0].t]);
    res.json({ message: 'Request sent.', id: r.rows[0].id });
  } catch (e) { fail(res, e); }
};

// GET /late              -> my requests
// GET /late?scope=review -> requests I can review
export const listLate = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const params: any[] = [];
    let where = '1=1';
    if (req.query.scope === 'review') {
      if (!REVIEW_ROLES.includes(u.role)) return res.status(403).json({ message: 'Not allowed' });
      if (!ALL_ACCESS.includes(u.role)) {
        if (u.role === 'coordinator') {
          params.push(u.coordinatorStates && u.coordinatorStates.length ? u.coordinatorStates : [-1]);
          where = `r.state_id = ANY($1::int[])`;
        } else {
          params.push(u.state_id ?? -1);
          where = `r.state_id = $1`;
        }
      }
    } else {
      params.push(u.id);
      where = `r.user_id = $1`;
    }
    const r = await db.query(
      `SELECT r.id, r.user_id, usr.name AS user_name, to_char(r.date,'YYYY-MM-DD') AS date,
              r.reason, r.check_in_time, r.status, r.created_at
       FROM ${L} r JOIN state_crm_users usr ON usr.id = r.user_id
       WHERE ${where} ORDER BY r.created_at DESC LIMIT 200`, params);
    res.json({ requests: r.rows });
  } catch (e) { fail(res, e); }
};

// PUT /late/:id  { status: 'approved' | 'rejected' }
export const reviewLate = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'status must be approved or rejected' });

    const cur = await db.query(`SELECT id, user_id, state_id, status FROM ${L} WHERE id = $1`, [req.params.id]);
    const row = cur.rows[0];
    if (!row) return res.status(404).json({ message: 'Request not found' });
    if (row.status !== 'pending') return res.status(409).json({ message: 'This request was already reviewed.' });
    if (row.user_id === u.id) return res.status(403).json({ message: 'You cannot review your own request.' });
    if (!inScope(u, row.state_id)) return res.status(403).json({ message: 'This request is outside your area.' });

    await db.query(`UPDATE ${L} SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3`, [status, u.id, row.id]);

    if (status === 'approved') {
      // Full day's pay: lift an existing credit to the per-day rate...
      const upd = await db.query(
        `UPDATE state_crm_daily_salary_credits c SET amount_credited = c.per_day_rate_used
         FROM ${L} r WHERE r.id = $1 AND c.user_id = r.user_id AND c.date = r.date`, [row.id]);
      // ...or create the credit if the person has already checked out but none exists yet.
      if (!upd.rowCount) {
        await db.query(
          `INSERT INTO state_crm_daily_salary_credits
             (user_id, attendance_id, date, hours_worked, amount_credited, monthly_salary_used, working_days_used, per_day_rate_used)
           SELECT a.user_id, a.id, a.date, COALESCE(a.total_hours, 0), u.monthly_salary / wd.d, u.monthly_salary, wd.d, u.monthly_salary / wd.d
           FROM ${L} r
           JOIN state_crm_attendance a ON a.user_id = r.user_id AND a.date = r.date
           JOIN state_crm_users u ON u.id = r.user_id
           CROSS JOIN LATERAL (SELECT COALESCE((SELECT working_days FROM state_crm_attendance_settings WHERE state_id = r.state_id), 26) AS d) wd
           WHERE r.id = $1 AND u.monthly_salary IS NOT NULL AND u.monthly_salary > 0 AND a.check_out IS NOT NULL`, [row.id]);
      }
      await db.query(
        `UPDATE state_crm_attendance a SET hr_note = 'Late regularization approved'
         FROM ${L} r WHERE r.id = $1 AND a.user_id = r.user_id AND a.date = r.date`, [row.id]);
    }
    res.json({ message: `Request ${status}.` });
  } catch (e) { fail(res, e); }
};
