// api/slack.js
// Vercel Serverless Function to proxy Slack API calls
// This avoids CORS issues when calling Slack from the browser

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId, isAnnouncement } = req.body; // isAnnouncement flag for channel selection
  const SLACK_BOT_TOKEN = process.env.VITE_SLACK_BOT_TOKEN;
  const SLACK_CHANNEL = process.env.VITE_SLACK_CHANNEL || '#attendance-admin';
  const ANNOUNCEMENTS_CHANNEL = process.env.VITE_ANNOUNCEMENTS_CHANNEL || '#team-announcements';

  if (!SLACK_BOT_TOKEN) {
    console.error('❌ Slack bot token not configured');
    return res.status(500).json({ error: 'Slack bot token not configured' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Determine target: userId (DM), announcements channel, or default channel
  let target;
  if (userId) {
    target = userId; // DM
  } else if (isAnnouncement) {
    target = ANNOUNCEMENTS_CHANNEL; // #team-announcements
  } else {
    target = SLACK_CHANNEL; // #attendance-admin
  }

  try {
    console.log('🔵 Sending to Slack:', userId ? `DM to ${userId}` : target);
    console.log('📝 Message:', message);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: target,
        text: message
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Slack API error:', data.error);
      return res.status(500).json({ error: data.error, details: data });
    }

    console.log('✅ Slack message sent successfully');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Slack fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
