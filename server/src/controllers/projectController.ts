import { Request, Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getProjects = async (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  try {
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    // ── NEW: company isolation ────────────────────────────────────────────
    if (req.user?.role !== 'master_admin') {
      queryParams.push(req.user?.company_id);
      whereClauses.push(`p.company_id = $${queryParams.length}`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(`p.company_id = $${queryParams.length}`);
    }
    // ── NEW: employees only see their assigned projects ──────────────────
    if (req.user?.role === 'EMPLOYEE') {
      queryParams.push(req.user?.id);
      whereClauses.push(`p.id IN (SELECT project_id FROM user_projects WHERE user_id = ${queryParams.length})`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }

    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM leads WHERE project_id = p.id) as lead_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
      FROM projects p
    `;

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ` ORDER BY p.name ASC`;

    const result = await db.query(query, queryParams);
    res.json(result.rows.map(r => ({
      ...r,
      lead_count: parseInt(r.lead_count),
      task_count: parseInt(r.task_count)
    })));
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name, description, status } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: updated role check to include new roles ──────────────────────
  const allowed = ['master_admin', 'company_admin', 'ADMIN', 'MANAGER'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // ── NEW: company_id from token ────────────────────────────────────────
  const company_id = req.user.role === 'master_admin'
                     ? (req.body.company_id || null)
                     : req.user.company_id;

  try {
    const result = await db.query(
      'INSERT INTO projects (name, description, status, company_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, description, status || 'ACTIVE', company_id]
    );
    const newProject = await db.query('SELECT * FROM projects WHERE id = $1', [result.rows[0].id]);
    res.status(201).json(newProject.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: updated role check ───────────────────────────────────────────
  const allowed = ['master_admin', 'company_admin', 'ADMIN', 'MANAGER'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM projects WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await db.query(
      'UPDATE projects SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [name, description, status, id]
    );
    const updatedProject = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    res.json(updatedProject.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectOwnerImpact = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { employee_id } = req.query;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const allowed = ['master_admin', 'company_admin', 'ADMIN', 'MANAGER'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (!employee_id) return res.status(400).json({ message: 'employee_id required' });
  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM projects WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const result = await db.query(
      `SELECT COUNT(*) AS affected_count
       FROM leads
       WHERE project_id = $1 AND (owner_id IS DISTINCT FROM $2)`,
      [id, employee_id]
    );
    res.json({ affectedCount: parseInt(result.rows[0].affected_count, 10) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const assignProjectOwner = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { employee_id, confirmBulkReassign } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const allowed = ['master_admin', 'company_admin', 'ADMIN', 'MANAGER'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (!employee_id) return res.status(400).json({ message: 'employee_id required' });
  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM projects WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    await db.query(
      'UPDATE projects SET default_owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [employee_id, id]
    );
    let reassignedCount = 0;
    if (confirmBulkReassign) {
      const bulk = await db.query(
        `UPDATE leads SET owner_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE project_id = $2 AND (owner_id IS DISTINCT FROM $1)
         RETURNING id`,
        [employee_id, id]
      );
      reassignedCount = bulk.rows.length;
    }
    const updatedProject = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    res.json({ project: updatedProject.rows[0], reassignedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: updated role check ───────────────────────────────────────────
  const allowed = ['master_admin', 'company_admin', 'ADMIN'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM projects WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const leadsInUse = await db.query('SELECT id FROM leads WHERE project_id = $1 LIMIT 1', [id]);
    if (leadsInUse.rows.length > 0) {
      return res.status(400).json({ message: 'Cannot delete project that is currently assigned to leads' });
    }
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
