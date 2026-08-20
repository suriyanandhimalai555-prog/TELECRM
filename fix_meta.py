content = open('server/src/controllers/leadController.ts').read()

# Add Meta Conversions API function at the top after imports
old = "export const deleteLead = async (req: AuthRequest, res: Response) => {"

new = """// ─── Meta Conversions API ─────────────────────────────────────────────────────
async function sendMetaConversionEvent(lead: any, stage: string) {
  try {
    const crypto = require('crypto');
    const hash = (val: string) => val ? crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex') : undefined;
    const payload: any = {
      data: [{
        event_name: stage === 'new' ? 'Lead' : 'Other',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'AVG CRM',
          stage: stage
        },
        user_data: {}
      }]
    };
    if (lead.email) payload.data[0].user_data.em = [hash(lead.email)];
    if (lead.mobile) payload.data[0].user_data.ph = [hash(lead.mobile.replace(/[^0-9]/g, ''))];
    const TOKEN = 'EAAODCzZAjLToBRnPZAgRMaARTfD4nXHmFhphbCHMa0ZAwTpDvPE5go8IkmcjWMjshUGlXZCzPikZAZBimPLtGnjwWWmewSAn2KlhPoL00vKpZAwMZCtVyp2EYWgSOFKWfT0BcDF643fFdWrN3ELmZCwRby38TuGNOnXAXJL757aNCSlm1Q4ld182Enh7Nm1ctVdPdkgZDZD';
    const DATASET_ID = '1298634335807741';
    const res = await fetch(`https://graph.facebook.com/v25.0/${DATASET_ID}/events?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[Meta] Conversion event sent:', stage, data);
  } catch (err) {
    console.error('[Meta] Conversion API error:', err);
  }
}

export const deleteLead = async (req: AuthRequest, res: Response) => {"""

content = content.replace(old, new)

# Trigger Meta event after lead stage update
old = "    const updatedLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);\n    res.json(updatedLeadResult.rows[0]);"
new = """    const updatedLeadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    const updatedLead = updatedLeadResult.rows[0];
    if (body.stage) {
      sendMetaConversionEvent(updatedLead, body.stage).catch(() => {});
    }
    res.json(updatedLead);"""

content = content.replace(old, new)

open('server/src/controllers/leadController.ts', 'w').write(content)
print('✅ Meta Conversions API added')
