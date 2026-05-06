import type { VercelRequest, VercelResponse } from '@vercel/node';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const mediaId = req.query.mediaId as string;
  if (!mediaId) return res.status(400).json({ error: 'Missing mediaId' });

  try {
    let token = process.env.WHATSAPP_ACCESS_TOKEN || '';

    if (!token) {
      const { rows } = await pool.query(
        `SELECT whatsapp_token FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1`
      );
      token = rows[0]?.whatsapp_token || '';
    }

    if (!token) return res.status(400).json({ error: 'WhatsApp token missing' });

    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData = await metaRes.json();

    if (metaData.error) return res.status(400).json({ error: metaData.error.message });

    res.redirect(302, metaData.url);
  } catch (err: any) {
    console.error('[WA] media error:', err);
    res.status(500).json({ error: err.message });
  }
}
