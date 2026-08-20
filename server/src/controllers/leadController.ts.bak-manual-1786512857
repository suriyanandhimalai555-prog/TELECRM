import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getLeads = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { search } = req.query;

  try {
    let baseQuery = `
      SELECT l.*, u.name as owner_name, p.name as project_name, c.company_name as tenant_company
      FROM leads l 
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
      LEFT JOIN companies c ON l.company_id = c.id
    `;
    
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    // ── company isolation ────────────────────────────────────────────
    if (req.user.role === 'master_admin') {
      if (req.query.company_id) {
        queryParams.push(parseInt(req.query.company_id as string));
        whereClauses.push(`l.company_id = $${queryParams.length}`);
      }
    } else if (req.user.company_id) {
      queryParams.push(req.user.company_id);
      whereClauses.push(`l.company_id = $${queryParams.length}`);
    } else {
      whereClauses.push(`l.company_id IS NULL`);
    }

    // ── Role-based visibility (within the company) ────────────────────────
    if (req.user.role === 'MANAGER') {
      whereClauses.push(`(
        l.owner_id = $${queryParams.length + 1}
        OR (u.reporting_to = $${queryParams.length + 2})
        OR l.source = 'WHATSAPP'
      )`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      whereClauses.push(`(
        l.owner_id = $${queryParams.length + 1}
        OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $${queryParams.length + 2})
      )`);
      queryParams.push(req.user.id, req.user.id);
    }

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

import { sendMetaLeadEvent } from '../utils/metaPixel';

export const createLead = async (req: AuthRequest, res: Response) => {
  const { contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, owner_id, project_id, company, tags } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const finalOwnerId      = owner_id || req.user.id;
    const finalRevenue      = Number(revenue) || 0;
    const finalNextFollowup = next_followup ? next_followup : null;
    const finalProjectId    = project_id || null;
    // ── NEW: company_id from token ────────────────────────────────────────
    const company_id        = req.user.role === 'master_admin'
                              ? (req.body.company_id || null)
                              : req.user.company_id;

    const result = await db.query(`
      INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id, company, tags, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [finalOwnerId, contact_name, mobile, whatsapp, email, source, stage, finalRevenue, finalNextFollowup, finalProjectId, company || '', tags || '', company_id]);

    const leadId = result.rows[0].id;

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);
    
    await db.query(`
      INSERT INTO tasks (user_id, lead_id, type, status, due_date, notes)
      VALUES ($1, $2, 'FOLLOW_UP', 'OPEN', $3, 'Auto-generated follow-up for new lead')
    `, [finalOwnerId, leadId, dueDate.toISOString()]);

    const newLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);

    // Fire Meta CAPI Lead event (non-blocking)
    sendMetaLeadEvent({ email, phone: mobile, eventName: 'Lead' }).catch(() => {});

    res.status(201).json(newLeadResult.rows[0]);
  } catch (error) {
    console.error('createLead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM leads WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden: Lead does not belong to your company' });
      }
    }

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
    const updatedLead = updatedLeadResult.rows[0];
    if (body.stage) {
      sendMetaConversionEvent(updatedLead, body.stage).catch(() => {});
    }
    res.json(updatedLead);
  } catch (error) {
    console.error('updateLead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Meta Conversions API ─────────────────────────────────────────────────────
async function sendMetaConversionEvent(lead: any, stage: string) {
  try {
    const crypto = require('crypto');
    const hash = (val: string) => val ? crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex') : undefined;
    const payload: any = {
      data: [{
        event_name: stage === 'new' ? 'Lead' : 'Other',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'AVG CRM',
          stage: stage
        },
        user_data: {}
      }]
    };
    if (lead.email) payload.data[0].user_data.em = [hash(lead.email)];
    if (lead.mobile) payload.data[0].user_data.ph = [hash(lead.mobile.replace(/[^0-9]/g, ''))];
    const TOKEN = 'EAAODCzZAjLToBRnPZAgRMaARTfD4nXHmFhphbCHMa0ZAwTpDvPE5go8IkmcjWMjshUGlXZCzPikZAZBimPLtGnjwWWmewSAn2KlhPoL00vKpZAwMZCtVyp2EYWgSOFKWfT0BcDF643fFdWrN3ELmZCwRby38TuGNOnXAXJL757aNCSlm1Q4ld182Enh7Nm1ctVdPdkgZDZD';
    const DATASET_ID = '1298634335807741';
    const res = await fetch(`https://graph.facebook.com/v25.0/${DATASET_ID}/events?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[Meta] Conversion event sent:', stage, data);
  } catch (err) {
    console.error('[Meta] Conversion API error:', err);
  }
}

export const deleteLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // Only ADMIN and MANAGER can delete leads
  if (req.user.role === 'EMPLOYEE') {
    return res.status(403).json({ message: 'Forbidden: Employees cannot delete leads' });
  }

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM leads WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden: Lead does not belong to your company' });
      }
    }

    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reassignLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { owner_id } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    if (req.user.role !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM leads WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden: Lead does not belong to your company' });
      }
    }

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

  // ── NEW: company_id from token ──────────────────────────────────────────
  const company_id = req.user.role === 'master_admin'
                     ? (req.body.company_id || null)
                     : req.user.company_id;

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
        INSERT INTO leads (owner_id, contact_name, mobile, whatsapp, email, source, stage, revenue, next_followup, project_id, company, tags, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [ownerId, name, mobile, whatsapp, email, source, stage, revenue, nextFollowup, projectId, company, tags, company_id]);
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
    let baseQuery = `
      SELECT l.*, u.name as owner_name, p.name as project_name, c.company_name as tenant_company
      FROM leads l 
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN projects p ON l.project_id = p.id
      LEFT JOIN companies c ON l.company_id = c.id
    `;

    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    // ── NEW: company isolation ────────────────────────────────────────────
    if (req.user.role !== 'master_admin') {
      queryParams.push(req.user.company_id);
      whereClauses.push(`l.company_id = $${queryParams.length}`);
    } else if (req.query.company_id) {
      queryParams.push(parseInt(req.query.company_id as string));
      whereClauses.push(`l.company_id = $${queryParams.length}`);
    }

    if (req.user.role === 'MANAGER') {
      whereClauses.push(`(l.owner_id = $${queryParams.length + 1} OR (u.reporting_to = $${queryParams.length + 2}) OR l.source = 'WHATSAPP')`);
      queryParams.push(req.user.id, req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      whereClauses.push(`(l.owner_id = $${queryParams.length + 1} OR l.project_id IN (SELECT project_id FROM user_projects WHERE user_id = $${queryParams.length + 2}) OR l.source = 'WHATSAPP')`);
      queryParams.push(req.user.id, req.user.id);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    baseQuery += ` ORDER BY l.created_at DESC`;

    const leadsResult = await db.query(baseQuery, queryParams);
    res.json(leadsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
