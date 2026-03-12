import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: "Date required" });

    const sodData = await kv.get(`sod-${date}`);
    return res.status(200).json({ success: true, date, submissions: sodData || {} });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
