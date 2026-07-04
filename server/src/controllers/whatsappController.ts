import nodeFetch from 'node-fetch';
import FormDataNode from 'form-data';
import { Request, Response } from 'express';
import db from '../config/database';
import fs from 'fs';
import path from 'path';

const PHONE_NUMBER_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID   || '1023163197557145';
const PHONE_NUMBER_ID_2 = process.env.WHATSAPP_PHONE_NUMBER_ID_2 || ''; // ← add to .env
const VERIFY_TOKEN      = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'avgcrm_webhook_2024';
const WHATSAPP_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_TOKEN_3  = process.env.WA_ACCESS_TOKEN_3 || '';
const WABA_ID           = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '27198788186399333';
const WABA_ID_3         = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID_3 || '964486646396502';
const PHONE_NUMBER_ID_3 = process.env.WHATSAPP_PHONE_NUMBER_ID_3 || '';
const PHONE_NUMBER_ID_4 = process.env.WHATSAPP_PHONE_NUMBER_ID_4 || '';
const WHATSAPP_TOKEN_2  = process.env.WA_ACCESS_TOKEN_2 || process.env.WHATSAPP_ACCESS_TOKEN_2 || WHATSAPP_TOKEN;
const WHATSAPP_TOKEN_4  = process.env.WA_ACCESS_TOKEN_4 || '';

// ─── Helper: pick phone ID by account index ───────────────────────────────────
function getPhoneId(account?: string | number): string {
  if (String(account) === '3' && PHONE_NUMBER_ID_4) return PHONE_NUMBER_ID_4;
  if (String(account) === '2' && PHONE_NUMBER_ID_3) return PHONE_NUMBER_ID_3;
  if (String(account) === '1' && PHONE_NUMBER_ID_2) return PHONE_NUMBER_ID_2;
  return PHONE_NUMBER_ID;
}
function getToken(account?: string | number): string {
  if (String(account) === '3' && WHATSAPP_TOKEN_4) return WHATSAPP_TOKEN_4;
  if (String(account) === '2' && WHATSAPP_TOKEN_3) return WHATSAPP_TOKEN_3;
  if (String(account) === '1' && WHATSAPP_TOKEN_2) return WHATSAPP_TOKEN_2;
  return WHATSAPP_TOKEN;
}

