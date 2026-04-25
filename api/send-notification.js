// Vercel Serverless Function — sends OneSignal push notification
// Place this file at: api/send-notification.js
// POST /api/send-notification
// Body: { playerId, title, body, tag }
//
// Required Vercel env vars:
//   ONESIGNAL_APP_ID       — from OneSignal dashboard → Settings → Keys & IDs
//   ONESIGNAL_REST_API_KEY — from OneSignal dashboard → Settings → Keys & IDs

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { playerId, title, body, tag } = req.body || {};

  if (!playerId) {
    res.status(400).json({ error: 'No OneSignal playerId provided' });
    return;
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    res.status(500).json({ error: 'OneSignal env vars not set. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Vercel.' });
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + ONESIGNAL_REST_API_KEY
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: [playerId],
        headings: { en: title || '⏰ Reminder' },
        contents: { en: body || '' },
        priority: 10,
        android_channel_id: 'reminders',
        ios_sound: 'default',
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        web_push_topic: tag || 'reminder',
        url: '/'
      })
    });

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      res.status(400).json({ error: 'OneSignal error', details: data.errors });
    } else {
      res.status(200).json({ success: true, id: data.id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
