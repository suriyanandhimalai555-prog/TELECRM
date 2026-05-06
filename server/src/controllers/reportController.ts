import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAllReports = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const userId    = req.user.id;
    const role      = req.user.role;
    const isAdmin   = role === 'ADMIN';
    const isManager = role === 'MANAGER';

    const dateLeads  = startDate && endDate ? `AND DATE(l.created_at) BETWEEN '${startDate}' AND '${endDate}'` : '';
    const dateCalls  = startDate && endDate ? `AND DATE(c.start_time) BETWEEN '${startDate}' AND '${endDate}'` : '';
    const dateWa     = startDate && endDate ? `AND DATE(created_at)   BETWEEN '${startDate}' AND '${endDate}'` : '';
    const dateLeadsP = startDate && endDate ? `AND DATE(created_at)   BETWEEN '${startDate}' AND '${endDate}'` : '';
    const dateCallsP = startDate && endDate ? `AND DATE(start_time)   BETWEEN '${startDate}' AND '${endDate}'` : '';

    // ✅ FIXED: use owner_id instead of assigned_to
    const leadScopeJ  = isAdmin ? '' : isManager
      ? `AND (l.owner_id = ${userId} OR l.owner_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND l.owner_id = ${userId}`;
    const callScopeJ  = isAdmin ? '' : isManager
      ? `AND (c.agent_id = ${userId} OR c.agent_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND c.agent_id = ${userId}`;
    const leadScope   = isAdmin ? '' : isManager
      ? `AND (owner_id = ${userId} OR owner_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND owner_id = ${userId}`;
    const callScope   = isAdmin ? '' : isManager
      ? `AND (agent_id = ${userId} OR agent_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : `AND agent_id = ${userId}`;
    const projectScope = isAdmin ? '' : `AND owner_id = ${userId}`;
    const teamScope    = isAdmin ? '' : isManager
      ? `AND u.id IN (SELECT id FROM users WHERE reporting_to = ${userId})`
      : `AND u.id = ${userId}`;

    const [statsLeads, statsCalls, statsWa] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM leads l WHERE 1=1 ${leadScopeJ} ${dateLeads}`),
      db.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected,
          COALESCE(SUM(c.duration_seconds), 0) AS total_duration,
          COALESCE(AVG(CASE WHEN c.status = 'connected' THEN c.duration_seconds END), 0) AS avg_duration
        FROM calls c WHERE 1=1 ${callScopeJ} ${dateCalls}`),
      db.query(`SELECT COUNT(*) AS total FROM whatsapp_messages WHERE 1=1 ${dateWa}`),
    ]);

    const stats = {
      totalLeads:       parseInt(statsLeads.rows[0]?.total         || '0'),
      connectedCalls:   parseInt(statsCalls.rows[0]?.connected     || '0'),
      totalDuration:    parseInt(statsCalls.rows[0]?.total_duration || '0'),
      avgDuration:      Math.round(parseFloat(statsCalls.rows[0]?.avg_duration || '0')),
      whatsappMessages: parseInt(statsWa.rows[0]?.total            || '0'),
    };

    const [callSummary, callTypes] = await Promise.all([
      db.query(`
        SELECT DATE(start_time) AS date, COUNT(*) AS total,
          SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
          SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
        FROM calls WHERE 1=1 ${callScope} ${dateCallsP}
        GROUP BY DATE(start_time) ORDER BY date DESC LIMIT 30`),
      db.query(`
        SELECT COALESCE(type, 'Unknown') AS type, COUNT(*) AS count
        FROM calls WHERE 1=1 ${callScope} ${dateCallsP} GROUP BY type`),
    ]);

    const waSummary = await db.query(`
      SELECT COUNT(*) AS total_messages,
        SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) AS inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
      FROM whatsapp_messages WHERE 1=1 ${dateWa}`
    ).catch(() => ({ rows: [{ total_messages: 0, inbound: 0, outbound: 0 }] }));

    // ✅ FIXED: use owner_id instead of assigned_to
    const [byStage, bySource] = await Promise.all([
      db.query(`SELECT COALESCE(stage, 'Unknown') AS stage, COUNT(*) AS count FROM leads WHERE 1=1 ${leadScope} ${dateLeadsP} GROUP BY stage ORDER BY count DESC`),
      db.query(`SELECT COALESCE(source, 'Unknown') AS source, COUNT(*) AS count FROM leads WHERE 1=1 ${leadScope} ${dateLeadsP} GROUP BY source ORDER BY count DESC`),
    ]);

    const dateProjP = startDate && endDate ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'` : '';
    const projectDist = await db.query(`
      SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) AS count
      FROM projects WHERE 1=1 ${projectScope} ${dateProjP} GROUP BY status ORDER BY count DESC`
    ).catch(() => ({ rows: [] }));

    const tl = startDate && endDate ? `AND DATE(l.created_at) BETWEEN '${startDate}' AND '${endDate}'` : '';
    const tc = startDate && endDate ? `AND DATE(c.start_time) BETWEEN '${startDate}' AND '${endDate}'` : '';

    // ✅ FIXED: use owner_id instead of assigned_to
    const teamPerf = await db.query(`
      SELECT u.id, u.name, u.role,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.id) AS total_calls,
        SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration_seconds), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.owner_id  = u.id ${tl}
      LEFT JOIN calls c ON c.agent_id  = u.id ${tc}
      WHERE u.role != 'ADMIN' ${teamScope}
      GROUP BY u.id, u.name, u.role ORDER BY total_calls DESC`);

    return res.json({
      stats,
      calls:    { summary: callSummary.rows, typeBreakdown: callTypes.rows },
      whatsapp: { summary: waSummary.rows[0] || { total_messages: 0, inbound: 0, outbound: 0 } },
      leads:    { byStage: byStage.rows, bySource: bySource.rows },
      projects: { distribution: projectDist.rows },
      team:     { performance: teamPerf.rows },
    });

  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ message: 'Server error', detail: (err as Error).message });
  }
};

