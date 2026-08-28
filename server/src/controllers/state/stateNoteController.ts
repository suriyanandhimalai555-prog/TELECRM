import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listNotes = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'n.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const search = (req.query.search as string) || '';
    let params = filter.params;
    let query = `
      SELECT n.*, u.name AS user_name, l.name AS lead_name
      FROM state_crm_notes n
      LEFT JOIN state_crm_users u ON n.user_id = u.id
      LEFT JOIN state_crm_leads l ON n.lead_id = l.id
      WHERE ${where}
    `;
    if (search) {
      params = [...params, `%${search}%`];
      query += ` AND n.content ILIKE $${params.length}`;
    }
    query += ` ORDER BY n.created_at DESC`;
    const { rows } = await db.query(query, params);
    res.json({ notes: rows });
  } catch (err) {
    console.error('[StateCRM] listNotes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNote = async (req: StateAuthRequest, res: Response) => {
  const { content, lead_id, type } = req.body;
  const requester = req.stateUser!;
  try {
    let stateId: number | null = requester.state_id;
    if (lead_id) {
      const leadRes = await db.query('SELECT state_id FROM state_crm_leads WHERE id = $1', [lead_id]);
      if (leadRes.rows.length > 0) stateId = leadRes.rows[0].state_id;
    } else if (requester.role === 'master' || requester.role === 'admin' || requester.role === 'coordinator') {
      stateId = req.body.state_id || null;
    }
    const { rows } = await db.query(
      `INSERT INTO state_crm_notes (state_id, lead_id, content, type, user_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [stateId, lead_id || null, content, type || 'FOLLOW_UP', requester.id]
    );
    res.status(201).json({ note: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createNote error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNote = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const requester = req.stateUser!;
  try {
    const noteRes = await db.query('SELECT user_id FROM state_crm_notes WHERE id = $1', [id]);
    if (noteRes.rows.length === 0) return res.status(404).json({ message: 'Note not found' });
    const canManage = requester.role === 'master' || requester.role === 'admin' || requester.role === 'coordinator' || noteRes.rows[0].user_id === requester.id;
    if (!canManage) return res.status(403).json({ message: 'Forbidden' });
    await db.query('DELETE FROM state_crm_notes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[StateCRM] deleteNote error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
