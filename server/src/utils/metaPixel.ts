import crypto from 'crypto';

function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendMetaLeadEvent(params: {
  email?: string;
  phone?: string;
  eventName?: string;
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const userData: Record<string, any> = {};
  if (params.email) userData.em = [hash(params.email)];
  if (params.phone) userData.ph = [hash(params.phone.replace(/\D/g, ''))];

  const body = {
    data: [
      {
        event_name: params.eventName || 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        user_data: userData,
      },
    ],
  };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await resp.json();
    console.log('[Meta CAPI] event sent:', data);
  } catch (err) {
    console.error('[Meta CAPI] error:', err);
  }
}
