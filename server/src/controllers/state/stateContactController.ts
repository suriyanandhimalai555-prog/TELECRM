import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listContacts = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'c.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT c.*, s.name AS state_name
       FROM state_crm_customers c
       LEFT JOIN state_crm_states s ON c.state_id = s.id
       WHERE ${where}
       ORDER BY c.created_at DESC`,
      filter.params
    );
    res.json({ contacts: rows });
  } catch (err) {
    console.error('[StateCRM] listContacts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createContact = async (req: StateAuthRequest, res: Response) => {
  const { name, email, phone, state_id, assigned_to, lead_id } = req.body;
  const requester = req.stateUser!;
  try {
    let finalStateId = state_id;
    if (requester.role !== 'master' && requester.role !== 'admin') {
      if (requester.role === 'coordinator') {
        const allowed = requester.coordinatorStates || [];
        if (!state_id || !allowed.includes(Number(state_id))) {
          return res.status(403).json({ message: 'You can only create contacts within your assigned states' });
        }
      } else {
        finalStateId = requester.state_id;
      }
    }
    const safeStateId = finalStateId === '' || finalStateId === undefined ? null : finalStateId;
    const { rows } = await db.query(
      `INSERT INTO state_crm_customers (name, email, phone, state_id, assigned_to, lead_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, phone, safeStateId, assigned_to || null, lead_id || null, requester.id]
    );
    res.status(201).json({ contact: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createContact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateContact = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, assigned_to } = req.body;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const { rows } = await db.query(
      `UPDATE state_crm_customers SET name = COALESCE($3, name), email = COALESCE($4, email),
       phone = COALESCE($5, phone), assigned_to = COALESCE($6, assigned_to)
       WHERE id = $1 AND ${where} RETURNING *`,
      [id, ...filter.params, name, email, phone, assigned_to]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Contact not found or access denied' });
    res.json({ contact: rows[0] });
  } catch (err) {
    console.error('[StateCRM] updateContact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteContact = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$2');
    const { rows } = await db.query(
      `DELETE FROM state_crm_customers WHERE id = $1 AND ${where} RETURNING id`,
      [id, ...filter.params]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Contact not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] deleteContact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
