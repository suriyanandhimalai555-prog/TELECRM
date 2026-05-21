import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getTasks = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { search } = req.query;

  try {
    let baseQuery = `
      SELECT t.*, u.name as user_name, l.contact_name as lead_name, l.mobile as lead_mobile, p.name as project_name
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      JOIN leads l ON t.lead_id = l.id
      LEFT JOIN projects p ON t.project_id = p.id
    `;
    
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    // ── NEW: company isolation ────────────────────────────────────────────
    if (req.user.role !== 'master_admin') {
      queryParams.push(req.user.company_id);
      whereClauses.push(`t.company_id = $${queryParams.length}`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(`t.company_id = $${queryParams.length}`);
    }

    // Role-based filtering
    if (req.user.role === 'MANAGER') {
      whereClauses.push(`(t.user_id = $${queryParams.length + 1} OR u.reporting_to = $${queryParams.length + 2})`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'employee') {
      whereClauses.push(`(t.user_id = $${queryParams.length + 1} OR t.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $${queryParams.length + 2}))`);
      queryParams.push(req.user.id, req.user.id);
    }

    if (search) {
      const paramIndex = queryParams.length + 1;
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        t.notes ILIKE $${paramIndex} OR 
        l.contact_name ILIKE $${paramIndex} OR 
        l.mobile ILIKE $${paramIndex} OR
        p.name ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex}
      )`);
      queryParams.push(searchPattern);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    baseQuery += ` ORDER BY t.due_date ASC`;

    const tasksResult = await db.query(baseQuery, queryParams);
    res.json(tasksResult.rows);
  } catch (error) {
    console.error('getTasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  const { user_id, lead_id, type, due_date, notes, project_id } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: company_id from token ──────────────────────────────────────────
  const company_id = req.user.role === 'master_admin'
                     ? (req.body.company_id || null)
                     : req.user.company_id;

  try {
    const result = await db.query(`
      INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes, project_id, company_id)
      VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, $7)
      RETURNING id
    `, [user_id || req.user.id, lead_id, type, due_date, notes, project_id || null, company_id]);

    const newTaskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [result.rows[0].id]);
    res.status(201).json(newTaskResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes, type, due_date, user_id, lead_id, project_id } = req.body;

  try {
    await db.query(`
      UPDATE tasks 
      SET status = $1, notes = $2, type = $3, due_date = $4, user_id = $5, lead_id = $6, project_id = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [status, notes, type, due_date, user_id, lead_id, project_id, id]);

    const updatedTaskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    res.json(updatedTaskResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const generateDailyTasks = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: company_id from token ──────────────────────────────────────────
  const company_id = req.user.role === 'master_admin'
                     ? (req.body.company_id || null)
                     : req.user.company_id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // ── NEW: only generate tasks for leads in this company ────────────────
    const leadsQuery = company_id
      ? `SELECT id, owner_id FROM leads WHERE stage NOT IN ('RECENTLY_WON', 'LOST') AND company_id = $1`
      : `SELECT id, owner_id FROM leads WHERE stage NOT IN ('RECENTLY_WON', 'LOST')`;
    const leadsResult = await client.query(leadsQuery, company_id ? [company_id] : []);
    const leads = leadsResult.rows;

    const today = new Date();
    today.setHours(9, 0, 0, 0);

    for (const lead of leads) {
      await client.query(`
        INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes, company_id)
        VALUES ($1, $2, 'FOLLOW_UP', 'OPEN', $3, 'Daily automated follow-up task', $4)
      `, [lead.owner_id, lead.id, today.toISOString(), company_id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Generated ${leads.length} daily tasks` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
