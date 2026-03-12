import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: "Date parameter required" 
      });
    }

    // GET EOD submissions for a specific date
    if (req.method === "GET") {
      const eodKey = `eod-${date}`;
      const eodData = await kv.get(eodKey);
      
      return res.status(200).json({ 
        success: true, 
        date,
        submissions: eodData || {} 
      });
    }

    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });

  } catch (error) {
    console.error("EOD API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
