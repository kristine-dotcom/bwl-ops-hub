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
      // Get EOD submissions for a specific date
      const url = new URL(req.url);
      const date = url.searchParams.get('date'); // e.g., "2026-03-10"
      
      if (!date) {
        return new Response(JSON.stringify({ error: 'Date parameter required' }), { status: 400, headers });
      }

      const key = `eod-${date}`;
      const submissions = await kv.get(key) || {};
      return new Response(JSON.stringify({ success: true, submissions }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { date, member, eodData } = body;

      if (!date || !member || !eodData) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
      }

      const key = `eod-${date}`;
      
      // CRITICAL: Load latest data first to prevent overwriting
      const existingData = await kv.get(key) || {};
      
      // Merge with existing
      const updatedData = {
        ...existingData,
        [member]: eodData
      };
      
      // Save merged data
      await kv.set(key, updatedData);
      
      console.log(`✅ EOD saved for ${member} on ${date} - Total: ${Object.keys(updatedData).length}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        submissions: updatedData,
        count: Object.keys(updatedData).length 
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (error) {
    console.error('EOD API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
