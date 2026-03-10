import { kv } from '@vercel/kv';

// Use Node.js runtime (supports @vercel/kv package)
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
      // Get attendance logs
      const logs = await kv.get('attendance-logs') || [];
      return res.status(200).json({ success: true, logs });
    }

    if (req.method === 'POST') {
      const { action, log, logs } = req.body;

      if (action === 'add') {
        // Add single log entry
        const currentLogs = await kv.get('attendance-logs') || [];
        const updatedLogs = [...currentLogs, log];
        await kv.set('attendance-logs', updatedLogs);
        return res.status(200).json({ success: true, logs: updatedLogs });
      }

      if (action === 'set') {
        // Replace all logs (bulk update)
        await kv.set('attendance-logs', logs);
        return res.status(200).json({ success: true, logs });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
