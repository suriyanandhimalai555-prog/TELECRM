import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

export async function listDistricts(req: StateAuthRequest, res: Response) {
  const { state_id } = req.query;
  if (!state_id) return res.status(400).json({ message: 'state_id query param is required' });
  try {
    const { rows } = await db.query(
      'SELECT id, state_id, name FROM state_crm_districts WHERE state_id = $1 ORDER BY name',
      [state_id]
    );
    res.json({ districts: rows });
  } catch (err) {
    console.error('listDistricts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function listTaluks(req: StateAuthRequest, res: Response) {
  const { district_id } = req.query;
  if (!district_id) return res.status(400).json({ message: 'district_id query param is required' });
  try {
    const { rows } = await db.query(
      'SELECT id, district_id, name FROM state_crm_taluks WHERE district_id = $1 ORDER BY name',
      [district_id]
    );
    res.json({ taluks: rows });
  } catch (err) {
    console.error('listTaluks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function createTaluk(req: StateAuthRequest, res: Response) {
  const { district_id, name } = req.body;
  if (!district_id || !name) return res.status(400).json({ message: 'district_id and name are required' });
  try {
    const result = await db.query(
      `INSERT INTO state_crm_taluks (district_id, name) VALUES ($1, $2)
       ON CONFLICT (district_id, name) DO NOTHING
       RETURNING id, district_id, name`,
      [district_id, name.trim()]
    );
    if (result.rows.length === 0) {
      const existing = await db.query('SELECT id, district_id, name FROM state_crm_taluks WHERE district_id = $1 AND name = $2', [district_id, name.trim()]);
      return res.status(200).json({ taluk: existing.rows[0], alreadyExisted: true });
    }
    res.status(201).json({ taluk: result.rows[0] });
  } catch (err) {
    console.error('createTaluk error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteTaluk(req: StateAuthRequest, res: Response) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM state_crm_taluks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteTaluk error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}
