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

    // GET SOD submissions for a specific date
    if (req.method === "GET") {
      const sodKey = `sod-${date}`;
      const sodData = await kv.get(sodKey);
      
      return res.status(200).json({ 
        success: true, 
        date,
        submissions: sodData || {} 
      });
    }

    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });

  } catch (error) {
    console.error("SOD API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
