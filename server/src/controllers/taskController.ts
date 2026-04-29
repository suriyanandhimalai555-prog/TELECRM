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
    
    let whereClauses = [];
    let queryParams: any[] = [];

    // Role-based filtering
    if (req.user.role === 'MANAGER') {
      whereClauses.push(`(t.user_id = $1 OR u.reporting_to = $2)`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      whereClauses.push(`(t.user_id = $1 OR t.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $2))`);
      queryParams.push(req.user.id, req.user.id);
    }

    // Search filtering
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

  try {
    const result = await db.query(`
      INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes, project_id)
      VALUES ($1, $2, $3, 'OPEN', $4, $5, $6)
      RETURNING id
    `, [user_id || req.user.id, lead_id, type, due_date, notes, project_id || null]);

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

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Get all active leads that need follow-up
    const leadsResult = await client.query(`
      SELECT id, owner_id FROM leads 
      WHERE stage NOT IN ('RECENTLY_WON', 'LOST')
    `);
    const leads = leadsResult.rows;

    const today = new Date();
    today.setHours(9, 0, 0, 0); // Set to 9 AM today

    for (const lead of leads) {
      await client.query(`
        INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes)
        VALUES ($1, $2, 'FOLLOW_UP', 'OPEN', $3, 'Daily automated follow-up task')
      `, [lead.owner_id, lead.id, today.toISOString()]);
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
