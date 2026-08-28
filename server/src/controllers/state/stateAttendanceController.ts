import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

// ── Helpers ──────────────────────────────────────────────────────────────

const IST_TZ = 'Asia/Kolkata';

// Returns minutes-since-midnight in IST for a given Date, regardless of server TZ.
const istMinutesOfDay = (d: Date): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
};

const parseHHMM = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Rule: checkIn <= fullDayEnd (default 9:40 AM) => full day (present).
// After that => half day. lateMinutes measured from fullDayStart (default 9:30 AM).
const computeStatus = (checkInDate: Date, fullDayStart: string, fullDayEnd: string) => {
  const checkInMin = istMinutesOfDay(checkInDate);
  const startMin = parseHHMM(fullDayStart);
  const endMin = parseHHMM(fullDayEnd);
  const lateMinutes = Math.max(0, checkInMin - startMin);
  const status = checkInMin <= endMin ? 'present' : 'half_day';
  return { status, lateMinutes };
};

const getSettings = async (stateId: number | null) => {
  if (stateId) {
    const { rows } = await db.query(
      'SELECT * FROM state_crm_attendance_settings WHERE state_id = $1',
      [stateId]
    );
    if (rows.length) return rows[0];
  }
  return { full_day_start: '09:30', full_day_end: '09:40', working_days: 26 };
};

// ── Attendance: check-in / check-out ────────────────────────────────────

