import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listStates = async (req: StateAuthRequest, res: Response) => {
  try {
    const { rows } = await db.query('SELECT * FROM state_crm_states ORDER BY name ASC');
    res.json({ states: rows });
  } catch (err) {
    console.error('[StateCRM] listStates error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createState = async (req: StateAuthRequest, res: Response) => {
  const { name } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO state_crm_states (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json({ state: rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ message: 'State already exists' });
    console.error('[StateCRM] createState error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
