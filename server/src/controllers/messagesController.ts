import { Request, Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { project_id } = req.query;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (req.user.role !== 'master_admin') {
      queryParams.push(req.user.company_id);
      whereClauses.push(`l.company_id = $${queryParams.length}`);
    }

    if (req.user.role === 'EMPLOYEE') {
      queryParams.push(req.user.id);
      whereClauses.push(`l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $${queryParams.length})`);
    }

    if (project_id) {
      queryParams.push(parseInt(project_id as string));
      whereClauses.push(`l.project_id = $${queryParams.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT wm.*, l.id AS lead_id, l.contact_name, l.project_id, l.company_id
      FROM whatsapp_messages wm
      JOIN leads l ON (wm.from_number = l.whatsapp OR wm.from_number = l.mobile
                     OR wm.to_number = l.whatsapp OR wm.to_number = l.mobile)
      ${whereSQL}
      ORDER BY wm.timestamp ASC
    `;

    const result = await db.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
