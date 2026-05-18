import nodeFetch from 'node-fetch';
import FormDataNode from 'form-data';
import { Request, Response } from 'express';
import db from '../config/database';

const PHONE_NUMBER_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID   || '1023163197557145';
const PHONE_NUMBER_ID_2 = process.env.WHATSAPP_PHONE_NUMBER_ID_2 || ''; // ← add to .env
const VERIFY_TOKEN      = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'avgcrm_webhook_2024';
const WHATSAPP_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WABA_ID           = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '27198788186399333';

// ─── Helper: pick phone ID by account index ───────────────────────────────────
function getPhoneId(account?: string | number): string {
  return String(account) === '1' && PHONE_NUMBER_ID_2
    ? PHONE_NUMBER_ID_2
    : PHONE_NUMBER_ID;
}

// ─── Helper: normalize phone to last 10 digits for matching ─────────────────
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

// ─── Helper: find a lead by phone number ────────────────────────────────────
async function findLeadByPhone(phone: string): Promise<any | null> {
  const normalized = normalizePhone(phone);
  const { rows } = await db.query(
    `SELECT * FROM leads 
     WHERE mobile LIKE $1 
        OR whatsapp LIKE $1 
     LIMIT 1`,
    [`%${normalized}`]
  );
  return rows[0] ?? null;
}

// ─── Helper: get admin user id ───────────────────────────────────────────────
async function getAdminUserId(): Promise<number> {
  const { rows } = await db.query(
    `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1`
  );
  return rows[0]?.id ?? 1;
}

