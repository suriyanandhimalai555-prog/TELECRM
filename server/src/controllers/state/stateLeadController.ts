import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listLeads = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'l.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const params = filter.params;
    const { rows } = await db.query(
      `SELECT l.*, s.name AS state_name
       FROM state_crm_leads l
       LEFT JOIN state_crm_states s ON l.state_id = s.id
       WHERE ${where}
       ORDER BY l.created_at DESC`,
      params
    );
    res.json({ leads: rows });
  } catch (err) {
    console.error('[StateCRM] listLeads error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLead = async (req: StateAuthRequest, res: Response) => {
  const { name, email, phone, state_id, assigned_to } = req.body;
  const requester = req.stateUser!;
  try {
    // Non-master/admin users can only create leads within their own accessible state(s)
    let finalStateId = state_id;
    if (requester.role !== 'master' && requester.role !== 'admin') {
      if (requester.role === 'coordinator') {
        const allowed = requester.coordinatorStates || [];
        if (!state_id || !allowed.includes(Number(state_id))) {
          return res.status(403).json({ message: 'You can only create leads within your assigned states' });
        }
      } else {
        finalStateId = requester.state_id;
      }
    }
    const safeStateId = finalStateId === '' || finalStateId === undefined ? null : finalStateId;
    const { rows } = await db.query(
      `INSERT INTO state_crm_leads (name, email, phone, state_id, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, phone, safeStateId, assigned_to || null, requester.id]
    );
    res.status(201).json({ lead: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createLead error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLead = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, status, assigned_to } = req.body;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const params = [id, ...filter.params];
    const { rows } = await db.query(
      `UPDATE state_crm_leads SET name = COALESCE($3, name), email = COALESCE($4, email),
       phone = COALESCE($5, phone), status = COALESCE($6, status), assigned_to = COALESCE($7, assigned_to),
       updated_at = NOW()
       WHERE id = $1 AND ${where} RETURNING *`,
      [id, ...filter.params, name, email, phone, status, assigned_to]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Lead not found or access denied' });
    res.json({ lead: rows[0] });
  } catch (err) {
    console.error('[StateCRM] updateLead error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteLead = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const { rows } = await db.query(
      `DELETE FROM state_crm_leads WHERE id = $1 AND ${where} RETURNING id`,
      [id, ...filter.params]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Lead not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] deleteLead error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
