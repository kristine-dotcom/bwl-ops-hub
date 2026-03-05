import { useState } from "react";

const BWL = {
  bg: "#F5F0E8", black: "#0A0A0A", orange: "#E8390E",
  white: "#FFFFFF", gray: "#888888", lightGray: "#C8C2B8", darkGray: "#333333",
  font: "'Arial Black', 'Arial Bold', Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

const DEFAULT_SLACK_IDS = {
  "David Perlov": "U08BQH5JJDD",
  "Cyril Butanas": "U09HHPVSSUQ",
  "Caleb Bentil": "U0AE1T4N7A8",
  "Darlene Mae Malolos": "U0A8GV25V0A",
  "Suki Santos": "U093GFVM7D1",
  "Kristine Miel Zulaybar": "U093GFXPK3M",
  "Kristine Mirabueno": "U09QJGY27JP",
};

const storage = {
  get: (key) => {
    try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  delete: (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

function weekLabel() {
  const now = new Date(), day = now.getDay(), monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── RESPONSIVE ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  useState(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  });
  return isMobile;
};

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
function exportPDF(title, contentId) {
  const printWindow = window.open("", "_blank");
  const content = document.getElementById(contentId)?.innerHTML || "";
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial Black', Arial, sans-serif; background: #F5F0E8; color: #0A0A0A; padding: 40px; }
        .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 3px solid #0A0A0A; margin-bottom: 32px; }
        .pdf-logo { font-size: 22px; font-weight: 900; letter-spacing: -1px; }
        .pdf-logo span { color: #E8390E; }
        .pdf-meta { font-size: 10px; letter-spacing: 2px; color: #888; font-family: 'Courier New', monospace; text-align: right; }
        .pdf-title { font-size: 11px; color: #E8390E; font-weight: 900; letter-spacing: 3px; margin-bottom: 6px; }
        button { display: none !important; }
        textarea { display: none !important; }
        input { display: none !important; }
        [data-hide-pdf] { display: none !important; }
        pre, .pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.7; }
        .section { margin-bottom: 24px; border: 1.5px solid #0A0A0A; padding: 16px; background: white; }
        .section-label { font-size: 9px; font-weight: 900; letter-spacing: 3px; margin-bottom: 10px; }
        .bullet { padding-left: 10px; border-left: 2px solid #E8390E; margin-bottom: 6px; font-size: 12px; line-height: 1.5; font-family: 'Courier New', monospace; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="pdf-header">
        <div class="pdf-logo">LEVERAGE<span>.</span></div>
        <div class="pdf-meta">
          <div>${title.toUpperCase()}</div>
          <div>${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>
      ${content}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); };
}

function ExportBtn({ title, contentId }) {
  return (
    <button onClick={() => exportPDF(title, contentId)}
      style={{ padding: "9px 18px", background: BWL.black, color: BWL.white, border: "none", fontSize: 11, fontWeight: 900, cursor: "pointer", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 }}>
      📄 EXPORT PDF
    </button>
  );
}

const Card = ({ children, style = {} }) => <div style={{ background: BWL.white, border: `1.5px solid ${BWL.black}`, borderRadius: 0, ...style }}>{children}</div>;
const CardHeader = ({ label, color = BWL.orange }) => <div style={{ padding: "10px 16px", borderBottom: `1.5px solid ${BWL.black}`, fontSize: 10, color, fontWeight: 900, letterSpacing: 3, fontFamily: BWL.font }}>{label}</div>;

function Textarea({ label, value, onChange, placeholder, minHeight = 120 }) {
  return (
    <Card>
      {label && <CardHeader label={label} />}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", minHeight, background: "transparent", border: "none", color: BWL.black, fontSize: 13, padding: 16, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
    </Card>
  );
}

function Btn({ onClick, disabled, loading, label, color }) {
  const bg = disabled ? "#ccc" : (color || BWL.black);
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width: "100%", padding: 13, borderRadius: 10, background: bg, color: BWL.white, border: "none", fontSize: 14, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 1 }}>
      {loading ? "⏳ Generating..." : label}
    </button>
  );
}

function Bullets({ label, items, color }) {
  if (!items?.length) return null;
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 10, color, fontWeight: 900, letterSpacing: 2, marginBottom: 10 }}>{label}</div>
      {items.map((w, i) => <div key={i} style={{ fontSize: 12, color: BWL.black, marginBottom: 8, paddingLeft: 10, borderLeft: `2px solid ${color}`, lineHeight: 1.5 }}>{w}</div>)}
    </Card>
  );
}

function ResultBlock({ label, content, color = BWL.orange, copyable }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color, fontWeight: 900, letterSpacing: 2 }}>{label}</div>
        {copyable && <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ background: copied ? "#10b981" : BWL.black, color: BWL.white, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{copied ? "✅ Copied!" : "📋 Copy"}</button>}
      </div>
      <div style={{ fontSize: 13, color: BWL.black, lineHeight: 1.8, whiteSpace: "pre-wrap", background: BWL.bg, borderRadius: 8, padding: 14 }}>{content}</div>
    </Card>
  );
}

function Err({ msg }) { return msg ? <div style={{ background: "#fff0ee", border: `1px solid ${BWL.orange}`, borderRadius: 10, padding: 14, color: BWL.orange, fontSize: 13 }}>{msg}</div> : null; }

