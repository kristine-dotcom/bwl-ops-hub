export const config = { maxDuration: 60 };

const KEYWORDS = [
  "digital marketing services",
  "paid media advertising",
  "outbound sales services",
  "web design development",
  "influencer marketing services",
  "email marketing services",
  "social media marketing",
  "growth marketing agency",
  "performance marketing",
  "brand awareness campaign",
  "lead generation services",
  "content marketing services",
  "SEO digital advertising",
  "marketing communications agency",
  "public relations marketing",
];

const BWL_CONTEXT = `LEVERAGE. | David Perlov | $125M revenue generated | 11X ROAS | 20+ companies | Services: Outbound, Paid Media, Influencer, Email, Web/Graphic Design | 20% profit share on closed deals | david@buildwithleverage.com | (201) 290-1536 | buildwithleverage.com`;

const SLACK_USER_ID = "U09QJGY27JP"; // Kristine

async function callClaude(apiKey, prompt, maxTokens = 2000, useSearch = false) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...(useSearch ? { "anthropic-beta": "web-search-2025-03-05" } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return clean;
}

async function kvGet(key) {
  try {
    const r = await fetch(process.env.KV_REST_API_URL + "/get/" + key, {
      headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN },
    });
    const data = await r.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function kvSet(key, value) {
  try {
    await fetch(process.env.KV_REST_API_URL + "/set/" + key, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.KV_REST_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(value) }),
    });
  } catch {}
}

async function sendSlack(token, text) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ channel: SLACK_USER_ID, text }),
  });
}

export default async function handler(req, res) {
  // Allow manual trigger via POST, or cron via GET
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!apiKey) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const today = new Date().toISOString().split("T")[0];
  const results = [];

  try {
    // Step 1: Search RFPs across all keywords
    const keywordBatch = KEYWORDS.slice(0, 5).join(", "); // batch to save tokens
    const searchPrompt =
      "RFP research for BuildWithLeverage (growth/marketing agency). Find active RFPs for: " +
      keywordBatch +
      ". Today: " + today +
      ". Only include RFPs with deadlines in the future. Return ONLY valid JSON: " +
      '{"rfps":[{"title":"...","organization":"...","type":"Government|Corporate|Nonprofit|Other","budget":"...","deadline":"YYYY-MM-DD","description":"2 sentences","relevance_score":85,"services_needed":["Outbound"],"source_url":"url or empty","source":"platform name"}]}';

    const searchRaw = await callClaude(apiKey, searchPrompt, 3000, true);
    const searchClean = searchRaw.slice(searchRaw.indexOf("{"), searchRaw.lastIndexOf("}") + 1);
    let rfps = [];
    try {
      rfps = JSON.parse(searchClean).rfps || [];
    } catch {
      return res.status(200).json({ message: "No RFPs parsed", date: today });
    }

    // Step 2: Filter 80%+ score only
    const highFit = rfps.filter((r) => r.relevance_score >= 80);
    if (highFit.length === 0) {
      if (slackToken) {
        await sendSlack(slackToken, "*BWL Daily RFP Scan — " + today + "*\nNo high-fit RFPs found today (80%+ score). Will scan again tomorrow.");
      }
      return res.status(200).json({ message: "No high-fit RFPs", date: today });
    }

    // Step 3: Auto-generate proposals for high-fit RFPs
    for (const rfp of highFit.slice(0, 3)) { // max 3 per day to stay within limits
      try {
        // Meta call
        const metaPrompt =
          "Proposal writer for LEVERAGE. RFP: " + rfp.title +
          " | Org: " + rfp.organization +
          " | Type: " + rfp.type +
          " | Budget: " + rfp.budget +
          " | Services: " + (rfp.services_needed || []).join(", ") +
          ". Return ONLY compact JSON (no newlines in values): " +
          '{"subject_line":"A NEW X FOR ORG","why_bwl":["reason"],"requirements_checklist":[{"requirement":"req","addressed":true,"how":"how"}]}';

        const metaRaw = await callClaude(apiKey, metaPrompt, 1000);
        const metaClean = metaRaw.slice(metaRaw.indexOf("{"), metaRaw.lastIndexOf("}") + 1);
        let meta = {};
        try { meta = JSON.parse(metaClean); } catch { meta = { subject_line: rfp.title, why_bwl: [], requirements_checklist: [] }; }

        // Proposal text call
        const textPrompt =
          "Senior proposal writer for LEVERAGE. (BuildWithLeverage). " +
          BWL_CONTEXT +
          "\nRFP: " + rfp.title +
          " | Org: " + rfp.organization +
          " | Type: " + rfp.type +
          " | Budget: " + rfp.budget +
          " | Services: " + (rfp.services_needed || []).join(", ") +
          "\nWrite full proposal. Format: personal opening, 01 // THE OPPORTUNITY, 02 // WHAT WE BUILD, 03 // THE PILOT, 04 // THE MATH (pipe table Conservative/Moderate/Aggressive), 05 // INVESTMENT (pipe table ITEM|COST|NOTES, 20% profit share), 06 // NEXT STEPS. Use // KEY INSIGHT for standout points. Price HIGH for " + rfp.type + ". End: David Perlov // FOUNDER // LEVERAGE. // david@buildwithleverage.com // (201) 290-1536 // buildwithleverage.com\nPlain text only. No JSON. No markdown.";

        const proposalText = await callClaude(apiKey, textPrompt, 4000);

        results.push({
          id: Date.now() + Math.random(),
          title: rfp.title,
          organization: rfp.organization,
          type: rfp.type || "Other",
          budget: rfp.budget,
          deadline: rfp.deadline || "",
          services: rfp.services_needed || [],
          score: rfp.relevance_score,
          proposal: proposalText,
          subject_line: meta.subject_line || rfp.title,
          requirements_checklist: meta.requirements_checklist || [],
          status: "draft",
          revenue: "",
          notes: "Auto-generated by daily scanner — " + today,
          source_url: rfp.source_url || "",
          created_at: new Date().toISOString(),
          auto_generated: true,
        });
      } catch (e) {
        results.push({ error: e.message, title: rfp.title });
      }
    }

    // Step 4: Save to KV — merge with existing tracker
    if (results.length > 0) {
      const existing = await kvGet("rfp-tracker") || [];
      const merged = [...results, ...existing];
      await kvSet("rfp-tracker", merged);
    }

    // Step 5: Slack notification
    if (slackToken && results.length > 0) {
      const lines = results.map((r) =>
        "• *" + r.title + "* — " + r.organization + " | Score: " + r.score + " | Deadline: " + (r.deadline || "TBD") + (r.source_url ? "\n  🔗 " + r.source_url : "")
      ).join("\n");

      await sendSlack(
        slackToken,
        "*BWL Daily RFP Scan — " + today + "* ⚡\n" +
        results.length + " high-fit proposal" + (results.length > 1 ? "s" : "") + " auto-generated and saved to pipeline:\n\n" +
        lines +
        "\n\n👉 Review at https://bwl-ops-hub.vercel.app → RFP Engine → Pipeline"
      );
    }

    return res.status(200).json({
      success: true,
      date: today,
      scanned: rfps.length,
      highFit: highFit.length,
      generated: results.length,
      proposals: results.map((r) => ({ title: r.title, score: r.score })),
    });
  } catch (e) {
    console.error("Scan error:", e);
    return res.status(500).json({ error: e.message });
  }
}
