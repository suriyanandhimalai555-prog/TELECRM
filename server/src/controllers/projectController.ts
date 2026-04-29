import { Request, Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getProjects = async (req: AuthRequest, res: Response) => {
  const { search } = req.query;

  try {
    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM leads WHERE project_id = p.id) as lead_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
      FROM projects p
    `;
    
    let queryParams: any[] = [];
    if (search) {
      query += ` WHERE p.name ILIKE $1 OR p.description ILIKE $1`;
      queryParams.push(`%${search}%`);
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
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const result = await db.query(
      'INSERT INTO projects (name, description, status) VALUES ($1, $2, $3) RETURNING id',
      [name, description, status || 'ACTIVE']
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
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
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

export const deleteProject = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    // Check if project is in use
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
