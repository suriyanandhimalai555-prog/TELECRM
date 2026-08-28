import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import db from '../../config/database';
import { StateAuthRequest, stateAccessFilter } from '../../middleware/stateAuth';

export const listCalls = async (req: StateAuthRequest, res: Response) => {
  try {
    const filter = stateAccessFilter(req, 'c.state_id');
    const where = filter.where.replace('$STATE_PARAM', '$1');
    let params = filter.params;
    let query = `
      SELECT c.*, u.name AS agent_name, l.name AS lead_name, l.phone AS lead_phone
      FROM state_crm_calls c
      LEFT JOIN state_crm_users u ON c.agent_id = u.id
      LEFT JOIN state_crm_leads l ON c.lead_id = l.id
      WHERE ${where}
    `;
    if (req.query.lead_id) {
      params = [...params, req.query.lead_id];
      query += ` AND c.lead_id = $${params.length}`;
    }
    query += ` ORDER BY c.start_time DESC NULLS LAST`;
    const { rows } = await db.query(query, params);
    res.json({ calls: rows });
  } catch (err) {
    console.error('[StateCRM] listCalls error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCall = async (req: StateAuthRequest, res: Response) => {
  const { lead_id, caller, start_time, end_time, duration_seconds, type, status, feedback, notes, outcome } = req.body;
  const requester = req.stateUser!;
  try {
    let stateId: number | null = null;
    if (lead_id) {
      const leadRes = await db.query('SELECT state_id FROM state_crm_leads WHERE id = $1', [lead_id]);
      if (leadRes.rows.length > 0) stateId = leadRes.rows[0].state_id;
    }
    if (!stateId) {
      stateId = (requester.role === 'master' || requester.role === 'admin') ? null : requester.state_id;
    }
    if (!stateId) {
      return res.status(400).json({ message: 'Unable to determine state for this call — pick a lead with a state assigned' });
    }
    const { rows } = await db.query(
      `INSERT INTO state_crm_calls (state_id, lead_id, agent_id, caller, start_time, end_time, duration_seconds, type, status, feedback, notes, outcome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        stateId,
        lead_id || null,
        requester.id,
        caller || requester.email,
        start_time || new Date().toISOString(),
        end_time || null,
        duration_seconds || 0,
        type || 'OUTGOING',
        status || 'COMPLETED',
        feedback || null,
        notes || null,
        outcome || null,
      ]
    );
    res.status(201).json({ call: rows[0] });
  } catch (err) {
    console.error('[StateCRM] createCall error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadRecording = async (req: StateAuthRequest, res: Response) => {
  const { id } = req.params;
  const file = (req as any).file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const filename = `${Date.now()}-${id}${path.extname(file.originalname) || '.mp3'}`;
    const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'call-recordings');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    const result = await db.query(
      'UPDATE state_crm_calls SET recording_url = $1 WHERE id = $2 RETURNING *',
      [filename, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Call not found' });
    res.json({ call: result.rows[0] });
  } catch (err) {
    console.error('[StateCRM] uploadRecording error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const serveRecording = async (req: StateAuthRequest, res: Response) => {
  const { filename } = req.params;
  try {
    const fp = path.join(process.cwd(), 'server', 'uploads', 'call-recordings', filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ message: 'Recording not found' });
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.sendFile(fp);
  } catch (err) {
    console.error('[StateCRM] serveRecording error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