const TEAM_OPS = ["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const INPUT_TYPES = [{ key: "transcript", label: "📋 Meeting Transcript" },{ key: "sod", label: "🌅 SOD Report" },{ key: "email", label: "📧 Emails" },{ key: "slack", label: "💬 Slack" }];

function OpsPulse({ slackIds }) {
  const [inputs, setInputs] = useState({ transcript: "", sod: "", email: "", slack: "" });
  const [activeTab, setActiveTab] = useState("transcript");
  const [result, setResult] = useState(() => { const s = storage.get("ops-pulse-current"); return s ? JSON.parse(s.value) : null; });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState(() => { const s = storage.get("ops-pulse-checked"); return s ? JSON.parse(s.value) : {}; });
  const [selectedMember, setSelectedMember] = useState(null);
  const [view, setView] = useState("team");
  const [slackStatus, setSlackStatus] = useState({});
  const [showInput, setShowInput] = useState(false);

  const clearTasks = () => {
    setResult(null); setChecked({});
    storage.delete("ops-pulse-current"); storage.delete("ops-pulse-checked");
  };

  const sendDM = async (member) => {
    const userId = slackIds?.[member];
    if (!userId) { setSlackStatus(p => ({ ...p, [member]: "❌ No ID" })); return; }
    const token = storage.get("slack-token")?.value;
    if (!token) { setSlackStatus(p => ({ ...p, [member]: "❌ No Token" })); return; }
    const tasks = result?.team_tasks?.[member]?.tasks || [];
    const taskLines = tasks.map((t, i) => `${i+1}. ${t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢"} ${t.task}${t.due ? ` (${t.due})` : ""}`).join("\n");
    const text = `📋 *Your Tasks — ${weekLabel()}*\nHi ${member.split(" ")[0]}! Here are your tasks for this week:\n\n${taskLines}\n\n_Sent from BWL Operations Hub_`;
    setSlackStatus(p => ({ ...p, [member]: "⏳ Sending..." }));
    try {
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, channel: userId, text })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSlackStatus(p => ({ ...p, [member]: "✅ Sent!" }));
    } catch (e) {
      setSlackStatus(p => ({ ...p, [member]: "❌ Failed" }));
    }
    setTimeout(() => setSlackStatus(p => ({ ...p, [member]: null })), 3000);
  };

  const sendAll = () => TEAM_OPS.forEach(member => { if (result?.team_tasks?.[member]?.tasks?.length) sendDM(member); });
  const hasInput = Object.values(inputs).some(v => v.trim());

  const generate = async () => {
    setLoading(true); setResult(null); setError(null); setChecked({});
    storage.delete("ops-pulse-current"); storage.delete("ops-pulse-checked");
    const context = INPUT_TYPES.filter(t => inputs[t.key].trim()).map(t => `=== ${t.label} ===\n${inputs[t.key]}`).join("\n\n");
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const prompt = `You are AI Chief of Staff for BuildWithLeverage. Today is ${today}. Generate weekly tasks per team member.
Team: ${TEAM_OPS.join(", ")}
IMPORTANT: SOD Report tasks belong to Kristine Mirabueno unless stated otherwise.
For each task include due_day (Monday/Tuesday/Wednesday/Thursday/Friday/EOW).
INPUTS:\n${context}
Return ONLY valid JSON:
{"week_summary":"...","team_tasks":{"Suki Santos":{"role":"...","tasks":[{"task":"...","priority":"high|medium|low","due":"...","due_day":"Monday","type":"action|follow-up|proactive"}],"blockers":[]},"Kristine Mirabueno":{"role":"...","tasks":[],"blockers":[]},"Kristine Miel Zulaybar":{"role":"...","tasks":[],"blockers":[]},"Caleb Bentil":{"role":"...","tasks":[],"blockers":[]},"David Perlov":{"role":"...","tasks":[],"blockers":[]},"Cyril Butanas":{"role":"...","tasks":[],"blockers":[]},"Darlene Mae Malolos":{"role":"...","tasks":[],"blockers":[]}},"follow_ups_needed":["..."],"risks":["..."]}`;
    try {
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed); setShowInput(false);
      storage.set("ops-pulse-current", JSON.stringify(parsed));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const toggleCheck = (member, idx) => {
    const newChecked = { ...checked, [`${member}-${idx}`]: !checked[`${member}-${idx}`] };
    setChecked(newChecked);
    storage.set("ops-pulse-checked", JSON.stringify(newChecked));
  };

  const isOverdue = (dueDay) => {
    if (!dueDay) return false;
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return days.indexOf(dueDay) !== -1 && days.indexOf(dueDay) < new Date().getDay();
  };

  const pColor = p => ({ high: "#ef4444", medium: "#f59e0b", low: "#10b981" }[p] || BWL.gray);
  const tIcon = t => ({ action: "⚡", "follow-up": "🔄", proactive: "🚀" }[t] || "📌");

  const getProgress = member => {
    const tasks = result?.team_tasks?.[member]?.tasks || [];
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((_, i) => checked[`${member}-${i}`]).length / tasks.length) * 100);
  };

  const teamProgress = () => {
    if (!result) return 0;
    let total = 0, done = 0;
    TEAM_OPS.forEach(m => { const t = result.team_tasks?.[m]?.tasks || []; total += t.length; done += t.filter((_, i) => checked[`${m}-${i}`]).length; });
    return total ? Math.round((done / total) * 100) : 0;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: BWL.black }}>{weekLabel()}</div>
          {result && <div style={{ fontSize: 11, color: BWL.gray, marginTop: 2 }}>Tasks loaded — {teamProgress()}% complete</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {result && <button onClick={clearTasks} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: BWL.white, color: "#ef4444", border: "1px solid #ef444433", cursor: "pointer" }}>🗑 Clear</button>}
          <button onClick={() => setShowInput(!showInput)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: showInput ? BWL.black : BWL.orange, color: BWL.white, border: "none", cursor: "pointer" }}>
            {showInput ? "✕ Close" : result ? "⚡ New Week" : "⚡ Generate Tasks"}
          </button>
        </div>
      </div>
      {(showInput || !result) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${BWL.lightGray}` }}>
              {INPUT_TYPES.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: "10px 6px", fontSize: 11, fontWeight: 600, background: activeTab === t.key ? BWL.bg : "transparent", color: activeTab === t.key ? BWL.black : BWL.gray, border: "none", borderBottom: activeTab === t.key ? `2px solid ${BWL.orange}` : "2px solid transparent", cursor: "pointer" }}>
                  {t.label}{inputs[t.key].trim() && <span style={{ marginLeft: 3, color: "#10b981" }}>●</span>}
                </button>
              ))}
            </div>
            <textarea value={inputs[activeTab]} onChange={e => setInputs(p => ({ ...p, [activeTab]: e.target.value }))} placeholder={`Paste ${INPUT_TYPES.find(t => t.key === activeTab)?.label.split(" ").slice(1).join(" ")} here...`}
              style={{ width: "100%", minHeight: 140, background: "transparent", border: "none", color: BWL.black, fontSize: 13, padding: 16, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
          </Card>
          <Btn onClick={generate} disabled={!hasInput} loading={loading} label={`⚡ GENERATE OPS PULSE — ${weekLabel()}`} />
          <Err msg={error} />
        </div>
      )}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: BWL.orange, fontWeight: 900, letterSpacing: 2 }}>{weekLabel().toUpperCase()}</div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, color: BWL.orange }}>{teamProgress()}%</div><div style={{ fontSize: 9, color: BWL.gray }}>TEAM DONE</div></div>
            </div>
            <div style={{ background: BWL.lightGray, borderRadius: 20, height: 8, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${teamProgress()}%`, background: BWL.orange, borderRadius: 20, transition: "width 0.3s" }} />
            </div>
            <p style={{ margin: 0, color: BWL.darkGray, fontSize: 13, lineHeight: 1.7 }}>{result.week_summary}</p>
          </Card>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[["team","👥 Team"],["person","👤 Per-Person"]].map(([v,l]) => (
              <button key={v} onClick={() => { setView(v); if (v==="team") setSelectedMember(null); }}
                style={{ padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: view===v ? BWL.black : BWL.white, color: view===v ? BWL.white : BWL.gray, border: view===v ? "none" : `1px solid ${BWL.lightGray}`, cursor: "pointer" }}>{l}</button>
            ))}
            <button onClick={sendAll} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#1a1a2e", color: "#a78bfa", border: "1px solid #2a2a4a", cursor: "pointer" }}>📨 Send All to Slack</button>
            <ExportBtn title={`OPS PULSE — ${weekLabel()}`} contentId="ops-pulse-pdf" />
          </div>
          <div id="ops-pulse-pdf">
          {view === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TEAM_OPS.map(member => {
                const d = result.team_tasks?.[member]; if (!d) return null;
                const tasks = d.tasks || [], p = getProgress(member);
                const overdueCount = tasks.filter((t, i) => !checked[`${member}-${i}`] && isOverdue(t.due_day)).length;
                return (
                  <Card key={member} style={{ overflow: "hidden" }}>
                    <div onClick={() => { setSelectedMember(member); setView("person"); }} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{member}</div>
                          {overdueCount > 0 && <span style={{ background: "#fff0ee", color: BWL.orange, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>⚠️ {overdueCount} overdue</span>}
                        </div>
                        <div style={{ background: BWL.lightGray, borderRadius: 20, height: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, background: p===100 ? "#10b981" : BWL.orange, borderRadius: 20, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: p===100 ? "#10b981" : BWL.orange }}>{p}%</span>
                        <button onClick={e => { e.stopPropagation(); sendDM(member); }}
                          style={{ background: slackStatus[member] ? "#10b981" : BWL.black, color: BWL.white, border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {slackStatus[member] || "📨 DM"}
                        </button>
                        <span style={{ fontSize: 11, color: BWL.gray }}>→</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Bullets label="🔄 FOLLOW-UPS" items={result.follow_ups_needed} color="#10b981" />
                <Bullets label="🚨 RISKS" items={result.risks} color="#ef4444" />
              </div>
            </div>
          )}
          {view === "person" && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {TEAM_OPS.map(m => (
                  <button key={m} onClick={() => setSelectedMember(m)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: selectedMember===m ? BWL.black : BWL.white, color: selectedMember===m ? BWL.white : BWL.gray, border: selectedMember===m ? "none" : `1px solid ${BWL.lightGray}`, cursor: "pointer" }}>
                    {m.split(" ")[0]} <span style={{ fontSize: 10 }}>{getProgress(m)}%</span>
                  </button>
                ))}
              </div>
              {selectedMember && (() => {
                const d = result.team_tasks?.[selectedMember]; if (!d) return null;
                const tasks = d.tasks || [], done = tasks.filter((_,i) => checked[`${selectedMember}-${i}`]).length, p = tasks.length ? Math.round((done/tasks.length)*100) : 0;
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div><div style={{ fontWeight: 700, fontSize: 16 }}>{selectedMember}</div><div style={{ fontSize: 12, color: BWL.gray }}>{d.role}</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800, color: BWL.orange }}>{p}%</div><div style={{ fontSize: 10, color: BWL.gray }}>{done}/{tasks.length} DONE</div></div>
                    </div>
                    <div style={{ background: BWL.lightGray, borderRadius: 20, height: 6, marginBottom: 16, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p}%`, background: p===100?"#10b981":BWL.orange, borderRadius: 20 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {tasks.map((t, i) => {
                        const key = `${selectedMember}-${i}`, isDone = checked[key], overdue = !isDone && isOverdue(t.due_day);
                        return (
                          <div key={i} onClick={() => toggleCheck(selectedMember, i)}
                            style={{ display: "flex", gap: 10, background: isDone?"#f0faf0":overdue?"#fff0ee":BWL.bg, borderRadius: 10, padding: "12px 14px", cursor: "pointer", border: `1px solid ${isDone?"#10b98133":overdue?`${BWL.orange}33`:BWL.lightGray}` }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isDone?"#10b981":overdue?BWL.orange:"#ccc"}`, background: isDone?"#10b981":"transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              {isDone && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: isDone?"#999":BWL.black, textDecoration: isDone?"line-through":"none", lineHeight: 1.5 }}>{tIcon(t.type)} {t.task}</div>
                              <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                                <span style={{ fontSize: 10, color: pColor(t.priority), fontWeight: 700 }}>{t.priority}</span>
                                {t.due && <span style={{ fontSize: 10, color: overdue?BWL.orange:"#999" }}>• {overdue?"⚠️ OVERDUE — ":""}{t.due}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {d.blockers?.length > 0 && <div style={{ background: "#fff8f0", border: `1px solid ${BWL.orange}33`, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}><div style={{ fontSize: 10, color: BWL.orange, fontWeight: 700, marginBottom: 6 }}>⚠️ BLOCKERS</div>{d.blockers.map((b,i)=><div key={i} style={{fontSize:12,color:BWL.darkGray}}>{b}</div>)}</div>}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

const BWL_SERVICES = ["Outbound","Paid Media","Influencer","Email Marketing","Design","Web","SEO","Content"];
const PROPOSAL_TEMPLATES = {
  Government: "formal, compliance-focused, emphasize track record, certifications, reporting",
  Corporate: "ROI-driven, scalable, data-backed, executive-friendly",
  Nonprofit: "mission-aligned, cost-efficient, impact-focused, community-driven",
  Other: "flexible, value-driven, relationship-focused"
};

function urgencyTag(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline), now = new Date(), diff = Math.ceil((d - now) / 86400000);
  if (isNaN(diff)) return null;
  if (diff < 0) return { label:"⛔ Expired", color:"#aaa" };
  if (diff <= 7) return { label:`🔴 ${diff}d left`, color:"#ef4444" };
  if (diff <= 21) return { label:`🟡 ${diff}d left`, color:"#f59e0b" };
  return { label:`🟢 ${diff}d left`, color:"#10b981" };
}

function RFPEngine() {
  const [keywords, setKeywords] = useState(""); const [rfps, setRfps] = useState([]); const [selected, setSelected] = useState(null); const [proposal, setProposal] = useState(null); const [loading, setLoading] = useState({ search: false, proposal: false }); const [error, setError] = useState(null); const [view, setView] = useState("search");
  const [tracker, setTracker] = useState(() => { const s = storage.get("rfp-tracker"); return s ? JSON.parse(s.value) : []; });
  const [expandedScore, setExpandedScore] = useState(null);
  const [editNote, setEditNote] = useState({});
  const [editRev, setEditRev] = useState({});
  const setLoad = (k,v) => setLoading(p=>({...p,[k]:v}));

  const persist = (list) => { setTracker(list); storage.set("rfp-tracker", JSON.stringify(list)); };
  const saveToTracker = (rfp, pt) => {
    const e={id:Date.now(),title:rfp.title,organization:rfp.organization,type:rfp.type||"Other",budget:rfp.budget,deadline:rfp.deadline||"",services:rfp.services_needed||[],score:rfp.relevance_score,proposal:pt,status:"draft",revenue:"",notes:"",created_at:new Date().toISOString()};
    persist([e,...tracker]);
  };
  const updateStatus = (id,status) => persist(tracker.map(t=>t.id===id?{...t,status}:t));
  const updateField = (id,field,val) => persist(tracker.map(t=>t.id===id?{...t,[field]:val}:t));
  const del = (id) => persist(tracker.filter(t=>t.id!==id));

  const search = async () => {
    setLoad("search",true); setError(null); setRfps([]); setSelected(null); setProposal(null);
    const prompt = `RFP research specialist for BuildWithLeverage (growth agency: outbound, paid media, influencer, email marketing, design, web). Find RFPs for: ${keywords}. Return ONLY valid JSON: {"rfps":[{"id":"1","title":"...","organization":"...","type":"Government|Corporate|Nonprofit|Other","budget":"...","deadline":"YYYY-MM-DD or empty","description":"2-3 sentences","relevance_score":85,"score_breakdown":{"strengths":["s1","s2"],"gaps":["g1"],"overall":"1 sentence"},"why_bwl_can_win":"...","services_needed":["Outbound","Paid Media"],"source":"..."}]}`;
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:prompt}]})});
      const data = await res.json(); if(data.error) throw new Error(data.error.message);
      const raw = data.content?.find(b=>b.type==="text")?.text||"";
      setRfps(JSON.parse(raw.slice(raw.indexOf("{"),raw.lastIndexOf("}")+1)).rfps||[]);
    } catch(e){setError(e.message);}
    setLoad("search",false);
  };

  const genProposal = async rfp => {
    setSelected(rfp); setProposal(null); setLoad("proposal",true);
    const tpl = PROPOSAL_TEMPLATES[rfp.type] || PROPOSAL_TEMPLATES.Other;
    const prompt = `Proposal writer for BuildWithLeverage. RFP type: ${rfp.type}. Template style: ${tpl}. RFP: ${rfp.title} by ${rfp.organization}. Description: ${rfp.description}. Budget: ${rfp.budget}. Services matched: ${(rfp.services_needed||[]).join(", ")}. BWL: performance-based growth agency, 11x ROAS, $2M+ revenue. Return ONLY valid JSON: {"subject_line":"...","why_bwl":["w1"],"relevant_results":["r1"],"investment":"...","timeline":"...","full_proposal_text":"complete formatted proposal"}`;
    try { const r=await callClaude(prompt,3000); setProposal(r); } catch(e){setError(e.message);}
    setLoad("proposal",false);
  };

  const sc = s => s>=80?"#10b981":s>=60?"#f59e0b":"#ef4444";
  const ss = s => ({draft:{color:BWL.gray,label:"📝 Draft"},submitted:{color:"#f59e0b",label:"⏳ Submitted"},won:{color:"#10b981",label:"✅ Won"},lost:{color:"#ef4444",label:"❌ Lost"}}[s]||{color:BWL.gray,label:s});
  const won = tracker.filter(t=>t.status==="won");
  const submitted = tracker.filter(t=>["submitted","won","lost"].includes(t.status));
  const winRate = submitted.length ? Math.round((won.length/submitted.length)*100) : 0;
  const totalRev = won.filter(t=>t.revenue).reduce((a,t)=>a+parseFloat(t.revenue.replace(/[^0-9.]/g,""))||0,0);
  const pipelineRev = tracker.filter(t=>t.status==="submitted"&&t.revenue).reduce((a,t)=>a+parseFloat(t.revenue.replace(/[^0-9.]/g,""))||0,0);

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["search","🔍 Find RFPs"],["tracker",`📊 Pipeline (${tracker.length})`]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 18px",borderRadius:20,fontSize:12,fontWeight:700,background:view===v?BWL.black:BWL.white,color:view===v?BWL.white:BWL.gray,border:view===v?"none":`1px solid ${BWL.lightGray}`,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {view==="search" && <div>
        <Card style={{overflow:"hidden",marginBottom:14}}>
          <CardHeader label="🔍 SEARCH RFPs" />
          <div style={{padding:16,display:"flex",gap:10}}>
            <input value={keywords} onChange={e=>setKeywords(e.target.value)} onKeyDown={e=>e.key==="Enter"&&keywords.trim()&&search()} placeholder="e.g. marketing services, digital advertising..." style={{flex:1,background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:"inherit"}} />
            <button onClick={search} disabled={!keywords.trim()||loading.search} style={{background:keywords.trim()?BWL.black:"#ccc",color:BWL.white,border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:keywords.trim()?"pointer":"not-allowed"}}>{loading.search?"⏳...":"🔍 Search"}</button>
          </div>
        </Card>
        <Err msg={error} />
        {rfps.length>0&&!proposal&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {rfps.map((rfp,i)=>{
            const urg=urgencyTag(rfp.deadline), isExp=expandedScore===rfp.id;
            return (
              <Card key={i} style={{padding:18,border:`1px solid ${selected?.id===rfp.id?BWL.orange:BWL.lightGray}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{rfp.title}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,color:BWL.gray}}>{rfp.organization}</span>
                      <span style={{background:"#f0f0f0",color:BWL.darkGray,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{rfp.type}</span>
                      {urg&&<span style={{background:urg.color+"18",color:urg.color,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{urg.label}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"center",marginLeft:12}}>
                    <div style={{fontSize:26,fontWeight:800,color:sc(rfp.relevance_score)}}>{rfp.relevance_score}</div>
                    <button onClick={()=>setExpandedScore(isExp?null:rfp.id)} style={{fontSize:9,color:BWL.orange,fontWeight:700,background:"none",border:"none",cursor:"pointer",padding:0}}>{isExp?"▲ HIDE":"▼ WHY"}</button>
                  </div>
                </div>
                {isExp&&rfp.score_breakdown&&(
                  <div style={{background:BWL.bg,borderRadius:8,padding:12,marginBottom:10}}>
                    <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>SCORE BREAKDOWN</div>
                    <div style={{fontSize:12,color:BWL.darkGray,marginBottom:6}}>{rfp.score_breakdown.overall}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><div style={{fontSize:9,color:"#10b981",fontWeight:900,marginBottom:3}}>✅ STRENGTHS</div>{rfp.score_breakdown.strengths?.map((s,j)=><div key={j} style={{fontSize:11,marginBottom:2}}>• {s}</div>)}</div>
                      <div><div style={{fontSize:9,color:"#ef4444",fontWeight:900,marginBottom:3}}>⚠️ GAPS</div>{rfp.score_breakdown.gaps?.map((g,j)=><div key={j} style={{fontSize:11,marginBottom:2}}>• {g}</div>)}</div>
                    </div>
                  </div>
                )}
                <p style={{margin:"0 0 8px",fontSize:12,color:BWL.darkGray,lineHeight:1.6}}>{rfp.description}</p>
                {rfp.services_needed?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{rfp.services_needed.map((s,j)=><span key={j} style={{background:BWL.orange+"18",color:BWL.orange,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>🔧 {s}</span>)}</div>}
                <div style={{fontSize:12,color:"#10b981",marginBottom:10}}>✅ {rfp.why_bwl_can_win}</div>
                <button onClick={()=>genProposal(rfp)} style={{width:"100%",padding:"9px 0",borderRadius:8,background:loading.proposal&&selected?.id===rfp.id?"#ccc":BWL.black,color:BWL.white,border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {loading.proposal&&selected?.id===rfp.id?"⏳ Generating...":"⚡ Generate Proposal →"}
                </button>
              </Card>
            );
          })}
        </div>}
        {proposal&&selected&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2}}>📄 PROPOSAL</div><div style={{fontSize:11,color:BWL.gray,marginTop:2}}>Template: <strong>{selected.type}</strong></div></div>
            <button onClick={()=>{setProposal(null);setSelected(null);}} style={{background:BWL.white,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,borderRadius:20,padding:"6px 14px",fontSize:11,cursor:"pointer"}}>← Back</button>
          </div>
          <div style={{background:BWL.black,borderRadius:12,padding:16}}><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>SUBJECT</div><div style={{fontSize:14,fontWeight:700,color:BWL.white}}>{proposal.subject_line}</div></div>
          <ResultBlock label="📄 FULL PROPOSAL" content={proposal.full_proposal_text} copyable />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Bullets label="💪 WHY BWL WINS" items={proposal.why_bwl} color="#10b981" />
            <Bullets label="📊 RESULTS" items={proposal.relevant_results} color="#6c63ff" />
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>navigator.clipboard.writeText(proposal.full_proposal_text)} style={{flex:1,padding:12,borderRadius:10,background:BWL.black,color:BWL.white,border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>📋 Copy</button>
            <button onClick={()=>{saveToTracker(selected,proposal.full_proposal_text);setView("tracker");setProposal(null);setSelected(null);}} style={{flex:1,padding:12,borderRadius:10,background:"#10b981",color:BWL.white,border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>💾 Save to Pipeline</button>
          </div>
        </div>}
      </div>}
      {view==="tracker"&&<div>
        <div style={{background:BWL.black,borderRadius:12,padding:18,marginBottom:16}}>
          <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:12}}>📈 WIN RATE DASHBOARD</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[["Total",tracker.length,BWL.orange],["Pending",tracker.filter(t=>t.status==="submitted").length,"#f59e0b"],["Won",won.length,"#10b981"],["Lost",tracker.filter(t=>t.status==="lost").length,"#ef4444"],["Win Rate",`${winRate}%`,winRate>=50?"#10b981":winRate>=30?"#f59e0b":"#ef4444"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center",background:"#ffffff0d",borderRadius:10,padding:"12px 6px"}}>
                <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#aaa",fontWeight:700,marginTop:2}}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {(totalRev>0||pipelineRev>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
            {totalRev>0&&<div style={{background:"#10b98118",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:9,color:"#10b981",fontWeight:900}}>💰 REVENUE WON</div><div style={{fontSize:18,fontWeight:800,color:"#10b981"}}>${totalRev.toLocaleString()}</div></div>}
            {pipelineRev>0&&<div style={{background:"#f59e0b18",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:9,color:"#f59e0b",fontWeight:900}}>⏳ PIPELINE VALUE</div><div style={{fontSize:18,fontWeight:800,color:"#f59e0b"}}>${pipelineRev.toLocaleString()}</div></div>}
          </div>}
        </div>
        {tracker.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:BWL.gray}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontSize:14,fontWeight:700}}>No proposals saved yet</div></div>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {tracker.map(t=>{
            const urg=urgencyTag(t.deadline);
            return(
              <Card key={t.id} style={{padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{t.title}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginTop:4}}>
                      <span style={{fontSize:11,color:BWL.gray}}>{t.organization}</span>
                      {t.type&&<span style={{background:"#f0f0f0",color:BWL.darkGray,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{t.type}</span>}
                      {urg&&<span style={{background:urg.color+"18",color:urg.color,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{urg.label}</span>}
                      {t.score&&<span style={{background:sc(t.score)+"18",color:sc(t.score),borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>Score: {t.score}</span>}
                    </div>
                    {t.services?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{t.services.map((s,j)=><span key={j} style={{background:BWL.orange+"18",color:BWL.orange,borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700}}>{s}</span>)}</div>}
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:ss(t.status).color,whiteSpace:"nowrap",marginLeft:10}}>{ss(t.status).label}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:BWL.bg,borderRadius:8,padding:"8px 12px"}}>
                  <span style={{fontSize:11,color:BWL.gray,fontWeight:700,whiteSpace:"nowrap"}}>💰 Est. Revenue:</span>
                  {editRev[t.id]?(
                    <input autoFocus value={t.revenue||""} onChange={e=>updateField(t.id,"revenue",e.target.value)} onBlur={()=>setEditRev(p=>({...p,[t.id]:false}))} placeholder="e.g. $5,000" style={{flex:1,background:BWL.white,border:`1px solid ${BWL.lightGray}`,borderRadius:6,color:BWL.black,fontSize:12,padding:"4px 8px",outline:"none",fontFamily:"inherit"}} />
                  ):(
                    <span onClick={()=>setEditRev(p=>({...p,[t.id]:true}))} style={{flex:1,fontSize:12,color:t.revenue?BWL.black:BWL.gray,cursor:"pointer"}}>{t.revenue||"Click to add..."}</span>
                  )}
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:BWL.gray,fontWeight:700,marginBottom:4}}>📎 NOTES</div>
                  {editNote[t.id]?(
                    <textarea autoFocus value={t.notes||""} onChange={e=>updateField(t.id,"notes",e.target.value)} onBlur={()=>setEditNote(p=>({...p,[t.id]:false}))} style={{width:"100%",minHeight:60,background:BWL.bg,border:`1px solid ${BWL.orange}`,borderRadius:8,color:BWL.black,fontSize:12,padding:"8px 10px",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}} />
                  ):(
                    <div onClick={()=>setEditNote(p=>({...p,[t.id]:true}))} style={{background:BWL.bg,borderRadius:8,padding:"8px 10px",fontSize:12,color:t.notes?BWL.black:BWL.gray,cursor:"pointer",minHeight:32,lineHeight:1.5}}>{t.notes||"Click to add notes..."}</div>
                  )}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {t.status==="draft"&&<button onClick={()=>updateStatus(t.id,"submitted")} style={{background:BWL.bg,color:"#f59e0b",border:"1px solid #f59e0b33",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Submitted</button>}
                  {t.status==="submitted"&&<><button onClick={()=>updateStatus(t.id,"won")} style={{background:BWL.bg,color:"#10b981",border:"1px solid #10b98133",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>✅ Won</button><button onClick={()=>updateStatus(t.id,"lost")} style={{background:BWL.bg,color:"#ef4444",border:"1px solid #ef444433",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>❌ Lost</button></>}
                  <button onClick={()=>navigator.clipboard.writeText(t.proposal)} style={{background:BWL.bg,color:BWL.orange,border:`1px solid ${BWL.lightGray}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>📋 Copy</button>
                  <button onClick={()=>del(t.id)} style={{marginLeft:"auto",background:BWL.bg,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>🗑</button>
                </div>
              </Card>
            );
          })}
        </div>}
      </div>}
    </div>
  );
}

function WeeklyReport() {
  const [updates, setUpdates] = useState(""); const [slack, setSlack] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Generate weekly status report for Kristine Mirabueno (CoS/EA) at BuildWithLeverage to send to David (CEO). Updates: ${updates}. Slack/Notes: ${slack||"none"}. Return ONLY valid JSON: {"executive_summary":"TL;DR 2-3 sentences","wins":["w1"],"in_progress":[{"item":"...","status":"...","owner":"..."}],"blockers":["b1"],"next_week":["p1"],"david_needs_to_know":["item"],"full_report":"complete formatted report"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="📝 YOUR UPDATES THIS WEEK" value={updates} onChange={setUpdates} placeholder={`Type your updates for ${weekLabel()}...`} />
      <Textarea label="💬 SLACK / NOTES (OPTIONAL)" value={slack} onChange={setSlack} placeholder="Paste relevant Slack messages..." minHeight={80} />
      <Btn onClick={gen} disabled={!updates.trim()} loading={loading} label={`⚡ GENERATE WEEKLY REPORT — ${weekLabel()}`} />
      <Err msg={error} />
      {result && <div id="weekly-report-pdf">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{background:BWL.black,borderRadius:0,padding:18,flex:1,marginRight:10}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:8}}>TL;DR FOR DAVID</div><p style={{margin:0,color:BWL.white,fontSize:14,lineHeight:1.7}}>{result.executive_summary}</p></div>
          <ExportBtn title={`Weekly Report — ${weekLabel()}`} contentId="weekly-report-pdf" />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="✅ WINS" items={result.wins} color="#10b981" /><Bullets label="🚧 BLOCKERS" items={result.blockers?.length?result.blockers:["None 🎉"]} color="#ef4444" /></div>
        <Bullets label="📅 NEXT WEEK" items={result.next_week} color="#6c63ff" />
        <Bullets label="👀 DAVID NEEDS TO KNOW" items={result.david_needs_to_know?.length?result.david_needs_to_know:["Nothing urgent 👍"]} color={BWL.orange} />
        <ResultBlock label="📄 FULL REPORT" content={result.full_report} copyable />
      </div>}
    </div>
  );
}

function ExecComms() {
  const TYPES = [{key:"announcement",label:"📢 Announcement"},{key:"followup",label:"🔄 Follow-up"},{key:"recap",label:"📋 Meeting Recap"},{key:"slack",label:"💬 Slack Message"}];
  const [type, setType] = useState("announcement"); const [context, setContext] = useState(""); const [tone, setTone] = useState("professional"); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `CoS at BuildWithLeverage drafting a ${type}. Tone: ${tone}. Context: ${context}. Return ONLY valid JSON: {"subject":"subject or header","draft":"complete message","alt_version":"alternative version","tips":["tip 1"]}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{TYPES.map(t=><button key={t.key} onClick={()=>{setType(t.key);setResult(null);}} style={{padding:"11px 14px",borderRadius:10,fontSize:12,fontWeight:700,background:type===t.key?BWL.black:BWL.white,color:type===t.key?BWL.white:BWL.gray,border:type===t.key?`2px solid ${BWL.black}`:`1px solid ${BWL.lightGray}`,cursor:"pointer",textAlign:"left"}}>{t.label}</button>)}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:BWL.gray,fontWeight:700}}>TONE:</span>{["professional","friendly","direct","urgent"].map(t=><button key={t} onClick={()=>setTone(t)} style={{padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:700,background:tone===t?BWL.orange:BWL.white,color:tone===t?BWL.white:BWL.gray,border:tone===t?"none":`1px solid ${BWL.lightGray}`,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}</div>
      <Textarea label="CONTEXT" value={context} onChange={setContext} placeholder="What do you need to communicate? Who is the audience?" />
      <Btn onClick={gen} disabled={!context.trim()} loading={loading} label="✉️ DRAFT COMMS" />
      <Err msg={error} />
      {result && <>{result.subject&&<div style={{background:BWL.black,borderRadius:12,padding:"14px 18px"}}><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>SUBJECT</div><div style={{fontSize:14,fontWeight:700,color:BWL.white}}>{result.subject}</div></div>}<ResultBlock label="✅ MAIN DRAFT" content={result.draft} copyable /><ResultBlock label="🔀 ALTERNATIVE" content={result.alt_version} color={BWL.gray} copyable /><Bullets label="💡 TIPS" items={result.tips} color={BWL.orange} /></>}
    </div>
  );
}

function DailyBriefing() {
  const [input, setInput] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `You are AI Chief of Staff for David Perlov, CEO of BuildWithLeverage. Generate a concise daily briefing based on: ${input}. Return ONLY valid JSON: {"summary":"2-3 sentence TL;DR","urgent_items":["item1"],"fyi_items":["item1"],"decisions_needed":["decision1"],"full_briefing":"complete formatted briefing"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="📋 PASTE UPDATES, REPORTS, SLACK MESSAGES" value={input} onChange={setInput} placeholder="Paste anything David needs to be briefed on today..." />
      <Btn onClick={gen} disabled={!input.trim()} loading={loading} label="⚡ GENERATE DAILY BRIEFING" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:8}}>TL;DR</div><p style={{margin:0,color:BWL.white,fontSize:14,lineHeight:1.7}}>{result.summary}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Bullets label="🚨 URGENT" items={result.urgent_items} color="#ef4444" />
          <Bullets label="🧠 DECISIONS NEEDED" items={result.decisions_needed} color="#6c63ff" />
          <Bullets label="📌 FYI" items={result.fyi_items} color="#f59e0b" />
        </div>
        <ResultBlock label="📄 FULL BRIEFING" content={result.full_briefing} copyable />
      </>}
    </div>
  );
}

