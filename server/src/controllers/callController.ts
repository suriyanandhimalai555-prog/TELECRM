import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getCalls = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    let callsResult;
    const query = `
      SELECT c.*, u.name as agent_name, l.contact_name as lead_name, cp.name as campaign_name
      FROM calls c
      JOIN users u ON c.agent_id = u.id
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
    `;

    if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
      callsResult = await db.query(`${query} ORDER BY c.start_time DESC`);
    } else {
      callsResult = await db.query(`
        ${query}
        WHERE c.agent_id = $1
        ORDER BY c.start_time DESC
      `, [req.user.id]);
    }
    res.json(callsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCall = async (req: AuthRequest, res: Response) => {
  const { lead_id, caller, start_time, end_time, duration_seconds, type, campaign_id, status, feedback, notes, outcome } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await db.query(`
      INSERT INTO calls (agent_id, lead_id, caller, start_time, end_time, duration_seconds, type, campaign_id, status, feedback, notes, outcome)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [req.user.id, lead_id, caller, start_time, end_time, duration_seconds, type, campaign_id, status, feedback, notes, outcome]);

    const newCallResult = await db.query('SELECT * FROM calls WHERE id = $1', [result.rows[0].id]);
    res.status(201).json(newCallResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCall = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { feedback, notes, outcome } = req.body;

  try {
    await db.query(`
      UPDATE calls 
      SET feedback = $1, notes = $2, outcome = $3
      WHERE id = $4
    `, [feedback, notes, outcome, id]);

    const updatedCallResult = await db.query('SELECT * FROM calls WHERE id = $1', [id]);
    res.json(updatedCallResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
