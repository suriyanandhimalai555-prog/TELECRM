import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const dashboardStats = async (req: StateAuthRequest, res: Response) => {
  try {
    const leadFilter = stateAccessFilter(req, 'state_id');
    const leadWhere = leadFilter.where.replace('$STATE_PARAM', '$1');
    const totalContactsResult = await db.query(
      `SELECT COUNT(*) FROM state_crm_leads WHERE ${leadWhere}`,
      leadFilter.params
    );
    const totalContacts = parseInt(totalContactsResult.rows[0].count, 10);
    const taskFilter = stateAccessFilter(req, 'state_id');
    const taskWhere = taskFilter.where.replace('$STATE_PARAM', '$1');
    const dailyTasksResult = await db.query(
      `SELECT COUNT(*) FROM state_crm_tasks WHERE ${taskWhere} AND status != 'completed'`,
      taskFilter.params
    );
    const dailyTasks = parseInt(dailyTasksResult.rows[0].count, 10);
    res.json({
      totalContacts,
      messagesToday: 0,
      unreadWhatsAppCount: 0,
      totalCalls: 0,
      totalDuration: 0,
      avgDuration: 0,
      dailyTasks,
      recentCalls: [],
      callTypeBreakdown: [],
    });
  } catch (err) {
    console.error('[StateCRM] dashboardStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStats = async (req: StateAuthRequest, res: Response) => {
  try {
    const leadFilter = stateAccessFilter(req, 'state_id');
    const leadWhere = leadFilter.where.replace('$STATE_PARAM', '$1');
    const totalLeadsResult = await db.query(`SELECT COUNT(*) FROM state_crm_leads WHERE ${leadWhere}`, leadFilter.params);

    const callFilter = stateAccessFilter(req, 'state_id');
    const callWhere = callFilter.where.replace('$STATE_PARAM', '$1');
    const callStatsResult = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'CONNECTED') as connected, AVG(duration_seconds) as avg_duration
       FROM state_crm_calls WHERE ${callWhere}`,
      callFilter.params
    );

    res.json({
      totalLeads: parseInt(totalLeadsResult.rows[0].count, 10),
      connectedCalls: parseInt(callStatsResult.rows[0].connected || 0, 10),
      avgDuration: parseFloat(callStatsResult.rows[0].avg_duration || 0),
      whatsappMessages: 0,
    });
  } catch (err) {
    console.error('[StateCRM] getStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCallSummary = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT TO_CHAR(created_at, 'Mon DD') as date,
              COUNT(*) FILTER (WHERE status = 'CONNECTED') as connected,
              COUNT(*) FILTER (WHERE status != 'CONNECTED') as failed
       FROM state_crm_calls WHERE ${where}
       GROUP BY TO_CHAR(created_at, 'Mon DD'), DATE(created_at)
       ORDER BY DATE(created_at) DESC LIMIT 14`,
      filter.params
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('[StateCRM] getCallSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeadConversion = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT status as name, COUNT(*) as value FROM state_crm_leads WHERE ${where} GROUP BY status`,
      filter.params
    );
    res.json(rows.map((r: any) => ({ name: r.name, value: parseInt(r.value, 10) })));
  } catch (err) {
    console.error('[StateCRM] getLeadConversion error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamPerformance = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where
      .replace('$STATE_PARAM', '$1')
      .replace(/\bstate_id\b/g, 'u.state_id');
    const { rows } = await db.query(
      `SELECT u.name,
              COUNT(DISTINCT l.id) as total_leads,
              COUNT(DISTINCT c.id) as total_calls,
              COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'CONNECTED') as connected_calls,
              COALESCE(SUM(c.duration_seconds), 0) as total_duration
       FROM state_crm_users u
       LEFT JOIN state_crm_leads l ON l.assigned_to = u.id
       LEFT JOIN state_crm_calls c ON c.agent_id = u.id
       WHERE ${where}
       GROUP BY u.id, u.name
       ORDER BY total_leads DESC`,
      filter.params
    );
    res.json(rows);
  } catch (err) {
    console.error('[StateCRM] getTeamPerformance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
