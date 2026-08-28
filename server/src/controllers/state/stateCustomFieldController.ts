import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listFields = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    const { rows } = await db.query(
      `SELECT * FROM state_crm_custom_fields WHERE ${where} OR state_id IS NULL ORDER BY created_at DESC`,
      filter.params
    );
    res.json({ fields: rows });
  } catch (error) {
    console.error('[StateCRM] listFields error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createField = async (req: StateAuthRequest, res: Response) => {
  const { field_name, field_type, field_options, is_required } = req.body;
  const requester = req.stateUser!;
  try {
    const result = await db.query(
      `INSERT INTO state_crm_custom_fields (state_id, field_name, field_type, field_options, is_required)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [requester.state_id, field_name, field_type, field_options, is_required || false]
    );
    res.status(201).json({ field: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] createField error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteField = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM state_crm_custom_fields WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[StateCRM] deleteField error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
