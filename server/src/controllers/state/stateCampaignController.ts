import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listCampaigns = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT * FROM state_crm_campaigns WHERE ${where} ORDER BY created_at DESC`,
      filter.params
    );
    res.json({ campaigns: rows });
  } catch (error) {
    console.error('[StateCRM] listCampaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCampaign = async (req: StateAuthRequest, res: Response) => {
  const { name, type, phone_number, status, state_id } = req.body;
  const requester = req.stateUser!;
  try {
    const result = await db.query(
      `INSERT INTO state_crm_campaigns (name, type, phone_number, status, state_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, type, phone_number, status || 'ACTIVE', state_id || requester.state_id, requester.id]
    );
    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] createCampaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCampaign = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, type, phone_number, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE state_crm_campaigns SET
         name = COALESCE($1, name), type = COALESCE($2, type),
         phone_number = COALESCE($3, phone_number), status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [name, type, phone_number, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] updateCampaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCampaign = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM state_crm_campaigns WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[StateCRM] deleteCampaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
