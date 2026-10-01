import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const USERS_TABLE = 'state_crm_users';
const W = 'state_crm_work_updates';
const H = 'state_crm_work_edit_history';

// Roles that can review work. master/admin/hr see everyone; the rest see their own state.
export const REVIEWER_ROLES = ['master', 'admin', 'hr', 'coordinator', 'state_head', 'sales_manager'];
const ALL_ACCESS_ROLES = ['master', 'admin', 'hr'];
const DEFAULT_CATEGORIES = ['Development', 'Design', 'Sales', 'Support', 'Meetings', 'Research', 'Admin', 'Other'];
const MIN_REJECT_LEN = 20;

const SELECT_COLS = `w.id, w.user_id, w.user_name, w.user_email, w.user_role, w.state_id,
  w.title, w.description, w.hours_spent::float8 AS hours_spent, w.category,
  to_char(w.work_date, 'YYYY-MM-DD') AS work_date, w.status,
  w.reviewer_id, w.reviewer_name, w.review_comment, w.reviewed_at, w.created_at, w.updated_at`;

const fail = (res: Response, err: unknown) => {
  console.error('[WorkTracker]', err);
  res.status(500).json({ message: 'Server error' });
};

const isReviewer = (role: string) => REVIEWER_ROLES.includes(role);

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

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

const canSeeEntry = (req: StateAuthRequest, entry: any): boolean => {
  const u = req.stateUser!;
  if (entry.user_id === u.id) return true;
  if (!isReviewer(u.role)) return false;
  if (ALL_ACCESS_ROLES.includes(u.role)) return true;
  if (u.role === 'coordinator') return (u.coordinatorStates || []).includes(entry.state_id);
  return entry.state_id != null && entry.state_id === u.state_id;
};

const getUserInfo = async (req: StateAuthRequest) => {
  const u = req.stateUser!;
  const { rows } = await db.query(`SELECT * FROM ${USERS_TABLE} WHERE id = $1`, [u.id]);
  const row = rows[0] || {};
  return { name: String(row.name || row.full_name || u.email), email: u.email };
};

const getEntry = async (id: number) => {
  const { rows } = await db.query(`SELECT ${SELECT_COLS} FROM ${W} w WHERE w.id = $1`, [id]);
  return rows[0] || null;
};

const parseId = (v: unknown): number | null => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

type EntryInput = { title: string; description: string; hours_spent: number; category: string; work_date: string | null };

const parseEntry = (body: any): { error?: string; data?: EntryInput } => {
  const title = String(body?.title ?? '').trim();
  const description = String(body?.description ?? '').trim();
  const category = String(body?.category ?? '').trim();
  const hours = Number(body?.hours_spent);
  const workDate = body?.work_date ? String(body.work_date) : null;
  if (!title || title.length > 200) return { error: 'Title is required (max 200 characters)' };
  if (!description) return { error: 'Description is required' };
  if (!category || category.length > 60) return { error: 'Category is required' };
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) return { error: 'Hours must be between 0.5 and 24' };
  if (Math.round(hours * 10) !== hours * 10) return { error: 'Hours must be in steps of 0.1' };
  if (workDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { error: 'work_date must be YYYY-MM-DD' };
    if (workDate > todayIST()) return { error: 'work_date cannot be in the future' };
  }
  return { data: { title, description, hours_spent: hours, category, work_date: workDate } };
};

export const getCategories = async (_req: StateAuthRequest, res: Response) => {
  res.json({ categories: DEFAULT_CATEGORIES });
};

