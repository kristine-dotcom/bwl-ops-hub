import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg:        "#F7F4EF",
  surface:   "#FFFFFF",
  border:    "#E5E0D8",
  borderDark:"#C8C2B8",
  black:     "#0D0D0D",
  orange:    "#E8390E",
  orangeHov: "#C72E0A",
  orangeSoft:"#FDF1EE",
  gray:      "#6B7280",
  grayLight: "#9CA3AF",
  darkGray:  "#374151",
  green:     "#10B981",
  yellow:    "#F59E0B",
  red:       "#EF4444",
  purple:    "#7C3AED",
  font:      "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  body:      "'Inter', 'Segoe UI', Arial, sans-serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${T.bg}; font-family: ${T.body}; color: ${T.black}; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.borderDark}; border-radius: 3px; }
    ::placeholder { color: ${T.grayLight}; }
    select, input, textarea { font-family: ${T.body}; }
    button { font-family: ${T.font}; }
    a { color: ${T.orange}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `}</style>
);

// ─── STORAGE SHIM ─────────────────────────────────────────────────────────────
const storage = {
  get: async (key) => {
    try {
      const r = await fetch("/api/kv", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", key }),
      });
      const data = await r.json();
      if (data.value === null || data.value === undefined) return null;
      return { value: typeof data.value === "string" ? data.value : JSON.stringify(data.value) };
    } catch { return null; }
  },
  set: async (key, value) => {
    try {
      await fetch("/api/kv", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", key, value }),
      });
    } catch {}
  },
  delete: async (key) => {
    try {
      await fetch("/api/kv", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key }),
      });
    } catch {}
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const weekLabel = () => {
  const now = new Date(), day = now.getDay(), mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return `Week of ${mon.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
};

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
};

async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── PRIMITIVE COMPONENTS ─────────────────────────────────────────────────────

const Badge = ({ label, color = T.orange, bg }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    background: bg || color + "18", color,
    borderRadius: 4, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
    fontFamily: T.font, textTransform: "uppercase",
  }}>{label}</span>
);

const Pill = ({ label, color = T.orange, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "5px 14px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
    background: active ? color : T.surface,
    color: active ? "#fff" : T.gray,
    border: active ? "none" : `1px solid ${T.border}`,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: T.body,
  }}>{label}</button>
);

const Card = ({ children, style = {}, hover = false }) => {
  const [isHov, setIsHov] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setIsHov(true)}
      onMouseLeave={() => hover && setIsHov(false)}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: isHov ? "0 8px 32px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s",
        overflow: "hidden",
        ...style,
      }}
    >{children}</div>
  );
};

const CardLabel = ({ children, color = T.orange }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: 2,
    color, textTransform: "uppercase", fontFamily: T.font,
  }}>{children}</div>
);

const Divider = ({ style = {} }) => (
  <div style={{ height: 1, background: T.border, ...style }} />
);

const SectionHeader = ({ label, action }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
  }}>
    <CardLabel color={T.orange}>{label}</CardLabel>
    {action}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
      borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px",
      outline: "none", fontFamily: T.body, transition: "border-color 0.15s",
      ...style,
    }}
    onFocus={e => e.target.style.borderColor = T.orange}
    onBlur={e => e.target.style.borderColor = T.border}
  />
);

const Textarea = ({ label, value, onChange, placeholder, minHeight = 120 }) => (
  <Card>
    {label && <SectionHeader label={label} />}
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", minHeight, background: "transparent", border: "none",
        color: T.black, fontSize: 13, padding: 16, resize: "vertical",
        outline: "none", fontFamily: T.body, lineHeight: 1.7, display: "block",
      }}
    />
  </Card>
);

const Btn = ({ onClick, disabled, loading, label, color, icon, variant = "primary" }) => {
  const [hov, setHov] = useState(false);
  const bg = disabled ? T.border : variant === "ghost"
    ? (hov ? T.bg : "transparent")
    : (hov ? T.orangeHov : (color || T.black));
  const col = disabled ? T.gray : variant === "ghost" ? T.gray : "#fff";
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "12px 20px", borderRadius: 8,
        background: bg, color: col,
        border: variant === "ghost" ? `1px solid ${T.border}` : "none",
        fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, transition: "all 0.15s", fontFamily: T.font,
      }}
    >
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {loading ? "GENERATING…" : label}
    </button>
  );
};

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        background: copied ? T.green : T.black, color: "#fff",
        border: "none", borderRadius: 6, padding: "5px 14px",
        fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "background 0.2s",
        fontFamily: T.font, letterSpacing: 0.5,
      }}
    >{copied ? "✓ COPIED" : "COPY"}</button>
  );
};

const Err = ({ msg }) => msg ? (
  <div style={{
    background: T.orangeSoft, border: `1px solid ${T.orange}44`,
    borderRadius: 8, padding: "12px 16px", color: T.orange,
    fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start",
  }}>
    <span>⚠</span><span>{msg}</span>
  </div>
) : null;

const Bullets = ({ label, items, color }) => {
  if (!items?.length) return null;
  return (
    <Card style={{ padding: 16 }}>
      <CardLabel color={color}>{label}</CardLabel>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((w, i) => (
          <div key={i} style={{
            fontSize: 13, color: T.darkGray, lineHeight: 1.6,
            paddingLeft: 12, borderLeft: `2px solid ${color}44`,
          }}>{w}</div>
        ))}
      </div>
    </Card>
  );
};

const ResultBlock = ({ label, content, color = T.orange, copyable }) => (
  <Card style={{ padding: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <CardLabel color={color}>{label}</CardLabel>
      {copyable && <CopyBtn text={content} />}
    </div>
    <div style={{
      fontSize: 13, color: T.darkGray, lineHeight: 1.8,
      whiteSpace: "pre-wrap", background: T.bg, borderRadius: 8, padding: 14,
    }}>{content}</div>
  </Card>
);

const ProgressBar = ({ value, color, height = 6 }) => (
  <div style={{ background: T.border, borderRadius: 99, height, overflow: "hidden" }}>
    <div style={{
      height: "100%", width: `${value}%`,
      background: value === 100 ? T.green : (color || T.orange),
      borderRadius: 99, transition: "width 0.4s ease",
    }} />
  </div>
);

const StatBlock = ({ label, value, sub, color }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 20px" }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: T.gray, textTransform: "uppercase", fontFamily: T.font, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 900, color: color || T.orange, fontFamily: T.font, lineHeight: 1, marginBottom: 6 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.grayLight, fontFamily: T.mono }}>{sub}</div>}
  </div>
);

// ─── TEAM / CONSTANTS ──────────────────────────────────────────────────────────
const TEAM_OPS = ["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const DEFAULT_SLACK_IDS = {
  "David Perlov": "U08BQH5JJDD", "Cyril Butanas": "U09HHPVSSUQ",
  "Caleb Bentil": "U0AE1T4N7A8", "Darlene Mae Malolos": "U0A8GV25V0A",
  "Suki Santos": "U093GFVM7D1", "Kristine Miel Zulaybar": "U093GFXPK3M",
  "Kristine Mirabueno": "U09QJGY27JP",
};
const INPUT_TYPES = [{ key: "transcript", label: "Meeting Transcript" },{ key: "sod", label: "SOD Report" },{ key: "email", label: "Emails" },{ key: "slack", label: "Slack" }];

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("");
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 60%, 88%)`, color: `hsl(${hue}, 50%, 35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, fontFamily: T.font,
    }}>{initials}</div>
  );
};