function TeamPerformance() {
  const [input, setInput] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `You are an AI advisor for David Perlov, CEO of BuildWithLeverage. Analyze team performance based on: ${input}. Team: ${TEAM_OPS.join(", ")}. Return ONLY valid JSON: {"overall_health":"green|yellow|red","summary":"2-3 sentence overview","top_performers":["name: reason"],"needs_attention":["name: reason"],"team_insights":["insight1"],"recommended_actions":["action1"],"david_focus":"what David should personally focus on this week"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  const hColor = h => ({green:"#10b981",yellow:"#f59e0b",red:"#ef4444"}[h]||BWL.gray);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="📊 PASTE TEAM UPDATES, REPORTS, OR NOTES" value={input} onChange={setInput} placeholder="Paste any team updates, SOD reports, task completions..." />
      <Btn onClick={gen} disabled={!input.trim()} loading={loading} label="📊 ANALYZE TEAM PERFORMANCE" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2}}>TEAM HEALTH</div>
            <span style={{background:hColor(result.overall_health)+"22",color:hColor(result.overall_health),borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:900,textTransform:"uppercase"}}>{result.overall_health==="green"?"✅ Healthy":result.overall_health==="yellow"?"⚠️ Watch":"🚨 Critical"}</span>
          </div>
          <p style={{margin:0,color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.summary}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Bullets label="🏆 TOP PERFORMERS" items={result.top_performers} color="#10b981" />
          <Bullets label="⚠️ NEEDS ATTENTION" items={result.needs_attention} color="#ef4444" />
        </div>
        <Bullets label="💡 TEAM INSIGHTS" items={result.team_insights} color="#6c63ff" />
        <Bullets label="👣 RECOMMENDED ACTIONS" items={result.recommended_actions} color="#f59e0b" />
        <Card style={{padding:16,border:`1px solid ${BWL.orange}33`,background:"#fff8f0"}}>
          <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:8}}>👑 DAVID'S FOCUS THIS WEEK</div>
          <p style={{margin:0,fontSize:13,color:BWL.black,lineHeight:1.6}}>{result.david_focus}</p>
        </Card>
      </>}
    </div>
  );
}

function StrategicDecision() {
  const [situation, setSituation] = useState(""); const [options, setOptions] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Strategic advisor for David Perlov, CEO of BuildWithLeverage. Situation: ${situation}. Options: ${options||"not specified"}. Return ONLY valid JSON: {"recommendation":"recommended path in 2-3 sentences","confidence":"high|medium|low","pros_cons":[{"option":"name","pros":["p1"],"cons":["c1"]}],"risks":"key risk","next_steps":["step1"],"decision_log":"1 paragraph decision log"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  const confColor = c => ({high:"#10b981",medium:"#f59e0b",low:"#ef4444"}[c]||BWL.gray);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="🧠 SITUATION / DECISION" value={situation} onChange={setSituation} placeholder="Describe the strategic decision or situation..." />
      <Textarea label="OPTIONS BEING CONSIDERED (OPTIONAL)" value={options} onChange={setOptions} placeholder="List the options..." minHeight={80} />
      <Btn onClick={gen} disabled={!situation.trim()} loading={loading} label="🧠 ANALYZE DECISION" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2}}>✅ RECOMMENDATION</div>
            {result.confidence&&<span style={{background:confColor(result.confidence)+"22",color:confColor(result.confidence),borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{result.confidence} confidence</span>}
          </div>
          <p style={{margin:0,color:BWL.white,fontSize:14,lineHeight:1.7}}>{result.recommendation}</p>
        </div>
        {result.pros_cons?.map((o,i)=>(
          <Card key={i} style={{padding:16}}>
            <div style={{fontWeight:900,fontSize:13,marginBottom:10}}>{o.option}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Bullets label="✅ PROS" items={o.pros} color="#10b981" />
              <Bullets label="❌ CONS" items={o.cons} color="#ef4444" />
            </div>
          </Card>
        ))}
        <Bullets label="👣 NEXT STEPS" items={result.next_steps} color="#6c63ff" />
        <ResultBlock label="📝 DECISION LOG" content={result.decision_log} copyable />
      </>}
    </div>
  );
}

function SequenceBuilder() {
  const [icp, setIcp] = useState(""); const [goal, setGoal] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Outbound marketing specialist at BuildWithLeverage. Build 3-email cold sequence. ICP: ${icp}. Goal: ${goal}. Return ONLY valid JSON: {"sequence_name":"name","emails":[{"step":1,"subject":"s","body":"full email","send_day":"Day 1","goal":"g"},{"step":2,"subject":"s","body":"full email","send_day":"Day 3","goal":"g"},{"step":3,"subject":"s","body":"full email","send_day":"Day 7","goal":"g"}],"tips":["t1"]}`;
    try { const r=await callClaude(prompt,3000); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="🎯 TARGET AUDIENCE / ICP" value={icp} onChange={setIcp} placeholder="Who are you targeting?" minHeight={80} />
      <Textarea label="🎯 CAMPAIGN GOAL" value={goal} onChange={setGoal} placeholder="e.g. Book discovery call..." minHeight={70} />
      <Btn onClick={gen} disabled={!icp.trim()||!goal.trim()} loading={loading} label="📨 BUILD EMAIL SEQUENCE" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:16}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>SEQUENCE</div><div style={{fontSize:15,fontWeight:900,color:BWL.white}}>{result.sequence_name}</div></div>
        {result.emails?.map((e,i)=>(
          <Card key={i} style={{padding:18}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <span style={{background:BWL.black,color:BWL.white,borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:900}}>Email {e.step}</span>
              <span style={{fontSize:11,color:BWL.gray}}>{e.send_day}</span>
              <span style={{fontSize:11,color:"#6c63ff",marginLeft:"auto"}}>{e.goal}</span>
            </div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Subject: {e.subject}</div>
            <div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",background:BWL.bg,borderRadius:8,padding:12}}>{e.body}</div>
          </Card>
        ))}
        <Bullets label="💡 TIPS" items={result.tips} color={BWL.orange} />
      </>}
    </div>
  );
}

