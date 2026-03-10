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
      // Get attendance logs
      const logs = await kv.get('attendance-logs') || [];
      return new Response(JSON.stringify({ success: true, logs }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, log, logs } = body;

      if (action === 'add') {
        // Add single log entry
        const currentLogs = await kv.get('attendance-logs') || [];
        const updatedLogs = [...currentLogs, log];
        await kv.set('attendance-logs', updatedLogs);
        return new Response(JSON.stringify({ success: true, logs: updatedLogs }), { status: 200, headers });
      }

      if (action === 'set') {
        // Replace all logs (bulk update)
        await kv.set('attendance-logs', logs);
        return new Response(JSON.stringify({ success: true, logs }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('Attendance API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
