export default async function handler(req, res) {
  const { method, body } = req;
  const { action, key, value } = body || {};

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const kv = async (cmd, ...args) => {
    const r = await fetch(`${url}/${[cmd, ...args.map(a => encodeURIComponent(a))].join("/")}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.json();
  };

  try {
    if (action === "get") {
      const data = await kv("get", key);
      return res.json({ value: data.result ?? null });
    }
    if (action === "set") {
      await kv("set", key, typeof value === "string" ? value : JSON.stringify(value));
      return res.json({ ok: true });
    }
    if (action === "delete") {
      await kv("del", key);
      return res.json({ ok: true });
    }
    if (action === "keys") {
      const data = await kv("keys", key || "*");
      return res.json({ keys: data.result ?? [] });
    }
    return res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