export const createWork = async (req: StateAuthRequest, res: Response) => {
  try {
    const parsed = parseEntry(req.body);
    if (parsed.error || !parsed.data) return res.status(400).json({ message: parsed.error });
    const d = parsed.data;
    const u = req.stateUser!;
    const info = await getUserInfo(req);
    const { rows } = await db.query(
      `INSERT INTO ${W} (user_id, user_name, user_email, user_role, state_id, title, description, hours_spent, category, work_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::date, (NOW() AT TIME ZONE 'Asia/Kolkata')::date))
       RETURNING id`,
      [u.id, info.name, info.email, u.role, u.state_id, d.title, d.description, d.hours_spent, d.category, d.work_date]
    );
    res.status(201).json(await getEntry(rows[0].id));
  } catch (err) { fail(res, err); }
};

const listEntries = async (req: StateAuthRequest, res: Response, mode: 'mine' | 'review') => {
  try {
    const u = req.stateUser!;
    const q = req.query as Record<string, string | undefined>;
    const params: any[] = [];
    const conds: string[] = [];
    if (mode === 'mine') { params.push(u.id); conds.push(`w.user_id = $${params.length}`); }
    else conds.push(scopeSql(req, 'w.state_id', params));

    if (q.status && ['pending', 'approved', 'rejected'].includes(q.status)) { params.push(q.status); conds.push(`w.status = $${params.length}`); }
    if (q.category) { params.push(q.category); conds.push(`w.category = $${params.length}`); }
    if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) { params.push(q.from); conds.push(`w.work_date >= $${params.length}::date`); }
    if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) { params.push(q.to); conds.push(`w.work_date <= $${params.length}::date`); }
    if (q.search) { params.push(`%${q.search}%`); conds.push(`(w.title ILIKE $${params.length} OR w.description ILIKE $${params.length} OR w.user_name ILIKE $${params.length})`); }

    const page = Math.max(1, parseInt(q.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20', 10) || 20));
    const where = conds.join(' AND ');

    const count = await db.query(`SELECT COUNT(*)::int AS total FROM ${W} w WHERE ${where}`, params);
    const { rows } = await db.query(
      `SELECT ${SELECT_COLS} FROM ${W} w WHERE ${where} ORDER BY w.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ items: rows, total: count.rows[0].total, page, limit });
  } catch (err) { fail(res, err); }
};

export const listMine = (req: StateAuthRequest, res: Response) => listEntries(req, res, 'mine');
export const listReview = (req: StateAuthRequest, res: Response) => listEntries(req, res, 'review');

const norm = (v: unknown) => String(v ?? '');

export const updateWork = async (req: StateAuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const entry = await getEntry(id);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    if (entry.user_id !== req.stateUser!.id) return res.status(403).json({ message: 'You can only edit your own entries' });
    if (entry.status === 'approved') return res.status(400).json({ message: 'Approved entries cannot be edited' });

    const parsed = parseEntry({ ...entry, ...req.body });
    if (parsed.error || !parsed.data) return res.status(400).json({ message: parsed.error });
    const d = parsed.data;

    const changes: { field: string; from: string; to: string }[] = [];
    (['title', 'description', 'hours_spent', 'category'] as const).forEach(f => {
      if (norm(entry[f]) !== norm(d[f])) changes.push({ field: f, from: norm(entry[f]), to: norm(d[f]) });
    });
    if (d.work_date && d.work_date !== entry.work_date) changes.push({ field: 'work_date', from: entry.work_date, to: d.work_date });
    if (entry.status === 'rejected') changes.push({ field: 'status', from: 'rejected', to: 'pending' });
    if (!changes.length) return res.json(entry);

    await db.query(
      `UPDATE ${W} SET title=$1, description=$2, hours_spent=$3, category=$4,
         work_date = COALESCE($5::date, work_date), status='pending',
         reviewer_id=NULL, reviewer_name=NULL, review_comment=NULL, reviewed_at=NULL, updated_at=NOW()
       WHERE id=$6`,
      [d.title, d.description, d.hours_spent, d.category, d.work_date, id]
    );
    const info = await getUserInfo(req);
    await db.query(
      `INSERT INTO ${H} (work_id, edited_by, edited_by_name, changes) VALUES ($1,$2,$3,$4::jsonb)`,
      [id, req.stateUser!.id, info.name, JSON.stringify(changes)]
    );
    res.json(await getEntry(id));
  } catch (err) { fail(res, err); }
};

const applyReview = async (req: StateAuthRequest, ids: number[], action: string, comment: string) => {
  const u = req.stateUser!;
  const info = await getUserInfo(req);
  const params: any[] = [action === 'approve' ? 'approved' : 'rejected', comment || null, u.id, info.name, ids];
  const scope = scopeSql(req, 'state_id', params);
  const { rows } = await db.query(
    `UPDATE ${W} SET status=$1, review_comment=$2, reviewer_id=$3, reviewer_name=$4, reviewed_at=NOW(), updated_at=NOW()
     WHERE id = ANY($5::int[]) AND status='pending' AND user_id <> $3 AND ${scope}
     RETURNING id`,
    params
  );
  return rows.length as number;
};

const checkReviewInput = (body: any): { error?: string; action?: string; comment?: string } => {
  const action = String(body?.action ?? '');
  const comment = String(body?.comment ?? '').trim();
  if (!['approve', 'reject'].includes(action)) return { error: "action must be 'approve' or 'reject'" };
  if (action === 'reject' && comment.length < MIN_REJECT_LEN) return { error: `A rejection needs a comment of at least ${MIN_REJECT_LEN} characters` };
  return { action, comment };
};

export const reviewOne = async (req: StateAuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const c = checkReviewInput(req.body);
    if (c.error) return res.status(400).json({ message: c.error });
    const n = await applyReview(req, [id], c.action!, c.comment!);
    if (!n) return res.status(400).json({ message: 'Entry not found, already reviewed, outside your scope, or your own' });
    res.json(await getEntry(id));
  } catch (err) { fail(res, err); }
};

export const bulkReview = async (req: StateAuthRequest, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : [];
    if (!ids.length || ids.length > 200) return res.status(400).json({ message: 'Provide 1 to 200 ids' });
    const c = checkReviewInput(req.body);
    if (c.error) return res.status(400).json({ message: c.error });
    const n = await applyReview(req, ids, c.action!, c.comment!);
    res.json({ updated: n, skipped: ids.length - n });
  } catch (err) { fail(res, err); }
};

export const getHistory = async (req: StateAuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const entry = await getEntry(id);
    if (!entry || !canSeeEntry(req, entry)) return res.status(404).json({ message: 'Not found' });
    const { rows } = await db.query(
      `SELECT id, edited_by, edited_by_name, changes, edited_at FROM ${H} WHERE work_id = $1 ORDER BY edited_at DESC`, [id]
    );
    res.json({ entry, history: rows });
  } catch (err) { fail(res, err); }
};

export const getStats = async (req: StateAuthRequest, res: Response) => {
  try {
    const u = req.stateUser!;
    const params: any[] = [];
    let base: string;
    if (isReviewer(u.role)) base = scopeSql(req, 'w.state_id', params);
    else { params.push(u.id); base = `w.user_id = $1`; }
    const totals = await db.query(
      `SELECT COALESCE(SUM(hours_spent),0)::float8 AS total_hours,
              COUNT(*) FILTER (WHERE status='pending')::int  AS pending,
              COUNT(*) FILTER (WHERE status='approved')::int AS approved,
              COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
              COUNT(DISTINCT user_id)::int AS contributors
       FROM ${W} w WHERE ${base}`, params);
    const byCategory = await db.query(
      `SELECT category, COALESCE(SUM(hours_spent),0)::float8 AS hours, COUNT(*)::int AS entries
       FROM ${W} w WHERE ${base} GROUP BY category ORDER BY hours DESC`, params);
    const t = totals.rows[0];
    const reviewed = t.approved + t.rejected;
    res.json({ ...t, approval_rate: reviewed ? Math.round((t.approved / reviewed) * 1000) / 10 : 0, by_category: byCategory.rows });
  } catch (err) { fail(res, err); }
};
