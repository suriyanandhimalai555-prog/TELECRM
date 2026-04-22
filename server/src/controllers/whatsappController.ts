import { Request, Response } from 'express';
import db from '../config/database';
import fetch from 'node-fetch';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1128846923635649';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'avgcrm_webhook_secret_2024';
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export const sendMessage = async (req: Request, res: Response) => {
  const { to, message, contactName } = req.body;
  const authReq = req as any;
  const userId = authReq.user?.id;

  if (!to || !message) return res.status(400).json({ error: 'to and message required' });

  try {
    // Fetch user keys
    const { rows: userRows } = await db.query('SELECT whatsapp_token, whatsapp_phone_id FROM users WHERE id = $1', [userId]);
    const userKeys = userRows[0];

    const token = userKeys?.whatsapp_token || WHATSAPP_TOKEN;
    const phoneId = userKeys?.whatsapp_phone_id || PHONE_NUMBER_ID;

    if (!token) return res.status(500).json({ error: 'WhatsApp Access Token missing. Please configure it in Settings.' });

    const phone = to.replace(/[^0-9]/g, '');

    const waRes = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        messaging_product: 'whatsapp', 
        to: phone, 
        type: 'text', 
        text: { body: message } 
      }),
    });

    const data = await waRes.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const msgId = data.messages?.[0]?.id;

    // Save to DB
    const { rows: savedRows } = await db.query(
      `INSERT INTO whatsapp_messages(message_id, from_number, to_number, message_text, direction, status, contact_name, is_read)
       VALUES($1, $2, $3, $4, 'outbound', 'sent', $5, true) RETURNING *`,
      [msgId, PHONE_NUMBER_ID, phone, message, contactName || '']
    );

    // Emit socket event
    const reqWithIo = req as any;
    if (reqWithIo.io) {
      reqWithIo.io.emit('whatsapp:message', savedRows[0]);
    }

    res.json({ success: true, messageId: msgId });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: 'Failed to send' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  try {
    const { rows } = await db.query(
      `SELECT * FROM whatsapp_messages
       WHERE from_number=$1 OR to_number=$1
       ORDER BY timestamp ASC LIMIT 200`,
      [phone]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  const { search } = req.query;
  try {
    let query = `
      SELECT 
         contact_number,
         contact_name,
         message_text AS last_message,
         timestamp AS last_timestamp,
         direction AS last_direction,
         status AS last_status,
         unread_count
       FROM (
         SELECT 
           CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END AS contact_number,
           contact_name,
           message_text,
           timestamp,
           direction,
           status,
           ROW_NUMBER() OVER(
             PARTITION BY (CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END) 
             ORDER BY timestamp DESC
           ) as rn,
           COUNT(CASE WHEN direction = 'inbound' AND is_read = false THEN 1 END) OVER(
             PARTITION BY (CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END)
           ) as unread_count
         FROM whatsapp_messages
       ) t
       WHERE rn = 1
    `;
    
    const params: any[] = [];
    if (search) {
      query += ` AND (contact_name LIKE $1 OR contact_number LIKE $1 OR last_message LIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY last_timestamp DESC`;

    const { rows } = await db.query(query, params);
    res.json({ conversations: rows });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;

        // Incoming messages
        if (val.messages) {
          for (const msg of val.messages) {
            const from = msg.from;
            const text = msg.text?.body || '';
            const msgId = msg.id;
            const ts = new Date(parseInt(msg.timestamp) * 1000);
            const contact = val.contacts?.find((c: any) => c.wa_id === from);
            const name = contact?.profile?.name || '';

            console.log(`📩 INBOUND: ${from} (${name}): ${text}`);

            const { rows: savedRows } = await db.query(
              `INSERT INTO whatsapp_messages(message_id, from_number, to_number, message_text, direction, status, contact_name, timestamp, is_read)
               VALUES($1, $2, $3, $4, 'inbound', 'received', $5, $6, false) 
               ON CONFLICT(message_id) DO NOTHING 
               RETURNING *`,
              [msgId, from, PHONE_NUMBER_ID, text, name, ts]
            );

            // Emit socket event
            const reqWithIo = req as any;
            if (reqWithIo.io && savedRows?.length > 0) {
              reqWithIo.io.emit('whatsapp:message', savedRows[0]);
            }
          }
        }

        // Status updates (sent → delivered → read)
        if (val.statuses) {
          for (const s of val.statuses) {
            await db.query(
              `UPDATE whatsapp_messages SET status=$1 WHERE message_id=$2`,
              [s.status, s.id]
            );

            // Emit status update
            const reqWithIo = req as any;
            if (reqWithIo.io) {
              reqWithIo.io.emit('whatsapp:status', { message_id: s.id, status: s.status });
            }
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.sendStatus(500);
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { phone } = req.params;
  const phoneClean = phone.replace(/[^0-9]/g, '');

  try {
    await db.query(
      `UPDATE whatsapp_messages 
       SET is_read = true 
       WHERE (from_number = $1 OR to_number = $1) AND direction = 'inbound' AND is_read = false`,
      [phoneClean]
    );

    // Emit socket event
    const reqWithIo = req as any;
    if (reqWithIo.io) {
      reqWithIo.io.emit('whatsapp:read', { phone: phoneClean });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};
