import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listProjects = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'p.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const search = (req.query.search as string) || '';
    let params = filter.params;
    let query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM state_crm_leads l WHERE l.project_id = p.id) AS lead_count,
        (SELECT COUNT(*) FROM state_crm_tasks t WHERE t.project_id = p.id) AS task_count,
        u.name AS default_owner_name
      FROM state_crm_projects p
      LEFT JOIN state_crm_users u ON p.default_owner_id = u.id
      WHERE ${where}
    `;
    if (search) {
      params = [...params, `%${search}%`];
      query += ` AND p.name ILIKE $${params.length}`;
    }
    query += ` ORDER BY p.created_at DESC`;
    const { rows } = await db.query(query, params);
    res.json({ projects: rows });
  } catch (err) {
    console.error('[StateCRM] listProjects error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProject = async (req: StateAuthRequest, res: Response) => {
  const { name, description, status, state_id } = req.body;
  const requester = req.stateUser!;
  try {
    let finalStateId = state_id;
    if (requester.role !== 'master' && requester.role !== 'admin') {
      if (requester.role === 'coordinator') {
        const allowed = requester.coordinatorStates || [];
        if (!state_id || !allowed.includes(Number(state_id))) {
          return res.status(403).json({ message: 'You can only create projects within your assigned states' });
        }
      } else {
        finalStateId = requester.state_id;
      }
    }
    const safeStateId = finalStateId === '' || finalStateId === undefined ? null : finalStateId;
    const { rows } = await db.query(
      `INSERT INTO state_crm_projects (state_id, name, description, status, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [safeStateId, name, description || null, status || 'ACTIVE', requester.id]
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createProject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProject = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const stateParamIdx = filter.params.length > 0 ? 2 : null;
    const where = stateParamIdx ? filter.where.replace('$STATE_PARAM', `$${stateParamIdx}`) : filter.where;
    const nameIdx = filter.params.length + 2;
    const descIdx = filter.params.length + 3;
    const statusIdx = filter.params.length + 4;
    const params = [id, ...filter.params, name, description, status];
    const { rows } = await db.query(
      `UPDATE state_crm_projects SET
        name = COALESCE($${nameIdx}, name),
        description = COALESCE($${descIdx}, description),
        status = COALESCE($${statusIdx}, status),
        updated_at = NOW()
       WHERE id = $1 AND ${where} RETURNING *`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Project not found or access denied' });
    res.json({ project: rows[0] });
  } catch (err) {
    console.error('[StateCRM] updateProject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProject = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const stateParamIdx = filter.params.length > 0 ? 2 : null;
    const where = stateParamIdx ? filter.where.replace('$STATE_PARAM', `$${stateParamIdx}`) : filter.where;
    const params = [id, ...filter.params];
    const { rowCount } = await db.query(`DELETE FROM state_crm_projects WHERE id = $1 AND ${where}`, params);
    if (rowCount === 0) return res.status(404).json({ message: 'Project not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] deleteProject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOwnerImpact = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { employee_id } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count FROM state_crm_leads WHERE project_id = $1 AND assigned_to IS NOT NULL AND assigned_to != $2`,
      [id, employee_id]
    );
    res.json({ affectedCount: parseInt(rows[0].count) });
  } catch (err) {
    console.error('[StateCRM] getOwnerImpact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const assignOwner = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { employee_id, confirmBulkReassign } = req.body;
  try {
    await db.query(`UPDATE state_crm_projects SET default_owner_id = $1, updated_at = NOW() WHERE id = $2`, [employee_id || null, id]);
    if (confirmBulkReassign) {
      await db.query(`UPDATE state_crm_leads SET assigned_to = $1 WHERE project_id = $2`, [employee_id, id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] assignOwner error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