function LeadResearch() {
  const [target, setTarget] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Lead research specialist for BuildWithLeverage. Research: ${target}. Return ONLY valid JSON: {"company_summary":"2-3 sentences","pain_points":["p1"],"why_bwl_fits":"reason","recommended_angle":"best angle","talking_points":["t1"],"estimated_fit_score":85,"research_summary":"complete research summary"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="🔍 COMPANY / LEAD TO RESEARCH" value={target} onChange={setTarget} placeholder="Company name, website, or any lead details..." minHeight={90} />
      <Btn onClick={gen} disabled={!target.trim()} loading={loading} label="🔍 RESEARCH LEAD" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:8}}>OVERVIEW</div><p style={{margin:0,color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.company_summary}</p></div>
          <div style={{textAlign:"center",marginLeft:20}}><div style={{fontSize:32,fontWeight:900,color:result.estimated_fit_score>=80?"#10b981":result.estimated_fit_score>=60?"#f59e0b":"#ef4444"}}>{result.estimated_fit_score}</div><div style={{fontSize:9,color:BWL.gray,fontWeight:700}}>FIT SCORE</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="😤 PAIN POINTS" items={result.pain_points} color="#ef4444" /><Bullets label="🗣 TALKING POINTS" items={result.talking_points} color="#6c63ff" /></div>
        <Card style={{padding:16}}><div style={{fontSize:10,color:"#10b981",fontWeight:900,letterSpacing:2,marginBottom:6}}>✅ WHY BWL FITS</div><p style={{margin:"0 0 10px",fontSize:13,lineHeight:1.6}}>{result.why_bwl_fits}</p><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>🎯 ANGLE</div><p style={{margin:0,fontSize:13,lineHeight:1.6}}>{result.recommended_angle}</p></Card>
        <ResultBlock label="📄 RESEARCH SUMMARY" content={result.research_summary} copyable />
      </>}
    </div>
  );
}

