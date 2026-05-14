import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getNotes = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { search } = req.query;
  try {
    let baseQuery = `
      SELECT n.*, u.name as user_name, l.contact_name as lead_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN leads l ON n.lead_id = l.id
    `;
    
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    // ── NEW: company isolation ────────────────────────────────────────────
    if (req.user.role !== 'master_admin') {
      queryParams.push(req.user.company_id);
      whereClauses.push(`n.company_id = $${queryParams.length}`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(`n.company_id = $${queryParams.length}`);
    }

    // Role-based filtering
    if (req.user.role === 'MANAGER') {
      whereClauses.push(`(n.user_id = $${queryParams.length + 1} OR u.reporting_to = $${queryParams.length + 2})`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'employee') {
      whereClauses.push(`n.user_id = $${queryParams.length + 1}`);
      queryParams.push(req.user.id);
    }

    if (search) {
      const paramIndex = queryParams.length + 1;
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        n.content ILIKE $${paramIndex} OR 
        l.contact_name ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex}
      )`);
      queryParams.push(searchPattern);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    baseQuery += ` ORDER BY n.created_at DESC`;

    const notesResult = await db.query(baseQuery, queryParams);
    res.json(notesResult.rows);
  } catch (error) {
    console.error('getNotes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNote = async (req: AuthRequest, res: Response) => {
  const { lead_id, content, type } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // ── NEW: company_id from token ──────────────────────────────────────────
  const company_id = req.user.role === 'master_admin'
                     ? (req.body.company_id || null)
                     : req.user.company_id;

  try {
    const result = await db.query(`
      INSERT INTO notes (user_id, lead_id, content, type, company_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [req.user.id, lead_id || null, content, type, company_id]);

    const newNoteResult = await db.query('SELECT * FROM notes WHERE id = $1', [result.rows[0].id]);
    res.status(201).json(newNoteResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const noteResult = await db.query('SELECT user_id FROM notes WHERE id = $1', [id]);
    const note = noteResult.rows[0];
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (
      req.user.role !== 'master_admin' &&
      req.user.role !== 'company_admin' &&
      req.user.role !== 'MANAGER' &&
      note.user_id !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await db.query('DELETE FROM notes WHERE id = $1', [id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