// ─── Helper: get user's WhatsApp credentials ─────────────────────────────────
async function getUserWACredentials(userId: number, account?: string | number) {
  const { rows } = await db.query(
    'SELECT whatsapp_token, whatsapp_phone_id, whatsapp_waba_id FROM users WHERE id = $1',
    [userId]
  );
  const u = rows[0];
  return {
    token:   u?.whatsapp_token    || WHATSAPP_TOKEN,
    phoneId: getPhoneId(account) || u?.whatsapp_phone_id || PHONE_NUMBER_ID,
    wabaId:  u?.whatsapp_waba_id  || WABA_ID,
  };
}

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
    let token = WHATSAPP_TOKEN;

    if (!token) {
      try {
        const adminId = await getAdminUserId();
        const creds = await getUserWACredentials(adminId);
        if (creds.token) token = creds.token;
      } catch (dbErr) {
        console.error('[WA] proxyMedia: failed to get admin token from DB:', dbErr);
      }
    }

    if (!token) {
      return res.status(400).json({ error: 'WhatsApp token missing. Please set it in Settings.' });
    }

    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData = await metaRes.json();

    if (metaData.error) {
      console.error('[WA] proxyMedia meta error:', metaData.error);
      return res.status(400).json({ error: metaData.error.message });
    }

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
  try {
    const { rows } = await db.query(
      'SELECT * FROM whatsapp_templates ORDER BY created_at DESC'
    );
    res.json({ templates: rows });
  } catch (err) {
    console.error('[WA] getTemplates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

export const syncTemplates = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const { token, wabaId } = await getUserWACredentials(userId);
    if (!token) return res.status(400).json({ error: 'WhatsApp Token missing' });

    const waRes = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await waRes.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    for (const temp of data.data || []) {
      await db.query(
        `INSERT INTO whatsapp_templates (name, category, language, components, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET
           category   = EXCLUDED.category,
           language   = EXCLUDED.language,
           components = EXCLUDED.components,
           status     = EXCLUDED.status`,
        [temp.name, temp.category, temp.language, JSON.stringify(temp.components), temp.status]
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
    if (data.error) return res.status(400).json({ error: data.error.message });

    const msgId = data.messages?.[0]?.id;

    await db.query(
      `INSERT INTO whatsapp_messages
         (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true)`,
      [msgId, phoneId, phone, `Template: ${templateName}`, contactName || '']
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
               (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read)
             VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true)`,
            [msgId, phoneId, phone, message, name]
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
    if (data.error) return res.status(400).json({ error: data.error.message });

    const msgId = data.messages?.[0]?.id;

    const { rows: savedRows } = await db.query(
      `INSERT INTO whatsapp_messages
         (message_id, from_number, to_number, message_text, direction, status, contact_name, is_read)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, true)
       RETURNING *`,
      [msgId, phoneId, phone, message, contactName || '']
    );

    const reqWithIo = req as any;
    if (reqWithIo.io) {
      reqWithIo.io.emit('whatsapp:message', savedRows[0]);
    }

    res.json({ success: true, messageId: msgId });
  } catch (err) {
    console.error('[WA] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send' });
  }
};

// ─── Get message history for a phone ─────────────────────────────────────────

export const getHistory = async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  try {
    const { rows } = await db.query(
      `SELECT * FROM whatsapp_messages
       WHERE from_number = $1 OR to_number = $1
       ORDER BY timestamp ASC
       LIMIT 200`,
      [phone]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error('[WA] getHistory error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

// ─── Get all conversations ────────────────────────────────────────────────────

export const getConversations = async (req: Request, res: Response) => {
  const { search, account } = req.query;

  // Filter by which phone number ID sent/received the message
  const phoneId = getPhoneId(account as string);

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
        lead_stage
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
            ORDER BY wm.timestamp DESC
          ) AS rn,
          COUNT(CASE WHEN wm.direction = 'inbound' AND wm.is_read = false THEN 1 END) OVER (
            PARTITION BY (CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END)
          ) AS unread_count,
          l.id           AS lead_id,
          l.contact_name AS lead_name,
          l.stage        AS lead_stage
        FROM whatsapp_messages wm
        LEFT JOIN leads l
          ON RIGHT(l.mobile,   10) = RIGHT(
               CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END, 10
             )
          OR RIGHT(l.whatsapp, 10) = RIGHT(
               CASE WHEN wm.direction = 'inbound' THEN wm.from_number ELSE wm.to_number END, 10
             )
        WHERE
          -- scope to the right phone number ID
          (wm.direction = 'inbound'  AND wm.to_number   = $1)
          OR
          (wm.direction = 'outbound' AND wm.from_number = $1)
      ) t
      WHERE rn = 1
    `;

    const params: any[] = [phoneId];
    const role = (req as any).user?.role || 'EMPLOYEE';
    const uid = (req as any).user?.id || 0;

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

export const handleWebhook = async (req: Request, res: Response) => {
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;

        // Determine which of our phone IDs received this message
        const receivingPhoneId = val?.metadata?.phone_number_id || PHONE_NUMBER_ID;

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
            case 'interactive':
              text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive message]';
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
              text = `[${msg.type} message]`;
          }

          console.log(`[WA] 📩 INBOUND from ${from} (${name}): type=${msg.type} → phoneId=${receivingPhoneId}`);

          let lead = await findLeadByPhone(from);
          if (!lead) {
            const adminId = await getAdminUserId();
            const { rows: newLeadRows } = await db.query(
              `INSERT INTO leads
                 (contact_name, mobile, whatsapp, source, stage, owner_id, revenue, created_at, updated_at)
               VALUES ($1, $2, $3, 'WHATSAPP', 'NEW', $4, 0, NOW(), NOW())
               RETURNING *`,
              [name, from, from, adminId]
            );
            lead = newLeadRows[0];
            console.log(`[WA] ✅ Auto-created lead #${lead?.id} for ${from} (owner: ${adminId})`);
          }

          // Store with the actual receiving phone ID so conversations are scoped correctly
          const { rows: savedRows } = await db.query(
            `INSERT INTO whatsapp_messages
               (message_id, from_number, to_number, message_text, direction, status, contact_name, timestamp, is_read)
             VALUES ($1, $2, $3, $4, 'inbound', 'received', $5, $6, false)
             ON CONFLICT (message_id) DO NOTHING
             RETURNING *`,
            [msgId, from, receivingPhoneId, text, name, ts]
          );

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
    const lead = await findLeadByPhone(to);

    const msgText = waType === 'document'
      ? `[document:${mediaId}:${file.originalname}:${mime}]`
      : waType === 'image' ? `[image:${mediaId}]`
      : waType === 'video' ? `[video:${mediaId}]`
      : `[audio:${mediaId}]`;

    await db.query(
      `INSERT INTO whatsapp_messages (message_id, from_number, to_number, message_text, direction, status, contact_name, timestamp)
       VALUES ($1, $2, $3, $4, 'outbound', 'sent', $5, NOW())
       ON CONFLICT (message_id) DO NOTHING`,
      [messageId, phoneId, to, msgText, contactName || lead?.contact_name || to]
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
  try {
    await db.query('DELETE FROM whatsapp_messages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};