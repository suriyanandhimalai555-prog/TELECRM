import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const IST_TZ = 'Asia/Kolkata';

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

const canManageEod = (role: string) => ['master', 'hr', 'admin'].includes(role);

const getWindow = async (stateId: number | null) => {
  if (stateId) {
    const { rows } = await db.query(
      `SELECT office_start, office_end FROM state_crm_attendance_settings WHERE state_id = $1`,
      [stateId]
    );
    if (rows[0]) return { start: rows[0].office_start || '09:00', end: rows[0].office_end || '18:00' };
  }
  return { start: '09:00', end: '18:00' };
};

const isWithinWindow = async (stateId: number | null) => {
  const { start, end } = await getWindow(stateId);
  const nowMin = istMinutesOfDay(new Date());
  return nowMin >= parseHHMM(start) && nowMin <= parseHHMM(end);
};

// GET /eod/today
export const getMyEodToday = async (req: StateAuthRequest, res: Response) => {
  try {
    const userId = req.stateUser!.id;
    const { rows } = await db.query(
      `SELECT * FROM state_crm_eod_records WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );
    const { rows: enableRows } = await db.query(
      `SELECT * FROM state_crm_eod_enablements WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );
    const withinWindow = await isWithinWindow(req.stateUser!.state_id);
    res.json({
      record: rows[0] || null,
      enabled: !!enableRows[0],
      canSubmit: withinWindow || !!enableRows[0],
      withinWindow,
    });
  } catch (err: any) {
    console.error('[StateCRM] getMyEodToday error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /eod/submit  { summary }
export const submitEod = async (req: StateAuthRequest, res: Response) => {
  try {
    const userId = req.stateUser!.id;
    const { summary } = req.body;
    if (!summary || !String(summary).trim()) {
      return res.status(400).json({ message: 'Summary is required' });
    }

    const withinWindow = await isWithinWindow(req.stateUser!.state_id);
    if (!withinWindow) {
      const { rows: enableRows } = await db.query(
        `SELECT * FROM state_crm_eod_enablements WHERE user_id = $1 AND date = CURRENT_DATE`,
        [userId]
      );
      if (!enableRows[0]) {
        return res.status(403).json({ message: 'EOD submission window is closed. Ask an admin to enable it for you.' });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO state_crm_eod_records (state_id, user_id, date, status, summary, updated_at)
       VALUES ($1, $2, CURRENT_DATE, 'marked', $3, NOW())
       ON CONFLICT (user_id, date)
       DO UPDATE SET status = 'marked', summary = $3, updated_at = NOW()
       RETURNING *`,
      [req.stateUser!.state_id, userId, summary]
    );
    res.json({ success: true, record: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] submitEod error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /eod/absent  { reason }
export const markEodAbsent = async (req: StateAuthRequest, res: Response) => {
  try {
    const userId = req.stateUser!.id;
    const { reason } = req.body;
    const { rows } = await db.query(
      `INSERT INTO state_crm_eod_records (state_id, user_id, date, status, summary, updated_at)
       VALUES ($1, $2, CURRENT_DATE, 'absent', $3, NOW())
       ON CONFLICT (user_id, date)
       DO UPDATE SET status = 'absent', summary = $3, updated_at = NOW()
       RETURNING *`,
      [req.stateUser!.state_id, userId, reason || null]
    );
    res.json({ success: true, record: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] markEodAbsent error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /eod/all?date=YYYY-MM-DD
export const listEod = async (req: StateAuthRequest, res: Response) => {
  try {
    if (!canManageEod(req.stateUser!.role) && !['coordinator', 'state_head'].includes(req.stateUser!.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { date } = req.query;
    const params: any[] = [];
    let where = '1=1';
    if (req.stateUser!.state_id) {
      params.push(req.stateUser!.state_id);
      where += ` AND u.state_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      where += ` AND COALESCE(e.date, $${params.length}::date) = $${params.length}`;
    } else {
      where += ` AND (e.date = CURRENT_DATE OR e.date IS NULL)`;
    }
    const { rows } = await db.query(
      `SELECT u.id AS user_id, u.name AS user_name, u.role,
              e.id AS eod_id, e.date, e.status, e.summary, e.updated_at,
              en.id AS enablement_id, en.note AS enablement_note
       FROM state_crm_users u
       LEFT JOIN state_crm_eod_records e ON e.user_id = u.id AND e.date = COALESCE($${date ? params.length : 'NULL'}::date, CURRENT_DATE)
       LEFT JOIN state_crm_eod_enablements en ON en.user_id = u.id AND en.date = COALESCE($${date ? params.length : 'NULL'}::date, CURRENT_DATE)
       WHERE ${req.stateUser!.state_id ? 'u.state_id = $1' : '1=1'}
       ORDER BY u.name ASC`,
      req.stateUser!.state_id ? [req.stateUser!.state_id] : []
    );
    res.json({ records: rows });
  } catch (err: any) {
    console.error('[StateCRM] listEod error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /eod/enable  { user_id, date, note }
export const enableEod = async (req: StateAuthRequest, res: Response) => {
  try {
    if (!canManageEod(req.stateUser!.role)) return res.status(403).json({ message: 'Forbidden' });
    const { user_id, date, note } = req.body;
    if (!user_id || !date) return res.status(400).json({ message: 'user_id and date are required' });
    const { rows } = await db.query(
      `INSERT INTO state_crm_eod_enablements (user_id, date, enabled_by, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date) DO UPDATE SET enabled_by = $3, note = $4
       RETURNING *`,
      [user_id, date, req.stateUser!.id, note || null]
    );
    res.json({ success: true, enablement: rows[0] });
  } catch (err: any) {
    console.error('[StateCRM] enableEod error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
