import { kv } from '@vercel/kv';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all announcements
      const announcements = await kv.get('announcements') || [];
      return res.status(200).json({ success: true, announcements });
    }

    if (req.method === 'POST') {
      const { action, announcements } = req.body;

      if (action === 'set') {
        // Replace all announcements
        await kv.set('announcements', announcements);
        return res.status(200).json({ success: true, announcements });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Announcements API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
