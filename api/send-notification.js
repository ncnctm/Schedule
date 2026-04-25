// Vercel Serverless Function — sends FCM push notification
// POST /api/send-notification
// Body: { token, title, body, tag }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { token, title, body, tag } = req.body || {};
  if (!token) { res.status(400).json({ error: 'No FCM token provided' }); return; }

  const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
  if (!FCM_SERVER_KEY) { res.status(500).json({ error: 'FCM_SERVER_KEY not set in environment' }); return; }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'key=' + FCM_SERVER_KEY
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: title || '⏰ Reminder',
          body: body || '',
          icon: '/icon.png',
          badge: '/icon.png',
          tag: tag || 'reminder',
          click_action: '/'
        },
        data: { tag: tag || 'reminder', url: '/' },
        android: { priority: 'high', notification: { channel_id: 'reminders', sound: 'default', vibrate_timings: ['0.2s','0.1s','0.2s'] } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } }, headers: { 'apns-priority': '10' } },
        webpush: { headers: { Urgency: 'high' }, notification: { requireInteraction: true, vibrate: [200,100,200] } }
      })
    });

    const data = await response.json();
    if (data.failure > 0) {
      res.status(400).json({ error: 'FCM error', details: data });
    } else {
      res.status(200).json({ success: true, messageId: data.results?.[0]?.message_id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
