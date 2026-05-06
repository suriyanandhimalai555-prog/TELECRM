import { Request, Response } from 'express';
import db from '../db';
import { leads, whatsappMessages } from '../db/schema';
import { eq, or, like, desc, and } from 'drizzle-orm';
import axios from 'axios';

const WA_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
const WA_TOKEN = process.env.WHATSAPP_TOKEN;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise any phone string to the last 10 digits so we can match
 * regardless of whether the DB stores "9876543210" or "+919876543210".
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Find a lead whose mobile or whatsapp field ends with the same 10 digits.
 */
async function findLeadByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  // Try exact suffix match on both columns
  const result = await db
    .select()
    .from(leads)
    .where(
      or(
        like(leads.mobile, `%${normalized}`),
        like(leads.whatsapp, `%${normalized}`)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

// ─── Webhook verification (GET) ──────────────────────────────────────────────

export const verifyWebhook = (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ─── Incoming message webhook (POST) ─────────────────────────────────────────

export const handleWebhook = async (req: Request, res: Response) => {
  // Always acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        // ── Handle incoming messages ──────────────────────────────────────
        for (const message of value?.messages ?? []) {
          const fromPhone  = message.from as string;           // e.g. "919876543210"
          const timestamp  = new Date(parseInt(message.timestamp) * 1000);
          const senderName = value?.contacts?.[0]?.profile?.name ?? fromPhone;

          let messageText = '';
          switch (message.type) {
            case 'text':
              messageText = message.text?.body ?? '';
              break;
            case 'image':
              messageText = '[Image]';
              break;
            case 'audio':
              messageText = '[Audio]';
              break;
            case 'video':
              messageText = '[Video]';
              break;
            case 'document':
              messageText = '[Document]';
              break;
            case 'location':
              messageText = '[Location]';
              break;
            default:
              messageText = `[${message.type}]`;
          }

          // ✅ Find existing lead by phone number (mobile OR whatsapp field)
          let lead = await findLeadByPhone(fromPhone);

          // ✅ If no lead exists, auto-create one from the WhatsApp contact
          if (!lead) {
            const [newLead] = await db
              .insert(leads)
              .values({
                contact_name : senderName,
                mobile       : fromPhone,
                whatsapp     : fromPhone,
                source       : 'WHATSAPP',
                stage        : 'NEW',
                owner_id     : 1,   // default to first admin; adjust as needed
                revenue      : 0,
                created_at   : new Date(),
              })
              .returning();
            lead = newLead;
            console.log(`[WhatsApp] Auto-created lead for ${fromPhone}`);
          }

          // ✅ Save the message linked to the lead
          await db.insert(whatsappMessages).values({
            lead_id    : lead.id,
            from_phone : fromPhone,
            to_phone   : value?.metadata?.display_phone_number ?? '',
            message    : messageText,
            type       : message.type,
            direction  : 'incoming',
            is_read    : false,
            wa_message_id : message.id,
            created_at : timestamp,
          });

          console.log(`[WhatsApp] Message from ${fromPhone} linked to lead #${lead.id}`);
        }

        // ── Handle message status updates (delivered / read / failed) ─────
        for (const status of value?.statuses ?? []) {
          await db
            .update(whatsappMessages)
            .set({ status: status.status, updated_at: new Date() })
            .where(eq(whatsappMessages.wa_message_id, status.id));
        }
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Webhook processing error:', error);
  }
};

// ─── Send a single message ───────────────────────────────────────────────────

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { to, message, lead_id } = req.body;
    if (!to || !message) {
      return res.status(400).json({ message: 'to and message are required' });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    const response = await axios.post(WA_API_URL, payload, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    });

    const waMessageId = response.data?.messages?.[0]?.id;

    // Persist outgoing message
    await db.insert(whatsappMessages).values({
      lead_id    : lead_id ?? null,
      from_phone : process.env.WHATSAPP_PHONE_NUMBER ?? '',
      to_phone   : to,
      message,
      type       : 'text',
      direction  : 'outgoing',
      is_read    : true,
      wa_message_id : waMessageId,
      created_at : new Date(),
    });

    return res.json({ success: true, message_id: waMessageId });
  } catch (error: any) {
    console.error('[WhatsApp] sendMessage error:', error?.response?.data ?? error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

// ─── Bulk send ───────────────────────────────────────────────────────────────

export const bulkSendMessage = async (req: Request, res: Response) => {
  try {
    const { contacts, message } = req.body as {
      contacts: { to: string; contactName: string }[];
      message: string;
    };

    if (!contacts?.length || !message) {
      return res.status(400).json({ message: 'contacts and message are required' });
    }

    const results = await Promise.allSettled(
      contacts.map(async ({ to, contactName }) => {
        // Personalise the message if it contains {name}
        const personalised = message.replace(/\{name\}/gi, contactName);

        const payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: personalised },
        };

        const response = await axios.post(WA_API_URL, payload, {
          headers: { Authorization: `Bearer ${WA_TOKEN}` },
        });

        const waMessageId = response.data?.messages?.[0]?.id;

        // Find lead to link message
        const lead = await findLeadByPhone(to);

        await db.insert(whatsappMessages).values({
          lead_id    : lead?.id ?? null,
          from_phone : process.env.WHATSAPP_PHONE_NUMBER ?? '',
          to_phone   : to,
          message    : personalised,
          type       : 'text',
          direction  : 'outgoing',
          is_read    : true,
          wa_message_id : waMessageId,
          created_at : new Date(),
        });

        return { to, success: true };
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;

    return res.json({
      success: true,
      sent: succeeded,
      failed,
      total: contacts.length,
    });
  } catch (error: any) {
    console.error('[WhatsApp] bulkSendMessage error:', error?.response?.data ?? error);
    return res.status(500).json({ message: 'Failed to send bulk messages' });
  }
};

// ─── Get conversation history for a phone number ─────────────────────────────

export const getHistory = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const normalized = normalizePhone(phone);

    // Find the lead first
    const lead = await findLeadByPhone(phone);
    if (!lead) {
      return res.json([]);
    }

    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.lead_id, lead.id))
      .orderBy(desc(whatsappMessages.created_at))
      .limit(100);

    return res.json(messages.reverse()); // chronological order
  } catch (error) {
    console.error('[WhatsApp] getHistory error:', error);
    return res.status(500).json({ message: 'Failed to get history' });
  }
};