export const checkIn = async (req: StateAuthRequest, res: Response) => {
  const { lat, lng, photo } = req.body;
  const requester = req.stateUser!;
  try {
    const existing = await db.query(
      'SELECT * FROM state_crm_attendance WHERE user_id = $1 AND date = CURRENT_DATE AND check_out IS NULL',
      [requester.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const now = new Date();
    const settings = await getSettings(requester.state_id);
    const { status, lateMinutes } = computeStatus(now, settings.full_day_start, settings.full_day_end);

    const { rows } = await db.query(
      `INSERT INTO state_crm_attendance
         (state_id, user_id, user_name, check_in, lat, lng, photo, status, late_minutes)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8) RETURNING *`,
      [requester.state_id, requester.id, requester.email, lat || null, lng || null, photo || null, status, lateMinutes]
    );
    res.json({ success: true, attendance: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] checkIn error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const checkOut = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  try {
    const { rows } = await db.query(
      `UPDATE state_crm_attendance SET check_out = NOW()
       WHERE user_id = $1 AND date = CURRENT_DATE AND check_out IS NULL RETURNING *`,
      [requester.id]
    );
    if (!rows.length) return res.status(400).json({ message: 'No active check-in found' });

    const att = rows[0];
    const hoursWorked = (new Date(att.check_out).getTime() - new Date(att.check_in).getTime()) / 3600000;
    await db.query(`UPDATE state_crm_attendance SET total_hours = $1 WHERE id = $2`, [hoursWorked, att.id]);
    att.total_hours = hoursWorked;

    // Salary credit — only if this user has a monthly_salary configured.
    const userRes = await db.query('SELECT monthly_salary FROM state_crm_users WHERE id = $1', [requester.id]);
    const monthlySalary = userRes.rows[0]?.monthly_salary;
    if (monthlySalary) {
      const settings = await getSettings(requester.state_id);
      const workingDays = settings.working_days || 26;
      const perDayRate = Number(monthlySalary) / workingDays;
      const dayFraction = att.status === 'half_day' ? 0.5 : 1;
      const amount = perDayRate * dayFraction;
      await db.query(
        `INSERT INTO state_crm_daily_salary_credits
           (user_id, attendance_id, date, hours_worked, amount_credited, monthly_salary_used, working_days_used, per_day_rate_used)
         VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, date) DO UPDATE SET
           hours_worked = EXCLUDED.hours_worked,
           amount_credited = EXCLUDED.amount_credited,
           attendance_id = EXCLUDED.attendance_id`,
        [requester.id, att.id, hoursWorked, amount, monthlySalary, workingDays, perDayRate]
      );
    }

    res.json({ success: true, attendance: att });
  } catch (err: any) {
    console.error('[StateCRM] checkOut error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const todayStatus = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  try {
    const { rows } = await db.query(
      'SELECT * FROM state_crm_attendance WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY id DESC LIMIT 1',
      [requester.id]
    );
    res.json({ attendance: rows[0] || null });
  } catch (err: any) {
    console.error('[StateCRM] todayStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const myHistory = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  try {
    const { rows } = await db.query(
      'SELECT * FROM state_crm_attendance WHERE user_id = $1 ORDER BY check_in DESC LIMIT 30',
      [requester.id]
    );
    res.json({ history: rows });
  } catch (err: any) {
    console.error('[StateCRM] myHistory error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listAttendance = async (req: StateAuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const filter = stateAccessFilter(req, 'a.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    let params = filter.params;
    let query = `
      SELECT a.*, u.name AS user_full_name, u.role, u.email
      FROM state_crm_attendance a
      LEFT JOIN state_crm_users u ON a.user_id = u.id
      WHERE ${where}
    `;
    if (date) {
      params = [...params, date];
      query += ` AND a.date = $${params.length}::date`;
    }
    query += ` ORDER BY a.check_in DESC`;
    const { rows } = await db.query(query, params);
    res.json({ attendance: rows });
  } catch (err: any) {
    console.error('[StateCRM] listAttendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Leave requests ──────────────────────────────────────────────────────

export const createLeaveRequest = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  const { leave_type, date, reason } = req.body;
  if (!date) return res.status(400).json({ message: 'date is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO state_crm_leave_requests (user_id, state_id, leave_type, date, reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [requester.id, requester.state_id, leave_type || 'casual', date, reason || null]
    );
    res.json({ success: true, leave: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] createLeaveRequest error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listLeaveRequests = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  try {
    const canViewAll = ['master', 'admin', 'coordinator', 'state_head'].includes(requester.role);
    if (canViewAll) {
      const filter = stateAccessFilter(req, 'l.state_id');
      const where = filter.where.replace('$STATE_PARAM', '$1');
      const { rows } = await db.query(
        `SELECT l.*, u.name AS user_name, u.email
         FROM state_crm_leave_requests l
         LEFT JOIN state_crm_users u ON l.user_id = u.id
         WHERE ${where} ORDER BY l.date DESC`,
        filter.params
      );
      return res.json({ leave: rows });
    }
    const { rows } = await db.query(
      'SELECT * FROM state_crm_leave_requests WHERE user_id = $1 ORDER BY date DESC',
      [requester.id]
    );
    res.json({ leave: rows });
  } catch (err: any) {
    console.error('[StateCRM] listLeaveRequests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLeaveRequestStatus = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'status must be approved or rejected' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE state_crm_leave_requests SET status = $1, approved_by = $2, approved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, requester.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Leave request not found' });
    res.json({ success: true, leave: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] updateLeaveRequestStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Salary ───────────────────────────────────────────────────────────────

export const getSalarySummary = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  try {
    const { rows } = await db.query(
      `SELECT * FROM state_crm_daily_salary_credits
       WHERE user_id = $1 AND to_char(date, 'YYYY-MM') = $2
       ORDER BY date`,
      [requester.id, month]
    );
    const total = rows.reduce((sum, r) => sum + Number(r.amount_credited || 0), 0);
    res.json({ month, credits: rows, total });
  } catch (err: any) {
    console.error('[StateCRM] getSalarySummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listSalarySummaries = async (req: StateAuthRequest, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  try {
    const filter = stateAccessFilter(req, 'u.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const params = [...filter.params, month];
    const { rows } = await db.query(
      `SELECT u.id AS user_id, u.name, u.email, u.monthly_salary,
              COALESCE(SUM(c.amount_credited), 0) AS total_credited,
              COUNT(c.id) AS days_credited
       FROM state_crm_users u
       LEFT JOIN state_crm_daily_salary_credits c
         ON c.user_id = u.id AND to_char(c.date, 'YYYY-MM') = $${params.length}
       WHERE ${where}
       GROUP BY u.id, u.name, u.email, u.monthly_salary
       ORDER BY u.name`,
      params
    );
    res.json({ month, summaries: rows });
  } catch (err: any) {
    console.error('[StateCRM] listSalarySummaries error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Attendance settings ─────────────────────────────────────────────────

export const getAttendanceSettings = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  try {
    const settings = await getSettings(requester.state_id);
    res.json({ settings });
  } catch (err: any) {
    console.error('[StateCRM] getAttendanceSettings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAttendanceSettings = async (req: StateAuthRequest, res: Response) => {
  const { state_id, full_day_start, full_day_end, working_days } = req.body;
  if (!state_id) return res.status(400).json({ message: 'state_id is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO state_crm_attendance_settings (state_id, full_day_start, full_day_end, working_days)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (state_id) DO UPDATE SET
         full_day_start = EXCLUDED.full_day_start,
         full_day_end = EXCLUDED.full_day_end,
         working_days = EXCLUDED.working_days
       RETURNING *`,
      [state_id, full_day_start || '09:30', full_day_end || '09:40', working_days || 26]
    );
    res.json({ success: true, settings: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] updateAttendanceSettings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
