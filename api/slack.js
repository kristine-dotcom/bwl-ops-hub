// api/slack.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  const SLACK_BOT_TOKEN = process.env.VITE_SLACK_BOT_TOKEN;
  const SLACK_CHANNEL = process.env.VITE_SLACK_CHANNEL || '#attendance-admin';

  if (!SLACK_BOT_TOKEN) {
    return res.status(500).json({ error: 'Slack bot token not configured' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: message
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return res.status(500).json({ error: data.error });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Slack fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
