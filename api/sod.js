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
      // Get SOD submissions for a specific date
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Date parameter required' });
      }

      const key = `sod-${date}`;
      const submissions = await kv.get(key) || {};
      return res.status(200).json({ success: true, submissions });
    }

    if (req.method === 'POST') {
      const { date, member, sodData } = req.body;

      if (!date || !member || !sodData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const key = `sod-${date}`;
      
      // CRITICAL: Load latest data first to prevent overwriting
      const existingData = await kv.get(key) || {};
      
      // Merge with existing
      const updatedData = {
        ...existingData,
        [member]: sodData
      };
      
      // Save merged data
      await kv.set(key, updatedData);
      
      console.log(`✅ SOD saved for ${member} on ${date} - Total: ${Object.keys(updatedData).length}`);
      
      return res.status(200).json({ 
        success: true, 
        submissions: updatedData,
        count: Object.keys(updatedData).length 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('SOD API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
