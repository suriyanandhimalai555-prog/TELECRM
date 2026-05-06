import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getLeads = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { search } = req.query;

  try {
    let baseQuery = `
      SELECT l.*, u.name as owner_name, p.name as project_name
      FROM leads l 
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
    `;
    
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (req.user.role === 'MANAGER') {
      // ✅ FIX: MANAGER sees own leads + team leads + ALL WhatsApp auto-created leads
      whereClauses.push(`(
        l.owner_id = $1 
        OR (u.reporting_to = $2)
        OR l.source = 'WHATSAPP'
      )`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      whereClauses.push(`(
        l.owner_id = $1 
        OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $2)
        OR l.source = 'WHATSAPP'
      )`);
      queryParams.push(req.user.id, req.user.id);
    }
    // ADMIN sees everything — no WHERE clause

    if (search) {
      const paramIndex = queryParams.length + 1;
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        l.contact_name ILIKE $${paramIndex} OR 
        l.mobile ILIKE $${paramIndex} OR 
        l.email ILIKE $${paramIndex} OR 
        l.company ILIKE $${paramIndex} OR
        l.tags ILIKE $${paramIndex}
      )`);
      queryParams.push(searchPattern);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    baseQuery += ` ORDER BY l.created_at DESC`;

    const leadsResult = await db.query(baseQuery, queryParams);
    res.json(leadsResult.rows);
  } catch (error) {
    console.error('getLeads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLead = async (req: AuthRequest, res: Response) => {
  const { contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, owner_id, project_id, company, tags } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const finalOwnerId     = owner_id || req.user.id;
    const finalRevenue     = Number(revenue) || 0;
    const finalNextFollowup = next_followup ? next_followup : null;
    const finalProjectId   = project_id || null;

    const result = await db.query(`
      INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id, company, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [finalOwnerId, contact_name, mobile, whatsapp, email, source, stage, finalRevenue, finalNextFollowup, finalProjectId, company || '', tags || '']);

    const leadId = result.rows[0].id;

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);
    
    await db.query(`
      INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes)
      VALUES ($1, $2, 'FOLLOW_UP', 'OPEN', $3, 'Auto-generated follow-up for new lead')
    `, [finalOwnerId, leadId, dueDate.toISOString()]);

    const newLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    res.status(201).json(newLeadResult.rows[0]);
  } catch (error) {
    console.error('createLead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const fieldMap: Record<string, any> = {};

    if (body.contact_name  !== undefined) fieldMap.contact_name  = body.contact_name;
    if (body.mobile        !== undefined) fieldMap.mobile        = body.mobile;
    if (body.whatsapp      !== undefined) fieldMap.whatsapp      = body.whatsapp;
    if (body.email         !== undefined) fieldMap.email         = body.email;
    if (body.source        !== undefined) fieldMap.source        = body.source;
    if (body.stage         !== undefined) fieldMap.stage         = body.stage;
    if (body.revenue       !== undefined) fieldMap.revenue       = Number(body.revenue) || 0;
    if (body.next_followup !== undefined) fieldMap.next_followup = body.next_followup || null;
    if (body.owner_id      !== undefined) fieldMap.owner_id      = body.owner_id;
    if (body.project_id    !== undefined) fieldMap.project_id    = body.project_id || null;
    if (body.company       !== undefined) fieldMap.company       = body.company;
    if (body.tags          !== undefined) fieldMap.tags          = body.tags;

    if (Object.keys(fieldMap).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const keys       = Object.keys(fieldMap);
    const values     = Object.values(fieldMap);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const idParam    = `$${keys.length + 1}`;

    await db.query(
      `UPDATE leads SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ${idParam}`,
      [...values, id]
    );

    const updatedLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    res.json(updatedLeadResult.rows[0]);
  } catch (error) {
    console.error('updateLead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reassignLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { owner_id } = req.body;

  try {
    await db.query(
      'UPDATE leads SET owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [owner_id, id]
    );
    res.json({ message: 'Lead reassigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const importLeads = async (req: AuthRequest, res: Response) => {
  const { leads } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const client = await db.connect();
  try {
    const usersRes    = await client.query('SELECT id, name FROM users');
    const projectsRes = await client.query('SELECT id, name FROM projects');
    
    const userMap    = new Map(usersRes.rows.map((u: any) => [u.name.toLowerCase().trim(), u.id]));
    const projectMap = new Map(projectsRes.rows.map((p: any) => [p.name.toLowerCase().trim(), p.id]));

    await client.query('BEGIN');

    for (const lead of leads as any[]) {
      const findVal = (possibleKeys: string[]) => {
        const entry = Object.entries(lead).find(([k]) => {
          const trimmedKey = k.trim().toLowerCase();
          return possibleKeys.some(pk => pk.toLowerCase() === trimmedKey);
        });
        return entry ? entry[1] : null;
      };

      const name      = (findVal(['CONTACT', 'Name', 'Contact Name', 'contact_name']) || 'Unknown').toString();
      const mobileRaw = (findVal(['MOBILE', 'Phone', 'Mobile Number', 'Phone Number', 'mobile']) || '').toString();
      const mobile    = mobileRaw.replace(/\s+/g, '');
      const whatsapp  = (findVal(['WhatsApp', 'WhatsApp Number', 'whatsapp']) || mobile).toString().replace(/\s+/g, '');
      const email     = (findVal(['Email', 'Email Address', 'email']) || '').toString();
      const source    = (findVal(['Source', 'Lead Source', 'source']) || 'BULK_IMPORT').toString();
      const stage     = (findVal(['Stage', 'Lead Stage', 'stage']) || 'NEW').toString();
      const revenue   = Number(findVal(['Revenue', 'Expected Revenue', 'revenue']) || 0);

      const nextFollowupRaw = findVal(['Next Follow-up', 'Next Followup', 'Follow-up Date', 'next_followup', 'NEXT FOLLOW-UP']);
      let nextFollowup = null;
      if (nextFollowupRaw) {
        const dateStr = nextFollowupRaw.toString().trim();
        if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [d, m, y] = dateStr.split('-');
          nextFollowup = `${y}-${m}-${d}`;
        } else {
          nextFollowup = dateStr;
        }
      }

      const employeeName = (findVal(['Employee Name', 'Owner', 'Assigned To', 'OWNER']) || '').toString().toLowerCase().trim();
      const ownerId      = userMap.get(employeeName) || req.user.id;
      const projectName  = (findVal(['Project Name', 'Project', 'PROJECT']) || '').toString().toLowerCase().trim();
      const projectId    = projectMap.get(projectName) || null;
      const company      = (findVal(['Company', 'Organization', 'Company Name', 'company']) || '').toString();
      const tags         = (findVal(['Tags', 'Labels', 'tags']) || '').toString();

      await client.query(`
        INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id, company, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [ownerId, name, mobile, whatsapp, email, source, stage, revenue, nextFollowup, projectId, company, tags]);
    }

    await client.query('COMMIT');
    res.json({ message: `${leads.length} leads imported successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import error:', error);
    res.status(500).json({ message: 'Failed to import leads' });
  } finally {
    client.release();
  }
};

export const exportLeads = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // ✅ FIX: LEFT JOIN so WhatsApp auto-created leads always appear
    const query = `
      SELECT l.*, u.name as owner_name, p.name as project_name
      FROM leads l 
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
    `;

    let leadsResult;
    if (req.user.role === 'ADMIN') {
      leadsResult = await db.query(`${query} ORDER BY l.created_at DESC`);
    } else if (req.user.role === 'MANAGER') {
      leadsResult = await db.query(`
        ${query}
        WHERE l.owner_id = $1 OR (u.reporting_to = $2) OR l.source = 'WHATSAPP'
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    } else {
      leadsResult = await db.query(`
        ${query}
        WHERE l.owner_id = $1 
          OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $2)
          OR l.source = 'WHATSAPP'
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    }

    res.json(leadsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};