import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getCalls = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { search } = req.query;

  try {
    let query = `
      SELECT c.*, u.name as agent_name, l.contact_name as lead_name, cp.name as campaign_name
      FROM calls c
      JOIN users u ON c.agent_id = u.id
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
    `;
    
    let whereClauses = [];
    let queryParams: any[] = [];

    // Role-based filtering
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      whereClauses.push(`c.agent_id = $${queryParams.length + 1}`);
      queryParams.push(req.user.id);
    }

    // Search filtering
    if (search) {
      const paramIndex = queryParams.length + 1;
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        c.notes ILIKE $${paramIndex} OR 
        l.contact_name ILIKE $${paramIndex} OR 
        cp.name ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex} OR
        c.outcome ILIKE $${paramIndex}
      )`);
      queryParams.push(searchPattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY c.start_time DESC`;

    const callsResult = await db.query(query, queryParams);
    res.json(callsResult.rows);
  } catch (error) {
    console.error('getCalls error:', error);
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
