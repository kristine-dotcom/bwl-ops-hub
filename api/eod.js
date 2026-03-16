import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  
  try {
    // GET: Retrieve EOD data
    if (req.method === "GET") {
      const { date } = req.query;
      if (!date) return res.status(400).json({ success: false, error: "Date required" });
      
      const eodData = await kv.get(`eod-${date}`);
      return res.status(200).json({ success: true, submissions: eodData || {} });
    }
    
    // POST: Save EOD data
    if (req.method === "POST") {
      const { date, submissions } = req.body;
      if (!date) return res.status(400).json({ success: false, error: "Date required" });
      if (!submissions) return res.status(400).json({ success: false, error: "Submissions required" });
      
      await kv.set(`eod-${date}`, submissions);
      return res.status(200).json({ success: true, submissions });
    }
    
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
