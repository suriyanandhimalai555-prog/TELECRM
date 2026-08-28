import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listTasks = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 't.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT t.*, s.name AS state_name, l.name AS lead_name
       FROM state_crm_tasks t
       LEFT JOIN state_crm_states s ON t.state_id = s.id
       LEFT JOIN state_crm_leads l ON t.lead_id = l.id
       WHERE ${where}
       ORDER BY t.created_at DESC`,
      filter.params
    );
    res.json({ tasks: rows });
  } catch (err) {
    console.error('[StateCRM] listTasks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTask = async (req: StateAuthRequest, res: Response) => {
  const { title, description, status, due_date, assigned_to, lead_id, state_id } = req.body;
  const requester = req.stateUser!;
  try {
    let finalStateId = state_id;
    if (requester.role !== 'master' && requester.role !== 'admin') {
      if (requester.role === 'coordinator') {
        const allowed = requester.coordinatorStates || [];
        if (!state_id || !allowed.includes(Number(state_id))) {
          return res.status(403).json({ message: 'You can only create tasks within your assigned states' });
        }
      } else {
        finalStateId = requester.state_id;
      }
    }
    const safeStateId = finalStateId === '' || finalStateId === undefined ? null : finalStateId;
    const { rows } = await db.query(
      `INSERT INTO state_crm_tasks (title, description, status, due_date, assigned_to, lead_id, state_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description || null, status || 'pending', due_date || null, assigned_to || null, lead_id || null, safeStateId, requester.id]
    );
    res.status(201).json({ task: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createTask error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTask = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, status, due_date, assigned_to } = req.body;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const { rows } = await db.query(
      `UPDATE state_crm_tasks SET title = COALESCE($3, title), description = COALESCE($4, description),
       status = COALESCE($5, status), due_date = COALESCE($6, due_date), assigned_to = COALESCE($7, assigned_to)
       WHERE id = $1 AND ${where} RETURNING *`,
      [id, ...filter.params, title, description, status, due_date, assigned_to]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Task not found or access denied' });
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('[StateCRM] updateTask error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTask = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const { rows } = await db.query(
      `DELETE FROM state_crm_tasks WHERE id = $1 AND ${where} RETURNING id`,
      [id, ...filter.params]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Task not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] deleteTask error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
