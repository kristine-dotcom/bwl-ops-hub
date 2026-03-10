import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method === 'GET') {
      // Get all announcements
      const announcements = await kv.get('announcements') || [];
      return new Response(JSON.stringify({ success: true, announcements }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, announcements } = body;

      if (action === 'set') {
        // Replace all announcements
        await kv.set('announcements', announcements);
        return new Response(JSON.stringify({ success: true, announcements }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Announcements API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
