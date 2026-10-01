import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const USERS_TABLE = 'state_crm_users';
const EOD = 'state_crm_work_eod';
const ENABLE = 'state_crm_work_eod_enablements';
const SETTINGS = 'state_crm_work_eod_settings';

const ALL_ACCESS_ROLES = ['master', 'admin', 'hr'];
const MANAGE_ROLES = ['master', 'admin', 'hr'];

const fail = (res: Response, err: unknown) => {
  console.error('[WorkTracker][EOD]', err);
  res.status(500).json({ message: 'Server error' });
};

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const nowMinutesIST = (): number => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
};
const toMinutes = (t: string): number => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const scopeSql = (req: StateAuthRequest, column: string, params: any[]): string => {
  const u = req.stateUser!;
  if (ALL_ACCESS_ROLES.includes(u.role)) return '1=1';
  if (u.role === 'coordinator') {
    params.push(u.coordinatorStates && u.coordinatorStates.length ? u.coordinatorStates : [-1]);
    return `${column} = ANY($${params.length}::int[])`;
  }
  params.push(u.state_id ?? -1);
  return `${column} = $${params.length}`;
};

const getWindow = async (stateId: number | null) => {
  if (stateId) {
    const { rows } = await db.query(`SELECT office_start, office_end FROM ${SETTINGS} WHERE state_id = $1`, [stateId]);
    if (rows[0]) return { start: String(rows[0].office_start).slice(0, 5), end: String(rows[0].office_end).slice(0, 5) };
  }
  return { start: '09:00', end: '19:00' };
};

// GET /eod/window
export const getWindowStatus = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const { start, end } = await getWindow(u.state_id);
    const nowMin = nowMinutesIST();
    const withinWindow = nowMin >= toMinutes(start) && nowMin <= toMinutes(end);
    res.json({ start, end, status: withinWindow ? 'Open' : 'Closed', withinWindow, today: todayIST() });
  } catch (err) { fail(res, err); }
};

// GET /eod/mine
export const getMyEod = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const date = todayIST();
    const { rows } = await db.query(`SELECT * FROM ${EOD} WHERE user_id = $1 AND date = $2`, [u.id, date]);
    const { rows: enableRows } = await db.query(`SELECT * FROM ${ENABLE} WHERE user_id = $1 AND date = $2`, [u.id, date]);
    const { start, end } = await getWindow(u.state_id);
    const nowMin = nowMinutesIST();
    const withinWindow = nowMin >= toMinutes(start) && nowMin <= toMinutes(end);
    res.json({
      record: rows[0] || null,
      enabled: !!enableRows[0],
      canSubmit: (withinWindow || !!enableRows[0]) && !rows[0],
      withinWindow,
      window: { start, end },
    });
  } catch (err) { fail(res, err); }
};

// POST /eod/mark  { note? }
export const markEod = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const date = todayIST();
    const { start, end } = await getWindow(u.state_id);
    const nowMin = nowMinutesIST();
    const withinWindow = nowMin >= toMinutes(start) && nowMin <= toMinutes(end);
    if (!withinWindow) {
      const { rows: enableRows } = await db.query(`SELECT * FROM ${ENABLE} WHERE user_id = $1 AND date = $2`, [u.id, date]);
      if (!enableRows[0]) return res.status(403).json({ message: 'EOD window is closed. Ask an admin to enable it for you.' });
    }
    const { rows } = await db.query(
      `INSERT INTO ${EOD} (user_id, state_id, date, status, note)
       VALUES ($1,$2,$3,'marked',$4)
       ON CONFLICT (user_id, date) DO UPDATE SET status='marked', note=$4
       RETURNING *`,
      [u.id, u.state_id, date, req.body?.note || null]
    );
    res.json({ success: true, record: rows[0] });
  } catch (err) { fail(res, err); }
};

// POST /eod/absent  { note? }
export const markAbsent = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const date = todayIST();
    const { rows } = await db.query(
      `INSERT INTO ${EOD} (user_id, state_id, date, status, note)
       VALUES ($1,$2,$3,'absent',$4)
       ON CONFLICT (user_id, date) DO UPDATE SET status='absent', note=$4
       RETURNING *`,
      [u.id, u.state_id, date, req.body?.note || null]
    );
    res.json({ success: true, record: rows[0] });
  } catch (err) { fail(res, err); }
};

// GET /eod/employees?date=YYYY-MM-DD&status=&search=
// MD/HR/admin-scope view: every employee in scope + their status for the date, plus counts.
export const listEmployeeStatus = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    if (!MANAGE_ROLES.includes(u.role) && !['coordinator', 'state_head'].includes(u.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const q = req.query as Record<string, string | undefined>;
    const date = q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : todayIST();

    const params: any[] = [];
    const scope = scopeSql(req, 'u.state_id', params);
    let where = scope;
    if (q.search) { params.push(`%${q.search}%`); where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }

    params.push(date);
    const dateParamIdx = params.length;

    const { rows } = await db.query(
      `SELECT u.id AS user_id, u.name AS user_name, u.role, u.email,
              e.id AS eod_id, e.status, e.note, e.marked_at,
              en.id AS enablement_id, en.note AS enablement_note
       FROM ${USERS_TABLE} u
       LEFT JOIN ${EOD} e ON e.user_id = u.id AND e.date = $${dateParamIdx}
       LEFT JOIN ${ENABLE} en ON en.user_id = u.id AND en.date = $${dateParamIdx}
       WHERE ${where}
       ORDER BY u.name ASC`,
      params
    );

    let filtered = rows;
    if (q.status === 'marked') filtered = rows.filter((r: any) => r.status === 'marked');
    else if (q.status === 'absent') filtered = rows.filter((r: any) => r.status === 'absent');
    else if (q.status === 'not_marked') filtered = rows.filter((r: any) => !r.status);

    const counts = {
      total: rows.length,
      marked: rows.filter((r: any) => r.status === 'marked').length,
      not_marked: rows.filter((r: any) => !r.status).length,
      absent: rows.filter((r: any) => r.status === 'absent').length,
    };
    res.json({ date, counts, records: filtered });
  } catch (err) { fail(res, err); }
};

// POST /eod/toggle  { user_id, date?, note? }  -- enable EOD outside window for one employee
export const enableEod = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    if (!MANAGE_ROLES.includes(u.role)) return res.status(403).json({ message: 'Forbidden' });
    const userId = Number(req.body?.user_id);
    const date = req.body?.date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : todayIST();
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'user_id is required' });
    const { rows } = await db.query(
      `INSERT INTO ${ENABLE} (user_id, date, enabled_by, enabled_by_name, note)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, date) DO UPDATE SET enabled_by=$3, enabled_by_name=$4, note=$5
       RETURNING *`,
      [userId, date, u.id, (u as any).name || u.email, req.body?.note || null]
    );
    res.json({ success: true, enablement: rows[0] });
  } catch (err) { fail(res, err); }
};

// DELETE /eod/toggle/:user_id/:date  -- turn the override back off
export const disableEod = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    if (!MANAGE_ROLES.includes(u.role)) return res.status(403).json({ message: 'Forbidden' });
    const userId = Number(req.params.user_id);
    const date = req.params.date;
    if (!Number.isInteger(userId) || userId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid user_id or date' });
    }
    await db.query(`DELETE FROM ${ENABLE} WHERE user_id = $1 AND date = $2`, [userId, date]);
    res.json({ success: true });
  } catch (err) { fail(res, err); }
};
