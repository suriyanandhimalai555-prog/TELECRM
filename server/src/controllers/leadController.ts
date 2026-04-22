import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getLeads = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    let leadsResult;
    const baseQuery = `
      SELECT l.*, u.name as owner_name, p.name as project_name
      FROM leads l 
      JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
    `;
    if (req.user.role === 'ADMIN') {
      leadsResult = await db.query(`${baseQuery} ORDER BY l.created_at DESC`);
    } else if (req.user.role === 'MANAGER') {
      leadsResult = await db.query(`
        ${baseQuery}
        WHERE l.owner_id = $1 OR u.reporting_to = $2
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    } else {
      // Employee sees leads they own OR leads in projects they are assigned to
      leadsResult = await db.query(`
        ${baseQuery}
        WHERE l.owner_id = $1 OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $2)
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    }
    res.json(leadsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createLead = async (req: AuthRequest, res: Response) => {
  const { contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, owner_id, project_id } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const finalOwnerId = owner_id || req.user.id;
    const result = await db.query(`
      INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [finalOwnerId, contact_name, mobile, whatsapp, email, source, stage, revenue || 0, next_followup, project_id || null]);

    const leadId = result.rows[0].id;

    // Auto-create 24-hour follow-up task
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);
    
    await db.query(`
      INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes)
      VALUES ($1, $2, 'FOLLOW_UP', 'OPEN', $3, 'Auto-generated follow-up for new lead')
    `, [finalOwnerId, leadId, dueDate.toISOString()]);

    const newLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    res.status(201).json(newLeadResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, owner_id, project_id } = req.body;

  try {
    await db.query(`
      UPDATE leads 
      SET contact_name = $1, mobile = $2, whatsapp = $3, email = $4, source = $5, stage = $6, revenue = $7, next_followup = $8, owner_id = $9, project_id = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
    `, [contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, owner_id, project_id, id]);

    const updatedLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    res.json(updatedLeadResult.rows[0]);
  } catch (error) {
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
    await db.query('UPDATE leads SET owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [owner_id, id]);
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
    // Fetch all users and projects for mapping
    const usersRes = await client.query('SELECT id, name FROM users');
    const projectsRes = await client.query('SELECT id, name FROM projects');
    
    // Trim and lowercase for robust matching
    const userMap = new Map(usersRes.rows.map((u: any) => [u.name.toLowerCase().trim(), u.id]));
    const projectMap = new Map(projectsRes.rows.map((p: any) => [p.name.toLowerCase().trim(), p.id]));

    await client.query('BEGIN');
    for (const lead of leads as any[]) {
      // Helper to find value by multiple possible keys (case-insensitive and trimmed)
      const findVal = (possibleKeys: string[]) => {
        const entry = Object.entries(lead).find(([k]) => {
          const trimmedKey = k.trim().toLowerCase();
          return possibleKeys.some(pk => pk.toLowerCase() === trimmedKey);
        });
        return entry ? entry[1] : null;
      };

      const name = (findVal(['CONTACT', 'Name', 'Contact Name', 'contact_name']) || 'Unknown').toString();
      const mobileRaw = (findVal(['MOBILE', 'Phone', 'Mobile Number', 'Phone Number', 'mobile']) || '').toString();
      const mobile = mobileRaw.replace(/\s+/g, ''); // Remove all spaces
      const whatsapp = (findVal(['WhatsApp', 'WhatsApp Number', 'whatsapp']) || mobile).toString().replace(/\s+/g, '');
      const email = (findVal(['Email', 'Email Address', 'email']) || '').toString();
      const source = (findVal(['Source', 'Lead Source', 'source']) || 'BULK_IMPORT').toString();
      const stage = (findVal(['Stage', 'Lead Stage', 'stage']) || 'NEW').toString();
      const revenue = Number(findVal(['Revenue', 'Expected Revenue', 'revenue']) || 0);
      const nextFollowupRaw = findVal(['Next Follow-up', 'Next Followup', 'Follow-up Date', 'next_followup', 'NEXT FOLLOW-UP']);
      
      let nextFollowup = null;
      if (nextFollowupRaw) {
        const dateStr = nextFollowupRaw.toString().trim();
        // Handle DD-MM-YYYY format
        if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [d, m, y] = dateStr.split('-');
          nextFollowup = `${y}-${m}-${d}`;
        } else {
          nextFollowup = dateStr;
        }
      }
      
      // Map Employee/Owner Name
      const employeeName = (findVal(['Employee Name', 'Owner', 'Assigned To', 'OWNER']) || '').toString().toLowerCase().trim();
      const ownerId = userMap.get(employeeName) || req.user.id;

      // Map Project Name
      const projectName = (findVal(['Project Name', 'Project', 'PROJECT']) || '').toString().toLowerCase().trim();
      const projectId = projectMap.get(projectName) || null;

      await client.query(`
        INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [ownerId, name, mobile, whatsapp, email, source, stage, revenue, nextFollowup, projectId]);
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
    let leadsResult;
    const query = `
      SELECT l.*, u.name as owner_name, p.name as project_name
      FROM leads l 
      JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
    `;
    
    if (req.user.role === 'ADMIN') {
      leadsResult = await db.query(`${query} ORDER BY l.created_at DESC`);
    } else if (req.user.role === 'MANAGER') {
      leadsResult = await db.query(`
        ${query}
        WHERE l.owner_id = $1 OR u.reporting_to = $2
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    } else {
      leadsResult = await db.query(`
        ${query}
        WHERE l.owner_id = $1 OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $2)
        ORDER BY l.created_at DESC
      `, [req.user.id, req.user.id]);
    }
    
    res.json(leadsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
