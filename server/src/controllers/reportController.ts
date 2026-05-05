import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ─── SINGLE ALL-IN-ONE REPORT ENDPOINT ───────────────────────────────────────
export const getAllReports = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = (col: string, paramStart: number) => {
      const filters: string[] = [];
      const params: any[] = [];
      if (startDate) { filters.push(`${col} >= $${paramStart++}`); params.push(startDate); }
      if (endDate)   { filters.push(`${col} <= $${paramStart++}`); params.push(endDate); }
      return { clause: filters.length ? filters.join(' AND ') : '', params };
    };

    // Build role-based filters
    const leadRoleFilter = role === 'MANAGER'
      ? `(owner_id = ${userId} OR owner_id IN (SELECT id FROM users WHERE reporting_to = ${userId}))`
      : role === 'EMPLOYEE' ? `owner_id = ${userId}` : '';

    const callRoleFilter = role === 'EMPLOYEE' ? `agent_id = ${userId}` : '';

    const teamRoleFilter = role === 'MANAGER' ? `reporting_to = ${userId}` : '';

    // Helper to combine filters
    const where = (...parts: string[]) => {
      const valid = parts.filter(Boolean);
      return valid.length ? 'WHERE ' + valid.join(' AND ') : '';
    };

    // ── 1. STATS (top cards) ──────────────────────────────────────────────────
    const df1 = dateFilter('start_time', 1);
    const callDateClause = df1.clause;
    const callDateParams = df1.params;

    const df2 = dateFilter('created_at', 1);
    const leadDateClause = df2.clause;
    const leadDateParams = df2.params;

    const df3 = dateFilter('timestamp', 1);
    const waMsgDateClause = df3.clause;
    const waMsgDateParams = df3.params;

    const [
      totalLeadsRes,
      connectedCallsRes,
      totalDurationRes,
      waMessagesRes,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM leads ${where(leadRoleFilter, leadDateClause)}`, leadDateParams),
      db.query(`SELECT COUNT(*) as count FROM calls ${where(callRoleFilter, callDateClause, "status = 'CONNECTED'")}`, callDateParams),
      db.query(`SELECT SUM(duration_seconds) as total, COUNT(*) as count FROM calls ${where(callRoleFilter, callDateClause)}`, callDateParams),
      db.query(`SELECT COUNT(*) as count FROM whatsapp_messages ${where(waMsgDateClause)}`, waMsgDateParams),
    ]);

    const stats = {
      totalLeads: parseInt(totalLeadsRes.rows[0].count),
      connectedCalls: parseInt(connectedCallsRes.rows[0].count),
      totalDuration: parseInt(totalDurationRes.rows[0].total || 0),
      avgDuration: parseInt(totalDurationRes.rows[0].count) > 0
        ? Math.round(parseInt(totalDurationRes.rows[0].total || 0) / parseInt(totalDurationRes.rows[0].count))
        : 0,
      whatsappMessages: parseInt(waMessagesRes.rows[0].count),
    };

    // ── 2. CALLS TAB ──────────────────────────────────────────────────────────
    const callSummaryRes = await db.query(`
      SELECT
        TO_CHAR(start_time, 'YYYY-MM-DD') as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
        SUM(CASE WHEN status != 'CONNECTED' THEN 1 ELSE 0 END) as failed,
        SUM(duration_seconds) as duration
      FROM calls
      ${where(callRoleFilter, callDateClause)}
      GROUP BY date ORDER BY date ASC LIMIT 30
    `, callDateParams);

    const callTypeRes = await db.query(`
      SELECT type, COUNT(*) as count FROM calls
      ${where(callRoleFilter, callDateClause)}
      GROUP BY type
    `, callDateParams);

    // ── 3. WHATSAPP TAB ───────────────────────────────────────────────────────
    const waSummaryRes = await db.query(`
      SELECT
        TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
        SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) as inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM whatsapp_messages
      ${where(waMsgDateClause)}
      GROUP BY date ORDER BY date ASC LIMIT 30
    `, waMsgDateParams);

    // ── 4. LEADS TAB ──────────────────────────────────────────────────────────
    const leadStageRes = await db.query(`
      SELECT stage as name, COUNT(*) as value
      FROM leads
      ${where(leadRoleFilter, leadDateClause)}
      GROUP BY stage ORDER BY value DESC
    `, leadDateParams);

    const leadStatusRes = await db.query(`
      SELECT status as name, COUNT(*) as value
      FROM leads
      ${where(leadRoleFilter, leadDateClause)}
      GROUP BY status ORDER BY value DESC
    `, leadDateParams);

    // ── 5. PROJECTS TAB ───────────────────────────────────────────────────────
    const projectStatsRes = await db.query(`
      SELECT p.name, COUNT(l.id) as value
      FROM projects p
      LEFT JOIN leads l ON p.id = l.project_id ${leadRoleFilter ? 'AND (' + leadRoleFilter + ')' : ''}
      GROUP BY p.id, p.name ORDER BY value DESC
    `);

    // ── 6. TEAM TAB ───────────────────────────────────────────────────────────
    let teamPerformance: any[] = [];
    if (role !== 'EMPLOYEE') {
      const teamRes = await db.query(`
        SELECT
          u.id,
          u.name,
          u.role,
          COUNT(c.id) as total_calls,
          SUM(CASE WHEN c.status = 'CONNECTED' THEN 1 ELSE 0 END) as connected_calls,
          SUM(c.duration_seconds) as total_duration,
          COUNT(DISTINCT l.id) as total_leads
        FROM users u
        LEFT JOIN calls c ON u.id = c.agent_id ${callDateClause ? 'AND ' + callDateClause.replace(/\$(\d+)/g, (_, n) => `$${n}`) : ''}
        LEFT JOIN leads l ON u.id = l.owner_id
        ${where(teamRoleFilter)}
        GROUP BY u.id, u.name, u.role
        ORDER BY total_calls DESC
      `, callDateParams);

      teamPerformance = teamRes.rows.map(r => ({
        ...r,
        total_calls: parseInt(r.total_calls),
        connected_calls: parseInt(r.connected_calls || 0),
        total_duration: parseInt(r.total_duration || 0),
        total_leads: parseInt(r.total_leads || 0),
      }));
    }

    // ── RESPOND ───────────────────────────────────────────────────────────────
    res.json({
      stats,
      calls: {
        summary: callSummaryRes.rows.map(r => ({
          ...r,
          total: parseInt(r.total),
          connected: parseInt(r.connected || 0),
          failed: parseInt(r.failed || 0),
          duration: parseInt(r.duration || 0),
        })),
        typeBreakdown: callTypeRes.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      },
      whatsapp: {
        summary: waSummaryRes.rows.map(r => ({
          ...r,
          inbound: parseInt(r.inbound || 0),
          outbound: parseInt(r.outbound || 0),
        })),
      },
      leads: {
        byStage: leadStageRes.rows.map(r => ({ ...r, value: parseInt(r.value) })),
        byStatus: leadStatusRes.rows.map(r => ({ ...r, value: parseInt(r.value) })),
      },
      projects: {
        distribution: projectStatsRes.rows.map(r => ({ ...r, value: parseInt(r.value) })),
      },
      team: {
        performance: teamPerformance,
      },
    });
  } catch (error) {
    console.error('getAllReports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── KEEP OLD ENDPOINTS (for backward compatibility) ─────────────────────────
export const getStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let leadFilter = '';
    let leadParams: any[] = [];
    if (role === 'MANAGER') { leadFilter = 'WHERE owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)'; leadParams = [userId, userId]; }
    else if (role === 'EMPLOYEE') { leadFilter = 'WHERE owner_id = $1'; leadParams = [userId]; }
    const totalLeadsResult = await db.query(`SELECT COUNT(*) as count FROM leads ${leadFilter}`, leadParams);
    let callFilter = ''; let callParams: any[] = [];
    if (role === 'EMPLOYEE') { callFilter = 'WHERE agent_id = $1'; callParams = [userId]; }
    const connectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status = 'CONNECTED'" : "WHERE status = 'CONNECTED'"}`, callParams);
    const totalDurationResult = await db.query(`SELECT SUM(duration_seconds) as total FROM calls ${callFilter}`, callParams);
    const waMessagesResult = await db.query(`SELECT COUNT(*) as count FROM whatsapp_messages`);
    res.json({
      totalLeads: parseInt(totalLeadsResult.rows[0].count),
      connectedCalls: parseInt(connectedCallsResult.rows[0].count),
      totalDuration: parseInt(totalDurationResult.rows[0].total || 0),
      avgDuration: parseInt(connectedCallsResult.rows[0].count) > 0 ? parseInt(totalDurationResult.rows[0].total || 0) / parseInt(connectedCallsResult.rows[0].count) : 0,
      whatsappNotes: parseInt(waMessagesResult.rows[0].count),
    });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = req.user.id; const role = req.user.role;
    let callFilter = ''; let callParams: any[] = [];
    if (role === 'EMPLOYEE') { callFilter = 'WHERE agent_id = $1'; callParams = [userId]; }
    const totalCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter}`, callParams);
    const connectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status = 'CONNECTED'" : "WHERE status = 'CONNECTED'"}`, callParams);
    const notConnectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status != 'CONNECTED'" : "WHERE status != 'CONNECTED'"}`, callParams);
    const callTypeBreakdownResult = await db.query(`SELECT type, COUNT(*) as count FROM calls ${callFilter} GROUP BY type`, callParams);
    const totalDurationResult = await db.query(`SELECT SUM(duration_seconds) as total FROM calls ${callFilter}`, callParams);
    const recentCallsResult = await db.query(`SELECT c.*, l.contact_name as lead_name FROM calls c LEFT JOIN leads l ON c.lead_id = l.id ${callFilter} ORDER BY c.start_time DESC LIMIT 5`, callParams);
    let taskFilter = ''; let taskParams: any[] = [];
    if (role === 'MANAGER') { taskFilter = "WHERE (user_id = $1 OR user_id IN (SELECT id FROM users WHERE reporting_to = $2)) AND status = 'OPEN'"; taskParams = [userId, userId]; }
    else if (role === 'EMPLOYEE') { taskFilter = "WHERE user_id = $1 AND status = 'OPEN'"; taskParams = [userId]; }
    else { taskFilter = "WHERE status = 'OPEN'"; }
    const dailyTasksResult = await db.query(`SELECT COUNT(*) as count FROM tasks ${taskFilter}`, taskParams);
    let leadFilter = ''; let leadParams: any[] = [];
    if (role === 'MANAGER') { leadFilter = 'WHERE owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)'; leadParams = [userId, userId]; }
    else if (role === 'EMPLOYEE') { leadFilter = 'WHERE owner_id = $1'; leadParams = [userId]; }
    const totalContactsResult = await db.query(`SELECT COUNT(*) as count FROM leads ${leadFilter}`, leadParams);
    const messagesTodayResult = await db.query(`SELECT COUNT(*) as count FROM whatsapp_messages WHERE direction = 'outbound' AND DATE(timestamp) = CURRENT_DATE`);
    const unreadCountResult = await db.query(`SELECT COUNT(*) as count FROM whatsapp_messages WHERE direction = 'inbound' AND is_read = false`);
    res.json({
      totalCalls: parseInt(totalCallsResult.rows[0].count),
      connectedCalls: parseInt(connectedCallsResult.rows[0].count),
      notConnectedCalls: parseInt(notConnectedCallsResult.rows[0].count),
      whatsappInteractions: 0,
      callTypeBreakdown: callTypeBreakdownResult.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      totalDuration: parseInt(totalDurationResult.rows[0].total || 0),
      avgDuration: parseInt(totalCallsResult.rows[0].count) > 0 ? parseInt(totalDurationResult.rows[0].total || 0) / parseInt(totalCallsResult.rows[0].count) : 0,
      recentCalls: recentCallsResult.rows,
      dailyTasks: parseInt(dailyTasksResult.rows[0].count),
      totalContacts: parseInt(totalContactsResult.rows[0].count),
      messagesToday: parseInt(messagesTodayResult.rows[0].count),
      unreadWhatsAppCount: parseInt(unreadCountResult.rows[0].count),
    });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