// ─── Helper: download and cache media from Meta ─────────────────────────────
async function downloadAndCacheMedia(mediaId: string, token: string): Promise<string | null> {
  try {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData: any = await metaRes.json();
    if (metaData.error || !metaData.url) return null;
    const fileRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) return null;
    const ext = (metaData.mime_type || 'application/octet-stream').split('/')[1]?.split(';')[0] || 'bin';
    const filename = `${mediaId}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.length === 0) return null;
    fs.writeFileSync(filepath, buffer);
    return `/api/whatsapp/cached-media/${filename}`;
  } catch (e) {
    console.error('[WA] downloadAndCacheMedia error:', e);
    return null;
  }
}
// ─── Helper: normalize phone to last 10 digits for matching ─────────────────
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

// ─── Helper: find a lead by phone number ────────────────────────────────────
async function findLeadByPhone(phone: string, companyId?: number | null): Promise<any | null> {
  const normalized = normalizePhone(phone);
  let queryStr = `SELECT * FROM leads WHERE (mobile LIKE $1 OR whatsapp LIKE $1)`;
  const params = [`%${normalized}`];
  if (companyId) {
    queryStr += ` AND company_id = $2`;
    params.push(companyId as any);
  }
  queryStr += ` LIMIT 1`;
  const { rows } = await db.query(queryStr, params);
  return rows[0] ?? null;
}

// ─── Helper: get admin user id ───────────────────────────────────────────────
async function getAdminUserId(companyId?: number | null): Promise<number> {
  let queryStr = `SELECT id FROM users WHERE role = 'ADMIN'`;
  const params = [];
  if (companyId) {
    queryStr += ` AND company_id = $1`;
    params.push(companyId);
  }
  queryStr += ` ORDER BY id ASC LIMIT 1`;
  const { rows } = await db.query(queryStr, params);
  if (rows.length > 0) return rows[0].id;
  const fallback = await db.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
  return fallback.rows[0]?.id ?? 1;
}

// ─── Helper: get user's WhatsApp credentials ─────────────────────────────────
async function getUserWACredentials(userId: number, account?: string | number) {
  const userRes = await db.query('SELECT role, company_id, whatsapp_token, whatsapp_phone_id, whatsapp_waba_id FROM users WHERE id = $1', [userId]);
  const u = userRes.rows[0];
  if (!u) {
    return { token: WHATSAPP_TOKEN, phoneId: PHONE_NUMBER_ID, wabaId: WABA_ID };
  }
  const companyId = u.company_id;
  if (companyId) {
    const waRes = await db.query(
      'SELECT access_token, phone_number_id, phone_number FROM whatsapp_accounts WHERE company_id = $1 ORDER BY id ASC',
      [companyId]
    );
    if (waRes.rows.length > 0) {
      const reqIdx = Math.min(Number(account) || 0, waRes.rows.length - 1); const waAcc = waRes.rows[reqIdx];
      return {
        token: waAcc.access_token || WHATSAPP_TOKEN,
        phoneId: waAcc.phone_number_id || PHONE_NUMBER_ID,
        wabaId: WABA_ID,
      };
    }
  }
  return {
    token:   getToken(account) || u.whatsapp_token || WHATSAPP_TOKEN,
    phoneId: getPhoneId(account) || u.whatsapp_phone_id || PHONE_NUMBER_ID,
    wabaId:  String(account) === '2' ? WABA_ID_3 : u.whatsapp_waba_id || WABA_ID,
  };}

// ─── Helper: fetch media URL + mime_type from Meta ───────────────────────────
async function fetchMediaInfo(
  mediaId: string,
  token: string
): Promise<{ url: string; mime_type: string; filename?: string } | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.error) {
      console.error('[WA] fetchMediaInfo error:', data.error);
      return null;
    }
    return { url: data.url, mime_type: data.mime_type, filename: data.filename };
  } catch (err) {
    console.error('[WA] fetchMediaInfo exception:', err);
    return null;
  }
}

// ─── Media proxy endpoint ─────────────────────────────────────────────────────
export const proxyMedia = async (req: Request, res: Response) => {
  const { mediaId } = req.params;

  try {
    const tokenRows = (await db.query('SELECT access_token FROM whatsapp_accounts WHERE access_token IS NOT NULL ORDER BY id ASC')).rows;
    const allTokens = [WHATSAPP_TOKEN, ...tokenRows.map((r) => r.access_token)].filter(Boolean);
    let metaData = null;
    let token = '';
    for (const t of allTokens) {
      const r = await fetch('https://graph.facebook.com/v25.0/' + mediaId, { headers: { Authorization: 'Bearer ' + t } });
      const d = await r.json();
      if (!d.error && d.url) { metaData = d; token = t; break; }
    }
    if (!metaData) return res.status(410).json({ error: 'Media expired or unavailable' });


    const mediaUrl: string = metaData.url;
    const mimeType: string = metaData.mime_type || 'application/octet-stream';
    const filename: string = metaData.filename || `file_${mediaId}`;

    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fileRes.ok) {
      console.error('[WA] proxyMedia file fetch failed:', fileRes.status);
      return res.status(502).json({ error: 'Failed to fetch media from Meta' });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const total = buffer.length;
    if (total === 0) {
      return res.status(410).json({ error: "Media expired or unavailable" });
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    const rangeHeader = req.headers['range'];
    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', end - start + 1);
      res.status(206);
      return res.send(buffer.slice(start, end + 1));
    }
    res.setHeader('Content-Length', total);
    return res.send(buffer);

  } catch (err) {
    console.error('[WA] proxyMedia error:', err);
    return res.status(500).json({ error: 'Media proxy failed' });
  }
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const getTemplates = async (req: Request, res: Response) => {
  const companyId = (req as any).user?.company_id;
  try {
    const { rows } = await db.query(
      'SELECT * FROM whatsapp_templates WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json({ templates: rows });
  } catch (err) {
    console.error('[WA] getTemplates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

export const syncTemplates = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.company_id;
  try {
    const { token, wabaId } = await getUserWACredentials(userId);
    if (!token) return res.status(400).json({ error: 'WhatsApp Token missing' });

    const waRes = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await waRes.json();
    if (data.error) {
      console.error('[WA] Meta API error:', JSON.stringify(data.error));
      return res.status(400).json({ error: data.error.message, details: data.error });
    }

    for (const temp of data.data || []) {
      await db.query(
        `INSERT INTO whatsapp_templates (company_id, name, category, language, components, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, name) DO UPDATE SET
           category   = EXCLUDED.category,
           language   = EXCLUDED.language,
           components = EXCLUDED.components,
           status     = EXCLUDED.status`,
        [companyId, temp.name, temp.category, temp.language, JSON.stringify(temp.components), temp.status]
      );
    }

    res.json({ success: true, count: data.data?.length || 0 });
  } catch (err) {
    console.error('[WA] syncTemplates error:', err);
    res.status(500).json({ error: 'Failed to sync templates' });
  }
};

export const sendTemplate = async (req: Request, res: Response) => {
  const { to, templateName, languageCode, components, contactName, account } = req.body;
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.company_id;

  if (!to || !templateName) {
    return res.status(400).json({ error: 'to and templateName required' });
  }

  try {
    const { token, phoneId } = await getUserWACredentials(userId, account);
    const phone = to.replace(/[^0-9]/g, '');

    const waRes = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode || 'en_US' },
          components: components || [],
        },
      }),
    });

    const data = await waRes.json();
    if (data.error) {
      console.error('[WA] Meta API error:', JSON.stringify(data.error));
      return res.status(400).json({ error: data.error.message, details: data.error });
    }

    const msgId = data.messages?.[0]?.id;

    await db.query(
      `INSERT INTO whatsapp_messages
         (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read, company_id, phone_number_id)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true, $6, $7)`,
      [msgId, phoneId, phone, `Template: ${templateName}`, contactName || '', companyId]
    );

    res.json({ success: true, messageId: msgId });
  } catch (err) {
    console.error('[WA] sendTemplate error:', err);
    res.status(500).json({ error: 'Failed to send template' });
  }
};

// ─── Bulk Send ────────────────────────────────────────────────────────────────

export const bulkSendMessage = async (req: Request, res: Response) => {
  const { contacts, message, account } = req.body;
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.company_id;

  if (!contacts || !Array.isArray(contacts) || !message) {
    return res.status(400).json({ error: 'contacts (array) and message required' });
  }

  try {
    const { token, phoneId } = await getUserWACredentials(userId, account);
    const results = [];

    for (const contact of contacts) {
      const rawPhone = contact.to || contact.phone || '';
      const name     = contact.contactName || contact.name || '';
      const phone    = rawPhone.replace(/[^0-9]/g, '');

      if (!phone) {
        results.push({ phone: rawPhone, success: false, error: 'Invalid phone number' });
        continue;
      }

      try {
        const waRes = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
        });

        const data = await waRes.json();

        if (!data.error) {
          const msgId = data.messages?.[0]?.id;
          await db.query(
            `INSERT INTO whatsapp_messages
               (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read, company_id, phone_number_id)
             VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true, $6, $7)`,
            [msgId, phoneId, phone, message, name, companyId]
          );
          results.push({ phone: rawPhone, success: true });
        } else {
          results.push({ phone: rawPhone, success: false, error: data.error.message });
        }
      } catch (innerErr: any) {
        results.push({ phone: rawPhone, success: false, error: innerErr.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed    = results.filter(r => !r.success).length;

    res.json({ success: true, sent: succeeded, failed, total: contacts.length, results });
  } catch (err) {
    console.error('[WA] bulkSendMessage error:', err);
    res.status(500).json({ error: 'Bulk send failed' });
  }
};

// ─── Send single message ──────────────────────────────────────────────────────

export const sendMessage = async (req: Request, res: Response) => {
  const { to, message, contactName, account } = req.body;
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.company_id;

  if (!to || !message) return res.status(400).json({ error: 'to and message required' });

  try {
    const { token, phoneId } = await getUserWACredentials(userId, account);
    if (!token) {
      return res.status(500).json({
        error: 'WhatsApp Access Token missing. Please configure it in Settings.',
      });
    }

    const phone = to.replace(/[^0-9]/g, '');

    const waRes = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await waRes.json();
    if (data.error) {
      console.error('[WA] Meta API error:', JSON.stringify(data.error));
      return res.status(400).json({ error: data.error.message, details: data.error });
    }

    const msgId = data.messages?.[0]?.id;

    const { rows: savedRows } = await db.query(
      `INSERT INTO whatsapp_messages
         (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read, company_id, phone_number_id)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true, $6, $7)
       RETURNING *`,
      [msgId, phoneId, phone, message, contactName || '', companyId, phoneId]
    );

    res.json({ success: true, messageId: msgId, message: savedRows[0] });
  } catch (err) {
    console.error('[WA] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send' });
  }
};

// ─── Get message history for a phone ─────────────────────────────────────────

export const getHistory = async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  const companyId = (req as any).user?.company_id;
  const userRole = (req as any).user?.role;
  try {
    let queryStr = `
      SELECT * FROM whatsapp_messages
      WHERE (from_number = $1 OR to_number = $1)
    `;
    const params = [phone];
    if (userRole !== 'master_admin') {
      queryStr += ` AND company_id = $2`;
      params.push(companyId);
    } else if (req.query.company_id) {
      queryStr += ` AND company_id = $2`;
      params.push(String(parseInt(req.query.company_id as string)));
    }
    
    const wrappedQuery = `SELECT * FROM (${queryStr} ORDER BY timestamp DESC LIMIT 200) recent ORDER BY timestamp ASC`;
    const { rows } = await db.query(wrappedQuery, params);
    res.json({ messages: rows });
  } catch (err) {
    console.error('[WA] getHistory error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

// ─── Get all conversations ────────────────────────────────────────────────────

export const getConversations = async (req: Request, res: Response) => {
  const { search, account } = req.query;
  const companyId = (req as any).user?.company_id;
  const role = (req as any).user?.role || 'EMPLOYEE';
  const uid = (req as any).user?.id || 0;

  try {
    let query = `
      SELECT
        contact_number,
        COALESCE(NULLIF(lead_name, ''), NULLIF(contact_name, ''), contact_number) AS contact_name,
        message_text   AS last_message,
        timestamp      AS last_timestamp,
        direction      AS last_direction,
        status         AS last_status,
        unread_count,
        lead_id,
        lead_name,
        lead_stage,
        lead_project_id AS project_id
      FROM (
        SELECT
          CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END AS contact_number,
          wm.contact_name,
          wm.message_text,
          wm.timestamp,
          wm.direction,
          wm.status,
          ROW_NUMBER() OVER (
            PARTITION BY (CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END)
            ORDER BY wm.timestamp DESC, l.id DESC
          ) AS rn,
          COUNT(CASE WHEN wm.direction = 'inbound' AND wm.is_read = false THEN 1 END) OVER (
            PARTITION BY (CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END)
          ) AS unread_count,
          l.id           AS lead_id,
          l.contact_name AS lead_name,
          l.stage        AS lead_stage,
          l.project_id   AS lead_project_id
        FROM whatsapp_messages wm
        LEFT JOIN LATERAL (
          SELECT l2.id, l2.contact_name, l2.stage, l2.project_id
          FROM leads l2
          WHERE l2.company_id = wm.company_id
            AND (
              RIGHT(l2.mobile,   10) = RIGHT(CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END, 10)
              OR RIGHT(l2.whatsapp, 10) = RIGHT(CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END, 10)
            )
          ORDER BY (l2.project_id IS NOT NULL) DESC, l2.id DESC
          LIMIT 1
        ) l ON true
        WHERE 1=1
    `;

    const params: any[] = [];
    if (role !== 'master_admin') {
      params.push(companyId);
      query += ` AND wm.company_id = $${params.length}`;
    } else if (req.query.company_id) {
      params.push(String(parseInt(req.query.company_id as string)));
      query += ` AND wm.company_id = $${params.length}`;
    }

    // Filter by WhatsApp account using phone_number_id
    if (account !== undefined && account !== null && account !== '') {
      const phoneId = getPhoneId(account as string);
      if (phoneId) {
        params.push(phoneId);
        query += ` AND wm.phone_number_id = $${params.length}`;
      }
    }

    query += ` ) t WHERE rn = 1`;

    if (role === 'EMPLOYEE') {
      query += ` AND lead_id IN (SELECT id FROM leads WHERE owner_id = $${params.length + 1})`;
      params.push(uid);
    }

    if (search) {
      query += ` AND (lead_name ILIKE $${params.length + 1} OR contact_name ILIKE $${params.length + 1} OR contact_number ILIKE $${params.length + 1} OR message_text ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY last_timestamp DESC`;

    const { rows } = await db.query(query, params);
    res.json({ conversations: rows });
  } catch (err) {
    console.error('[WA] getConversations error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

// ─── Mark messages as read ───────────────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response) => {
  const phoneClean = req.params.phone.replace(/[^0-9]/g, '');
  try {
    await db.query(
      `UPDATE whatsapp_messages
       SET is_read = true
       WHERE (from_number = $1 OR to_number = $1)
         AND direction = 'inbound'
         AND is_read = false`,
      [phoneClean]
    );

    const reqWithIo = req as any;
    if (reqWithIo.io) {
      reqWithIo.io.emit('whatsapp:read', { phone: phoneClean });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[WA] markAsRead error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

// ─── Webhook verification (GET) ───────────────────────────────────────────────

export const verifyWebhook = (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WA] ✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ─── Incoming webhook (POST) ──────────────────────────────────────────────────

// ─── Keyword-based owner guess for brand-new auto-created projects ───
const AD_KEYWORD_OWNER_MAP: { keyword: string; ownerId: number }[] = [
  { keyword: 'telecaller', ownerId: 69 },   // Jatin
  { keyword: 'tele caller', ownerId: 69 },  // Jatin
  { keyword: 'sales head', ownerId: 69 },   // Jatin
  { keyword: 'sales', ownerId: 69 },        // Jatin
  { keyword: 'video editing', ownerId: 67 },// Himanshi
  { keyword: 'video editor', ownerId: 67 }, // Himanshi
];
function guessOwnerFromCampaignName(name: string): number | null {
  const lower = name.toLowerCase();
  for (const { keyword, ownerId } of AD_KEYWORD_OWNER_MAP) {
    if (lower.includes(keyword)) return ownerId;
  }
  return null;
}

export const handleWebhook = async (req: Request, res: Response) => {
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;

        // Determine which of our phone IDs received this message
        let receivingPhoneId = val?.metadata?.phone_number_id || PHONE_NUMBER_ID;

        for (const msg of val?.messages || []) {
          const from    = msg.from as string;
          const msgId   = msg.id as string;
          const ts      = new Date(parseInt(msg.timestamp) * 1000);
          const contact = val.contacts?.find((c: any) => c.wa_id === from);
          const name    = contact?.profile?.name || from;

          let text      = '';
          let mediaType = '';

          switch (msg.type) {
            case 'text':
              text = msg.text?.body || '';
              break;
            case 'image':
              text      = `[image:${msg.image?.id || ''}]`;
              mediaType = 'image';
              break;
            case 'document':
              text      = `[document:${msg.document?.id || ''}:${msg.document?.filename || 'document'}:${msg.document?.mime_type || 'application/octet-stream'}]`;
              mediaType = 'document';
              break;
            case 'audio':
              text      = `[audio:${msg.audio?.id || ''}]`;
              mediaType = 'audio';
              break;
            case 'video':
              text      = `[video:${msg.video?.id || ''}]`;
              mediaType = 'video';
              break;
            case 'sticker':
              text      = `[sticker:${msg.sticker?.id || ''}]`;
              mediaType = 'sticker';
              break;
            case 'location':
              text = `[location:${msg.location?.latitude},${msg.location?.longitude}:${msg.location?.name || ''}]`;
              break;
            case 'reaction':
              text = `[reaction:${msg.reaction?.emoji || '👍'}:${msg.reaction?.message_id || ''}]`;
              break;
            case 'interactive': {
              const inter = msg.interactive;
              if (inter?.type === 'button_reply') {
                text = `Button: ${inter.button_reply?.title || ''}`;
              } else if (inter?.type === 'list_reply') {
                text = `Selected: ${inter.list_reply?.title || ''} - ${inter.list_reply?.description || ''}`;
              } else if (inter?.type === 'button') {
                const body = inter.body?.text || '';
                const buttons = (inter.action?.buttons || []).map((b: any) => b.reply?.title).join(' | ');
                text = `${body}${buttons ? ' [' + buttons + ']' : ''}`;
              } else if (inter?.type === 'list') {
                text = inter.body?.text || '[List message]';
              } else if (inter?.nfm_reply) {
                text = `Form reply: ${inter.nfm_reply?.response_json || '[Form submitted]'}`;
              } else {
                text = JSON.stringify(inter)?.slice(0, 200) || '[Interactive message]';
              }
              break;
            }
              break;
            case 'contacts':
              text = `👤 Contact shared`;
              break;
            case 'order':
              text = `🛒 Order received`;
              break;
            case 'system':
              if (msg.system?.type?.includes('call')) {
                const callType = msg.system.type.includes('missed') ? 'missed' : 'connected';
                const duration = msg.system.duration || 0;
                text = `[call:${callType}:${duration}]`;
              } else {
                text = `[system:${msg.system?.type || 'unknown'}]`;
              }
              break;
            case 'button':
              text = msg.button?.text || '[Button reply]';
              break;
            default:
              console.log(`[WA] Skipping unsupported message type: ${msg.type}`);
              continue;
          }

          console.log(`[WA] 📩 INBOUND from ${from} (${name}): type=${msg.type} → phoneId=${receivingPhoneId}`);

          // No normalization needed - use phone ID as-is from Meta webhook
          const accountRes = await db.query('SELECT company_id FROM whatsapp_accounts WHERE phone_number_id = $1 LIMIT 1', [receivingPhoneId]);
          const companyId = accountRes.rows[0]?.company_id || null;

          let lead = await findLeadByPhone(from, companyId);
          let isNewLead = false;
          // Auto-reply for existing leads who haven't been replied to yet
          // Auto-assign lead to employee based on project
          const projectAssignMap: Record<number, number> = {
            9: 66,  // Crypto Exchange -> Syed
            10: 67, // Web Development -> Himanshi (was Nithin)
            11: 67, // Digital Marketing -> Himanshi
            13: 69, // Trading -> Jatin
          };
          if (lead?.project_id && !lead.assigned_to) {
            const projOwnerRes2 = await db.query('SELECT default_owner_id FROM projects WHERE id = $1', [lead.project_id]);
            const ownerId2 = projOwnerRes2.rows[0]?.default_owner_id || projectAssignMap[lead.project_id];
            if (ownerId2) {
              await db.query('UPDATE leads SET assigned_to = $1 WHERE id = $2', [ownerId2, lead.id]);
            }
          }
          if (lead && !isNewLead && (companyId === 11 || companyId === 12 || companyId === 3)) {
            try {
              const lastOutbound = await db.query(
                `SELECT id FROM whatsapp_messages WHERE to_number = $1 AND direction = 'outbound' AND phone_number_id = $2 ORDER BY timestamp DESC LIMIT 1`,
                [from, receivingPhoneId]
              );
              if (lastOutbound.rows.length === 0) {
                // No agent reply yet — send auto-reply
                const waAccRes = await db.query(
                  'SELECT access_token, phone_number_id FROM whatsapp_accounts WHERE phone_number_id = $1 LIMIT 1',
                  [receivingPhoneId]
                );
                const waAcc = waAccRes.rows[0];
                if (waAcc) {
                  const msgLowerAuto = text.toLowerCase();
                  const pmAuto: Record<number, string> = {
                    9:  `Hello! 👋 Welcome to Almanzar. We specialize in *Crypto Exchange Development*. Our team will contact you shortly! 🚀`,
                    10: `Hello! 👋 Welcome to Almanzar. We build professional *Websites & Apps*. Our team will contact you shortly! 💻`,
                    11: `Hello! 👋 Welcome to Almanzar. We offer *Digital Marketing* solutions. Our team will contact you shortly! 📈`,
                    12: `Hello! 👋 Welcome to Almanzar. We provide *Video Editing* services. Our team will contact you shortly! 🎬`,
                    13: `Hello! 👋 Welcome to Almanzar. We offer *Trading* expertise. Our team will contact you shortly! 📊`,
                  };
                  const autoBody = companyId === 3
                    ? `Hello! 👋 Welcome to AVG Prime Tech. Thank you for reaching out. Our team will get back to you shortly.`
                    : (pmAuto[lead.project_id] || `Hello! 👋 Welcome to Almanzar. Thank you for reaching out. Our team will get back to you shortly.`);
                  await fetch(`https://graph.facebook.com/v18.0/${waAcc.phone_number_id}/messages`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${waAcc.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      to: from,
                      type: 'text',
                      text: { body: autoBody }
                    })
                  });
                  console.log(`[WA] ✅ Auto-reply sent to existing lead ${from}`);
                }
              }
            } catch (e) {
              console.log(`[WA] ❌ Auto-reply failed:`, e);
            }
          }
          // ─── Auto-detect project from Meta ad referral (Click-to-WhatsApp ads) ───
          let referralProjectId: number | null = null;
          let referralOwnerId: number | null = null;
          const referral = (msg as any).referral;
          if (referral && companyId) {
            const campaignName = (referral.headline || referral.source_id || '').trim();
            if (campaignName) {
              const existingProj = await db.query(
                'SELECT id, default_owner_id FROM projects WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
                [companyId, campaignName]
              );
              if (existingProj.rows.length > 0) {
                referralProjectId = existingProj.rows[0].id;
                referralOwnerId = existingProj.rows[0].default_owner_id || null;
              } else {
                const guessedOwnerId = guessOwnerFromCampaignName(campaignName);
                const newProj = await db.query(
                  `INSERT INTO projects (name, description, status, company_id, default_owner_id, created_at, updated_at)
                   VALUES ($1, $2, 'active', $3, $4, NOW(), NOW()) RETURNING id`,
                  [campaignName, `Auto-created from Meta ad: ${referral.source_url || referral.ad_id || ''}`, companyId, guessedOwnerId]
                );
                referralProjectId = newProj.rows[0].id;
                referralOwnerId = guessedOwnerId;
                console.log(`[WA] 🆕 Auto-created project "${campaignName}" (id ${referralProjectId}) for company #${companyId}, guessed owner ${guessedOwnerId}`);
              }
            }
          }

          if (!lead) {
            const adminId = await getAdminUserId(companyId);
            // Auto-detect project from message keywords
            const msgLower = text.toLowerCase();
            // Keywords per company
            const keywordMapByCompany: Record<number, Record<string, number>> = {
              8: { // ALMANZAR (legacy, kept for safety)
                'crypto': 9, 'bitcoin': 9, 'exchange': 9, 'token': 9, 'coin': 9, 'blockchain': 9,
                'web development': 10, 'website': 10, 'web design': 10, 'landing page': 10,
                'marketing': 11, 'digital': 11, 'seo': 11, 'ads': 11, 'social media': 11, 'instagram': 11, 'facebook': 11,
                'video': 12, 'editing': 12, 'reel': 12, 'youtube': 12, 'content': 12,
                'trading': 13, 'forex': 13, 'stock': 13, 'invest': 13,
              },
              11: { // Almanzar Digital
                'crypto': 9, 'bitcoin': 9, 'exchange': 9, 'token': 9, 'coin': 9, 'blockchain': 9,
                'web development': 10, 'website': 10, 'web design': 10, 'landing page': 10,
                'marketing': 11, 'digital': 11, 'seo': 11, 'ads': 11, 'social media': 11, 'instagram': 11, 'facebook': 11,
                'video': 12, 'editing': 12, 'reel': 12, 'youtube': 12, 'content': 12,
                'trading': 13, 'forex': 13, 'stock': 13, 'invest': 13,
              },
              12: { // Almanzar Primetech LLC
                'crypto': 9, 'bitcoin': 9, 'exchange': 9, 'token': 9, 'coin': 9, 'blockchain': 9,
                'web development': 10, 'website': 10, 'web design': 10, 'landing page': 10,
                'marketing': 11, 'digital': 11, 'seo': 11, 'ads': 11, 'social media': 11, 'instagram': 11, 'facebook': 11,
                'video': 12, 'editing': 12, 'reel': 12, 'youtube': 12, 'content': 12,
                'trading': 13, 'forex': 13, 'stock': 13, 'invest': 13,
              },
              3: { // AVG Prime Tech
                'telecaller': 14, 'tele caller': 14, 'telecalling': 14, 'bpo': 14, 'call center': 14,
                'video editor': 15, 'video editing': 15, 'editor': 15, 'editing': 15, 'reel': 15,
                'job': 16, 'placement': 16, 'vacancy': 16, 'hiring': 16, 'career': 16, 'work': 16, 'salary': 16,
              },
            };
            const keywordMap = keywordMapByCompany[companyId] || {};
            let detectedProjectId: number | null = null;
            for (const [keyword, projectId] of Object.entries(keywordMap)) {
              if (msgLower.includes(keyword)) { detectedProjectId = projectId; break; }
            }
            // Also check company-specific projects dynamically
            if (!detectedProjectId && companyId) {
              const projRes = await db.query('SELECT id, name FROM projects WHERE company_id = $1', [companyId]);
              for (const proj of projRes.rows) {
                if (msgLower.includes(proj.name.toLowerCase())) { detectedProjectId = proj.id; break; }
              }
            }
            // Auto-assign owner based on project
            const projectOwnerMap: Record<number, number> = {
              9: 66,  // Crypto Exchange → Syed
              10: 69, // Web Development → Jatin
              11: 67, // Digital Marketing → Himanshi
              12: 67, // Video Editing → Himanshi (was Nithin)
              13: 69, // Trading → Jatin (was Nithin)
            };
            if (referralProjectId) detectedProjectId = referralProjectId;
            let assignedOwnerId = adminId;
            if (referralOwnerId) {
              assignedOwnerId = referralOwnerId;
            } else if (detectedProjectId) {
              const projOwnerRes = await db.query('SELECT default_owner_id FROM projects WHERE id = $1', [detectedProjectId]);
              const projDefaultOwner = projOwnerRes.rows[0]?.default_owner_id;
              assignedOwnerId = projDefaultOwner || projectOwnerMap[detectedProjectId] || adminId;
            }
            const { rows: newLeadRows } = await db.query(
              `INSERT INTO leads
                 (contact_name, mobile, whatsapp, source, stage, owner_id, revenue, created_at, updated_at, company_id, project_id)
               VALUES ($1, $2, $3, 'WHATSAPP', 'NEW', $4, 0, NOW(), NOW(), $5, $6)
               RETURNING *`,
              [name, from, from, assignedOwnerId, companyId, detectedProjectId]
            );
            lead = newLeadRows[0];
            isNewLead = true;
            console.log(`[WA] ✅ Auto-created lead #${lead?.id} for ${from} in company #${companyId} project #${detectedProjectId}`);
            // Send one-time welcome message to new leads
            if (companyId === 11 || companyId === 12 || companyId === 3) {
              try {
                const waAccRes = await db.query(
                  'SELECT access_token, phone_number_id FROM whatsapp_accounts WHERE phone_number_id = $1 LIMIT 1',
                  [receivingPhoneId]
                );
                const waAcc = waAccRes.rows[0];
                if (waAcc) {
                  await fetch(`https://graph.facebook.com/v18.0/${waAcc.phone_number_id}/messages`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${waAcc.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      to: from,
                      type: 'text',
                      text: { body: (() => {
                        if (companyId === 3) return `Hello! 👋 Welcome to AVG Prime Tech. Thank you for reaching out. Our team will get back to you shortly.`;
                        const pm: Record<number, string> = {
                          9:  `Hello! 👋 Welcome to Almanzar. We specialize in *Crypto Exchange Development*. Our team will contact you shortly! 🚀`,
                          10: `Hello! 👋 Welcome to Almanzar. We build professional *Websites & Apps*. Our team will contact you shortly! 💻`,
                          11: `Hello! 👋 Welcome to Almanzar. We offer *Digital Marketing* solutions. Our team will contact you shortly! 📈`,
                          12: `Hello! 👋 Welcome to Almanzar. We provide *Video Editing* services. Our team will contact you shortly! 🎬`,
                          13: `Hello! 👋 Welcome to Almanzar. We offer *Trading* expertise. Our team will contact you shortly! 📊`,
                        };
                        return pm[detectedProjectId as number] || `Hello! 👋 Welcome to Almanzar. Thank you for reaching out. Our team will get back to you shortly.`;
                      })() }
                    })
                  });
                  console.log(`[WA] ✅ Welcome message sent to ${from}`);
                }
              } catch (e) {
                console.log(`[WA] ❌ Welcome message failed:`, e);
              }
            }
          }

          // Store with the actual receiving phone ID so conversations are scoped correctly
          const { rows: savedRows } = await db.query(
            `INSERT INTO whatsapp_messages
               (message_id, from_number, to_number, message_text, direction, status, contact_name, timestamp, is_read, company_id, phone_number_id)
             VALUES ($1, $2, $3, $4, 'inbound', 'received', $5, $6, false, $7, $3)
             ON CONFLICT (message_id) DO NOTHING
             RETURNING *`,
            [msgId, from, receivingPhoneId, text, name, ts, companyId]
          );

          // Download media immediately so it doesn't expire
          if (mediaType && savedRows?.length > 0) {
            const mediaMatch = text.match(/\[(image|document|audio|video|sticker):([^:\]]+)/);
            const mediaId = mediaMatch?.[2];
            if (mediaId) {
              const accountToken = (await db.query('SELECT access_token FROM whatsapp_accounts WHERE phone_number_id = $1', [receivingPhoneId])).rows[0]?.access_token || WHATSAPP_TOKEN;
              const cachedUrl = await downloadAndCacheMedia(mediaId, accountToken);
              if (cachedUrl) {
                await db.query('UPDATE whatsapp_messages SET message_text = $1 WHERE message_id = $2', [text.replace(mediaId, `cached:${cachedUrl}:${mediaId}`), msgId]);
              }
            }
          }
          const reqWithIo = req as any;
          if (reqWithIo.io && savedRows?.length > 0) {
            reqWithIo.io.emit('whatsapp:message', { ...savedRows[0], lead_id: lead?.id });
          }
        }

        for (const s of val?.statuses || []) {
          await db.query(
            `UPDATE whatsapp_messages SET status = $1 WHERE message_id = $2`,
            [s.status, s.id]
          );

          const reqWithIo = req as any;
          if (reqWithIo.io) {
            reqWithIo.io.emit('whatsapp:status', { message_id: s.id, status: s.status });
          }
        }
      }
    }
  } catch (err) {
    console.error('[WA] Webhook processing error:', err);
  }
};