export const getStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM leads) AS "totalLeads",
        (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM calls WHERE status = 'connected') AS "totalDuration",
        (SELECT COALESCE(AVG(duration_seconds), 0) FROM calls WHERE status = 'connected') AS "avgDuration",
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
    const today = new Date().toISOString().split('T')[0];

    const [mainStats, recentCallsRes, callTypeRes, tasksRes, unreadWaRes, msgTodayRes] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM leads)    AS "totalContacts",
          (SELECT COUNT(*) FROM calls)    AS "totalCalls",
          (SELECT COUNT(*) FROM calls WHERE status = 'connected') AS "connectedCalls",
          (SELECT COALESCE(SUM(duration_seconds), 0) FROM calls) AS "totalDuration",
          (SELECT COALESCE(AVG(duration_seconds), 0) FROM calls WHERE status = 'connected') AS "avgDuration",
          (SELECT COUNT(*) FROM projects) AS "totalProjects"
      `),
      db.query(`
        SELECT c.id, c.caller, c.type, c.status, c.duration_seconds,
          c.start_time, c.agent_id, u.name AS agent_name, l.contact_name AS lead_name
        FROM calls c
        LEFT JOIN users u ON u.id = c.agent_id
        LEFT JOIN leads l ON l.id = c.lead_id
        ORDER BY c.start_time DESC LIMIT 10
      `),
      db.query(`SELECT COALESCE(type, 'Unknown') AS type, COUNT(*) AS count FROM calls GROUP BY type ORDER BY count DESC`),
      db.query(`SELECT COUNT(*) AS count FROM tasks WHERE status != 'COMPLETED'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`SELECT COUNT(*) AS count FROM whatsapp_messages WHERE direction = 'inbound' AND is_read = false`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`SELECT COUNT(*) AS count FROM whatsapp_messages WHERE direction = 'outbound' AND DATE(created_at) = '${today}'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const row = mainStats.rows[0];
    return res.json({
      totalContacts:       parseInt(row?.totalContacts  || '0'),
      totalCalls:          parseInt(row?.totalCalls     || '0'),
      connectedCalls:      parseInt(row?.connectedCalls || '0'),
      totalDuration:       parseInt(row?.totalDuration  || '0'),
      avgDuration:         Math.round(parseFloat(row?.avgDuration || '0')),
      totalProjects:       parseInt(row?.totalProjects  || '0'),
      messagesToday:       parseInt(msgTodayRes.rows[0]?.count || '0'),
      unreadWhatsAppCount: parseInt(unreadWaRes.rows[0]?.count || '0'),
      dailyTasks:          parseInt(tasksRes.rows[0]?.count   || '0'),
      recentCalls:         recentCallsRes.rows || [],
      callTypeBreakdown:   callTypeRes.rows || [],
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ message: 'Server error', detail: (err as Error).message });
  }
};

export const getCallSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT DATE(start_time) AS date, COUNT(*) AS total,
        SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected,
        SUM(CASE WHEN status != 'connected' THEN 1 ELSE 0 END) AS failed
      FROM calls GROUP BY DATE(start_time) ORDER BY date DESC LIMIT 30`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getCallSummary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getLeadConversion = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`SELECT stage AS name, COUNT(*) AS value FROM leads GROUP BY stage ORDER BY value DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getLeadConversion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`SELECT status AS name, COUNT(*) AS value FROM projects GROUP BY status`);
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
      SELECT u.id, u.name, u.role,
        COUNT(DISTINCT l.id) AS total_leads,
        COUNT(DISTINCT c.id) AS total_calls,
        SUM(CASE WHEN c.status = 'connected' THEN 1 ELSE 0 END) AS connected_calls,
        COALESCE(SUM(c.duration_seconds), 0) AS total_duration
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id
      LEFT JOIN calls c ON c.agent_id = u.id
      WHERE u.role != 'ADMIN'
      GROUP BY u.id, u.name, u.role ORDER BY total_calls DESC`);
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
      SELECT DATE(created_at) AS date,
        SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) AS inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
      FROM whatsapp_messages
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`);
    return res.json(result.rows);
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
    const result = await db.query(`SELECT * FROM leads ${dateFilter} ORDER BY created_at DESC LIMIT 100`);
    return res.json(result.rows);
  } catch (err) {
    console.error('getCustomReport error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