function ColdEmailWriter() {
  const [lead, setLead] = useState(""); const [offer, setOffer] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Top SDR at BuildWithLeverage. Write cold email. Lead: ${lead}. Offer: ${offer||"BWL growth services"}. Return ONLY valid JSON: {"subject_line":"s","email_body":"complete cold email under 150 words","alt_subject":"alt","follow_up":"2-sentence day-3 follow-up","tips":["t1"]}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="👤 LEAD INFO" value={lead} onChange={setLead} placeholder="Company, contact, role, pain points..." minHeight={90} />
      <Textarea label="🎯 OFFER / ANGLE (OPTIONAL)" value={offer} onChange={setOffer} placeholder="What are you pitching?" minHeight={70} />
      <Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="❄️ WRITE COLD EMAIL" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:16}}><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>SUBJECT</div><div style={{fontSize:14,fontWeight:700,color:BWL.white,marginBottom:8}}>{result.subject_line}</div><div style={{fontSize:9,color:BWL.gray,fontWeight:700,marginBottom:4}}>ALT SUBJECT</div><div style={{fontSize:13,color:"#ccc"}}>{result.alt_subject}</div></div>
        <ResultBlock label="✉️ COLD EMAIL" content={result.email_body} copyable />
        <ResultBlock label="🔄 FOLLOW-UP (DAY 3)" content={result.follow_up} color={BWL.gray} copyable />
        <Bullets label="💡 TIPS" items={result.tips} color={BWL.orange} />
      </>}
    </div>
  );
}