export const getCallSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = req.user.id; const role = req.user.role;
    let callFilter = ''; let callParams: any[] = [];
    if (role === 'EMPLOYEE') { callFilter = 'WHERE agent_id = $1'; callParams = [userId]; }
    const summaryResult = await db.query(`
      SELECT TO_CHAR(start_time, 'YYYY-MM-DD') as date, COUNT(*) as total,
      SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
      SUM(CASE WHEN status != 'CONNECTED' THEN 1 ELSE 0 END) as failed
      FROM calls ${callFilter} GROUP BY date ORDER BY date DESC LIMIT 30
    `, callParams);
    res.json(summaryResult.rows.map(r => ({ ...r, total: parseInt(r.total), connected: parseInt(r.connected || 0), failed: parseInt(r.failed || 0) })));
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getLeadConversion = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = req.user.id; const role = req.user.role;
    let userFilter = ''; let params: any[] = [];
    if (role === 'MANAGER') { userFilter = 'WHERE owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)'; params = [userId, userId]; }
    else if (role === 'EMPLOYEE') { userFilter = 'WHERE owner_id = $1'; params = [userId]; }
    const conversionResult = await db.query(`SELECT stage as name, COUNT(*) as value FROM leads ${userFilter} GROUP BY stage`, params);
    res.json(conversionResult.rows.map(r => ({ ...r, value: parseInt(r.value) })));
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ message: 'Forbidden' });
  try {
    const userId = req.user.id; const role = req.user.role;
    let userFilter = ''; let params: any[] = [];
    if (role === 'MANAGER') { userFilter = 'WHERE reporting_to = $1'; params = [userId]; }
    const performanceResult = await db.query(`
      SELECT u.name, COUNT(c.id) as total_calls,
      SUM(CASE WHEN c.status = 'CONNECTED' THEN 1 ELSE 0 END) as connected_calls,
      SUM(c.duration_seconds) as total_duration
      FROM users u LEFT JOIN calls c ON u.id = c.agent_id ${userFilter} GROUP BY u.id, u.name
    `, params);
    res.json(performanceResult.rows.map(r => ({ ...r, total_calls: parseInt(r.total_calls), connected_calls: parseInt(r.connected_calls || 0), total_duration: parseInt(r.total_duration || 0) })));
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

export const getProjectStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const userId = req.user.id; const role = req.user.role;
    let userFilter = ''; let params: any[] = [];
    if (role === 'MANAGER') { userFilter = 'owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)'; params = [userId, userId]; }
    else if (role === 'EMPLOYEE') { userFilter = 'owner_id = $1'; params = [userId]; }
    const projectStatsResult = await db.query(`
      SELECT p.name, COUNT(l.id) as value FROM projects p
      LEFT JOIN leads l ON p.id = l.project_id ${userFilter ? 'AND (' + userFilter + ')' : ''}
      GROUP BY p.id, p.name
    `, params);
    res.json(projectStatsResult.rows.map(r => ({ ...r, value: parseInt(r.value) })));
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

export const getWhatsAppSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const summaryResult = await db.query(`
      SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM whatsapp_messages GROUP BY date ORDER BY date DESC LIMIT 30
    `);
    res.json(summaryResult.rows.map(r => ({ ...r, inbound: parseInt(r.inbound || 0), outbound: parseInt(r.outbound || 0) })));
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

export const getCustomReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { startDate, endDate, userId, projectId } = req.query;
    let result: any = {};
    const params: any[] = [];
    let paramCount = 0;
    const buildFilters = (userCol: string, dateCol: string) => {
      let filters = []; let currentParams = [];
      if (startDate) { paramCount++; filters.push(`${dateCol} >= $${paramCount}`); currentParams.push(startDate); }
      if (endDate) { paramCount++; filters.push(`${dateCol} <= $${paramCount}`); currentParams.push(endDate); }
      if (userId) { paramCount++; filters.push(`${userCol} = $${paramCount}`); currentParams.push(userId); }
      return { filters: filters.length ? 'WHERE ' + filters.join(' AND ') : '', params: currentParams };
    };
    paramCount = 0;
    const callFilters = buildFilters('agent_id', 'start_time');
    const callSummary = await db.query(`SELECT TO_CHAR(start_time, 'YYYY-MM-DD') as date, COUNT(*) as total, SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected FROM calls ${callFilters.filters} GROUP BY date ORDER BY date ASC`, callFilters.params);
    result.callDistribution = callSummary.rows;
    paramCount = 0;
    const leadFilters = buildFilters('owner_id', 'created_at');
    const leadSummary = await db.query(`SELECT stage as name, COUNT(*) as value FROM leads ${leadFilters.filters} GROUP BY stage`, leadFilters.params);
    result.conversionPipeline = leadSummary.rows;
    if (req.user.role !== 'EMPLOYEE') {
      paramCount = 0;
      const teamFilters = buildFilters('u.id', 'c.start_time');
      const teamPerf = await db.query(`SELECT u.name, COUNT(c.id) as total_calls, SUM(CASE WHEN c.status = 'CONNECTED' THEN 1 ELSE 0 END) as connected_calls, SUM(c.duration_seconds) as total_duration FROM users u LEFT JOIN calls c ON u.id = c.agent_id ${teamFilters.filters} GROUP BY u.id, u.name`, teamFilters.params);
      result.teamPerformance = teamPerf.rows;
    }
    res.json(result);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};