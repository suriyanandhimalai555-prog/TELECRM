import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Real calls table columns: id, lead_id, user_id, duration, notes, status, created_at
// Real leads table columns: id, assigned_to, stage, status, created_at
// Real projects table columns: id, owner_id, status, created_at
// Real users table columns: id, name, role, reporting_to

// ─── Single combined endpoint ─────────────────────────────────────────────────
export const getAllReports = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const userId  = req.user.id;
    const role    = req.user.role;
    const isAdmin   = role === 'ADMIN';
    const isManager = role === 'MANAGER';

    // Date filters — calls and leads both use created_at
    const dateFilter = startDate && endDate
      ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    // Scope filters
    const leadScope = isAdmin ? '' : isManager
      ? `AND (assigned_to = ${userId} OR assigned_to IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND assigned_to = ${userId}`;

    const callScope = isAdmin ? '' : isManager
      ? `AND (user_id = ${userId} OR user_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND user_id = ${userId}`;

    const teamScope = isAdmin ? '' : isManager
      ? `AND u.id IN (SELECT id FROM users WHERE reporting_to = ${userId})`
      : `AND u.id = ${userId}`;

    const projectScope = isAdmin ? '' : `AND owner_id = ${userId}`;

    // ── 1. Stats ──────────────────────────────────────────────────────────────
    const [statsLeads, statsCalls, statsWa] = await Promise.all([
      db.query(`
        SELECT COUNT(*) AS total
        FROM leads
        WHERE 1=1 ${leadScope} ${dateFilter}`),
      db.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
          COALESCE(SUM(duration), 0) AS total_duration,
          COALESCE(AVG(CASE WHEN status = 'connected' THEN duration END), 0) AS avg_duration
        FROM calls
        WHERE 1=1 ${callScope} ${dateFilter}`),
      db.query(`
        SELECT COUNT(*) AS total
        FROM whatsapp_messages
        WHERE 1=1 ${dateFilter}`),
    ]);

    const stats = {
      totalLeads:       parseInt(statsLeads.rows[0]?.total          || '0'),
      connectedCalls:   parseInt(statsCalls.rows[0]?.connected      || '0'),
      totalDuration:    parseInt(statsCalls.rows[0]?.total_duration  || '0'),
      avgDuration:      Math.round(parseFloat(statsCalls.rows[0]?.avg_duration || '0')),
      whatsappMessages: parseInt(statsWa.rows[0]?.total             || '0'),
    };

    // ── 2. Calls summary (daily) ──────────────────────────────────────────────
    const [callSummary, callTypes] = await Promise.all([
      db.query(`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
          SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
        FROM calls
        WHERE 1=1 ${callScope} ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30`),
      db.query(`
        SELECT
          COALESCE(status, 'Unknown') AS type,
          COUNT(*) AS count
        FROM calls
        WHERE 1=1 ${callScope} ${dateFilter}
        GROUP BY status`),
    ]);

    // ── 3. WhatsApp ───────────────────────────────────────────────────────────
    const waSummary = await db.query(`
      SELECT
        COUNT(*) AS total_messages,
        SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) AS inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
      FROM whatsapp_messages
      WHERE 1=1 ${dateFilter}`
    ).catch(() => ({ rows: [{ total_messages: 0, inbound: 0, outbound: 0 }] }));

    // ── 4. Leads ──────────────────────────────────────────────────────────────
    const [byStage, byStatus] = await Promise.all([
      db.query(`
        SELECT COALESCE(stage, 'Unknown') AS stage, COUNT(*) AS count
        FROM leads
        WHERE 1=1 ${leadScope} ${dateFilter}
        GROUP BY stage ORDER BY count DESC`),
      db.query(`
        SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
        FROM leads
        WHERE 1=1 ${leadScope} ${dateFilter}
        GROUP BY status ORDER BY count DESC`),
    ]);

    // ── 5. Projects ───────────────────────────────────────────────────────────
    const projectDist = await db.query(`
      SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
      FROM projects
      WHERE 1=1 ${projectScope} ${dateFilter}
      GROUP BY status ORDER BY count DESC`
    ).catch(() => ({ rows: [] }));

    // ── 6. Team ───────────────────────────────────────────────────────────────
    const teamPerf = await db.query(`
      SELECT
        u.id,
        u.name,
        u.role,
        COUNT(DISTINCT l.id)  AS total_leads,
        COUNT(DISTINCT c.id)  AS total_calls,
        SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.assigned_to = u.id
        ${dateFilter ? `AND DATE(l.created_at) BETWEEN '${startDate}' AND '${endDate}'` : ''}
      LEFT JOIN calls c ON c.user_id = u.id
        ${dateFilter ? `AND DATE(c.created_at) BETWEEN '${startDate}' AND '${endDate}'` : ''}
      WHERE u.role != 'ADMIN' ${teamScope}
      GROUP BY u.id, u.name, u.role
      ORDER BY total_calls DESC`);

    return res.json({
      stats,
      calls:    { summary: callSummary.rows, typeBreakdown: callTypes.rows },
      whatsapp: { summary: waSummary.rows[0] || { total_messages: 0, inbound: 0, outbound: 0 } },
      leads:    { byStage: byStage.rows, byStatus: byStatus.rows },
      projects: { distribution: projectDist.rows },
      team:     { performance: teamPerf.rows },
    });

  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ message: 'Server error', detail: (err as Error).message });
  }
};

// ─── Existing endpoints — all fixed with real column names ────────────────────

export const getStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM leads) AS "totalLeads",
        (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
        (SELECT COALESCE(SUM(duration), 0) FROM calls WHERE status = 'connected') AS "totalDuration",
        (SELECT COALESCE(AVG(duration), 0) FROM calls WHERE status = 'connected') AS "avgDuration",
        (SELECT COUNT(*) FROM whatsapp_messages) AS "whatsappNotes"`);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM leads)    AS "totalLeads",
        (SELECT COUNT(*) FROM calls)    AS "totalCalls",
        (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
        (SELECT COUNT(*) FROM projects) AS "totalProjects"`);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getCallSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
        SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
      FROM calls
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getCallSummary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getLeadConversion = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage ORDER BY count DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getLeadConversion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT status, COUNT(*) AS count FROM projects GROUP BY status`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getProjectStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        u.id, u.name, u.role,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.id) AS total_calls,
        SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.assigned_to = u.id
      LEFT JOIN calls c ON c.user_id     = u.id
      WHERE u.role != 'ADMIN'
      GROUP BY u.id, u.name, u.role
      ORDER BY total_calls DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getTeamPerformance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getWhatsAppSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_messages,
        SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) AS inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
      FROM whatsapp_messages`);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getWhatsAppSummary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const dateFilter = startDate && endDate
      ? `WHERE DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'` : '';
    const result = await db.query(
      `SELECT * FROM leads ${dateFilter} ORDER BY created_at DESC LIMIT 100`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getCustomReport error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};