export const config = { maxDuration: 120 };

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
  return text.replace(/```json|```/g, "").trim();
}

async function kvGet(key) {
  try {
    const r = await fetch(process.env.KV_REST_API_URL + "/get/" + key, {
      headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN },
    });
    const data = await r.json();
    if (!data.result) return null;
    return JSON.parse(data.result);
  } catch { return null; }
}

async function kvSet(key, value) {
  try {
    await fetch(process.env.KV_REST_API_URL + "/pipeline", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.KV_REST_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["SET", key, JSON.stringify(value)]]),
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
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!apiKey) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const today = new Date().toISOString().split("T")[0];

  try {
    // Step 1: Search RFPs with web search — get real data with source URLs
    const keywordBatch = KEYWORDS.slice(0, 5).join(", ");
    const searchPrompt =
      "Search the web for real, active RFPs (Requests for Proposal) for a growth/marketing agency. " +
      "Look for RFPs related to: " + keywordBatch +
      ". Today is " + today + ". " +
      "IMPORTANT: Only include RFPs with real source URLs and future deadlines. Do not make up RFPs. " +
      "For each RFP found, include the actual URL where it was found. " +
      "Return ONLY valid JSON: " +
      '{"rfps":[{"title":"exact RFP title","organization":"real org name","type":"Government|Corporate|Nonprofit|Other","budget":"exact budget if listed or Unknown","deadline":"YYYY-MM-DD or Unknown","description":"2 sentences about what they need","relevance_score":85,"services_needed":["service"],"source_url":"actual URL where RFP was found","source":"website name"}]}';

    const searchRaw = await callClaude(apiKey, searchPrompt, 2000, true);

    const firstBrace = searchRaw.indexOf("{");
    const lastBrace = searchRaw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(200).json({ message: "No RFPs parsed", date: today, debug: searchRaw.slice(0, 300) });
    }

    const searchClean = searchRaw.slice(firstBrace, lastBrace + 1);
    let rfps = [];
    try {
      rfps = JSON.parse(searchClean).rfps || [];
    } catch (parseErr) {
      return res.status(200).json({ message: "No RFPs parsed", date: today, debug: searchClean.slice(0, 300) });
    }

    // Step 2: Filter 80%+ score only
    const highFit = rfps.filter((r) => r.relevance_score >= 80);
    if (highFit.length === 0) {
      if (slackToken) {
        await sendSlack(slackToken, "*BWL Daily RFP Scan — " + today + "*\nNo high-fit RFPs found today. Will scan again tomorrow.");
      }
      return res.status(200).json({ message: "No high-fit RFPs", date: today });
    }

    // Step 3: Generate proposal for TOP 1 RFP only (avoids rate limit)
    const rfp = highFit[0];
    let result = null;

    try {
      const metaPrompt =
        "Proposal writer for LEVERAGE. RFP: " + rfp.title +
        " | Org: " + rfp.organization +
        " | Type: " + rfp.type +
        " | Budget: " + rfp.budget +
        " | Services: " + (rfp.services_needed || []).join(", ") +
        ". Return ONLY compact JSON (no newlines in values): " +
        '{"subject_line":"compelling subject line","why_bwl":["reason1","reason2"],"requirements_checklist":[{"requirement":"req","addressed":true,"how":"how"}]}';

      const metaRaw = await callClaude(apiKey, metaPrompt, 800);
      const metaClean = metaRaw.slice(metaRaw.indexOf("{"), metaRaw.lastIndexOf("}") + 1);
      let meta = {};
      try { meta = JSON.parse(metaClean); } catch { meta = { subject_line: rfp.title, why_bwl: [], requirements_checklist: [] }; }

      const textPrompt =
        "Senior proposal writer for LEVERAGE. (BuildWithLeverage). " +
        BWL_CONTEXT +
        "\nWrite a full winning proposal for this RFP:" +
        "\nTitle: " + rfp.title +
        "\nOrganization: " + rfp.organization +
        "\nType: " + rfp.type +
        "\nBudget: " + rfp.budget +
        "\nServices needed: " + (rfp.services_needed || []).join(", ") +
        "\nDescription: " + (rfp.description || "") +
        "\nFormat: personal opening paragraph, 01 // THE OPPORTUNITY, 02 // WHAT WE BUILD, 03 // THE PILOT, 04 // THE MATH (pipe table with Conservative/Moderate/Aggressive scenarios), 05 // INVESTMENT (pipe table ITEM|COST|NOTES with 20% profit share option), 06 // NEXT STEPS. " +
        "Use // KEY INSIGHT: to highlight standout points. Price HIGH for " + rfp.type + " client. " +
        "End with: David Perlov // FOUNDER // LEVERAGE. // david@buildwithleverage.com // (201) 290-1536 // buildwithleverage.com\n" +
        "Plain text only. No JSON. No markdown symbols.";

      const proposalText = await callClaude(apiKey, textPrompt, 3000);

      result = {
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
      };
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    // Step 4: Save to KV — safe merge
    const existing = await kvGet("rfp-tracker");
    const validExisting = Array.isArray(existing) ? existing : [];
    const merged = [result, ...validExisting];
    await kvSet("rfp-tracker", merged);

    // Step 5: Slack notification
    if (slackToken) {
      await sendSlack(
        slackToken,
        "*BWL Daily RFP Scan — " + today + "* ⚡\n" +
        "New proposal auto-generated:\n\n" +
        "• *" + result.title + "* — " + result.organization +
        " | Score: " + result.score +
        " | Deadline: " + (result.deadline || "TBD") +
        (result.source_url ? "\n  🔗 " + result.source_url : "") +
        "\n\n👉 Review at https://bwl-ops-hub.vercel.app → RFP Engine → Pipeline"
      );
    }

    return res.status(200).json({
      success: true,
      date: today,
      scanned: rfps.length,
      highFit: highFit.length,
      generated: 1,
      proposal: { title: result.title, organization: result.organization, score: result.score, source_url: result.source_url },
    });

  } catch (e) {
    console.error("Scan error:", e);
    return res.status(500).json({ error: e.message });
  }
}
