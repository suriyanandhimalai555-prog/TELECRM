import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Leads: Managers see their own + team's, Employees see only their own
    let leadFilter = '';
    let leadParams: any[] = [];
    if (role === 'MANAGER') {
      leadFilter = 'WHERE owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)';
      leadParams = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      leadFilter = 'WHERE owner_id = $1';
      leadParams = [userId];
    }

    const totalLeadsResult = await db.query(`SELECT COUNT(*) as count FROM leads ${leadFilter}`, leadParams);
    const totalLeads = totalLeadsResult.rows[0];
    
    // Call stats: Managers see all calls, Employees see only their own
    let callFilter = '';
    let callParams: any[] = [];
    if (role === 'EMPLOYEE') {
      callFilter = 'WHERE agent_id = $1';
      callParams = [userId];
    }
    const connectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status = 'CONNECTED'" : "WHERE status = 'CONNECTED'"} `, callParams);
    const connectedCalls = connectedCallsResult.rows[0];

    const totalDurationResult = await db.query(`SELECT SUM(duration_seconds) as total FROM calls ${callFilter}`, callParams);
    const totalDuration = totalDurationResult.rows[0];
    
    // WhatsApp notes: Managers see their own + team's, Employees see only their own
    let noteFilter = '';
    let noteParams: any[] = [];
    if (role === 'MANAGER') {
      noteFilter = 'WHERE user_id = $1 OR user_id IN (SELECT id FROM users WHERE reporting_to = $2)';
      noteParams = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      noteFilter = 'WHERE user_id = $1';
      noteParams = [userId];
    }
    const whatsappNotesResult = await db.query(`SELECT COUNT(*) as count FROM notes ${noteFilter ? noteFilter + " AND type = 'WHATSAPP'" : "WHERE type = 'WHATSAPP'"} `, noteParams);
    const whatsappNotes = whatsappNotesResult.rows[0];

    const waMessagesResult = await db.query(`SELECT COUNT(*) as count FROM whatsapp_messages`);
    const waMessages = waMessagesResult.rows[0];

    res.json({
      totalLeads: parseInt(totalLeads.count),
      connectedCalls: parseInt(connectedCalls.count),
      totalDuration: parseInt(totalDuration.total || 0),
      avgDuration: parseInt(connectedCalls.count) > 0 ? parseInt(totalDuration.total || 0) / parseInt(connectedCalls.count) : 0,
      whatsappNotes: parseInt(whatsappNotes.count) + parseInt(waMessages.count)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Call filter: Managers see all calls, Employees see only their own
    let callFilter = '';
    let callParams: any[] = [];
    if (role === 'EMPLOYEE') {
      callFilter = 'WHERE agent_id = $1';
      callParams = [userId];
    }

    const totalCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter}`, callParams);
    const connectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status = 'CONNECTED'" : "WHERE status = 'CONNECTED'"} `, callParams);
    const notConnectedCallsResult = await db.query(`SELECT COUNT(*) as count FROM calls ${callFilter ? callFilter + " AND status != 'CONNECTED'" : "WHERE status != 'CONNECTED'"} `, callParams);
    
    // WhatsApp interactions (from notes): Managers see their own + team's, Employees see only their own
    let noteFilter = '';
    let noteParams: any[] = [];
    if (role === 'MANAGER') {
      noteFilter = 'WHERE user_id = $1 OR user_id IN (SELECT id FROM users WHERE reporting_to = $2)';
      noteParams = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      noteFilter = 'WHERE user_id = $1';
      noteParams = [userId];
    }
    const whatsappInteractionsResult = await db.query(`SELECT COUNT(*) as count FROM notes ${noteFilter ? noteFilter + " AND type = 'WHATSAPP'" : "WHERE type = 'WHATSAPP'"} `, noteParams);

    const callTypeBreakdownResult = await db.query(`SELECT type, COUNT(*) as count FROM calls ${callFilter} GROUP BY type`, callParams);
    const totalDurationResult = await db.query(`SELECT SUM(duration_seconds) as total FROM calls ${callFilter}`, callParams);
    
    const recentCallsResult = await db.query(`
      SELECT c.*, l.contact_name as lead_name 
      FROM calls c 
      LEFT JOIN leads l ON c.lead_id = l.id 
      ${callFilter} 
      ORDER BY c.start_time DESC LIMIT 5
    `, callParams);

    // Tasks: Managers see their own + team's, Employees see only their own
    let taskFilter = '';
    let taskParams: any[] = [];
    if (role === 'MANAGER') {
      taskFilter = "WHERE (user_id = $1 OR user_id IN (SELECT id FROM users WHERE reporting_to = $2)) AND status = 'OPEN'";
      taskParams = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      taskFilter = "WHERE user_id = $1 AND status = 'OPEN'";
      taskParams = [userId];
    } else {
      taskFilter = "WHERE status = 'OPEN'";
    }

    const dailyTasksResult = await db.query(`SELECT COUNT(*) as count FROM tasks ${taskFilter}`, taskParams);

    res.json({
      totalCalls: parseInt(totalCallsResult.rows[0].count),
      connectedCalls: parseInt(connectedCallsResult.rows[0].count),
      notConnectedCalls: parseInt(notConnectedCallsResult.rows[0].count),
      whatsappInteractions: parseInt(whatsappInteractionsResult.rows[0].count),
      callTypeBreakdown: callTypeBreakdownResult.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      totalDuration: parseInt(totalDurationResult.rows[0].total || 0),
      avgDuration: parseInt(totalCallsResult.rows[0].count) > 0 ? parseInt(totalDurationResult.rows[0].total || 0) / parseInt(totalCallsResult.rows[0].count) : 0,
      recentCalls: recentCallsResult.rows,
      dailyTasks: parseInt(dailyTasksResult.rows[0].count)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCallSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;
    let callFilter = '';
    let callParams: any[] = [];

    if (role === 'EMPLOYEE') {
      callFilter = 'WHERE agent_id = $1';
      callParams = [userId];
    }

    const isPostgres = !!process.env.DATABASE_URL;
    const dateFunc = isPostgres 
      ? "TO_CHAR(start_time, 'YYYY-MM-DD')" 
      : "STRFTIME('%Y-%m-%d', start_time)";

    const summaryResult = await db.query(`
      SELECT 
        ${dateFunc} as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END) as connected,
        SUM(CASE WHEN status != 'CONNECTED' THEN 1 ELSE 0 END) as failed
      FROM calls
      ${callFilter}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `, callParams);

    res.json(summaryResult.rows.map(r => ({
      ...r,
      total: parseInt(r.total),
      connected: parseInt(r.connected || 0),
      failed: parseInt(r.failed || 0)
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeadConversion = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;
    let userFilter = '';
    let params: any[] = [];

    if (role === 'MANAGER') {
      userFilter = 'WHERE owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)';
      params = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      userFilter = 'WHERE owner_id = $1';
      params = [userId];
    }

    const conversionResult = await db.query(`
      SELECT stage as name, COUNT(*) as value
      FROM leads
      ${userFilter}
      GROUP BY stage
    `, params);

    res.json(conversionResult.rows.map(r => ({ ...r, value: parseInt(r.value) })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ message: 'Forbidden' });

  try {
    const userId = req.user.id;
    const role = req.user.role;
    let userFilter = '';
    let params: any[] = [];

    if (role === 'MANAGER') {
      userFilter = 'WHERE reporting_to = $1';
      params = [userId];
    }

    const performanceResult = await db.query(`
      SELECT 
        u.name,
        COUNT(c.id) as total_calls,
        SUM(CASE WHEN c.status = 'CONNECTED' THEN 1 ELSE 0 END) as connected_calls,
        SUM(c.duration_seconds) as total_duration
      FROM users u
      LEFT JOIN calls c ON u.id = c.agent_id
      ${userFilter}
      GROUP BY u.id, u.name
    `, params);

    res.json(performanceResult.rows.map(r => ({
      ...r,
      total_calls: parseInt(r.total_calls),
      connected_calls: parseInt(r.connected_calls || 0),
      total_duration: parseInt(r.total_duration || 0)
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const role = req.user.role;
    let userFilter = '';
    let params: any[] = [];

    if (role === 'MANAGER') {
      userFilter = 'owner_id = $1 OR owner_id IN (SELECT id FROM users WHERE reporting_to = $2)';
      params = [userId, userId];
    } else if (role === 'EMPLOYEE') {
      userFilter = 'owner_id = $1';
      params = [userId];
    }

    const query = `
      SELECT p.name, COUNT(l.id) as value
      FROM projects p
      LEFT JOIN leads l ON p.id = l.project_id ${userFilter ? 'AND (' + userFilter + ')' : ''}
      GROUP BY p.id, p.name
    `;

    const projectStatsResult = await db.query(query, params);

    res.json(projectStatsResult.rows.map(r => ({ ...r, value: parseInt(r.value) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWhatsAppSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const isPostgres = !!process.env.DATABASE_URL;
    const dateFunc = isPostgres 
      ? "TO_CHAR(timestamp, 'YYYY-MM-DD')" 
      : "STRFTIME('%Y-%m-%d', timestamp)";

    const summaryResult = await db.query(`
      SELECT 
        ${dateFunc} as date,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM whatsapp_messages
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json(summaryResult.rows.map(r => ({
      ...r,
      inbound: parseInt(r.inbound || 0),
      outbound: parseInt(r.outbound || 0)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
