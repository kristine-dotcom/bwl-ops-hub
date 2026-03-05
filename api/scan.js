// ✅ FIXED: kvGet — unwrap Upstash { result: "..." } correctly
async function kvGet(key) {
  try {
    const r = await fetch(process.env.KV_REST_API_URL + "/get/" + key, {
      headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN },
    });
    const data = await r.json();
    if (!data.result) return null;
    const parsed = JSON.parse(data.result);
    return parsed;
  } catch { return null; }
}

// ✅ FIXED: kvSet — Upstash REST expects the value as a plain string in the URL, not JSON body
async function kvSet(key, value) {
  try {
    const encoded = encodeURIComponent(JSON.stringify(value));
    await fetch(process.env.KV_REST_API_URL + "/set/" + key + "/" + encoded, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.KV_REST_API_TOKEN,
      },
    });
  } catch {}
}

// ✅ FIXED: Step 4 — safe merge, guards against corrupted/non-array existing data
if (results.length > 0) {
  const existing = await kvGet("rfp-tracker");
  const validExisting = Array.isArray(existing) ? existing : []; // 👈 THIS is the fix for l.filter error
  const merged = [...results, ...validExisting];
  await kvSet("rfp-tracker", merged);
}