// ─── Get all conversations (latest message per lead) ─────────────────────────

export const getConversations = async (req: Request, res: Response) => {
  try {
    // Get latest message per lead using a subquery approach
    const allMessages = await db
      .select({
        id          : whatsappMessages.id,
        lead_id     : whatsappMessages.lead_id,
        from_phone  : whatsappMessages.from_phone,
        to_phone    : whatsappMessages.to_phone,
        message     : whatsappMessages.message,
        direction   : whatsappMessages.direction,
        is_read     : whatsappMessages.is_read,
        created_at  : whatsappMessages.created_at,
        contact_name: leads.contact_name,
        mobile      : leads.mobile,
        stage       : leads.stage,
      })
      .from(whatsappMessages)
      .leftJoin(leads, eq(whatsappMessages.lead_id, leads.id))
      .orderBy(desc(whatsappMessages.created_at));

    // Deduplicate — keep only the latest message per lead
    const seen = new Set<number>();
    const conversations = allMessages.filter(msg => {
      const key = msg.lead_id ?? -1;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(conversations);
  } catch (error) {
    console.error('[WhatsApp] getConversations error:', error);
    return res.status(500).json({ message: 'Failed to get conversations' });
  }
};

// ─── Mark messages as read ───────────────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const lead = await findLeadByPhone(phone);
    if (!lead) return res.json({ success: true });

    await db
      .update(whatsappMessages)
      .set({ is_read: true, updated_at: new Date() })
      .where(
        and(
          eq(whatsappMessages.lead_id, lead.id),
          eq(whatsappMessages.direction, 'incoming'),
          eq(whatsappMessages.is_read, false)
        )
      );

    return res.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp] markAsRead error:', error);
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_ID}/message_templates`,
      { headers: { Authorization: `Bearer ${WA_TOKEN}` } }
    );
    return res.json(response.data?.data ?? []);
  } catch (error: any) {
    console.error('[WhatsApp] getTemplates error:', error?.response?.data ?? error);
    return res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const syncTemplates = async (req: Request, res: Response) => {
  // Re-use getTemplates — just a convenience alias
  return getTemplates(req, res);
};

export const sendTemplate = async (req: Request, res: Response) => {
  try {
    const { to, template_name, language_code = 'en_US', components = [], lead_id } = req.body;
    if (!to || !template_name) {
      return res.status(400).json({ message: 'to and template_name are required' });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name      : template_name,
        language  : { code: language_code },
        components,
      },
    };

    const response = await axios.post(WA_API_URL, payload, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    });

    const waMessageId = response.data?.messages?.[0]?.id;

    await db.insert(whatsappMessages).values({
      lead_id    : lead_id ?? null,
      from_phone : process.env.WHATSAPP_PHONE_NUMBER ?? '',
      to_phone   : to,
      message    : `[Template: ${template_name}]`,
      type       : 'template',
      direction  : 'outgoing',
      is_read    : true,
      wa_message_id : waMessageId,
      created_at : new Date(),
    });

    return res.json({ success: true, message_id: waMessageId });
  } catch (error: any) {
    console.error('[WhatsApp] sendTemplate error:', error?.response?.data ?? error);
    return res.status(500).json({ message: 'Failed to send template' });
  }
};