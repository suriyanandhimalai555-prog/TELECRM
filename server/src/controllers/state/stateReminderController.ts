import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest } from '../../middleware/stateAuth';

const scopeWhere = (requester: any) => {
  if (requester.role === 'master' || requester.role === 'hr' || requester.role === 'admin') return { where: '1=1', params: [] as any[] };
  if (requester.role === 'coordinator') {
    const states = requester.coordinatorStates?.length ? requester.coordinatorStates : [-1];
    return { where: 'state_id = ANY($1)', params: [states] };
  }
  return { where: 'state_id = $1', params: [requester.state_id ?? -1] };
};

export const getDue = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  const { where, params } = scopeWhere(requester);
  try {
    const { rows } = await db.query(
      `SELECT * FROM state_crm_leads WHERE ${where} AND next_followup IS NOT NULL AND next_followup <= NOW() ORDER BY next_followup ASC`,
      params
    );
    res.json({ reminders: rows });
  } catch (error) {
    console.error('[StateCRM] getDue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUpcoming = async (req: StateAuthRequest, res: Response) => {
  const requester = req.stateUser!;
  const { where, params } = scopeWhere(requester);
  try {
    const { rows } = await db.query(
      `SELECT * FROM state_crm_leads WHERE ${where} AND next_followup IS NOT NULL AND next_followup > NOW() ORDER BY next_followup ASC LIMIT 50`,
      params
    );
    res.json({ upcoming: rows });
  } catch (error) {
    console.error('[StateCRM] getUpcoming error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateFollowup = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const { next_followup } = req.body;
  try {
    const result = await db.query(
      `UPDATE state_crm_leads SET next_followup = $1 WHERE id = $2 RETURNING *`,
      [next_followup, id]
    );
    res.json({ lead: result.rows[0] });
  } catch (error) {
    console.error('[StateCRM] updateFollowup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
