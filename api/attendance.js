import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET - fetch all attendance logs
    if (req.method === "GET") {
      const logs = await kv.get("attendance_logs") || [];
      return res.status(200).json({ success: true, logs });
    }

    // POST - save attendance logs
    if (req.method === "POST") {
      const { logs } = req.body;
      if (!logs) {
        return res.status(400).json({ success: false, error: "Logs required" });
      }
      
      await kv.set("attendance_logs", logs);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Attendance API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