// ─── OPS PULSE ────────────────────────────────────────────────────────────────
function OpsPulse({ slackIds }) {
  const [inputs, setInputs] = useState({ transcript: "", sod: "", email: "", slack: "" });
  const [activeTab, setActiveTab] = useState("transcript");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [view, setView] = useState("team");
  const [slackStatus, setSlackStatus] = useState({});
  const [showInput, setShowInput] = useState(false);
  const [storageLoading, setStorageLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Promise.all([
      storage.get("ops-pulse-current"),
      storage.get("ops-pulse-checked"),
      storage.get("ops-pulse-history"),
    ]).then(([r, c, h]) => {
      if (r) setResult(JSON.parse(r.value));
      if (c) setChecked(JSON.parse(c.value));
      if (h) setHistory(JSON.parse(h.value));
      setStorageLoading(false);
    });
  }, []);

  const saveToHistory = async (res, chk) => {
    const weekKey = (() => { const d = new Date(); const day = d.getDay(); const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return mon.toISOString().split("T")[0]; })();
    const memberStats = TEAM_OPS.map(m => {
      const tasks = res?.team_tasks?.[m]?.tasks || [];
      const done = tasks.filter((_, i) => chk[`${m}-${i}`]).length;
      const overdue = tasks.filter((t, i) => !chk[`${m}-${i}`] && isOverdue(t.due_day)).length;
      return { name: m, total: tasks.length, done, overdue, blockers: res?.team_tasks?.[m]?.blockers || [] };
    });
    const total = memberStats.reduce((a, m) => a + m.total, 0);
    const done = memberStats.reduce((a, m) => a + m.done, 0);
    const snapshot = { weekKey, weekLabel: weekLabel(), savedAt: new Date().toISOString(), teamCompletion: total ? Math.round((done / total) * 100) : 0, totalTasks: total, doneTasks: done, overdueCount: memberStats.reduce((a, m) => a + m.overdue, 0), memberStats, blockers: memberStats.flatMap(m => m.blockers), summary: res?.week_summary || "" };
    const existing = await storage.get("ops-pulse-history");
    let hist = existing ? JSON.parse(existing.value) : [];
    hist = hist.filter(h => h.weekKey !== weekKey);
    hist = [snapshot, ...hist].slice(0, 4);
    setHistory(hist);
    await storage.set("ops-pulse-history", JSON.stringify(hist));
  };

  const clearTasks = async () => {
    if (result) await saveToHistory(result, checked);
    setResult(null); setChecked({});
    await storage.delete("ops-pulse-current"); await storage.delete("ops-pulse-checked");
  };

  const sendDM = async (member) => {
    const userId = slackIds?.[member];
    if (!userId) { setSlackStatus(p => ({ ...p, [member]: "NO ID" })); return; }
    const tokenData = await storage.get("slack-token");
    const token = tokenData?.value;
    if (!token) { setSlackStatus(p => ({ ...p, [member]: "NO TOKEN" })); return; }
    const tasks = result?.team_tasks?.[member]?.tasks || [];
    const taskLines = tasks.map((t, i) => `${i+1}. [${t.priority?.toUpperCase()}] ${t.task}${t.due ? ` (${t.due})` : ""}`).join("\n");
    const text = `*Your Tasks — ${weekLabel()}*\nHi ${member.split(" ")[0]}! Here are your tasks for this week:\n\n${taskLines}\n\n_Sent from BWL Operations Hub_`;
    setSlackStatus(p => ({ ...p, [member]: "SENDING…" }));
    try {
      const res = await fetch("/api/slack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, channel: userId, text }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSlackStatus(p => ({ ...p, [member]: "SENT ✓" }));
    } catch { setSlackStatus(p => ({ ...p, [member]: "FAILED" })); }
    setTimeout(() => setSlackStatus(p => ({ ...p, [member]: null })), 3000);
  };

  const isOverdue = (dueDay) => {
    if (!dueDay) return false;
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return days.indexOf(dueDay) !== -1 && days.indexOf(dueDay) < new Date().getDay();
  };

  const hasInput = Object.values(inputs).some(v => v.trim());
  const generate = async () => {
    setLoading(true); setResult(null); setError(null); setChecked({});
    await storage.delete("ops-pulse-current"); await storage.delete("ops-pulse-checked");
    const context = INPUT_TYPES.filter(t => inputs[t.key].trim()).map(t => `=== ${t.label} ===\n${inputs[t.key]}`).join("\n\n");
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const prompt = `You are AI Chief of Staff for BuildWithLeverage. Today is ${today}. Generate weekly tasks per team member. Team: ${TEAM_OPS.join(", ")}. IMPORTANT: SOD Report tasks belong to Kristine Mirabueno unless stated otherwise. For each task include due_day (Monday/Tuesday/Wednesday/Thursday/Friday/EOW). INPUTS:\n${context}\nReturn ONLY valid JSON: {"week_summary":"...","team_tasks":{"Suki Santos":{"role":"...","tasks":[{"task":"...","priority":"high|medium|low","due":"...","due_day":"Monday","type":"action|follow-up|proactive"}],"blockers":[]},"Kristine Mirabueno":{"role":"...","tasks":[],"blockers":[]},"Kristine Miel Zulaybar":{"role":"...","tasks":[],"blockers":[]},"Caleb Bentil":{"role":"...","tasks":[],"blockers":[]},"David Perlov":{"role":"...","tasks":[],"blockers":[]},"Cyril Butanas":{"role":"...","tasks":[],"blockers":[]},"Darlene Mae Malolos":{"role":"...","tasks":[],"blockers":[]}},"follow_ups_needed":["..."],"risks":["..."]}`;
    try {
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed); setShowInput(false);
      await storage.set("ops-pulse-current", JSON.stringify(parsed));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const toggleCheck = async (member, idx) => {
    const newChecked = { ...checked, [`${member}-${idx}`]: !checked[`${member}-${idx}`] };
    setChecked(newChecked);
    await storage.set("ops-pulse-checked", JSON.stringify(newChecked));
  };

  const getProgress = m => { const t = result?.team_tasks?.[m]?.tasks || []; if (!t.length) return 0; return Math.round((t.filter((_, i) => checked[`${m}-${i}`]).length / t.length) * 100); };
  const teamProgress = () => { if (!result) return 0; let total = 0, done = 0; TEAM_OPS.forEach(m => { const t = result.team_tasks?.[m]?.tasks || []; total += t.length; done += t.filter((_, i) => checked[`${m}-${i}`]).length; }); return total ? Math.round((done / total) * 100) : 0; };
  const pColor = p => ({ high: T.red, medium: T.yellow, low: T.green }[p] || T.gray);
  const tIcon = t => ({ action: "→", "follow-up": "↻", proactive: "↑" }[t] || "·");

  if (storageLoading) return <LoadingScreen />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.black, fontFamily: T.font }}>{weekLabel()}</div>
          {result && <div style={{ fontSize: 12, color: T.grayLight, marginTop: 2 }}>Tasks loaded · {teamProgress()}% complete</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {result && <button onClick={clearTasks} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "#FEF2F2", color: T.red, border: `1px solid ${T.red}22`, cursor: "pointer", fontFamily: T.font }}>CLEAR WEEK</button>}
          <button onClick={() => setShowInput(!showInput)} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: showInput ? T.black : T.orange, color: "#fff", border: "none", cursor: "pointer", fontFamily: T.font }}>
            {showInput ? "✕ CLOSE" : result ? "+ NEW WEEK" : "+ GENERATE TASKS"}
          </button>
        </div>
      </div>

      {/* Input panel */}
      {(showInput || !result) && (
        <Card>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
            {INPUT_TYPES.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, padding: "12px 8px", fontSize: 12, fontWeight: 600,
                background: activeTab === t.key ? T.orangeSoft : "transparent",
                color: activeTab === t.key ? T.orange : T.gray,
                border: "none", borderBottom: activeTab === t.key ? `2px solid ${T.orange}` : "2px solid transparent",
                cursor: "pointer", transition: "all 0.15s", fontFamily: T.body,
              }}>
                {t.label}
                {inputs[t.key].trim() && <span style={{ marginLeft: 4, color: T.green, fontSize: 14 }}>·</span>}
              </button>
            ))}
          </div>
          <textarea
            value={inputs[activeTab]} onChange={e => setInputs(p => ({ ...p, [activeTab]: e.target.value }))}
            placeholder={`Paste ${INPUT_TYPES.find(t => t.key === activeTab)?.label} here…`}
            style={{ width: "100%", minHeight: 140, background: "transparent", border: "none", color: T.black, fontSize: 13, padding: 18, resize: "vertical", outline: "none", fontFamily: T.body, lineHeight: 1.7, display: "block" }}
          />
          <div style={{ padding: "0 16px 16px" }}>
            <Btn onClick={generate} disabled={!hasInput} loading={loading} label={`GENERATE OPS PULSE — ${weekLabel()}`} icon="⚡" />
          </div>
          <Err msg={error} />
        </Card>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Summary card */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <CardLabel color={T.orange}>{weekLabel()}</CardLabel>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: teamProgress() === 100 ? T.green : T.orange, fontFamily: T.font, lineHeight: 1 }}>{teamProgress()}%</div>
                <div style={{ fontSize: 10, color: T.grayLight, fontFamily: T.mono }}>TEAM DONE</div>
              </div>
            </div>
            <ProgressBar value={teamProgress()} height={8} />
            <p style={{ margin: "14px 0 0", color: T.darkGray, fontSize: 13, lineHeight: 1.7 }}>{result.week_summary}</p>
          </Card>

          {/* View switcher */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[["team","👥 TEAM"],["person","👤 MEMBER"],["history","📋 HISTORY"]].map(([v, l]) => (
              <Pill key={v} label={l} active={view === v} onClick={() => { setView(v); if (v === "team") setSelectedMember(null); }} />
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={() => TEAM_OPS.forEach(m => { if (result?.team_tasks?.[m]?.tasks?.length) sendDM(m); })}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "#1a1a2e", color: "#a78bfa", border: "1px solid #2a2a4a", cursor: "pointer", fontFamily: T.font }}>
                SLACK ALL
              </button>
            </div>
          </div>

          {/* TEAM VIEW */}
          {view === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TEAM_OPS.map(member => {
                const d = result.team_tasks?.[member]; if (!d) return null;
                const tasks = d.tasks || [], p = getProgress(member);
                const overdueCount = tasks.filter((t, i) => !checked[`${member}-${i}`] && isOverdue(t.due_day)).length;
                return (
                  <Card key={member} hover>
                    <div onClick={() => { setSelectedMember(member); setView("person"); }}
                      style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar name={member} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{member}</span>
                          <span style={{ fontSize: 11, color: T.grayLight }}>{d.role}</span>
                          {overdueCount > 0 && <Badge label={`${overdueCount} overdue`} color={T.red} />}
                        </div>
                        <ProgressBar value={p} height={5} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: p === 100 ? T.green : T.orange, fontFamily: T.font, minWidth: 36, textAlign: "right" }}>{p}%</span>
                        <button onClick={e => { e.stopPropagation(); sendDM(member); }}
                          style={{ background: slackStatus[member] ? T.green : T.black, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: T.font }}>
                          {slackStatus[member] || "DM"}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <Bullets label="Follow-ups Needed" items={result.follow_ups_needed} color={T.green} />
                <Bullets label="Risks" items={result.risks} color={T.red} />
              </div>
            </div>
          )}

          {/* PERSON VIEW */}
          {view === "person" && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {TEAM_OPS.map(m => (
                  <Pill key={m} label={`${m.split(" ")[0]} ${getProgress(m)}%`} active={selectedMember === m} onClick={() => setSelectedMember(m)} />
                ))}
              </div>
              {selectedMember && (() => {
                const d = result.team_tasks?.[selectedMember]; if (!d) return null;
                const tasks = d.tasks || [], done = tasks.filter((_, i) => checked[`${selectedMember}-${i}`]).length, p = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                return (
                  <Card style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <Avatar name={selectedMember} size={44} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedMember}</div>
                          <div style={{ fontSize: 12, color: T.grayLight, marginTop: 2 }}>{d.role}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: p === 100 ? T.green : T.orange, fontFamily: T.font, lineHeight: 1 }}>{p}%</div>
                        <div style={{ fontSize: 10, color: T.grayLight, fontFamily: T.mono }}>{done}/{tasks.length} DONE</div>
                      </div>
                    </div>
                    <ProgressBar value={p} height={7} />
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      {tasks.map((t, i) => {
                        const key = `${selectedMember}-${i}`, isDone = checked[key], overdue = !isDone && isOverdue(t.due_day);
                        return (
                          <div key={i} onClick={() => toggleCheck(selectedMember, i)}
                            style={{
                              display: "flex", gap: 12, background: isDone ? "#F0FDF4" : overdue ? "#FFF7F5" : T.bg,
                              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                              border: `1px solid ${isDone ? T.green + "33" : overdue ? T.orange + "44" : T.border}`,
                              transition: "all 0.15s",
                            }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isDone ? T.green : overdue ? T.orange : T.borderDark}`, background: isDone ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              {isDone && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: isDone ? T.grayLight : T.black, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.5 }}>
                                <span style={{ opacity: 0.5, marginRight: 6 }}>{tIcon(t.type)}</span>{t.task}
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                                <Badge label={t.priority} color={pColor(t.priority)} />
                                {t.due && <span style={{ fontSize: 10, color: overdue ? T.orange : T.grayLight, fontFamily: T.mono }}>{overdue ? "⚠ OVERDUE · " : ""}{t.due}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {d.blockers?.length > 0 && (
                      <div style={{ background: T.orangeSoft, border: `1px solid ${T.orange}22`, borderRadius: 10, padding: "12px 16px", marginTop: 14 }}>
                        <CardLabel color={T.orange}>Blockers</CardLabel>
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          {d.blockers.map((b, i) => <div key={i} style={{ fontSize: 13, color: T.darkGray }}>· {b}</div>)}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })()}
            </div>
          )}

          {/* HISTORY VIEW */}
          {view === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {history.length === 0 ? (
                <Card style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.black, marginBottom: 6 }}>No history yet</div>
                  <div style={{ fontSize: 13, color: T.grayLight }}>History is saved automatically when you start a new week.</div>
                </Card>
              ) : history.map((h, hi) => {
                const topPerformer = [...h.memberStats].sort((a, b) => (b.done / Math.max(b.total, 1)) - (a.done / Math.max(a.total, 1)))[0];
                const needsAttention = [...h.memberStats].sort((a, b) => b.overdue - a.overdue)[0];
                return (
                  <Card key={hi}>
                    <div style={{ background: T.black, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: T.font }}>{h.weekLabel.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: T.gray, fontFamily: T.mono, marginTop: 2 }}>{new Date(h.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 30, fontWeight: 900, color: h.teamCompletion === 100 ? T.green : T.orange, fontFamily: T.font, lineHeight: 1 }}>{h.teamCompletion}%</div>
                        <div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono }}>{h.doneTasks}/{h.totalTasks} DONE</div>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <ProgressBar value={h.teamCompletion} height={5} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
                        {[["TASKS", `${h.doneTasks}/${h.totalTasks}`, T.orange],["OVERDUE", h.overdueCount, h.overdueCount > 0 ? T.red : T.green],["BLOCKERS", h.blockers.length, h.blockers.length > 0 ? T.yellow : T.green]].map(([l, v, c]) => (
                          <div key={l} style={{ background: T.bg, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 9, color: T.grayLight, fontFamily: T.mono, letterSpacing: 2, marginBottom: 4 }}>{l}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: c, fontFamily: T.font }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                        {h.memberStats.filter(m => m.total > 0).map(m => {
                          const pct = Math.round((m.done / m.total) * 100);
                          return (
                            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 76, fontSize: 11, fontWeight: 600, color: T.darkGray, flexShrink: 0 }}>{m.name.split(" ")[0]}</div>
                              <div style={{ flex: 1 }}><ProgressBar value={pct} height={4} /></div>
                              <div style={{ width: 34, fontSize: 11, fontWeight: 800, color: pct === 100 ? T.green : T.orange, textAlign: "right", fontFamily: T.font }}>{pct}%</div>
                              {m.overdue > 0 && <Badge label={`${m.overdue} late`} color={T.red} />}
                            </div>
                          );
                        })}
                      </div>
                      {(topPerformer?.total > 0 || needsAttention?.overdue > 0) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                          {topPerformer?.total > 0 && <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, color: T.green, fontWeight: 800, letterSpacing: 2, marginBottom: 4, fontFamily: T.font }}>TOP PERFORMER</div><div style={{ fontWeight: 700, fontSize: 13 }}>{topPerformer.name.split(" ")[0]}</div><div style={{ fontSize: 11, color: T.grayLight }}>{topPerformer.done}/{topPerformer.total} tasks</div></div>}
                          {needsAttention?.overdue > 0 && <div style={{ background: T.orangeSoft, borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, color: T.red, fontWeight: 800, letterSpacing: 2, marginBottom: 4, fontFamily: T.font }}>NEEDS ATTENTION</div><div style={{ fontWeight: 700, fontSize: 13 }}>{needsAttention.name.split(" ")[0]}</div><div style={{ fontSize: 11, color: T.grayLight }}>{needsAttention.overdue} overdue</div></div>}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [tasks, setTasks] = useState(null);
  const [checked, setChecked] = useState({});
  const [rfpTracker, setRfpTracker] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      storage.get("ops-pulse-current"), storage.get("ops-pulse-checked"),
      storage.get("rfp-tracker"), storage.get("influencer-tracker"),
    ]).then(([t, c, r, inf]) => {
      if (t) setTasks(JSON.parse(t.value));
      if (c) setChecked(JSON.parse(c.value));
      if (r) setRfpTracker(JSON.parse(r.value));
      if (inf) setInfluencers(JSON.parse(inf.value));
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  const getProgress = m => { const t = tasks?.team_tasks?.[m]?.tasks || []; if (!t.length) return null; return Math.round((t.filter((_, i) => checked[`${m}-${i}`]).length / t.length) * 100); };
  const teamProgress = () => { if (!tasks) return null; let total = 0, done = 0; TEAM_OPS.forEach(m => { const t = tasks.team_tasks?.[m]?.tasks || []; total += t.length; done += t.filter((_, i) => checked[`${m}-${i}`]).length; }); return total ? { pct: Math.round((done / total) * 100), total, done } : null; };
  const tp = teamProgress();
  const won = rfpTracker.filter(t => t.status === "won");
  const submitted = rfpTracker.filter(t => ["submitted","won","lost"].includes(t.status));
  const winRate = submitted.length ? Math.round((won.length / submitted.length) * 100) : 0;
  const totalRev = won.filter(t => t.revenue).reduce((a, t) => a + parseFloat(t.revenue.replace(/[^0-9.]/g, "")) || 0, 0);
  const activeInf = influencers.filter(i => i.status === "active").length;
  const negoInf = influencers.filter(i => i.status === "under_nego").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Date hero */}
      <div style={{ borderBottom: `2px solid ${T.black}`, paddingBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: T.orange, fontFamily: T.font, marginBottom: 6 }}>BWL OPERATIONS HUB</div>
        <div style={{ fontSize: 48, fontWeight: 900, fontFamily: T.font, textTransform: "uppercase", lineHeight: 1, letterSpacing: 1 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: T.gray, fontFamily: T.mono, marginTop: 6 }}>
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {weekLabel()}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatBlock label="Team Progress" value={tp ? `${tp.pct}%` : "—"} sub={tp ? `${tp.done}/${tp.total} tasks done` : "No tasks yet"} color={tp?.pct === 100 ? T.green : T.orange} />
        <StatBlock label="RFP Win Rate" value={`${winRate}%`} sub={`${won.length} won · ${rfpTracker.filter(t => t.status === "submitted").length} pending`} color={winRate >= 50 ? T.green : T.yellow} />
        <StatBlock label="Influencers" value={`${influencers.length}`} sub={`${activeInf} active · ${negoInf} negotiating`} color={T.purple} />
      </div>

      {/* Team progress */}
      {tasks ? (
        <Card>
          <SectionHeader label="Team Task Progress" />
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM_OPS.map(member => {
              const p = getProgress(member); if (p === null) return null;
              const memberTasks = tasks?.team_tasks?.[member]?.tasks || [];
              const overdue = memberTasks.filter((t, i) => !checked[`${member}-${i}`] && (() => { if (!t.due_day) return false; const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]; return days.indexOf(t.due_day) < new Date().getDay(); })()).length;
              return (
                <div key={member} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={member} size={28} />
                  <div style={{ width: 110, fontSize: 12, fontWeight: 600, flexShrink: 0, color: T.darkGray }}>{member.split(" ")[0]}</div>
                  <div style={{ flex: 1 }}><ProgressBar value={p} height={6} /></div>
                  <div style={{ width: 36, fontSize: 13, fontWeight: 800, color: p === 100 ? T.green : T.orange, textAlign: "right", fontFamily: T.font }}>{p}%</div>
                  {overdue > 0 && <Badge label={`${overdue} late`} color={T.red} />}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No tasks generated yet</div>
          <div style={{ fontSize: 13, color: T.grayLight }}>Go to OPS PULSE to generate this week's tasks.</div>
        </Card>
      )}

      {/* Pipeline & Influencer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionHeader label="RFP Pipeline" />
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {rfpTracker.length === 0 ? <div style={{ fontSize: 13, color: T.grayLight, padding: "8px 0" }}>No proposals saved yet.</div> :
              [["Total", rfpTracker.length, T.black], ["Submitted", rfpTracker.filter(t => t.status === "submitted").length, T.yellow], ["Won", won.length, T.green], ["Lost", rfpTracker.filter(t => t.status === "lost").length, T.red]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, color: T.gray }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: T.font }}>{v}</div>
                </div>
              ))}
            {totalRev > 0 && <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", marginTop: 4 }}><div style={{ fontSize: 9, color: T.green, fontWeight: 800, letterSpacing: 2, fontFamily: T.font, marginBottom: 4 }}>REVENUE WON</div><div style={{ fontSize: 20, fontWeight: 900, color: T.green, fontFamily: T.font }}>${totalRev.toLocaleString()}</div></div>}
          </div>
        </Card>
        <Card>
          <SectionHeader label="Influencer Tracker" />
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {influencers.length === 0 ? <div style={{ fontSize: 13, color: T.grayLight, padding: "8px 0" }}>No influencers tracked yet.</div> :
              [["Total", influencers.length, T.black], ["Active", activeInf, T.green], ["Negotiating", negoInf, T.yellow], ["Paid", influencers.filter(i => i.status === "paid").length, T.purple], ["Completed", influencers.filter(i => i.status === "completed").length, T.gray]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, color: T.gray }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: T.font }}>{v}</div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── RFP ENGINE ───────────────────────────────────────────────────────────────
const PROPOSAL_TEMPLATES = { Government: "formal, compliance-focused, emphasize track record, certifications, reporting", Corporate: "ROI-driven, scalable, data-backed, executive-friendly", Nonprofit: "mission-aligned, cost-efficient, impact-focused, community-driven", Other: "flexible, value-driven, relationship-focused" };
const urgencyTag = (deadline) => {
  if (!deadline) return null;
  const d = new Date(deadline), now = new Date(), diff = Math.ceil((d - now) / 86400000);
  if (isNaN(diff)) return null;
  if (diff < 0) return { label: "EXPIRED", color: T.gray };
  if (diff <= 7) return { label: `${diff}d left`, color: T.red };
  if (diff <= 21) return { label: `${diff}d left`, color: T.yellow };
  return { label: `${diff}d left`, color: T.green };
};

function RFPEngine() {
  const [keywords, setKeywords] = useState(""); const [rfps, setRfps] = useState([]); const [selected, setSelected] = useState(null); const [proposal, setProposal] = useState(null); const [loading, setLoading] = useState({ search: false, proposal: false }); const [error, setError] = useState(null); const [view, setView] = useState("search");
  const [tracker, setTracker] = useState([]); const [expandedScore, setExpandedScore] = useState(null); const [editNote, setEditNote] = useState({}); const [editRev, setEditRev] = useState({});

  useEffect(() => { storage.get("rfp-tracker").then(s => { if (s) setTracker(JSON.parse(s.value)); }); }, []);

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }));
  const persist = async (list) => { setTracker(list); await storage.set("rfp-tracker", JSON.stringify(list)); };
  const saveToTracker = (rfp, pt) => { const e = { id: Date.now(), title: rfp.title, organization: rfp.organization, type: rfp.type || "Other", budget: rfp.budget, deadline: rfp.deadline || "", services: rfp.services_needed || [], score: rfp.relevance_score, proposal: pt, status: "draft", revenue: "", notes: "", created_at: new Date().toISOString() }; persist([e, ...tracker]); };
  const updateStatus = (id, status) => persist(tracker.map(t => t.id === id ? { ...t, status } : t));
  const updateField = (id, field, val) => persist(tracker.map(t => t.id === id ? { ...t, [field]: val } : t));
  const del = (id) => persist(tracker.filter(t => t.id !== id));

  const search = async () => {
    setLoad("search", true); setError(null); setRfps([]); setSelected(null); setProposal(null);
    const prompt = `RFP research specialist for BuildWithLeverage (growth agency: outbound, paid media, influencer, email marketing, design, web). Find RFPs for: ${keywords}. Return ONLY valid JSON: {"rfps":[{"id":"1","title":"...","organization":"...","type":"Government|Corporate|Nonprofit|Other","budget":"...","deadline":"YYYY-MM-DD or empty","description":"2-3 sentences","relevance_score":85,"score_breakdown":{"strengths":["s1","s2"],"gaps":["g1"],"overall":"1 sentence"},"why_bwl_can_win":"...","services_needed":["Outbound","Paid Media"],"source":"..."}]}`;
    try {
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json(); if (data.error) throw new Error(data.error.message);
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      setRfps(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)).rfps || []);
    } catch (e) { setError(e.message); }
    setLoad("search", false);
  };

  const genProposal = async rfp => {
    setSelected(rfp); setProposal(null); setLoad("proposal", true);
    const tpl = PROPOSAL_TEMPLATES[rfp.type] || PROPOSAL_TEMPLATES.Other;
    const prompt = `Proposal writer for BuildWithLeverage. RFP type: ${rfp.type}. Template style: ${tpl}. RFP: ${rfp.title} by ${rfp.organization}. Description: ${rfp.description}. Budget: ${rfp.budget}. Services matched: ${(rfp.services_needed || []).join(", ")}. BWL: performance-based growth agency, 11x ROAS, $2M+ revenue. Return ONLY valid JSON: {"subject_line":"...","why_bwl":["w1"],"relevant_results":["r1"],"investment":"...","timeline":"...","full_proposal_text":"complete formatted proposal"}`;
    try { const r = await callClaude(prompt, 3000); setProposal(r); } catch (e) { setError(e.message); }
    setLoad("proposal", false);
  };

  const sc = s => s >= 80 ? T.green : s >= 60 ? T.yellow : T.red;
  const ss = s => ({ draft: { color: T.gray, label: "DRAFT" }, submitted: { color: T.yellow, label: "SUBMITTED" }, won: { color: T.green, label: "WON" }, lost: { color: T.red, label: "LOST" } }[s] || { color: T.gray, label: s });
  const won = tracker.filter(t => t.status === "won");
  const submitted = tracker.filter(t => ["submitted","won","lost"].includes(t.status));
  const winRate = submitted.length ? Math.round((won.length / submitted.length) * 100) : 0;
  const totalRev = won.filter(t => t.revenue).reduce((a, t) => a + parseFloat(t.revenue.replace(/[^0-9.]/g, "")) || 0, 0);
  const pipelineRev = tracker.filter(t => t.status === "submitted" && t.revenue).reduce((a, t) => a + parseFloat(t.revenue.replace(/[^0-9.]/g, "")) || 0, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Pill label="🔍 FIND RFPs" active={view === "search"} onClick={() => setView("search")} />
        <Pill label={`📊 PIPELINE (${tracker.length})`} active={view === "tracker"} onClick={() => setView("tracker")} />
      </div>

      {view === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <SectionHeader label="Search RFPs" />
            <div style={{ padding: 16, display: "flex", gap: 10 }}>
              <Input value={keywords} onChange={setKeywords} placeholder="e.g. marketing services, digital advertising…" style={{ flex: 1 }} />
              <button onClick={search} disabled={!keywords.trim() || loading.search}
                style={{ background: keywords.trim() ? T.black : T.border, color: keywords.trim() ? "#fff" : T.gray, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: keywords.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", fontFamily: T.font }}>
                {loading.search ? "SEARCHING…" : "SEARCH"}
              </button>
            </div>
          </Card>
          <Err msg={error} />
          {rfps.length > 0 && !proposal && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rfps.map((rfp, i) => {
                const urg = urgencyTag(rfp.deadline), isExp = expandedScore === rfp.id;
                return (
                  <Card key={i} style={{ padding: 18, border: `1px solid ${selected?.id === rfp.id ? T.orange : T.border}` }} hover>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{rfp.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: T.gray }}>{rfp.organization}</span>
                          <Badge label={rfp.type} color={T.gray} bg={T.bg} />
                          {urg && <Badge label={urg.label} color={urg.color} />}
                        </div>
                      </div>
                      <div style={{ textAlign: "center", marginLeft: 14 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: sc(rfp.relevance_score), fontFamily: T.font, lineHeight: 1 }}>{rfp.relevance_score}</div>
                        <button onClick={() => setExpandedScore(isExp ? null : rfp.id)} style={{ fontSize: 10, color: T.orange, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}>{isExp ? "HIDE" : "WHY?"}</button>
                      </div>
                    </div>
                    {isExp && rfp.score_breakdown && (
                      <div style={{ background: T.bg, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                        <CardLabel>Score Breakdown</CardLabel>
                        <div style={{ fontSize: 12, color: T.darkGray, margin: "8px 0" }}>{rfp.score_breakdown.overall}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><div style={{ fontSize: 10, color: T.green, fontWeight: 700, marginBottom: 4 }}>STRENGTHS</div>{rfp.score_breakdown.strengths?.map((s, j) => <div key={j} style={{ fontSize: 11, marginBottom: 2, color: T.darkGray }}>+ {s}</div>)}</div>
                          <div><div style={{ fontSize: 10, color: T.red, fontWeight: 700, marginBottom: 4 }}>GAPS</div>{rfp.score_breakdown.gaps?.map((g, j) => <div key={j} style={{ fontSize: 11, marginBottom: 2, color: T.darkGray }}>− {g}</div>)}</div>
                        </div>
                      </div>
                    )}
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: T.darkGray, lineHeight: 1.6 }}>{rfp.description}</p>
                    {rfp.services_needed?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>{rfp.services_needed.map((s, j) => <Badge key={j} label={s} color={T.orange} />)}</div>}
                    <div style={{ fontSize: 12, color: T.green, marginBottom: 12 }}>✓ {rfp.why_bwl_can_win}</div>
                    <button onClick={() => genProposal(rfp)}
                      style={{ width: "100%", padding: "10px 0", borderRadius: 8, background: loading.proposal && selected?.id === rfp.id ? T.border : T.black, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>
                      {loading.proposal && selected?.id === rfp.id ? "GENERATING…" : "GENERATE PROPOSAL"}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
          {proposal && selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><CardLabel>Proposal</CardLabel><div style={{ fontSize: 11, color: T.grayLight, marginTop: 2 }}>Template: <strong>{selected.type}</strong></div></div>
                <Pill label="← BACK" onClick={() => { setProposal(null); setSelected(null); }} />
              </div>
              <Card style={{ background: T.black, padding: 18 }}>
                <CardLabel color={T.orange}>Subject Line</CardLabel>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 6 }}>{proposal.subject_line}</div>
              </Card>
              <ResultBlock label="Full Proposal" content={proposal.full_proposal_text} copyable />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Bullets label="Why BWL Wins" items={proposal.why_bwl} color={T.green} />
                <Bullets label="Relevant Results" items={proposal.relevant_results} color={T.purple} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigator.clipboard.writeText(proposal.full_proposal_text)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: T.black, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>COPY</button>
                <button onClick={() => { saveToTracker(selected, proposal.full_proposal_text); setView("tracker"); setProposal(null); setSelected(null); }}
                  style={{ flex: 1, padding: 12, borderRadius: 8, background: T.green, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>SAVE TO PIPELINE</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "tracker" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ background: T.black, padding: 20 }}>
            <CardLabel color={T.orange}>Win Rate Dashboard</CardLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 14 }}>
              {[["Total", tracker.length, T.orange], ["Pending", tracker.filter(t => t.status === "submitted").length, T.yellow], ["Won", won.length, T.green], ["Lost", tracker.filter(t => t.status === "lost").length, T.red], ["Win Rate", `${winRate}%`, winRate >= 50 ? T.green : winRate >= 30 ? T.yellow : T.red]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center", background: "#ffffff0d", borderRadius: 8, padding: "12px 6px" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: c, fontFamily: T.font }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#999", fontWeight: 700, marginTop: 2, fontFamily: T.font, letterSpacing: 1 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {(totalRev > 0 || pipelineRev > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                {totalRev > 0 && <div style={{ background: "#10b98118", borderRadius: 8, padding: "10px 14px" }}><div style={{ fontSize: 9, color: T.green, fontWeight: 900, fontFamily: T.font }}>REVENUE WON</div><div style={{ fontSize: 20, fontWeight: 800, color: T.green, fontFamily: T.font }}>${totalRev.toLocaleString()}</div></div>}
                {pipelineRev > 0 && <div style={{ background: "#f59e0b18", borderRadius: 8, padding: "10px 14px" }}><div style={{ fontSize: 9, color: T.yellow, fontWeight: 900, fontFamily: T.font }}>PIPELINE VALUE</div><div style={{ fontSize: 20, fontWeight: 800, color: T.yellow, fontFamily: T.font }}>${pipelineRev.toLocaleString()}</div></div>}
              </div>
            )}
          </Card>
          {tracker.length === 0 ? <Card style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: T.gray }}>No proposals saved yet</div></Card> :
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tracker.map(t => {
                const urg = urgencyTag(t.deadline);
                return (
                  <Card key={t.id} style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: T.gray }}>{t.organization}</span>
                          {t.type && <Badge label={t.type} color={T.gray} bg={T.bg} />}
                          {urg && <Badge label={urg.label} color={urg.color} />}
                          {t.score && <Badge label={`SCORE: ${t.score}`} color={sc(t.score)} />}
                        </div>
                        {t.services?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{t.services.map((s, j) => <Badge key={j} label={s} color={T.orange} />)}</div>}
                      </div>
                      <Badge label={ss(t.status).label} color={ss(t.status).color} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: T.bg, borderRadius: 8, padding: "8px 12px" }}>
                      <span style={{ fontSize: 11, color: T.gray, fontWeight: 600, whiteSpace: "nowrap" }}>EST. REVENUE</span>
                      {editRev[t.id] ? (
                        <Input value={t.revenue || ""} onChange={v => updateField(t.id, "revenue", v)} placeholder="e.g. $5,000" style={{ flex: 1 }} />
                      ) : (
                        <span onClick={() => setEditRev(p => ({ ...p, [t.id]: true }))} style={{ flex: 1, fontSize: 12, color: t.revenue ? T.black : T.grayLight, cursor: "pointer" }}>{t.revenue || "Click to add…"}</span>
                      )}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>NOTES</div>
                      {editNote[t.id] ? (
                        <textarea autoFocus value={t.notes || ""} onChange={e => updateField(t.id, "notes", e.target.value)} onBlur={() => setEditNote(p => ({ ...p, [t.id]: false }))}
                          style={{ width: "100%", minHeight: 60, background: T.bg, border: `1.5px solid ${T.orange}`, borderRadius: 8, color: T.black, fontSize: 12, padding: "8px 10px", outline: "none", fontFamily: T.body, resize: "vertical" }} />
                      ) : (
                        <div onClick={() => setEditNote(p => ({ ...p, [t.id]: true }))} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: t.notes ? T.black : T.grayLight, cursor: "pointer", minHeight: 32, lineHeight: 1.5 }}>{t.notes || "Click to add notes…"}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.status === "draft" && <button onClick={() => updateStatus(t.id, "submitted")} style={{ background: T.bg, color: T.yellow, border: `1px solid ${T.yellow}44`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>SUBMITTED</button>}
                      {t.status === "submitted" && <><button onClick={() => updateStatus(t.id, "won")} style={{ background: T.bg, color: T.green, border: `1px solid ${T.green}44`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>WON</button><button onClick={() => updateStatus(t.id, "lost")} style={{ background: T.bg, color: T.red, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>LOST</button></>}
                      <button onClick={() => navigator.clipboard.writeText(t.proposal)} style={{ background: T.bg, color: T.orange, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>COPY</button>
                      <button onClick={() => del(t.id)} style={{ marginLeft: "auto", background: T.bg, color: T.gray, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: T.font }}>DELETE</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          }
        </div>
      )}
    </div>
  );
}

// ─── CoS TOOLS ────────────────────────────────────────────────────────────────
function WeeklyReport() {
  const [updates, setUpdates] = useState(""); const [slack, setSlack] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Generate weekly status report for Kristine Mirabueno (CoS/EA) at BuildWithLeverage to send to David (CEO). Updates: ${updates}. Slack/Notes: ${slack || "none"}. Return ONLY valid JSON: {"executive_summary":"TL;DR 2-3 sentences","wins":["w1"],"in_progress":[{"item":"...","status":"...","owner":"..."}],"blockers":["b1"],"next_week":["p1"],"david_needs_to_know":["item"],"full_report":"complete formatted report"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Your Updates This Week" value={updates} onChange={setUpdates} placeholder={`Type your updates for ${weekLabel()}…`} /><Textarea label="Slack / Notes (Optional)" value={slack} onChange={setSlack} placeholder="Paste relevant Slack messages…" minHeight={80} /><Btn onClick={gen} disabled={!updates.trim()} loading={loading} label={`GENERATE WEEKLY REPORT — ${weekLabel()}`} icon="📄" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 20 }}><CardLabel color={T.orange}>TL;DR FOR DAVID</CardLabel><p style={{ margin: "10px 0 0", color: "#fff", fontSize: 14, lineHeight: 1.7 }}>{result.executive_summary}</p></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Wins" items={result.wins} color={T.green} /><Bullets label="Blockers" items={result.blockers?.length ? result.blockers : ["None"]} color={T.red} /></div><Bullets label="Next Week" items={result.next_week} color={T.purple} /><Bullets label="David Needs to Know" items={result.david_needs_to_know?.length ? result.david_needs_to_know : ["Nothing urgent"]} color={T.orange} /><ResultBlock label="Full Report" content={result.full_report} copyable /></>}</div>);
}

function ExecComms() {
  const TYPES = [{ key: "announcement", label: "ANNOUNCEMENT" }, { key: "followup", label: "FOLLOW-UP" }, { key: "recap", label: "MEETING RECAP" }, { key: "slack", label: "SLACK MESSAGE" }];
  const [type, setType] = useState("announcement"); const [context, setContext] = useState(""); const [tone, setTone] = useState("professional"); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `CoS at BuildWithLeverage drafting a ${type}. Tone: ${tone}. Context: ${context}. Return ONLY valid JSON: {"subject":"subject or header","draft":"complete message","alt_version":"alternative version","tips":["tip 1"]}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{TYPES.map(t => <button key={t.key} onClick={() => { setType(t.key); setResult(null); }} style={{ padding: "12px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: type === t.key ? T.black : T.surface, color: type === t.key ? "#fff" : T.gray, border: type === t.key ? `2px solid ${T.black}` : `1px solid ${T.border}`, cursor: "pointer", textAlign: "left", fontFamily: T.font, letterSpacing: 1 }}>{t.label}</button>)}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 11, color: T.gray, fontWeight: 600 }}>TONE</span>{["professional", "friendly", "direct", "urgent"].map(t => <Pill key={t} label={t.toUpperCase()} active={tone === t} color={T.orange} onClick={() => setTone(t)} />)}</div><Textarea label="Context" value={context} onChange={setContext} placeholder="What do you need to communicate?" /><Btn onClick={gen} disabled={!context.trim()} loading={loading} label="DRAFT COMMS" icon="✏️" /><Err msg={error} />{result && <>{result.subject && <Card style={{ background: T.black, padding: 16 }}><CardLabel color={T.orange}>Subject</CardLabel><div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 6 }}>{result.subject}</div></Card>}<ResultBlock label="Main Draft" content={result.draft} copyable /><ResultBlock label="Alternative Version" content={result.alt_version} color={T.gray} copyable /><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function DailyBriefing() {
  const [input, setInput] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `You are AI Chief of Staff for David Perlov, CEO of BuildWithLeverage. Generate a concise daily briefing based on: ${input}. Return ONLY valid JSON: {"summary":"2-3 sentence TL;DR","urgent_items":["item1"],"fyi_items":["item1"],"decisions_needed":["decision1"],"full_briefing":"complete formatted briefing"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Paste Updates, Reports, Slack Messages" value={input} onChange={setInput} placeholder="Paste anything that needs to be briefed on today…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="GENERATE DAILY BRIEFING" icon="☀️" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><CardLabel color={T.orange}>TL;DR</CardLabel><p style={{ margin: "10px 0 0", color: "#fff", fontSize: 14, lineHeight: 1.7 }}>{result.summary}</p></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Urgent" items={result.urgent_items} color={T.red} /><Bullets label="Decisions Needed" items={result.decisions_needed} color={T.purple} /></div><Bullets label="FYI" items={result.fyi_items} color={T.yellow} /><ResultBlock label="Full Briefing" content={result.full_briefing} copyable /></>}</div>);
}

function TeamPerformance() {
  const [input, setInput] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `You are an AI advisor for David Perlov, CEO of BuildWithLeverage. Analyze team performance based on: ${input}. Team: ${TEAM_OPS.join(", ")}. Return ONLY valid JSON: {"overall_health":"green|yellow|red","summary":"2-3 sentence overview","top_performers":["name: reason"],"needs_attention":["name: reason"],"team_insights":["insight1"],"recommended_actions":["action1"],"david_focus":"what David should personally focus on this week"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  const hColor = h => ({ green: T.green, yellow: T.yellow, red: T.red }[h] || T.gray);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Paste Team Updates, Reports, or Notes" value={input} onChange={setInput} placeholder="Paste any team updates, SOD reports, task completions…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="ANALYZE TEAM PERFORMANCE" icon="📊" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><CardLabel color={T.orange}>Team Health</CardLabel><Badge label={result.overall_health === "green" ? "HEALTHY" : result.overall_health === "yellow" ? "WATCH" : "CRITICAL"} color={hColor(result.overall_health)} /></div><p style={{ margin: 0, color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.summary}</p></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Top Performers" items={result.top_performers} color={T.green} /><Bullets label="Needs Attention" items={result.needs_attention} color={T.red} /></div><Bullets label="Team Insights" items={result.team_insights} color={T.purple} /><Bullets label="Recommended Actions" items={result.recommended_actions} color={T.yellow} /><Card style={{ padding: 16, border: `1px solid ${T.orange}33`, background: T.orangeSoft }}><CardLabel color={T.orange}>David's Focus This Week</CardLabel><p style={{ margin: "8px 0 0", fontSize: 13, color: T.black, lineHeight: 1.6 }}>{result.david_focus}</p></Card></>}</div>);
}

function StrategicDecision() {
  const [situation, setSituation] = useState(""); const [options, setOptions] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Strategic advisor for David Perlov, CEO of BuildWithLeverage. Situation: ${situation}. Options: ${options || "not specified"}. Return ONLY valid JSON: {"recommendation":"recommended path in 2-3 sentences","confidence":"high|medium|low","pros_cons":[{"option":"name","pros":["p1"],"cons":["c1"]}],"risks":"key risk","next_steps":["step1"],"decision_log":"1 paragraph decision log"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  const confColor = c => ({ high: T.green, medium: T.yellow, low: T.red }[c] || T.gray);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Situation / Decision" value={situation} onChange={setSituation} placeholder="Describe the strategic decision or situation…" /><Textarea label="Options Being Considered (Optional)" value={options} onChange={setOptions} placeholder="List the options…" minHeight={80} /><Btn onClick={gen} disabled={!situation.trim()} loading={loading} label="ANALYZE DECISION" icon="🧠" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}><CardLabel color={T.orange}>Recommendation</CardLabel>{result.confidence && <Badge label={`${result.confidence} confidence`} color={confColor(result.confidence)} />}</div><p style={{ margin: 0, color: "#fff", fontSize: 14, lineHeight: 1.7 }}>{result.recommendation}</p></Card>{result.pros_cons?.map((o, i) => (<Card key={i} style={{ padding: 16 }}><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{o.option}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Pros" items={o.pros} color={T.green} /><Bullets label="Cons" items={o.cons} color={T.red} /></div></Card>))}<Bullets label="Next Steps" items={result.next_steps} color={T.purple} /><ResultBlock label="Decision Log" content={result.decision_log} copyable /></>}</div>);
}

// ─── OUTBOUND ─────────────────────────────────────────────────────────────────
function SequenceBuilder() {
  const [icp, setIcp] = useState(""); const [goal, setGoal] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Outbound marketing specialist at BuildWithLeverage. Build 3-email cold sequence. ICP: ${icp}. Goal: ${goal}. Return ONLY valid JSON: {"sequence_name":"name","emails":[{"step":1,"subject":"s","body":"full email","send_day":"Day 1","goal":"g"},{"step":2,"subject":"s","body":"full email","send_day":"Day 3","goal":"g"},{"step":3,"subject":"s","body":"full email","send_day":"Day 7","goal":"g"}],"tips":["t1"]}`; try { const r = await callClaude(prompt, 3000); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Target Audience / ICP" value={icp} onChange={setIcp} placeholder="Who are you targeting?" minHeight={80} /><Textarea label="Campaign Goal" value={goal} onChange={setGoal} placeholder="e.g. Book discovery call…" minHeight={70} /><Btn onClick={gen} disabled={!icp.trim() || !goal.trim()} loading={loading} label="BUILD EMAIL SEQUENCE" icon="✉️" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 16 }}><CardLabel color={T.orange}>Sequence</CardLabel><div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 6 }}>{result.sequence_name}</div></Card>{result.emails?.map((e, i) => (<Card key={i} style={{ padding: 18 }}><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}><Badge label={`EMAIL ${e.step}`} color={T.black} bg={T.black} /><span style={{ fontSize: 11, color: T.gray }}>{e.send_day}</span><span style={{ fontSize: 11, color: T.purple, marginLeft: "auto" }}>{e.goal}</span></div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: T.darkGray }}>Subject: {e.subject}</div><div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", background: T.bg, borderRadius: 8, padding: 14 }}>{e.body}</div></Card>))}<Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function LeadResearch() {
  const [target, setTarget] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Lead research specialist for BuildWithLeverage. Research: ${target}. Return ONLY valid JSON: {"company_summary":"2-3 sentences","pain_points":["p1"],"why_bwl_fits":"reason","recommended_angle":"best angle","talking_points":["t1"],"estimated_fit_score":85,"research_summary":"complete research summary"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Company / Lead to Research" value={target} onChange={setTarget} placeholder="Company name, website, or any lead details…" minHeight={90} /><Btn onClick={gen} disabled={!target.trim()} loading={loading} label="RESEARCH LEAD" icon="🔍" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ flex: 1 }}><CardLabel color={T.orange}>Overview</CardLabel><p style={{ margin: "10px 0 0", color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.company_summary}</p></div><div style={{ textAlign: "center", marginLeft: 20 }}><div style={{ fontSize: 34, fontWeight: 900, color: result.estimated_fit_score >= 80 ? T.green : result.estimated_fit_score >= 60 ? T.yellow : T.red, fontFamily: T.font, lineHeight: 1 }}>{result.estimated_fit_score}</div><div style={{ fontSize: 9, color: T.gray, fontWeight: 700, fontFamily: T.mono }}>FIT SCORE</div></div></div></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Pain Points" items={result.pain_points} color={T.red} /><Bullets label="Talking Points" items={result.talking_points} color={T.purple} /></div><Card style={{ padding: 16 }}><CardLabel color={T.green}>Why BWL Fits</CardLabel><p style={{ margin: "8px 0 12px", fontSize: 13, lineHeight: 1.6 }}>{result.why_bwl_fits}</p><CardLabel color={T.orange}>Recommended Angle</CardLabel><p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6 }}>{result.recommended_angle}</p></Card><ResultBlock label="Research Summary" content={result.research_summary} copyable /></>}</div>);
}

function ColdEmailWriter() {
  const [lead, setLead] = useState(""); const [offer, setOffer] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Top SDR at BuildWithLeverage. Write cold email. Lead: ${lead}. Offer: ${offer || "BWL growth services"}. Return ONLY valid JSON: {"subject_line":"s","email_body":"complete cold email under 150 words","alt_subject":"alt","follow_up":"2-sentence day-3 follow-up","tips":["t1"]}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Lead Info" value={lead} onChange={setLead} placeholder="Company, contact, role, pain points…" minHeight={90} /><Textarea label="Offer / Angle (Optional)" value={offer} onChange={setOffer} placeholder="What are you pitching?" minHeight={70} /><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="WRITE COLD EMAIL" icon="✉️" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 16 }}><CardLabel color={T.orange}>Subject Lines</CardLabel><div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 8 }}>{result.subject_line}</div><div style={{ fontSize: 13, color: "#777", marginTop: 6 }}>Alt: {result.alt_subject}</div></Card><ResultBlock label="Cold Email" content={result.email_body} copyable /><ResultBlock label="Follow-up (Day 3)" content={result.follow_up} color={T.gray} copyable /><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function CallScript() {
  const [lead, setLead] = useState(""); const [goal, setGoal] = useState("book a discovery call"); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Top SDR at BuildWithLeverage. Build cold call script. Lead: ${lead}. Goal: ${goal}. Return ONLY valid JSON: {"opener":"1-2 sentence opener","value_prop":"2-3 sentence value prop","discovery_questions":["q1","q2","q3"],"objection_handling":[{"objection":"o","response":"r"}],"cta":"closing CTA","full_script":"complete word-for-word script"}`; try { const r = await callClaude(prompt, 2500); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Lead / Company Info" value={lead} onChange={setLead} placeholder="Who are you calling?" minHeight={90} /><Card><SectionHeader label="Call Goal" /><input value={goal} onChange={e => setGoal(e.target.value)} style={{ width: "100%", background: "transparent", border: "none", color: T.black, fontSize: 13, padding: "12px 18px", outline: "none", fontFamily: T.body, display: "block" }} /></Card><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="GENERATE CALL SCRIPT" icon="📞" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><CardLabel color={T.orange}>Opener</CardLabel><p style={{ margin: "8px 0 14px", color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.opener}</p><CardLabel color={T.orange}>Value Prop</CardLabel><p style={{ margin: "8px 0 0", color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.value_prop}</p></Card><Bullets label="Discovery Questions" items={result.discovery_questions} color={T.purple} /><Card style={{ padding: 16 }}><CardLabel color={T.yellow}>Objection Handling</CardLabel><div style={{ marginTop: 10 }}>{result.objection_handling?.map((o, i) => <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < result.objection_handling.length - 1 ? `1px solid ${T.border}` : "none" }}><div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 4 }}>"{o.objection}"</div><div style={{ fontSize: 12, lineHeight: 1.5, color: T.darkGray }}>→ {o.response}</div></div>)}</div></Card><ResultBlock label="Full Script" content={result.full_script} copyable /></>}</div>);
}

function AfterCallAutomation() {
  const [callNotes, setCallNotes] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `SDR at BuildWithLeverage. Generate after-call automations: ${callNotes}. Return ONLY valid JSON: {"call_summary":"2-3 sentence summary","outcome":"connected|no_answer|left_voicemail|not_interested|interested|meeting_booked","crm_notes":"complete CRM note","follow_up_email":{"subject":"s","body":"complete follow-up email"},"next_action":"recommended next action","slack_update":"1-2 sentence Slack update"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  const outColor = o => ({ connected: T.green, interested: T.green, meeting_booked: T.green, no_answer: T.yellow, left_voicemail: T.yellow, not_interested: T.red }[o] || T.gray);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Call Notes" value={callNotes} onChange={setCallNotes} placeholder="What happened on the call? Messy notes are fine." /><Btn onClick={gen} disabled={!callNotes.trim()} loading={loading} label="GENERATE AFTER-CALL PACK" icon="🗒️" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><CardLabel color={T.orange}>Call Summary</CardLabel>{result.outcome && <Badge label={result.outcome.replace("_", " ")} color={outColor(result.outcome)} />}</div><p style={{ margin: 0, color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.call_summary}</p></Card><ResultBlock label="CRM Notes" content={result.crm_notes} copyable />{result.follow_up_email && <Card style={{ padding: 18 }}><CardLabel color={T.orange}>Follow-up Email</CardLabel><div style={{ background: T.black, borderRadius: 8, padding: "10px 14px", margin: "10px 0" }}><div style={{ fontSize: 9, color: T.gray, fontWeight: 700, marginBottom: 3, fontFamily: T.mono }}>SUBJECT</div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{result.follow_up_email.subject}</div></div><div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", background: T.bg, borderRadius: 8, padding: 14 }}>{result.follow_up_email.body}</div><div style={{ marginTop: 10 }}><CopyBtn text={result.follow_up_email.body} /></div></Card>}<Card style={{ padding: 16, border: `1px solid ${T.orange}33`, background: T.orangeSoft }}><CardLabel color={T.orange}>Next Action</CardLabel><p style={{ margin: "8px 0 0", fontSize: 13, color: T.black, lineHeight: 1.6 }}>{result.next_action}</p></Card><ResultBlock label="Slack Update" content={result.slack_update} color={T.purple} copyable /></>}</div>);
}

// ─── INFLUENCER ───────────────────────────────────────────────────────────────
function InfluencerOutreach() {
  const [influencer, setInfluencer] = useState(""); const [campaign, setCampaign] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Influencer outreach specialist at BuildWithLeverage. Influencer: ${influencer}. Campaign: ${campaign}. Return ONLY valid JSON: {"subject":"DM/email subject","outreach_message":"complete personalized outreach","follow_up":"follow-up for day 3","collaboration_brief":"brief collab overview","tips":["t1"]}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Influencer Info" value={influencer} onChange={setInfluencer} placeholder="Name, niche, platform, followers…" minHeight={80} /><Textarea label="Campaign / Brand" value={campaign} onChange={setCampaign} placeholder="What brand or campaign are you pitching?" minHeight={80} /><Btn onClick={gen} disabled={!influencer.trim() || !campaign.trim()} loading={loading} label="GENERATE OUTREACH" icon="📲" /><Err msg={error} />{result && <>{result.subject && <Card style={{ background: T.black, padding: 16 }}><CardLabel color={T.orange}>Subject</CardLabel><div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 6 }}>{result.subject}</div></Card>}<ResultBlock label="Outreach Message" content={result.outreach_message} copyable /><ResultBlock label="Follow-up (Day 3)" content={result.follow_up} color={T.gray} copyable /><ResultBlock label="Collab Brief" content={result.collaboration_brief} color={T.purple} copyable /><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function CampaignBrief() {
  const [details, setDetails] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Campaign manager at BuildWithLeverage. Build influencer campaign brief: ${details}. Return ONLY valid JSON: {"campaign_name":"n","objective":"o","target_audience":"a","key_message":"m","deliverables":["d1"],"timeline":"t","kpis":["k1"],"dos":["do1"],"donts":["dont1"],"full_brief":"complete formatted brief"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Campaign Details" value={details} onChange={setDetails} placeholder="Brand, product, goal, audience, budget…" /><Btn onClick={gen} disabled={!details.trim()} loading={loading} label="BUILD CAMPAIGN BRIEF" icon="📋" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><CardLabel color={T.orange}>Campaign</CardLabel><div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: T.font, margin: "6px 0 10px" }}>{result.campaign_name}</div><div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7 }}>{result.objective}</div></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="KPIs" items={result.kpis} color={T.green} /><Bullets label="Do's" items={result.dos} color={T.green} /><Bullets label="Don'ts" items={result.donts} color={T.red} /></div><ResultBlock label="Full Brief" content={result.full_brief} copyable /></>}</div>);
}

function InfluencerTracker() {
  const [influencers, setInfluencers] = useState([]);
  const [form, setForm] = useState({ name: "", handle: "", platform: "Instagram", niche: "", followers: "", status: "under_nego", rate: "", notes: "", email: "", contact: "" });
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { storage.get("influencer-tracker").then(s => { if (s) setInfluencers(JSON.parse(s.value)); }); }, []);

  const save = async (list) => { setInfluencers(list); await storage.set("influencer-tracker", JSON.stringify(list)); };
  const add = () => { save([{ ...form, id: Date.now(), created_at: new Date().toISOString() }, ...influencers]); setForm({ name: "", handle: "", platform: "Instagram", niche: "", followers: "", status: "under_nego", rate: "", notes: "", email: "", contact: "" }); setShowForm(false); };
  const del = (id) => save(influencers.filter(i => i.id !== id));
  const updateStatus = (id, status) => save(influencers.map(i => i.id === id ? { ...i, status } : i));

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const rows = lines.slice(1).map(line => { const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, "")); return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] || "" }), {}); });
    const fieldMap = { name: ["name", "fullname"], handle: ["handle", "username", "ig", "tiktok", "account"], platform: ["platform", "channel"], niche: ["niche", "category", "genre"], followers: ["followers", "followercount", "subs"], rate: ["rate", "fee", "price", "cost"], status: ["status"], notes: ["notes", "remarks", "comment"], email: ["email", "emailaddress"], contact: ["contact", "phone", "mobile", "number"] };
    const findField = (row, keys) => { for (const k of keys) { const match = Object.keys(row).find(h => h.includes(k)); if (match && row[match]) return row[match]; } return ""; };
    const imported = rows.filter(r => findField(r, fieldMap.name)).map(r => ({ id: Date.now() + Math.random(), name: findField(r, fieldMap.name), handle: findField(r, fieldMap.handle), platform: findField(r, fieldMap.platform) || "Instagram", niche: findField(r, fieldMap.niche), followers: findField(r, fieldMap.followers), rate: findField(r, fieldMap.rate), status: findField(r, fieldMap.status) || "under_nego", notes: findField(r, fieldMap.notes), email: findField(r, fieldMap.email), contact: findField(r, fieldMap.contact), created_at: new Date().toISOString() }));
    save([...imported, ...influencers]);
    setImportResult({ count: imported.length, skipped: rows.length - imported.length });
    setImporting(false); e.target.value = "";
  };

  const statuses = { active: { label: "ACTIVE", color: T.green }, paid: { label: "PAID", color: T.purple }, under_nego: { label: "NEGOTIATING", color: T.yellow }, completed: { label: "COMPLETED", color: T.gray }, declined: { label: "DECLINED", color: T.red } };
  const filtered = filter === "all" ? influencers : influencers.filter(i => i.status === filter);
  const counts = Object.keys(statuses).reduce((a, k) => ({ ...a, [k]: influencers.filter(i => i.status === k).length }), {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["all", "ALL", T.black], ...Object.entries(statuses).map(([k, v]) => [k, v.label, v.color])].map(([k, l, c]) => (
          <Pill key={k} label={`${l} (${k === "all" ? influencers.length : counts[k]})`} active={filter === k} color={c} onClick={() => setFilter(k)} />
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <label style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.purple, color: "#fff", cursor: "pointer", fontFamily: T.body }}>
            {importing ? "IMPORTING…" : "IMPORT CSV"}
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} disabled={importing} />
          </label>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.orange, color: "#fff", border: "none", cursor: "pointer", fontFamily: T.body }}>+ ADD</button>
        </div>
      </div>
      {importResult && <div style={{ background: "#F0FDF4", border: `1px solid ${T.green}33`, borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>Imported {importResult.count} influencers{importResult.skipped > 0 ? ` (${importResult.skipped} skipped)` : ""}</span><button onClick={() => setImportResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.green }}>×</button></div>}
      {showForm && (
        <Card>
          <SectionHeader label="Add Influencer" />
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["name", "NAME *"], ["handle", "HANDLE"], ["niche", "NICHE"], ["followers", "FOLLOWERS"], ["rate", "RATE"], ["email", "EMAIL"], ["contact", "CONTACT #"]].map(([k, l]) => (
              <div key={k}><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>{l}</div><Input value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} /></div>
            ))}
            <div><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>PLATFORM</div><select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none" }}>{["Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook", "LinkedIn"].map(p => <option key={p}>{p}</option>)}</select></div>
            <div><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>STATUS</div><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none" }}>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div style={{ padding: "0 16px 16px" }}><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes…" style={{ width: "100%", minHeight: 60, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: T.body, resize: "vertical" }} /></div>
          <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
            <Btn onClick={add} disabled={!form.name.trim()} label="ADD INFLUENCER" />
            <button onClick={() => setShowForm(false)} style={{ padding: "11px 20px", borderRadius: 8, background: T.surface, color: T.gray, border: `1px solid ${T.border}`, fontSize: 13, cursor: "pointer", fontFamily: T.font }}>CANCEL</button>
          </div>
        </Card>
      )}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>👥</div><div style={{ fontSize: 14, fontWeight: 600, color: T.gray }}>No influencers yet — import CSV or add manually</div></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(inf => (
            <Card key={inf.id} style={{ padding: 16 }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{inf.name}</div>
                  <div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>@{inf.handle} · {inf.platform}{inf.followers ? ` · ${inf.followers}` : ""}</div>
                  {inf.niche && <div style={{ fontSize: 11, color: T.grayLight, marginTop: 2 }}>Niche: {inf.niche}</div>}
                  {(inf.email || inf.contact) && <div style={{ fontSize: 11, color: T.grayLight, marginTop: 2 }}>{inf.email}{inf.email && inf.contact ? " · " : ""}{inf.contact}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge label={statuses[inf.status]?.label} color={statuses[inf.status]?.color} />
                  {inf.rate && <span style={{ fontSize: 11, color: T.gray }}>{inf.rate}</span>}
                </div>
              </div>
              {inf.notes && <div style={{ fontSize: 12, color: T.darkGray, background: T.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{inf.notes}</div>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(statuses).filter(([k]) => k !== inf.status).map(([k, v]) => (
                  <button key={k} onClick={() => updateStatus(inf.id, k)} style={{ background: T.bg, color: v.color, border: `1px solid ${v.color}33`, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>→ {v.label}</button>
                ))}
                <button onClick={() => del(inf.id)} style={{ marginLeft: "auto", background: T.bg, color: T.gray, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: T.font }}>DELETE</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentTracker() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ influencer: "", platform: "Instagram", content_type: "Post", caption: "", post_date: "", status: "planned", link: "" });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { storage.get("content-tracker").then(s => { if (s) setPosts(JSON.parse(s.value)); }); }, []);

  const save = async (list) => { setPosts(list); await storage.set("content-tracker", JSON.stringify(list)); };
  const add = () => { save([{ ...form, id: Date.now(), created_at: new Date().toISOString() }, ...posts]); setForm({ influencer: "", platform: "Instagram", content_type: "Post", caption: "", post_date: "", status: "planned", link: "" }); setShowForm(false); };
  const del = (id) => save(posts.filter(p => p.id !== id));
  const updateStatus = (id, status) => save(posts.map(p => p.id === id ? { ...p, status } : p));

  const statuses = { planned: { label: "PLANNED", color: T.purple }, submitted: { label: "SUBMITTED", color: T.yellow }, live: { label: "LIVE", color: T.green }, revision: { label: "REVISION", color: T.orange }, approved: { label: "APPROVED", color: T.green } };
  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["all", "ALL"], ...Object.entries(statuses).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <Pill key={k} label={`${l} (${k === "all" ? posts.length : posts.filter(p => p.status === k).length})`} active={filter === k} color={k === "all" ? T.black : statuses[k]?.color} onClick={() => setFilter(k)} />
        ))}
        <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.orange, color: "#fff", border: "none", cursor: "pointer", fontFamily: T.body }}>+ ADD CONTENT</button>
      </div>
      {showForm && (
        <Card>
          <SectionHeader label="Add Content" />
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["influencer", "INFLUENCER *"], ["link", "POST LINK"]].map(([k, l]) => (
              <div key={k}><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>{l}</div><Input value={form[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} /></div>
            ))}
            {[["platform", ["Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook"]], ["content_type", ["Post", "Reel", "Story", "Video", "TikTok", "Tweet"]]].map(([k, opts]) => (
              <div key={k}><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>{k === "platform" ? "PLATFORM" : "TYPE"}</div><select value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none" }}>{opts.map(o => <option key={o}>{o}</option>)}</select></div>
            ))}
            <div><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>POST DATE</div><input type="date" value={form.post_date} onChange={e => setForm(p => ({ ...p, post_date: e.target.value }))} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: T.body }} /></div>
            <div><div style={{ fontSize: 10, color: T.gray, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>STATUS</div><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none" }}>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div style={{ padding: "0 16px 16px" }}><textarea value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} placeholder="Caption / notes…" style={{ width: "100%", minHeight: 70, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: T.body, resize: "vertical" }} /></div>
          <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
            <Btn onClick={add} disabled={!form.influencer.trim()} label="ADD CONTENT" />
            <button onClick={() => setShowForm(false)} style={{ padding: "11px 20px", borderRadius: 8, background: T.surface, color: T.gray, border: `1px solid ${T.border}`, fontSize: 13, cursor: "pointer", fontFamily: T.font }}>CANCEL</button>
          </div>
        </Card>
      )}
      {filtered.length === 0 ? <Card style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>📅</div><div style={{ fontSize: 14, fontWeight: 600, color: T.gray }}>No content tracked yet</div></Card> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(post => (
            <Card key={post.id} style={{ padding: 16 }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{post.influencer}</div>
                  <div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>{post.platform} · {post.content_type}{post.post_date ? ` · ${new Date(post.post_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</div>
                  {post.link && <a href={post.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.orange, marginTop: 2, display: "block" }}>VIEW POST ↗</a>}
                </div>
                <Badge label={statuses[post.status]?.label} color={statuses[post.status]?.color} />
              </div>
              {post.caption && <div style={{ fontSize: 12, color: T.darkGray, background: T.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 10, lineHeight: 1.5 }}>{post.caption}</div>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(statuses).filter(([k]) => k !== post.status).map(([k, v]) => (
                  <button key={k} onClick={() => updateStatus(post.id, k)} style={{ background: T.bg, color: v.color, border: `1px solid ${v.color}33`, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>→ {v.label}</button>
                ))}
                <button onClick={() => del(post.id)} style={{ marginLeft: "auto", background: T.bg, color: T.gray, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: T.font }}>DELETE</button>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

// ─── DESIGN ───────────────────────────────────────────────────────────────────
function DesignBrief() {
  const [request, setRequest] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Creative director at BuildWithLeverage. Build design brief: ${request}. Return ONLY valid JSON: {"project_title":"t","objective":"o","deliverables":["d1"],"dimensions":"dim","brand_guidelines":["g1"],"mood":["v1"],"references":"inspiration","deadline_suggestion":"turnaround","full_brief":"complete formatted design brief"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Design Request" value={request} onChange={setRequest} placeholder="What needs to be designed?" /><Btn onClick={gen} disabled={!request.trim()} loading={loading} label="GENERATE DESIGN BRIEF" icon="🎨" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 18 }}><CardLabel color={T.orange}>Project</CardLabel><div style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: T.font, margin: "6px 0 10px" }}>{result.project_title}</div><div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{result.objective}</div></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="Mood / Vibe" items={result.mood} color="#a855f7" /></div><Bullets label="Brand Guidelines" items={result.brand_guidelines} color={T.orange} /><ResultBlock label="Full Design Brief" content={result.full_brief} copyable /></>}</div>);
}

function FeedbackSummary() {
  const [feedback, setFeedback] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const gen = async () => { setLoading(true); setResult(null); setError(null); const prompt = `Project manager at BuildWithLeverage. Summarize design feedback: ${feedback}. Return ONLY valid JSON: {"summary":"1-2 sentence overview","required_changes":["c1"],"nice_to_have":["n1"],"keep_as_is":["k1"],"tone":"positive|mixed|critical","designer_message":"complete actionable message to designer"}`; try { const r = await callClaude(prompt); setResult(r); } catch (e) { setError(e.message); } setLoading(false); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><Textarea label="Paste Feedback" value={feedback} onChange={setFeedback} placeholder="Paste raw feedback — messy is fine…" /><Btn onClick={gen} disabled={!feedback.trim()} loading={loading} label="SUMMARIZE FEEDBACK" icon="🖊" /><Err msg={error} />{result && <><Card style={{ background: T.black, padding: 16 }}><CardLabel color={T.orange}>Overview</CardLabel><p style={{ margin: "8px 0 0", color: "#fff", fontSize: 13, lineHeight: 1.7 }}>{result.summary}</p></Card><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Bullets label="Required Changes" items={result.required_changes} color={T.red} /><Bullets label="Nice to Have" items={result.nice_to_have} color={T.yellow} /></div><Bullets label="Keep As Is" items={result.keep_as_is} color={T.green} /><ResultBlock label="Message for Designer" content={result.designer_message} copyable /></>}</div>);
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ slackToken, setSlackToken, slackIds, setSlackIds }) {
  const [token, setToken] = useState(slackToken || "");
  const [ids, setIds] = useState(slackIds || DEFAULT_SLACK_IDS);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSlackToken(token); setSlackIds(ids);
    await storage.set("slack-token", token);
    await storage.set("slack-ids", JSON.stringify(ids));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionHeader label="Slack Bot Token" />
        <div style={{ padding: 16 }}>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="xoxb-…"
            style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: T.mono }}
            onFocus={e => e.target.style.borderColor = T.orange}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
      </Card>
      <Card>
        <SectionHeader label="Slack User IDs" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(ids).map(([name, id]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={name} size={28} />
              <div style={{ width: 130, fontSize: 12, fontWeight: 600, flexShrink: 0, color: T.darkGray }}>{name.split(" ")[0]}</div>
              <input value={id} onChange={e => setIds(p => ({ ...p, [name]: e.target.value }))} placeholder="U0XXXXXXXXX"
                style={{ flex: 1, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.black, fontSize: 12, padding: "8px 12px", outline: "none", fontFamily: T.mono }}
                onFocus={e => e.target.style.borderColor = T.orange}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
          ))}
        </div>
      </Card>
      <Btn onClick={save} label={saved ? "✓ SAVED" : "SAVE SETTINGS"} color={saved ? T.green : T.black} />
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{ padding: 60, textAlign: "center" }}>
    <div style={{ width: 40, height: 40, border: `3px solid ${T.border}`, borderTopColor: T.orange, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div style={{ fontSize: 12, color: T.grayLight, fontFamily: T.mono, letterSpacing: 2 }}>LOADING…</div>
  </div>
);

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Dashboard" },
  { key: "ops-pulse", label: "Ops Pulse" },
  { key: "rfp", label: "RFP Engine" },
  { key: "cos", label: "CoS Tools", children: [
    { key: "weekly-report", label: "Weekly Report" },
    { key: "exec-comms", label: "Exec Comms" },
    { key: "daily-briefing", label: "Daily Briefing" },
    { key: "team-performance", label: "Team Performance" },
    { key: "strategic-decision", label: "Strategic Decision" },
  ]},
  { key: "outbound", label: "Outbound", children: [
    { key: "sequence-builder", label: "Sequence Builder" },
    { key: "lead-research", label: "Lead Research" },
    { key: "cold-email", label: "Cold Email" },
    { key: "call-script", label: "Call Script" },
    { key: "after-call", label: "After Call" },
  ]},
  { key: "influencer", label: "Influencer", children: [
    { key: "influencer-outreach", label: "Outreach" },
    { key: "campaign-brief", label: "Campaign Brief" },
    { key: "influencer-tracker", label: "Tracker" },
    { key: "content-tracker", label: "Content Tracker" },
  ]},
  { key: "design", label: "Design", children: [
    { key: "design-brief", label: "Design Brief" },
    { key: "feedback-summary", label: "Feedback Summary" },
  ]},
  { key: "settings", label: "Settings" },
];

// ─── TOP NAV ─────────────────────────────────────────────────────────────────
function TopNav({ page, navigate, isMobile }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef(null);

  const openMenu = (key) => { clearTimeout(closeTimer.current); setOpenGroup(key); };
  const closeMenu = () => { closeTimer.current = setTimeout(() => setOpenGroup(null), 120); };

  return (
    <header style={{
      background: T.black, height: 58,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", position: "sticky", top: 0, zIndex: 200,
      borderBottom: `2px solid ${T.orange}`,
      boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: 2, fontFamily: T.font, cursor: "pointer" }} onClick={() => navigate("dashboard")}>
          LEVERAGE<span style={{ color: T.orange }}>.</span>
        </div>
        <div style={{ height: 20, width: 1, background: "#333" }} />
        <div style={{ fontSize: 10, color: "#555", fontFamily: T.mono, letterSpacing: 2 }}>OPS HUB</div>
      </div>

      {isMobile ? (
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: 4 }}>
          {menuOpen ? "✕" : "≡"}
        </button>
      ) : (
        <nav style={{ display: "flex", height: "100%", alignItems: "stretch" }}>
          {NAV.map(n => {
            const isActive = page === n.key || n.children?.some(c => c.key === page);
            return (
              <div key={n.key} style={{ position: "relative", display: "flex", alignItems: "stretch" }}
                onMouseEnter={() => n.children && openMenu(n.key)}
                onMouseLeave={() => n.children && closeMenu()}>
                <button
                  onClick={() => !n.children && navigate(n.key)}
                  style={{
                    height: "100%", padding: "0 18px",
                    background: isActive ? T.orange : "transparent",
                    color: isActive ? "#fff" : "#aaa",
                    border: "none", fontSize: 12, fontWeight: 700,
                    cursor: n.children ? "default" : "pointer",
                    letterSpacing: 1, fontFamily: T.font,
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "background 0.15s, color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#ffffff14"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "#aaa"; e.currentTarget.style.background = "transparent"; } }}
                >
                  {n.label.toUpperCase()}
                  {n.children && <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>}
                </button>

                {n.children && openGroup === n.key && (
                  <div
                    style={{
                      position: "absolute", top: "100%", left: 0,
                      background: T.black, border: `1px solid #2a2a2a`,
                      borderTop: `2px solid ${T.orange}`, minWidth: 200,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                      zIndex: 300, padding: "6px 0",
                    }}
                    onMouseEnter={() => clearTimeout(closeTimer.current)}
                    onMouseLeave={closeMenu}
                  >
                    {n.children.map((c, i) => (
                      <button key={c.key} onClick={() => { navigate(c.key); setOpenGroup(null); }}
                        style={{
                          display: "flex", alignItems: "center", width: "100%",
                          padding: "10px 18px", background: page === c.key ? "#ffffff12" : "transparent",
                          color: page === c.key ? T.orange : "#ccc",
                          border: "none", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", textAlign: "left",
                          letterSpacing: 0.5, fontFamily: T.body,
                          borderLeft: page === c.key ? `3px solid ${T.orange}` : "3px solid transparent",
                          transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#ffffff12"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = page === c.key ? "#ffffff12" : "transparent"; e.currentTarget.style.color = page === c.key ? T.orange : "#ccc"; }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", top: 58, left: 0, right: 0, bottom: 0, background: T.black, zIndex: 199, overflowY: "auto", padding: 16 }}>
          {NAV.map(n => n.children ? (
            <div key={n.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 3, padding: "6px 10px 4px", fontFamily: T.font }}>{n.label.toUpperCase()}</div>
              {n.children.map(c => (
                <button key={c.key} onClick={() => { navigate(c.key); setMenuOpen(false); }}
                  style={{ display: "block", width: "100%", padding: "10px 16px", background: page === c.key ? T.orange : "transparent", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 6, textAlign: "left", marginBottom: 2, fontFamily: T.body }}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <button key={n.key} onClick={() => { navigate(n.key); setMenuOpen(false); }}
              style={{ display: "block", width: "100%", padding: "10px 16px", background: page === n.key ? T.orange : "transparent", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: 6, textAlign: "left", marginBottom: 2, fontFamily: T.body }}>
              {n.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
const PAGE_ICONS = { dashboard: "⚡", "ops-pulse": "📋", rfp: "📊", "weekly-report": "📄", "exec-comms": "✏️", "daily-briefing": "☀️", "team-performance": "👥", "strategic-decision": "🧠", "sequence-builder": "✉️", "lead-research": "🔍", "cold-email": "📧", "call-script": "📞", "after-call": "🗒️", "influencer-outreach": "📲", "campaign-brief": "📋", "influencer-tracker": "👥", "content-tracker": "📅", "design-brief": "🎨", "feedback-summary": "🖊", settings: "⚙️" };

function PageWrapper({ page, children }) {
  const allPages = NAV.flatMap(n => n.children ? n.children : [n]);
  const current = allPages.find(n => n.key === page);
  const parent = NAV.find(n => n.children?.some(c => c.key === page));

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 60px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        {parent && <>
          <span style={{ fontSize: 11, color: T.grayLight, fontFamily: T.mono }}>{parent.label.toUpperCase()}</span>
          <span style={{ fontSize: 11, color: T.borderDark }}>›</span>
        </>}
        <span style={{ fontSize: 11, color: T.orange, fontWeight: 700, fontFamily: T.mono, letterSpacing: 1 }}>
          {PAGE_ICONS[page]} {current?.label?.toUpperCase() || page.toUpperCase()}
        </span>
      </div>
      {children}
    </main>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [slackToken, setSlackToken] = useState("");
  const [slackIds, setSlackIds] = useState(DEFAULT_SLACK_IDS);
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([storage.get("slack-token"), storage.get("slack-ids")]).then(([t, ids]) => {
      if (t) setSlackToken(t.value);
      if (ids) setSlackIds(JSON.parse(ids.value));
    });
  }, []);

  const navigate = (key) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "ops-pulse": return <OpsPulse slackIds={slackIds} />;
      case "rfp": return <RFPEngine />;
      case "weekly-report": return <WeeklyReport />;
      case "exec-comms": return <ExecComms />;
      case "daily-briefing": return <DailyBriefing />;
      case "team-performance": return <TeamPerformance />;
      case "strategic-decision": return <StrategicDecision />;
      case "sequence-builder": return <SequenceBuilder />;
      case "lead-research": return <LeadResearch />;
      case "cold-email": return <ColdEmailWriter />;
      case "call-script": return <CallScript />;
      case "after-call": return <AfterCallAutomation />;
      case "influencer-outreach": return <InfluencerOutreach />;
      case "campaign-brief": return <CampaignBrief />;
      case "influencer-tracker": return <InfluencerTracker />;
      case "content-tracker": return <ContentTracker />;
      case "design-brief": return <DesignBrief />;
      case "feedback-summary": return <FeedbackSummary />;
      case "settings": return <Settings slackToken={slackToken} setSlackToken={setSlackToken} slackIds={slackIds} setSlackIds={setSlackIds} />;
      default: return <Dashboard />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight: "100vh", background: T.bg }}>
        <TopNav page={page} navigate={navigate} isMobile={isMobile} />
        <PageWrapper page={page}>
          {renderPage()}
        </PageWrapper>
      </div>
    </>
  );
}