// ─── Send Media (file upload) ─────────────────────────────────────────────────
export const sendMedia = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.company_id;
    const account = req.body.account;
    const { token, phoneId } = await getUserWACredentials(userId, account);
    const to: string = req.body.to;
    const contactName: string = req.body.contactName || '';

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const mime = file.mimetype;

    let waType = 'document';
    if (mime.startsWith('image/')) waType = 'image';
    else if (mime.startsWith('video/')) waType = 'video';
    else if (mime.startsWith('audio/')) waType = 'audio';

    const uploadForm = new FormDataNode();
    uploadForm.append('file', file.buffer, { filename: file.originalname, contentType: mime });
    uploadForm.append('messaging_product', 'whatsapp');

    const uploadRes = await nodeFetch(
      `https://graph.facebook.com/v18.0/${phoneId}/media`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...uploadForm.getHeaders() }, body: uploadForm }
    );
    const uploadData: any = await uploadRes.json();
    if (!uploadData.id) return res.status(500).json({ error: 'Media upload failed', detail: uploadData });

    const mediaId = uploadData.id;

    const body: any = {
      messaging_product: 'whatsapp',
      to,
      type: waType,
      [waType]: waType === 'document'
        ? { id: mediaId, filename: file.originalname }
        : { id: mediaId },
    };

    const sendRes = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const sendData: any = await sendRes.json();
    if (!sendData.messages?.[0]?.id) return res.status(500).json({ error: 'Send failed', detail: sendData });

    const messageId = sendData.messages[0].id;
    const lead = await findLeadByPhone(to, companyId);

    const msgText = waType === 'document'
      ? `[document:${mediaId}:${file.originalname}:${mime}]`
      : waType === 'image' ? `[image:${mediaId}]`
      : waType === 'video' ? `[video:${mediaId}]`
      : `[audio:${mediaId}]`;

    await db.query(
      `INSERT INTO whatsapp_messages (message_id, from_number, to_number, message_text, direction, status, contact_name, timestamp, company_id)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, NOW(), $6)
       ON CONFLICT (message_id) DO NOTHING`,
      [messageId, phoneId, to, msgText, contactName || lead?.contact_name || to, companyId]
    );

    res.json({ success: true, messageId, mediaId });
  } catch (err: any) {
    console.error('sendMedia error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const companyId = (req as any).user?.company_id;
  const userRole = (req as any).user?.role;
  try {
    if (userRole !== 'master_admin') {
      const check = await db.query('SELECT company_id FROM whatsapp_messages WHERE id = $1', [id]);
      if (check.rows.length === 0 || check.rows[0].company_id !== companyId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    await db.query('DELETE FROM whatsapp_messages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ─── Delete All Messages for a Contact ───────────────────────────────────────
export const deleteConversation = async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  const companyId = (req as any).user?.company_id;
  const userRole = (req as any).user?.role;
  try {
    let queryStr = 'DELETE FROM whatsapp_messages WHERE (from_number = $1 OR to_number = $1)';
    const params = [phone];
    if (userRole !== 'master_admin') {
      queryStr += ' AND company_id = $2';
      params.push(companyId);
    }
    await db.query(queryStr, params);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};// force redeploy Tue Jun 16 12:56:59 IST 2026