function CallScript() {
  const [lead, setLead] = useState(""); const [goal, setGoal] = useState("book a discovery call"); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Top SDR at BuildWithLeverage. Build cold call script. Lead: ${lead}. Goal: ${goal}. Return ONLY valid JSON: {"opener":"1-2 sentence opener","value_prop":"2-3 sentence value prop","discovery_questions":["q1","q2","q3"],"objection_handling":[{"objection":"o","response":"r"}],"cta":"closing CTA","full_script":"complete word-for-word script"}`;
    try { const r=await callClaude(prompt,2500); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="👤 LEAD / COMPANY INFO" value={lead} onChange={setLead} placeholder="Who are you calling?" minHeight={90} />
      <Card><CardHeader label="🎯 CALL GOAL" /><input value={goal} onChange={e=>setGoal(e.target.value)} style={{width:"100%",background:"transparent",border:"none",color:BWL.black,fontSize:13,padding:"12px 16px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} /></Card>
      <Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="📞 GENERATE CALL SCRIPT" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:16}}><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>OPENER</div><p style={{margin:"0 0 12px",color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.opener}</p><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>VALUE PROP</div><p style={{margin:0,color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.value_prop}</p></div>
        <Bullets label="❓ DISCOVERY QUESTIONS" items={result.discovery_questions} color="#6c63ff" />
        <Card style={{padding:16}}><div style={{fontSize:10,color:"#f59e0b",fontWeight:900,letterSpacing:2,marginBottom:10}}>🛡 OBJECTION HANDLING</div>{result.objection_handling?.map((o,i)=><div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<result.objection_handling.length-1?`1px solid ${BWL.lightGray}`:"none"}}><div style={{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:4}}>"{o.objection}"</div><div style={{fontSize:12,lineHeight:1.5}}>→ {o.response}</div></div>)}</Card>
        <ResultBlock label="📜 FULL SCRIPT" content={result.full_script} copyable />
      </>}
    </div>
  );
}

function AfterCallAutomation() {
  const [callNotes, setCallNotes] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `SDR at BuildWithLeverage. Generate after-call automations: ${callNotes}. Return ONLY valid JSON: {"call_summary":"2-3 sentence summary","outcome":"connected|no_answer|left_voicemail|not_interested|interested|meeting_booked","crm_notes":"complete CRM note","follow_up_email":{"subject":"s","body":"complete follow-up email"},"next_action":"recommended next action","slack_update":"1-2 sentence Slack update"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  const outColor = o => ({connected:"#10b981",interested:"#10b981",meeting_booked:"#10b981",no_answer:"#f59e0b",left_voicemail:"#f59e0b",not_interested:"#ef4444"}[o]||BWL.gray);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="📞 CALL NOTES" value={callNotes} onChange={setCallNotes} placeholder="What happened on the call? Messy notes are fine." />
      <Btn onClick={gen} disabled={!callNotes.trim()} loading={loading} label="⚡ GENERATE AFTER-CALL AUTOMATIONS" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2}}>CALL SUMMARY</div>
            {result.outcome&&<span style={{background:outColor(result.outcome)+"22",color:outColor(result.outcome),borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{result.outcome.replace("_"," ")}</span>}
          </div>
          <p style={{margin:0,color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.call_summary}</p>
        </div>
        <ResultBlock label="🗃 CRM NOTES" content={result.crm_notes} copyable />
        {result.follow_up_email&&<Card style={{padding:18}}>
          <div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:10}}>✉️ FOLLOW-UP EMAIL</div>
          <div style={{background:BWL.black,borderRadius:8,padding:"10px 14px",marginBottom:10}}><div style={{fontSize:9,color:BWL.gray,fontWeight:700,marginBottom:3}}>SUBJECT</div><div style={{fontSize:13,fontWeight:700,color:BWL.white}}>{result.follow_up_email.subject}</div></div>
          <div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",background:BWL.bg,borderRadius:8,padding:14}}>{result.follow_up_email.body}</div>
          <button onClick={()=>navigator.clipboard.writeText(result.follow_up_email.body)} style={{marginTop:10,background:BWL.black,color:BWL.white,border:"none",borderRadius:8,padding:"7px 16px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Copy Email</button>
        </Card>}
        <Card style={{padding:16,border:`1px solid ${BWL.orange}33`,background:"#fff8f0"}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>👣 NEXT ACTION</div><p style={{margin:0,fontSize:13,color:BWL.black,lineHeight:1.6}}>{result.next_action}</p></Card>
        <ResultBlock label="💬 SLACK UPDATE" content={result.slack_update} color="#6c63ff" copyable />
      </>}
    </div>
  );
}

function InfluencerOutreach() {
  const [influencer, setInfluencer] = useState(""); const [campaign, setCampaign] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Influencer outreach specialist at BuildWithLeverage. Influencer: ${influencer}. Campaign: ${campaign}. Return ONLY valid JSON: {"subject":"DM/email subject","outreach_message":"complete personalized outreach","follow_up":"follow-up for day 3","collaboration_brief":"brief collab overview","tips":["t1"]}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="🌟 INFLUENCER INFO" value={influencer} onChange={setInfluencer} placeholder="Name, niche, platform, followers..." minHeight={80} />
      <Textarea label="📁 CAMPAIGN / BRAND" value={campaign} onChange={setCampaign} placeholder="What brand or campaign are you pitching?" minHeight={80} />
      <Btn onClick={gen} disabled={!influencer.trim()||!campaign.trim()} loading={loading} label="🌟 GENERATE OUTREACH" />
      <Err msg={error} />
      {result && <>{result.subject&&<div style={{background:BWL.black,borderRadius:12,padding:"14px 18px"}}><div style={{fontSize:9,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>SUBJECT</div><div style={{fontSize:14,fontWeight:700,color:BWL.white}}>{result.subject}</div></div>}<ResultBlock label="✉️ OUTREACH" content={result.outreach_message} copyable /><ResultBlock label="🔄 FOLLOW-UP (DAY 3)" content={result.follow_up} color={BWL.gray} copyable /><ResultBlock label="📋 COLLAB BRIEF" content={result.collaboration_brief} color="#6c63ff" copyable /><Bullets label="💡 TIPS" items={result.tips} color={BWL.orange} /></>}
    </div>
  );
}

function CampaignBrief() {
  const [details, setDetails] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Campaign manager at BuildWithLeverage. Build influencer campaign brief: ${details}. Return ONLY valid JSON: {"campaign_name":"n","objective":"o","target_audience":"a","key_message":"m","deliverables":["d1"],"timeline":"t","kpis":["k1"],"dos":["do1"],"donts":["dont1"],"full_brief":"complete formatted brief"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="📁 CAMPAIGN DETAILS" value={details} onChange={setDetails} placeholder="Brand, product, goal, audience, budget..." />
      <Btn onClick={gen} disabled={!details.trim()} loading={loading} label="📁 BUILD CAMPAIGN BRIEF" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>CAMPAIGN</div><div style={{fontSize:18,fontWeight:900,color:BWL.white,marginBottom:10}}>{result.campaign_name}</div><div style={{fontSize:13,color:"#ccc",lineHeight:1.7}}>{result.objective}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="📦 DELIVERABLES" items={result.deliverables} color="#6c63ff" /><Bullets label="📊 KPIs" items={result.kpis} color="#10b981" /><Bullets label="✅ DOs" items={result.dos} color="#10b981" /><Bullets label="❌ DON'Ts" items={result.donts} color="#ef4444" /></div>
        <ResultBlock label="📄 FULL BRIEF" content={result.full_brief} copyable />
      </>}
    </div>
  );
}

function InfluencerTracker() {
  const [influencers, setInfluencers] = useState(() => { const s=storage.get("influencer-tracker"); return s?JSON.parse(s.value):[]; });
  const [form, setForm] = useState({ name:"", handle:"", platform:"Instagram", niche:"", followers:"", status:"under_nego", rate:"", notes:"", email:"", contact:"" });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g,""));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] || "" }), {});
    });
    const fieldMap = { name:["name","fullname"], handle:["handle","username","ig","tiktok","account"], platform:["platform","channel"], niche:["niche","category","genre"], followers:["followers","followercount","subs"], rate:["rate","fee","price","cost"], status:["status"], notes:["notes","remarks","comment"], email:["email","emailaddress"], contact:["contact","phone","mobile","number"] };
    const findField = (row, keys) => { for (const k of keys) { const match = Object.keys(row).find(h => h.includes(k)); if (match && row[match]) return row[match]; } return ""; };
    const imported = rows.filter(r => findField(r, fieldMap.name)).map(r => ({
      id: Date.now() + Math.random(),
      name: findField(r, fieldMap.name),
      handle: findField(r, fieldMap.handle),
      platform: findField(r, fieldMap.platform) || "Instagram",
      niche: findField(r, fieldMap.niche),
      followers: findField(r, fieldMap.followers),
      rate: findField(r, fieldMap.rate),
      status: findField(r, fieldMap.status) || "under_nego",
      notes: findField(r, fieldMap.notes),
      email: findField(r, fieldMap.email),
      contact: findField(r, fieldMap.contact),
      created_at: new Date().toISOString()
    }));
    const merged = [...imported, ...influencers];
    save(merged);
    setImportResult({ count: imported.length, skipped: rows.length - imported.length });
    setImporting(false); setShowImport(false);
    e.target.value = "";
  };
  const save = (list) => { setInfluencers(list); storage.set("influencer-tracker", JSON.stringify(list)); };
  const add = () => { save([{...form,id:Date.now(),created_at:new Date().toISOString()},...influencers]); setForm({name:"",handle:"",platform:"Instagram",niche:"",followers:"",status:"under_nego",rate:"",notes:"",email:"",contact:""}); setShowForm(false); };
  const del = (id) => save(influencers.filter(i=>i.id!==id));
  const updateStatus = (id,status) => save(influencers.map(i=>i.id===id?{...i,status}:i));
  const statuses = {active:{label:"🟢 Active",color:"#10b981"},paid:{label:"💰 Paid",color:"#6c63ff"},under_nego:{label:"🟡 Under Nego",color:"#f59e0b"},completed:{label:"✅ Completed",color:BWL.gray},declined:{label:"❌ Declined",color:"#ef4444"}};
  const filtered = filter==="all"?influencers:influencers.filter(i=>i.status===filter);
  const counts = Object.keys(statuses).reduce((a,k)=>({...a,[k]:influencers.filter(i=>i.status===k).length}),{});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[["all","All",BWL.black],...Object.entries(statuses).map(([k,v])=>[k,v.label,v.color])].map(([k,l,c])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,background:filter===k?c:BWL.white,color:filter===k?BWL.white:BWL.gray,border:filter===k?"none":`1px solid ${BWL.lightGray}`,cursor:"pointer"}}>{l} <span style={{fontSize:10,opacity:0.8}}>({k==="all"?influencers.length:counts[k]})</span></button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <label style={{padding:"6px 16px",borderRadius:20,fontSize:11,fontWeight:700,background:"#6c63ff",color:BWL.white,cursor:"pointer",border:"none"}}>
            {importing ? "⏳ Importing..." : "📥 Import CSV"}
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSV} style={{display:"none"}} disabled={importing} />
          </label>
          <button onClick={()=>setShowForm(!showForm)} style={{padding:"6px 16px",borderRadius:20,fontSize:11,fontWeight:700,background:BWL.orange,color:BWL.white,border:"none",cursor:"pointer"}}>+ Add Influencer</button>
        </div>
      </div>

      {importResult && (
        <div style={{background:"#f0faf0",border:"1px solid #10b98133",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,color:"#10b981",fontWeight:700}}>✅ Imported {importResult.count} influencers successfully!{importResult.skipped > 0 && ` (${importResult.skipped} skipped — no name)`}</div>
          <button onClick={()=>setImportResult(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#10b981"}}>✕</button>
        </div>
      )}

      {showForm&&<Card style={{padding:18}}><CardHeader label="➕ ADD INFLUENCER" /><div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["name","Name *"],["handle","Handle"],["niche","Niche"],["followers","Followers"],["rate","Rate"],["email","Email"],["contact","Contact #"]].map(([k,l])=><div key={k}><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>{l.toUpperCase()}</div><input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} /></div>)}<div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>PLATFORM</div><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit"}}>{["Instagram","TikTok","YouTube","Twitter/X","Facebook","LinkedIn"].map(p=><option key={p}>{p}</option>)}</select></div><div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div></div><div style={{padding:"0 16px 16px"}}><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Notes..." style={{width:"100%",minHeight:60,background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}} /></div><div style={{padding:"0 16px 16px",display:"flex",gap:8}}><button onClick={add} disabled={!form.name.trim()} style={{flex:1,padding:11,borderRadius:10,background:form.name.trim()?BWL.black:"#ccc",color:BWL.white,border:"none",fontSize:13,fontWeight:700,cursor:form.name.trim()?"pointer":"not-allowed"}}>✅ Add</button><button onClick={()=>setShowForm(false)} style={{padding:"11px 20px",borderRadius:10,background:BWL.white,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,fontSize:13,cursor:"pointer"}}>Cancel</button></div></Card>}

      {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:BWL.gray}}><div style={{fontSize:40,marginBottom:12}}>🌟</div><div style={{fontSize:14,fontWeight:700}}>No influencers yet — import CSV or add manually</div></div>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(inf=><Card key={inf.id} style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontWeight:700,fontSize:14}}>{inf.name}</div><div style={{fontSize:12,color:BWL.gray,marginTop:2}}>@{inf.handle} • {inf.platform}{inf.followers&&` • ${inf.followers}`}</div>{inf.niche&&<div style={{fontSize:11,color:BWL.gray,marginTop:2}}>Niche: {inf.niche}</div>}{(inf.email||inf.contact)&&<div style={{fontSize:11,color:BWL.gray,marginTop:2}}>{inf.email&&`✉️ ${inf.email}`}{inf.email&&inf.contact&&" · "}{inf.contact&&`📱 ${inf.contact}`}</div>}</div><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{background:statuses[inf.status]?.color+"22",color:statuses[inf.status]?.color,borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{statuses[inf.status]?.label}</span>{inf.rate&&<span style={{fontSize:11,color:BWL.gray}}>💰 {inf.rate}</span>}</div></div>{inf.notes&&<div style={{fontSize:12,color:BWL.darkGray,background:BWL.bg,borderRadius:8,padding:"8px 12px",marginBottom:8}}>{inf.notes}</div>}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(statuses).filter(([k])=>k!==inf.status).map(([k,v])=><button key={k} onClick={()=>updateStatus(inf.id,k)} style={{background:BWL.bg,color:v.color,border:`1px solid ${v.color}33`,borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer"}}>→ {v.label}</button>)}<button onClick={()=>del(inf.id)} style={{marginLeft:"auto",background:BWL.bg,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,borderRadius:8,padding:"4px 10px",fontSize:10,cursor:"pointer"}}>🗑</button></div></Card>)}</div>}
    </div>
  );
}

function ContentTracker() {
  const [posts, setPosts] = useState(() => { const s=storage.get("content-tracker"); return s?JSON.parse(s.value):[]; });
  const [form, setForm] = useState({ influencer:"", platform:"Instagram", content_type:"Post", caption:"", post_date:"", status:"planned", link:"" });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const save = (list) => { setPosts(list); storage.set("content-tracker", JSON.stringify(list)); };
  const add = () => { save([{...form,id:Date.now(),created_at:new Date().toISOString()},...posts]); setForm({influencer:"",platform:"Instagram",content_type:"Post",caption:"",post_date:"",status:"planned",link:""}); setShowForm(false); };
  const del = (id) => save(posts.filter(p=>p.id!==id));
  const updateStatus = (id,status) => save(posts.map(p=>p.id===id?{...p,status}:p));
  const statuses = {planned:{label:"📅 Planned",color:"#6c63ff"},submitted:{label:"📤 Submitted",color:"#f59e0b"},live:{label:"🟢 Live",color:"#10b981"},revision:{label:"✏️ Revision",color:BWL.orange},approved:{label:"✅ Approved",color:"#10b981"}};
  const filtered = filter==="all"?posts:posts.filter(p=>p.status===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[["all","All"],...Object.entries(statuses).map(([k,v])=>[k,v.label])].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,background:filter===k?(k==="all"?BWL.black:statuses[k]?.color):BWL.white,color:filter===k?BWL.white:BWL.gray,border:filter===k?"none":`1px solid ${BWL.lightGray}`,cursor:"pointer"}}>{l} <span style={{fontSize:10,opacity:0.8}}>({k==="all"?posts.length:posts.filter(p=>p.status===k).length})</span></button>)}
        <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"6px 16px",borderRadius:20,fontSize:11,fontWeight:700,background:BWL.orange,color:BWL.white,border:"none",cursor:"pointer"}}>+ Add Content</button>
      </div>
      {showForm&&<Card style={{padding:18}}><CardHeader label="➕ ADD CONTENT" /><div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["influencer","Influencer *"],["link","Post Link"]].map(([k,l])=><div key={k}><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>{l.toUpperCase()}</div><input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} /></div>)}<div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>PLATFORM</div><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit"}}>{["Instagram","TikTok","YouTube","Twitter/X","Facebook"].map(p=><option key={p}>{p}</option>)}</select></div><div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>TYPE</div><select value={form.content_type} onChange={e=>setForm(p=>({...p,content_type:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit"}}>{["Post","Reel","Story","Video","TikTok","Tweet"].map(t=><option key={t}>{t}</option>)}</select></div><div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>POST DATE</div><input type="date" value={form.post_date} onChange={e=>setForm(p=>({...p,post_date:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}} /></div><div><div style={{fontSize:10,color:BWL.gray,fontWeight:700,marginBottom:4}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div></div><div style={{padding:"0 16px 16px"}}><textarea value={form.caption} onChange={e=>setForm(p=>({...p,caption:e.target.value}))} placeholder="Caption / notes..." style={{width:"100%",minHeight:70,background:BWL.bg,border:`1px solid ${BWL.lightGray}`,borderRadius:8,color:BWL.black,fontSize:13,padding:"9px 12px",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}} /></div><div style={{padding:"0 16px 16px",display:"flex",gap:8}}><button onClick={add} disabled={!form.influencer.trim()} style={{flex:1,padding:11,borderRadius:10,background:form.influencer.trim()?BWL.black:"#ccc",color:BWL.white,border:"none",fontSize:13,fontWeight:700,cursor:form.influencer.trim()?"pointer":"not-allowed"}}>✅ Add</button><button onClick={()=>setShowForm(false)} style={{padding:"11px 20px",borderRadius:10,background:BWL.white,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,fontSize:13,cursor:"pointer"}}>Cancel</button></div></Card>}
      {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:BWL.gray}}><div style={{fontSize:40,marginBottom:12}}>📸</div><div style={{fontSize:14,fontWeight:700}}>No content tracked yet</div></div>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(post=><Card key={post.id} style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontWeight:700,fontSize:14}}>{post.influencer}</div><div style={{fontSize:12,color:BWL.gray,marginTop:2}}>{post.platform} • {post.content_type}{post.post_date&&` • ${new Date(post.post_date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`}</div>{post.link&&<a href={post.link} target="_blank" rel="noreferrer" style={{fontSize:11,color:BWL.orange,marginTop:2,display:"block"}}>🔗 View Post</a>}</div><span style={{background:statuses[post.status]?.color+"22",color:statuses[post.status]?.color,borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{statuses[post.status]?.label}</span></div>{post.caption&&<div style={{fontSize:12,color:BWL.darkGray,background:BWL.bg,borderRadius:8,padding:"8px 12px",marginBottom:8,lineHeight:1.5}}>{post.caption}</div>}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(statuses).filter(([k])=>k!==post.status).map(([k,v])=><button key={k} onClick={()=>updateStatus(post.id,k)} style={{background:BWL.bg,color:v.color,border:`1px solid ${v.color}33`,borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer"}}>→ {v.label}</button>)}<button onClick={()=>del(post.id)} style={{marginLeft:"auto",background:BWL.bg,color:BWL.gray,border:`1px solid ${BWL.lightGray}`,borderRadius:8,padding:"4px 10px",fontSize:10,cursor:"pointer"}}>🗑</button></div></Card>)}</div>}
    </div>
  );
}

function DesignBrief() {
  const [request, setRequest] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Creative director at BuildWithLeverage. Build design brief: ${request}. Return ONLY valid JSON: {"project_title":"t","objective":"o","deliverables":["d1"],"dimensions":"dim","brand_guidelines":["g1"],"mood":["v1"],"references":"inspiration","deadline_suggestion":"turnaround","full_brief":"complete formatted design brief"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="🎨 DESIGN REQUEST" value={request} onChange={setRequest} placeholder="What needs to be designed?" />
      <Btn onClick={gen} disabled={!request.trim()} loading={loading} label="🎨 GENERATE DESIGN BRIEF" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:18}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:4}}>PROJECT</div><div style={{fontSize:16,fontWeight:900,color:BWL.white,marginBottom:8}}>{result.project_title}</div><div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{result.objective}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="📦 DELIVERABLES" items={result.deliverables} color="#6c63ff" /><Bullets label="🎭 MOOD" items={result.mood} color="#a855f7" /></div>
        <Bullets label="📐 BRAND GUIDELINES" items={result.brand_guidelines} color={BWL.orange} />
        <ResultBlock label="📄 FULL DESIGN BRIEF" content={result.full_brief} copyable />
      </>}
    </div>
  );
}

