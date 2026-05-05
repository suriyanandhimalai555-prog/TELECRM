import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildDateFilter(
  startDate: string | undefined,
  endDate: string | undefined,
  column: string
): { clause: string; params: string[] } {
  if (startDate && endDate) {
    return {
      clause: `AND DATE(${column}) BETWEEN $STARTDATE AND $ENDDATE`,
      params: [startDate, endDate],
    };
  }
  return { clause: '', params: [] };
}

// ─── Single combined endpoint ─────────────────────────────────────────────────
export const getAllReports = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const userId = req.user.id;
    const role = req.user.role;

    // Role-based WHERE clauses
    const isAdmin = role === 'ADMIN';
    const isManager = role === 'MANAGER';

    // ── 1. Stats cards ────────────────────────────────────────────────────────
    let statsLeadWhere = isAdmin ? '' : isManager
      ? `AND (l.assigned_to = ${userId} OR l.assigned_to IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND l.assigned_to = ${userId}`;

    let statsCallWhere = isAdmin ? '' : isManager
      ? `AND (c.user_id = ${userId} OR c.user_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND c.user_id = ${userId}`;

    const statsDateLeads = startDate && endDate
      ? `AND DATE(l.created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';
    const statsDateCalls = startDate && endDate
      ? `AND DATE(c.start_time) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const [statsLeads, statsCalls, statsWhatsapp] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total FROM leads l WHERE 1=1 ${statsLeadWhere} ${statsDateLeads}`
      ),
      db.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected,
           COALESCE(SUM(c.duration), 0) AS total_duration,
           COALESCE(AVG(CASE WHEN c.status = 'connected' THEN c.duration END), 0) AS avg_duration
         FROM calls c WHERE 1=1 ${statsCallWhere} ${statsDateCalls}`
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM whatsapp_messages wm WHERE 1=1 ${statsDateCalls.replace('c.start_time', 'wm.created_at')}`
      ),
    ]);

    const stats = {
      totalLeads: parseInt(statsLeads.rows[0]?.total || '0'),
      connectedCalls: parseInt(statsCalls.rows[0]?.connected || '0'),
      totalDuration: parseInt(statsCalls.rows[0]?.total_duration || '0'),
      avgDuration: Math.round(parseFloat(statsCalls.rows[0]?.avg_duration || '0')),
      whatsappMessages: parseInt(statsWhatsapp.rows[0]?.total || '0'),
    };

    // ── 2. Calls summary (daily) ──────────────────────────────────────────────
    let callWhere = isAdmin ? '' : isManager
      ? `AND (user_id = ${userId} OR user_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND user_id = ${userId}`;
    const callDateFilter = startDate && endDate
      ? `AND DATE(start_time) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const [callSummary, callTypes] = await Promise.all([
      db.query(
        `SELECT
           DATE(start_time) AS date,
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
           SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
         FROM calls
         WHERE 1=1 ${callWhere} ${callDateFilter}
         GROUP BY DATE(start_time)
         ORDER BY date DESC
         LIMIT 30`
      ),
      db.query(
        `SELECT
           COALESCE(call_type, 'Unknown') AS type,
           COUNT(*) AS count
         FROM calls
         WHERE 1=1 ${callWhere} ${callDateFilter}
         GROUP BY call_type`
      ),
    ]);

    // ── 3. WhatsApp summary ───────────────────────────────────────────────────
    const waDateFilter = startDate && endDate
      ? `AND DATE(wm.created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const waSummary = await db.query(
      `SELECT
         COUNT(*) AS total_messages,
         SUM(CASE WHEN wm.direction = 'inbound' THEN 1 ELSE 0 END) AS inbound,
         SUM(CASE WHEN wm.direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
       FROM whatsapp_messages wm
       WHERE 1=1 ${waDateFilter}`
    );

    // ── 4. Leads by stage & status ────────────────────────────────────────────
    let leadWhere = isAdmin ? '' : isManager
      ? `AND (assigned_to = ${userId} OR assigned_to IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND assigned_to = ${userId}`;
    const leadDateFilter = startDate && endDate
      ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const [leadsByStage, leadsByStatus] = await Promise.all([
      db.query(
        `SELECT COALESCE(stage, 'Unknown') AS stage, COUNT(*) AS count
         FROM leads WHERE 1=1 ${leadWhere} ${leadDateFilter}
         GROUP BY stage ORDER BY count DESC`
      ),
      db.query(
        `SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
         FROM leads WHERE 1=1 ${leadWhere} ${leadDateFilter}
         GROUP BY status ORDER BY count DESC`
      ),
    ]);

    // ── 5. Projects distribution ──────────────────────────────────────────────
    let projectWhere = isAdmin ? '' : `AND owner_id = ${userId}`;
    const projectDateFilter = startDate && endDate
      ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const projectDist = await db.query(
      `SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
       FROM projects WHERE 1=1 ${projectWhere} ${projectDateFilter}
       GROUP BY status ORDER BY count DESC`
    ).catch(() => ({ rows: [] })); // graceful if table doesn't exist

    // ── 6. Team performance ───────────────────────────────────────────────────
    let teamWhere = isAdmin
      ? ''
      : isManager
      ? `AND u.id IN (SELECT id FROM users WHERE reporting_to = ${userId})`
      : `AND u.id = ${userId}`;

    const teamPerf = await db.query(
      `SELECT
         u.id,
         u.name,
         u.role,
         COUNT(DISTINCT l.id) AS total_leads,
         COUNT(DISTINCT c.id) AS total_calls,
         SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
         COALESCE(SUM(c.duration), 0) AS total_duration
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
         ${startDate && endDate ? `AND DATE(l.created_at) BETWEEN '${startDate}' AND '${endDate}'` : ''}
       LEFT JOIN calls c ON c.user_id = u.id
         ${startDate && endDate ? `AND DATE(c.start_time) BETWEEN '${startDate}' AND '${endDate}'` : ''}
       WHERE u.role != 'ADMIN' ${teamWhere}
       GROUP BY u.id, u.name, u.role
       ORDER BY total_calls DESC`
    );

    // ── Response ──────────────────────────────────────────────────────────────
    return res.json({
      stats,
      calls: {
        summary: callSummary.rows,
        typeBreakdown: callTypes.rows,
      },
      whatsapp: {
        summary: waSummary.rows[0] || { total_messages: 0, inbound: 0, outbound: 0 },
      },
      leads: {
        byStage: leadsByStage.rows,
        byStatus: leadsByStatus.rows,
      },
      projects: {
        distribution: projectDist.rows,
      },
      team: {
        performance: teamPerf.rows,
      },
    });
  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ message: 'Server error', detail: (err as Error).message });
  }
};

// ─── Keep all existing endpoints unchanged ────────────────────────────────────

export const getStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM leads) AS "totalLeads",
         (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
         (SELECT COALESCE(SUM(duration), 0) FROM calls WHERE status = 'connected') AS "totalDuration",
         (SELECT COALESCE(AVG(duration), 0) FROM calls WHERE status = 'connected') AS "avgDuration",
         (SELECT COUNT(*) FROM whatsapp_messages) AS "whatsappNotes"`
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM leads) AS "totalLeads",
         (SELECT COUNT(*) FROM calls) AS "totalCalls",
         (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
         (SELECT COUNT(*) FROM projects) AS "totalProjects"`
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getCallSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT
         DATE(start_time) AS date,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
         SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
       FROM calls
       GROUP BY DATE(start_time)
       ORDER BY date DESC
       LIMIT 30`
    );
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
      `SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage ORDER BY count DESC`
    );
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
      `SELECT status, COUNT(*) AS count FROM projects GROUP BY status`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getProjectStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT
         u.id, u.name, u.role,
         COUNT(DISTINCT l.id) AS total_leads,
         COUNT(DISTINCT c.id) AS total_calls,
         SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
       LEFT JOIN calls c ON c.user_id = u.id
       WHERE u.role != 'ADMIN'
       GROUP BY u.id, u.name, u.role
       ORDER BY total_calls DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getTeamPerformance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getWhatsAppSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) AS total_messages,
         SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) AS inbound,
         SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
       FROM whatsapp_messages`
    );
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
      ? `WHERE DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
      : '';
    const result = await db.query(`SELECT * FROM leads ${dateFilter} ORDER BY created_at DESC LIMIT 100`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getCustomReport error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};