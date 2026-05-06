export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const parts = req.url?.split('?')[0]?.split('/') || [];
  const mediaId = parts[parts.length - 1];

  if (!mediaId) {
    res.status(400).json({ error: 'Missing mediaId' });
    return;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    res.status(400).json({ error: 'WHATSAPP_ACCESS_TOKEN env var not set in Vercel' });
    return;
  }

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData = await metaRes.json();

    if (metaData.error) {
      res.status(400).json({ error: metaData.error.message });
      return;
    }

    res.redirect(302, metaData.url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