function FeedbackSummary() {
  const [feedback, setFeedback] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => {
    setLoading(true); setResult(null); setError(null);
    const prompt = `Project manager at BuildWithLeverage. Summarize design feedback: ${feedback}. Return ONLY valid JSON: {"summary":"1-2 sentence overview","required_changes":["c1"],"nice_to_have":["n1"],"keep_as_is":["k1"],"tone":"positive|mixed|critical","designer_message":"complete actionable message to designer"}`;
    try { const r=await callClaude(prompt); setResult(r); } catch(e){setError(e.message);}
    setLoading(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Textarea label="💬 PASTE FEEDBACK" value={feedback} onChange={setFeedback} placeholder="Paste raw feedback — messy is fine..." />
      <Btn onClick={gen} disabled={!feedback.trim()} loading={loading} label="💬 SUMMARIZE FEEDBACK" />
      <Err msg={error} />
      {result && <>
        <div style={{background:BWL.black,borderRadius:12,padding:16}}><div style={{fontSize:10,color:BWL.orange,fontWeight:900,letterSpacing:2,marginBottom:6}}>OVERVIEW</div><p style={{margin:0,color:BWL.white,fontSize:13,lineHeight:1.7}}>{result.summary}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="🔴 REQUIRED CHANGES" items={result.required_changes} color="#ef4444" /><Bullets label="🟡 NICE TO HAVE" items={result.nice_to_have} color="#f59e0b" /></div>
        <Bullets label="✅ KEEP AS IS" items={result.keep_as_is} color="#10b981" />
        <ResultBlock label="✉️ MESSAGE FOR DESIGNER" content={result.designer_message} copyable />
      </>}
    </div>
  );
}

function Settings({ slackToken, setSlackToken, slackIds, setSlackIds }) {
  const [token, setToken] = useState(slackToken || "");
  const [ids, setIds] = useState(slackIds || DEFAULT_SLACK_IDS);
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSlackToken(token); setSlackIds(ids);
    storage.set("slack-token", token); storage.set("slack-ids", JSON.stringify(ids));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader label="🔑 SLACK BOT TOKEN" />
        <div style={{ padding: 16 }}>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="xoxb-..." style={{ width: "100%", background: BWL.bg, border: `1px solid ${BWL.lightGray}`, borderRadius: 8, color: BWL.black, fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
        </div>
      </Card>
      <Card>
        <CardHeader label="👥 SLACK USER IDs" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(ids).map(([name, id]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 160, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{name.split(" ")[0]}</div>
              <input value={id} onChange={e => setIds(p => ({ ...p, [name]: e.target.value }))} placeholder="U0XXXXXXXXX" style={{ flex: 1, background: BWL.bg, border: `1px solid ${BWL.lightGray}`, borderRadius: 8, color: BWL.black, fontSize: 12, padding: "8px 12px", outline: "none", fontFamily: "monospace" }} />
            </div>
          ))}
        </div>
      </Card>
      <button onClick={save} style={{ width: "100%", padding: 13, borderRadius: 10, background: BWL.black, color: BWL.white, border: "none", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
        {saved ? "✅ Saved!" : "💾 SAVE SETTINGS"}
      </button>
    </div>
  );
}

const TEAM_CONFIG = [
  { key:"david", name:"David Perlov", role:"CEO", emoji:"👑", tools:[{key:"briefing",label:"📋 Daily Briefing",component:<DailyBriefing/>},{key:"team_perf",label:"📊 Team Performance",component:<TeamPerformance/>},{key:"decision",label:"🧠 Strategic Decision",component:<StrategicDecision/>}]},
  { key:"tin", name:"Kristine Miel (Tin)", role:"Outbound Marketing", emoji:"📡", tools:[{key:"sequence",label:"📨 Sequence Builder",component:<SequenceBuilder/>},{key:"lead",label:"🔍 Lead Research",component:<LeadResearch/>}]},
  { key:"suki", name:"Suki Santos", role:"Outbound Marketing", emoji:"📡", tools:[{key:"sequence",label:"📨 Sequence Builder",component:<SequenceBuilder/>},{key:"lead",label:"🔍 Lead Research",component:<LeadResearch/>}]},
  { key:"caleb", name:"Caleb Bentil", role:"SDR / Sales", emoji:"🎯", tools:[{key:"cold",label:"❄️ Cold Email",component:<ColdEmailWriter/>},{key:"script",label:"📞 Call Script",component:<CallScript/>},{key:"aftercall",label:"⚡ After-Call",component:<AfterCallAutomation/>}]},
  { key:"cyril", name:"Cyril Butanas", role:"Influencer Outreach", emoji:"🌟", tools:[{key:"outreach",label:"🌟 Outreach",component:<InfluencerOutreach/>},{key:"brief",label:"📁 Campaign Brief",component:<CampaignBrief/>},{key:"tracker",label:"📋 Influencer Tracker",component:<InfluencerTracker/>},{key:"content",label:"📸 Content Tracker",component:<ContentTracker/>}]},
  { key:"darlene", name:"Darlene Mae Malolos", role:"Graphic Designer", emoji:"🎨", tools:[{key:"brief",label:"🎨 Design Brief",component:<DesignBrief/>},{key:"feedback",label:"💬 Feedback Summary",component:<FeedbackSummary/>}]},
];

function TeamMode() {
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const select = m => { setSelectedMember(m); setActiveTool(m.tools[0].key); };
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: BWL.gray, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>SELECT TEAM MEMBER</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TEAM_CONFIG.map(m => (
            <button key={m.key} onClick={() => select(m)} style={{ padding: "10px 16px", borderRadius: 10, background: selectedMember?.key===m.key ? BWL.black : BWL.white, color: selectedMember?.key===m.key ? BWL.white : BWL.black, border: selectedMember?.key===m.key ? `2px solid ${BWL.black}` : `1px solid ${BWL.lightGray}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{m.emoji} {m.name.split(" ")[0]}</div>
              <div style={{ fontSize: 9, color: selectedMember?.key===m.key ? BWL.orange : BWL.gray, fontWeight: 700, letterSpacing: 1 }}>{m.role.toUpperCase()}</div>
            </button>
          ))}
        </div>
      </div>
      {!selectedMember ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: BWL.gray }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👆</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: BWL.black, marginBottom: 8 }}>Select a team member above</div>
        </div>
      ) : (
        <div>
          <div style={{ background: BWL.black, borderRadius: 14, padding: "16px 22px", marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: BWL.white }}>{selectedMember.emoji} {selectedMember.name}</div>
            <div style={{ fontSize: 11, color: BWL.orange, fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>{selectedMember.role.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {selectedMember.tools.map(t => (
              <button key={t.key} onClick={() => setActiveTool(t.key)} style={{ padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 900, background: activeTool===t.key ? BWL.orange : BWL.white, color: activeTool===t.key ? BWL.white : BWL.gray, border: activeTool===t.key ? "none" : `1px solid ${BWL.lightGray}`, cursor: "pointer" }}>{t.label}</button>
            ))}
          </div>
          {selectedMember.tools.find(t => t.key === activeTool)?.component}
        </div>
      )}
    </div>
  );
}

const COS_TOOLS = [
  { key: "ops", label: "OPS PULSE", sub: "Task Generator" },
  { key: "rfp", label: "RFP ENGINE", sub: "Business Dev" },
  { key: "report", label: "WEEKLY REPORT", sub: "Status Builder" },
  { key: "comms", label: "EXEC COMMS", sub: "Comms Drafter" },
  { key: "settings", label: "⚙️ SETTINGS", sub: "Slack Config" },
];

export default function App() {
  const [mode, setMode] = useState("cos");
  const [active, setActive] = useState("ops");
  const [slackToken, setSlackToken] = useState(() => storage.get("slack-token")?.value || "");
  const [slackIds, setSlackIds] = useState(() => { const s = storage.get("slack-ids"); return s ? JSON.parse(s.value) : DEFAULT_SLACK_IDS; });

  return (
    <div style={{ fontFamily: BWL.font, background: BWL.bg, minHeight: "100vh", color: BWL.black,
      backgroundImage: `linear-gradient(${BWL.black}18 1px, transparent 1px), linear-gradient(90deg, ${BWL.black}18 1px, transparent 1px)`,
      backgroundSize: "40px 40px" }}>
      <div style={{ background: BWL.bg, padding: "0 0", display: "flex", alignItems: "stretch", justifyContent: "space-between", borderBottom: `2px solid ${BWL.black}` }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ padding: "18px 28px", borderRight: `2px solid ${BWL.black}` }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: BWL.black, letterSpacing: -1, fontFamily: BWL.font }}>LEVERAGE<span style={{ color: BWL.orange }}>.</span></div>
          </div>
          <div style={{ padding: "18px 28px", borderRight: `2px solid ${BWL.black}` }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: BWL.orange, fontWeight: 900, fontFamily: BWL.font }}>■ OPERATIONS HUB</div>
            <div style={{ fontSize: 10, color: BWL.black, marginTop: 2, fontFamily: BWL.mono }}>CLAUDE-POWERED</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[["cos","🗂 CoS MODE"],["team","👥 TEAM MODE"]].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{ padding: "18px 28px", fontSize: 11, fontWeight: 900, background: mode===m ? BWL.orange : "transparent", color: mode===m ? BWL.white : BWL.black, border: "none", borderLeft: `2px solid ${BWL.black}`, cursor: "pointer", letterSpacing: 2, fontFamily: BWL.font }}>{l}</button>
          ))}
        </div>
      </div>
      {mode === "cos" && (
        <div style={{ background: BWL.bg, borderBottom: `2px solid ${BWL.black}`, display: "flex" }}>
          {COS_TOOLS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} style={{ padding: "16px 28px", background: active===t.key ? BWL.black : "transparent", border: "none", borderRight: `2px solid ${BWL.black}`, color: active===t.key ? BWL.white : BWL.black, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: BWL.font }}>{t.label}</div>
              <div style={{ fontSize: 9, color: active===t.key ? BWL.orange : BWL.gray, fontWeight: 700, letterSpacing: 2, fontFamily: BWL.mono }}>{t.sub}</div>
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>
        {mode === "cos" && active === "ops" && <OpsPulse slackIds={slackIds} />}
        {mode === "cos" && active === "rfp" && <RFPEngine />}
        {mode === "cos" && active === "report" && <WeeklyReport />}
        {mode === "cos" && active === "comms" && <ExecComms />}
        {mode === "cos" && active === "settings" && <Settings slackToken={slackToken} setSlackToken={setSlackToken} slackIds={slackIds} setSlackIds={setSlackIds} />}
        {mode === "team" && <TeamMode />}
      </div>
    </div>
  );
}
