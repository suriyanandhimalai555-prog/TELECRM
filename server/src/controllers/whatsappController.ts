import { Request, Response } from 'express';
import db from '../config/database';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1023163197557145';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'avgcrm_webhook_2024';
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

// ==================== WEBHOOK VERIFICATION ====================
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
};

// ==================== WEBHOOK RECEIVE MESSAGES ====================
export const receiveMessage = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry;
      for (const entry of entries) {
        const changes = entry.changes;
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            const messages = value.messages;
            const contacts = value.contacts;

            if (messages && messages.length > 0) {
              for (const message of messages) {
                await processIncomingMessage(message, contacts, value.metadata?.phone_number_id);
              }
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

// ==================== PROCESS INCOMING MESSAGE & SAVE TO DB ====================
const processIncomingMessage = async (message: any, contacts: any[], phoneNumberId: string) => {
  try {
    const from = message.from; // Customer's WhatsApp number
    const timestamp = message.timestamp;
    const type = message.type; // 'text', 'image', 'document', 'audio', 'video', 'button', 'interactive'

    let messageText = '';
    let mediaId = '';
    let mimeType = '';
    let filename = '';

    // Extract content based on type
    if (type === 'text') {
      messageText = message.text?.body || '';
    } 
    else if (type === 'image') {
      mediaId = message.image?.id;
      mimeType = message.image?.mime_type;
      filename = `image_${Date.now()}.jpg`;
      messageText = `[image:${mediaId}]`;
    }
    else if (type === 'document') {
      mediaId = message.document?.id;
      mimeType = message.document?.mime_type;
      filename = message.document?.filename || `document_${Date.now()}`;
      messageText = `[document:${mediaId}:${filename}:${mimeType}]`;
    }
    else if (type === 'audio') {
      mediaId = message.audio?.id;
      mimeType = message.audio?.mime_type;
      messageText = `[audio:${mediaId}]`;
    }
    else if (type === 'video') {
      mediaId = message.video?.id;
      mimeType = message.video?.mime_type;
      messageText = `[video:${mediaId}]`;
    }
    else if (type === 'button') {
      messageText = message.button?.text || '';
    }
    else if (type === 'interactive') {
      messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
    }

    // Get contact name
    const contactName = contacts?.[0]?.profile?.name || from;

    // Save to database
    const query = `
      INSERT INTO whatsapp_messages 
      (from_number, to_number, message_text, message_type, media_id, mime_type, filename, status, timestamp, contact_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.query(query, [
      from,
      phoneNumberId,
      messageText,
      type,
      mediaId,
      mimeType,
      filename,
      'received',
      new Date(parseInt(timestamp) * 1000),
      contactName
    ]);

    console.log(`Message saved from ${from}: ${messageText.substring(0, 50)}`);
  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
};

// ==================== SEND TEXT MESSAGE ====================
export const sendTextMessage = async (req: Request, res: Response) => {
  try {
    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({ error: 'Missing required fields: to, text' });
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });

    const data = await response.json();

    // Save outgoing message to DB
    if (data.messages?.[0]?.id) {
      await db.query(
        `INSERT INTO whatsapp_messages (from_number, to_number, message_text, message_type, status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [PHONE_NUMBER_ID, to, text, 'text', 'sent', new Date()]
      );
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error sending text message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ==================== SEND MEDIA (IMAGE/DOCUMENT) ====================
export const sendMediaMessage = async (req: Request, res: Response) => {
  try {
    const { to, mediaId, type = 'image', caption = '' } = req.body;

    if (!to || !mediaId) {
      return res.status(400).json({ error: 'Missing required fields: to, mediaId' });
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: type,
      [type]: { id: mediaId, caption: caption }
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error sending media message:', error);
    res.status(500).json({ error: 'Failed to send media' });
  }
};

// ==================== PROXY MEDIA (FIXED FOR VERCEL) ====================
export const proxyMedia = async (req: Request, res: Response) => {
  const { mediaId } = req.params;

  if (!mediaId) {
    return res.status(400).json({ error: 'Media ID is required' });
  }

  try {
    // Step 1: Get media URL from Meta
    const metaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });

    if (!metaRes.ok) {
      throw new Error(`Meta API error: ${metaRes.status}`);
    }

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || 'application/octet-stream';
    const filename = metaData.filename || `media_${mediaId}`;

    // Step 2: Try buffer download (works on most platforms)
    try {
      const fileRes = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
      });

      if (fileRes.ok) {
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        return res.send(buffer);
      }
    } catch (bufferError) {
      console.warn('Buffer download failed, trying redirect fallback:', bufferError.message);
    }

    // Step 3: Fallback - redirect to Meta's signed URL (works on Vercel)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.redirect(downloadUrl);
    
  } catch (error) {
    console.error('Error proxying media:', error);
    res.status(500).json({ 
      error: 'Failed to fetch media',
      details: error.message 
    });
  }
};

// ==================== GET MESSAGE HISTORY ====================
export const getMessageHistory = async (req: Request, res: Response) => {
  try {
    const { contactNumber, limit = 50 } = req.query;

    let query = `
      SELECT id, from_number, to_number, message_text, message_type, 
             media_id, filename, mime_type, status, timestamp, contact_name
      FROM whatsapp_messages 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    let params = [parseInt(limit as string)];

    if (contactNumber) {
      query = `
        SELECT id, from_number, to_number, message_text, message_type, 
               media_id, filename, mime_type, status, timestamp, contact_name
        FROM whatsapp_messages 
        WHERE from_number = ? OR to_number = ?
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      params = [contactNumber as string, contactNumber as string, parseInt(limit as string)];
    }

    const messages = await db.query(query, params);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// ==================== GET CONVERSATIONS ====================
export const getConversations = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        COALESCE(from_number, to_number) as contact_number,
        MAX(contact_name) as contact_name,
        MAX(timestamp) as last_message_time,
        (SELECT message_text FROM whatsapp_messages w2 
         WHERE COALESCE(w2.from_number, w2.to_number) = COALESCE(w1.from_number, w1.to_number)
         ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT message_type FROM whatsapp_messages w2 
         WHERE COALESCE(w2.from_number, w2.to_number) = COALESCE(w1.from_number, w1.to_number)
         ORDER BY timestamp DESC LIMIT 1) as last_message_type,
        COUNT(*) as message_count
      FROM whatsapp_messages w1
      GROUP BY contact_number
      ORDER BY last_message_time DESC
    `;

    const conversations = await db.query(query);
    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// ==================== GET TEMPLATES ====================
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/message_templates`,
      {
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
      }
    );
    const data = await response.json();
    res.status(200).json({ success: true, templates: data.data || [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// ==================== BULK SEND ====================
export const bulkSend = async (req: Request, res: Response) => {
  try {
    const { numbers, message } = req.body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !message) {
      return res.status(400).json({ error: 'Missing required fields: numbers (array), message' });
    }

    const results = [];
    for (const to of numbers) {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: { body: message }
          })
        });
        const data = await response.json();
        results.push({ to, success: response.ok, data });
      } catch (err) {
        results.push({ to, success: false, error: err.message });
      }
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Error in bulk send:', error);
    res.status(500).json({ error: 'Failed to send bulk messages' });
  }
};