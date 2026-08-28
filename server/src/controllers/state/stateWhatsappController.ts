import { Response, Request } from 'express';
import db from '../../config/database';
import { StateAuthRequest, STATE_ROLES } from '../../middleware/stateAuth';

const VERIFY_TOKEN = process.env.STATE_WA_VERIFY_TOKEN || 'state_crm_verify_token_change_me';

export async function canViewWhatsappNumber(user: any, phoneNumberId: string): Promise<boolean> {
  if (user.role === 'master' || user.role === 'admin') return true;
  const result = await db.query(
    'SELECT 1 FROM state_crm_whatsapp_numbers WHERE phone_number_id = $1 AND state_head_user_id = $2',
    [phoneNumberId, user.id]
  );
  return result.rows.length > 0;
}

// ─── Numbers management (master/admin only) ────────────────────────────────

export async function listWhatsappNumbers(req: StateAuthRequest, res: Response) {
  const user = req.stateUser!;
  try {
    let result;
    if (user.role === 'master' || user.role === 'admin') {
      result = await db.query(
        `SELECT n.id, n.label, n.phone_number, n.phone_number_id, n.waba_id, n.state_head_user_id, n.status, n.created_at, u.name AS state_head_name
         FROM state_crm_whatsapp_numbers n
         LEFT JOIN state_crm_users u ON u.id = n.state_head_user_id
         ORDER BY n.created_at DESC`
      );
    } else {
      result = await db.query(
        `SELECT id, label, phone_number, phone_number_id, waba_id, state_head_user_id, status, created_at
         FROM state_crm_whatsapp_numbers WHERE state_head_user_id = $1`,
        [user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('listWhatsappNumbers error:', err);
    res.status(500).json({ error: 'Failed to fetch WhatsApp numbers' });
  }
}

export async function createWhatsappNumber(req: StateAuthRequest, res: Response) {
  const { label, phone_number, phone_number_id, waba_id, access_token, state_head_user_id } = req.body;
  const requester = req.stateUser!;
  if (!label || !phone_number || !phone_number_id || !waba_id || !access_token || !state_head_user_id) {
    return res.status(400).json({ message: 'label, phone_number, phone_number_id, waba_id, access_token, state_head_user_id are all required' });
  }
  try {
    const targetUser = await db.query('SELECT role FROM state_crm_users WHERE id = $1', [state_head_user_id]);
    if (targetUser.rows.length === 0) {
      return res.status(400).json({ message: 'state_head_user_id does not match a real user' });
    }
    if (targetUser.rows[0].role !== 'state_head') {
      return res.status(400).json({ message: 'WhatsApp numbers can only be assigned to a state_head user' });
    }
    const result = await db.query(
      `INSERT INTO state_crm_whatsapp_numbers (label, phone_number, phone_number_id, waba_id, access_token, state_head_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, label, phone_number, phone_number_id, waba_id, state_head_user_id, status, created_at`,
      [label, phone_number, phone_number_id, waba_id, access_token, state_head_user_id, requester.id]
    );
    res.status(201).json({ number: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ message: 'That phone_number_id is already registered' });
    console.error('createWhatsappNumber error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteWhatsappNumber(req: StateAuthRequest, res: Response) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM state_crm_whatsapp_numbers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteWhatsappNumber error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Conversations & history ────────────────────────────────────────────────

export async function getConversations(req: StateAuthRequest, res: Response) {
  const user = req.stateUser!;
  try {
    let numberIds: string[];
    if (user.role === 'master' || user.role === 'admin') {
      const all = await db.query('SELECT phone_number_id FROM state_crm_whatsapp_numbers');
      numberIds = all.rows.map((r: any) => r.phone_number_id);
    } else {
      const mine = await db.query('SELECT phone_number_id FROM state_crm_whatsapp_numbers WHERE state_head_user_id = $1', [user.id]);
      numberIds = mine.rows.map((r: any) => r.phone_number_id);
    }
    if (numberIds.length === 0) return res.json({ conversations: [] });

    const { rows } = await db.query(
      `SELECT DISTINCT ON (phone_number_id, contact_number)
         phone_number_id,
         CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END AS contact_number,
         contact_name,
         message_text AS last_message,
         timestamp AS last_timestamp,
         direction AS last_direction,
         status AS last_status
       FROM (
         SELECT *, CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END AS contact_number
         FROM state_crm_whatsapp_messages
         WHERE phone_number_id = ANY($1)
       ) sub
       ORDER BY phone_number_id, contact_number, timestamp DESC`,
      [numberIds]
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ error: 'Database error' });
  }
}

export async function getHistory(req: StateAuthRequest, res: Response) {
  const user = req.stateUser!;
  const { phoneNumberId, contact } = req.params;
  try {
    const allowed = await canViewWhatsappNumber(user, phoneNumberId);
    if (!allowed) return res.status(403).json({ message: 'You do not have access to this WhatsApp number' });

    const { rows } = await db.query(
      `SELECT * FROM state_crm_whatsapp_messages
       WHERE phone_number_id = $1 AND (from_number = $2 OR to_number = $2)
       ORDER BY timestamp ASC`,
      [phoneNumberId, contact]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ error: 'Database error' });
  }
}

export async function markAsRead(req: StateAuthRequest, res: Response) {
  const user = req.stateUser!;
  const { phoneNumberId, contact } = req.params;
  try {
    const allowed = await canViewWhatsappNumber(user, phoneNumberId);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    await db.query(
      `UPDATE state_crm_whatsapp_messages SET is_read = true
       WHERE phone_number_id = $1 AND from_number = $2 AND direction = 'inbound' AND is_read = false`,
      [phoneNumberId, contact]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ error: 'Database error' });
  }
}

// ─── Send (text only for v1) ────────────────────────────────────────────────

export async function sendMessage(req: StateAuthRequest, res: Response) {
  const user = req.stateUser!;
  const { phone_number_id, to, text } = req.body;
  if (!phone_number_id || !to || !text) {
    return res.status(400).json({ message: 'phone_number_id, to, and text are required' });
  }
  try {
    const allowed = await canViewWhatsappNumber(user, phone_number_id);
    if (!allowed) return res.status(403).json({ message: 'You do not have access to this WhatsApp number' });

    const numRes = await db.query('SELECT access_token FROM state_crm_whatsapp_numbers WHERE phone_number_id = $1', [phone_number_id]);
    if (numRes.rows.length === 0) return res.status(404).json({ message: 'WhatsApp number not found' });
    const accessToken = numRes.rows[0].access_token;

    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    const metaData: any = await metaRes.json();
    if (!metaData.messages?.[0]?.id) {
      console.error('[StateWA] send failed:', metaData);
      return res.status(502).json({ message: 'WhatsApp send failed', detail: metaData });
    }

    const saved = await db.query(
      `INSERT INTO state_crm_whatsapp_messages (phone_number_id, message_id, from_number, to_number, message_text, direction, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, 'outbound', 'sent', NOW())
       RETURNING *`,
      [phone_number_id, metaData.messages[0].id, phone_number_id, to, text]
    );

    const io = (req as any).io;
    if (io) io.to(`wa:${phone_number_id}`).to('wa:all').emit('state-whatsapp:message', saved.rows[0]);

    res.json({ success: true, message: saved.rows[0] });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ─── Webhook (public — called by Meta directly, no state auth) ─────────────

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[StateWA] ✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

export async function handleWebhook(req: Request, res: Response) {
  res.sendStatus(200); // ack immediately, Meta requires a fast 200

  const body: any = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const val = change.value;
        const receivingPhoneId = val?.metadata?.phone_number_id;
        if (!receivingPhoneId) continue;

        // Only process numbers we actually manage
        const knownNumber = await db.query('SELECT 1 FROM state_crm_whatsapp_numbers WHERE phone_number_id = $1', [receivingPhoneId]);
        if (knownNumber.rows.length === 0) continue;

        for (const msg of val?.messages || []) {
          const from = msg.from as string;
          const msgId = msg.id as string;
          const ts = new Date(parseInt(msg.timestamp) * 1000);
          const contact = val.contacts?.find((c: any) => c.wa_id === from);
          const name = contact?.profile?.name || from;

          let text = '';
          let mediaType = '';
          if (msg.type === 'text') {
            text = msg.text?.body || '';
          } else if (['image', 'document', 'audio', 'video', 'sticker'].includes(msg.type)) {
            mediaType = msg.type;
            const mediaId = msg[msg.type]?.id || '';
            text = `[${msg.type}:${mediaId}]`; // TODO: media download/caching, follow-up piece
          } else {
            console.log(`[StateWA] Skipping unsupported message type: ${msg.type}`);
            continue;
          }

          const saved = await db.query(
            `INSERT INTO state_crm_whatsapp_messages
               (phone_number_id, message_id, from_number, to_number, contact_name, message_text, media_type, direction, status, is_read, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'inbound', 'received', false, $8)
             ON CONFLICT (message_id) DO NOTHING
             RETURNING *`,
            [receivingPhoneId, msgId, from, receivingPhoneId, name, text, mediaType || null, ts]
          );

          const io = (req as any).io;
          if (io && saved.rows.length > 0) io.to(`wa:${receivingPhoneId}`).to('wa:all').emit('state-whatsapp:message', saved.rows[0]);
        }

        for (const s of val?.statuses || []) {
          await db.query(`UPDATE state_crm_whatsapp_messages SET status = $1 WHERE message_id = $2`, [s.status, s.id]);
          const io = (req as any).io;
          if (io) io.to(`wa:${receivingPhoneId}`).to('wa:all').emit('state-whatsapp:status', { message_id: s.id, status: s.status });
        }
      }
    }
  } catch (err) {
    console.error('[StateWA] Webhook processing error:', err);
  }
}
