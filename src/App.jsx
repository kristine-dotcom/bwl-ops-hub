import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const T = {
  bg:"#F5F5F0", surface:"#FFFFFF", border:"#E5E0D8", borderDark:"#C8C2B8",
  black:"#000000", orange:"#FF3300", orangeSoft:"#FFF0ED",
  gray:"#6B7280", grayLight:"#9CA3AF", darkGray:"#374151",
  green:"#10B981", yellow:"#F59E0B", red:"#EF4444", purple:"#7C3AED",
  blue:"#3B82F6",
  font:"'Space Grotesk','Arial Narrow',Arial,sans-serif",
  body:"'Space Grotesk','Segoe UI',Arial,sans-serif",
  mono:"'JetBrains Mono','Courier New',monospace",
};

const CORRECT_PASSWORD = "leverage2025";
const ADMIN_PASSWORD = "admin2025";
const SHIFT_START = "09:00";
const SHIFT_END = "18:00";
const PRIORITY_OPTIONS = ["High","Medium","Low"];
const TIME_OPTIONS = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","EOD"];
const TEAM_OPS = ["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const DAY_LABELS = ["MON","TUE","WED","THU","FRI"];

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:#F5F5F0;font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;color:#000;}
    ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-thumb{background:#000;}
    ::placeholder{color:#9CA3AF;}
    input,select,textarea,button{font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  `}</style>
);

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const storage = {
  get: async (k) => {
    try {
      const r = await window.storage.get(k);
      if (!r) return null;
      return { value: typeof r.value === "string" ? r.value : JSON.stringify(r.value) };
    } catch { return null; }
  },
  set: async (k, v) => { try { await window.storage.set(k, v); } catch {} },
};

// ─── PURE UTILITIES ───────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const priorityColor = (p) => ({ High:T.red, Medium:T.yellow, Low:T.green, high:T.red, medium:T.yellow, low:T.green }[p] || T.gray);

const getWeekDates = () => {
  const d = new Date(), day = d.getDay(), mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length:5 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate()+i); return x.toISOString().split("T")[0]; });
};

const calcTotalHours = (logs, member, date) => {
  const dl = logs.filter(l => l.member === member && l.date === date);
  let total = 0, inTime = null;
  for (const log of dl) {
    if (log.type === "in") inTime = log.timestamp;
    else if (log.type === "out" && inTime) { total += (new Date(log.timestamp) - new Date(inTime))/3600000; inTime=null; }
  }
  if (inTime) total += (new Date() - new Date(inTime))/3600000;
  return parseFloat(total.toFixed(1));
};

const calcIsLate = (logs, member, date) => {
  const fi = logs.find(l => l.member === member && l.date === date && l.type === "in");
  if (!fi) return false;
  const [h, min] = fi.time.split(":").map(Number);
  return h > 9 || (h === 9 && min > 0);
};

const exportCSV = (rows, filename) => {
  if (!rows.length) return alert("No data to export.");
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── METRIC FIELDS ────────────────────────────────────────────────────────────
const METRIC_FIELDS = {
  "Caleb Bentil": {
    emoji:"📞", role:"Outbound Specialist", color:"#6366f1",
    fields:[
      { key:"calls_dialed",    label:"Calls Dialed",           type:"number", placeholder:"0",  note:"Total dials incl. voicemails" },
      { key:"live_connects",   label:"Live Connects",          type:"number", placeholder:"0",  note:"Actual conversations" },
      { key:"meetings_booked", label:"Meetings Booked",        type:"number", placeholder:"0",  note:"Confirmed calendar invites" },
      { key:"followups_sent",  label:"Follow-ups Sent",        type:"number", placeholder:"0",  note:"Emails/messages after connects" },
      { key:"notable_convo",   label:"Notable Conversation",   type:"text",   placeholder:"e.g. Spoke with [name] at [company]…", note:"Best convo of the day" },
    ]
  },
  "Cyril Butanas": {
    emoji:"🌟", role:"Influencer Outreach Specialist", color:"#10b981",
    fields:[
      { key:"sourced",    label:"Influencers Sourced",     type:"number", placeholder:"0", note:"Qualified profiles added to pipeline" },
      { key:"outreach",   label:"Outreach Sent",           type:"number", placeholder:"0", note:"DMs or emails sent today" },
      { key:"replies",    label:"Replies Received",        type:"number", placeholder:"0", note:"Responses to outreach" },
      { key:"confirmed",  label:"Partnerships Confirmed",  type:"number", placeholder:"0", note:"Confirmed and ready for activation" },
      { key:"rel_update", label:"Key Relationship Update", type:"text",   placeholder:"e.g. [Name] — responded positively…", note:"Notable convo or status change" },
    ]
  },
  "Darlene Mae Malolos": {
    emoji:"🎨", role:"Graphic Designer", color:"#ec4899",
    fields:[
      { key:"assets",    label:"Assets Completed",    type:"text",   placeholder:"e.g. IG post (Client A), Email banner (Client B)", note:"List titles, not just count" },
      { key:"wip",       label:"In Progress",         type:"text",   placeholder:"e.g. Pitch deck (Client C) — 60% done",           note:"What's still ongoing" },
      { key:"revisions", label:"Revision Requests",   type:"number", placeholder:"0", note:"Revision rounds received today" },
      { key:"delays",    label:"Turnaround / Delays", type:"text",   placeholder:"e.g. Waiting for brand assets from Client D…",    note:"Any delays or blockers on design side" },
    ]
  },
};

const serializeMetrics = (member, values) => {
  const config = METRIC_FIELDS[member];
  if (!config) return values?.text || "";
  return config.fields.map(f => `${f.label}: ${values?.[f.key] || "—"}`).join("\n");
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Badge({ label, color = T.orange }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", color, border:`1.5px solid ${color}`, padding:"2px 8px", fontSize:10, fontWeight:700, letterSpacing:1.5, fontFamily:T.mono, textTransform:"uppercase" }}>
      {label}
    </span>
  );
}

function Pill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding:"5px 14px", fontSize:10, fontWeight:700, letterSpacing:1.5, background: active ? T.black : hov ? T.black : T.surface, color: active ? T.orange : hov ? "#fff" : T.gray, border:`2px solid ${T.black}`, cursor:"pointer", transition:"all 0.15s", fontFamily:T.mono, textTransform:"uppercase" }}>
      {label}
    </button>
  );
}

function Avatar({ name, size = 32, muted = false }) {
  const initials = name.split(" ").map(n => n[0]).slice(0,2).join("");
  const hue = name.split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width:size, height:size, background: muted ? "#ddd" : `hsl(${hue},60%,88%)`, color: muted ? "#999" : `hsl(${hue},50%,35%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, flexShrink:0, fontFamily:T.font, border:`2px solid ${muted ? "#ccc" : T.black}` }}>
      {initials}
    </div>
  );
}

function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ background:T.border, height, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${value}%`, background: value === 100 ? T.green : (color || T.orange), transition:"width 0.4s ease" }} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ padding:60, textAlign:"center" }}>
      <div style={{ width:40, height:40, border:`3px solid ${T.border}`, borderTopColor:T.orange, borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }} />
      <div style={{ fontSize:12, color:T.grayLight, fontFamily:T.mono, letterSpacing:2 }}>LOADING…</div>
    </div>
  );
}

// ─── CHART TOOLTIP ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, unit="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.black, border:`2px solid ${T.orange}`, padding:"8px 14px" }}>
      <div style={{ fontSize:10, color:T.orange, fontFamily:T.mono, letterSpacing:1, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ fontSize:16, fontWeight:900, color:"#fff", fontFamily:T.font }}>{p.value}{unit}</div>
      ))}
    </div>
  );
};

// ─── METRICS SECTION ──────────────────────────────────────────────────────────
function MetricsSection({ member, values, onChange }) {
  const config = METRIC_FIELDS[member];
  const [focused, setFocused] = useState(null);
  const set = (key, val) => onChange({ ...values, [key]: val });

  const connectRate = (member === "Caleb Bentil" && values?.calls_dialed && values?.live_connects)
    ? ((parseFloat(values.live_connects)/parseFloat(values.calls_dialed))*100).toFixed(1) : null;

  const inputStyle = (key) => ({
    width:"100%", background:T.bg, border:`2px solid ${focused===key ? T.orange : T.black}`,
    padding:"9px 12px", outline:"none", fontFamily:T.body, color:T.black, transition:"border-color 0.15s",
  });

  if (!config) {
    return (
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>ACTUAL METRICS TODAY *</div>
        </div>
        <textarea value={values?.text||""} onChange={e => onChange({ text:e.target.value })} placeholder="Fill in your actual numbers for today…"
          style={{ width:"100%", minHeight:90, background:"transparent", border:"none", padding:14, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
      </div>
    );
  }

  return (
    <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
      <div style={{ background:T.black, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>ACTUAL METRICS TODAY *</div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:13 }}>{config.emoji}</span>
          <span style={{ fontSize:10, color:"#555", fontFamily:T.mono }}>{config.role}</span>
        </div>
      </div>
      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>
        {config.fields.map(f => (
          <div key={f.key}>
            <div style={{ marginBottom:5 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.darkGray, fontFamily:T.mono, letterSpacing:1.5, textTransform:"uppercase" }}>{f.label}</div>
              <div style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono, marginTop:1 }}>{f.note}</div>
            </div>
            {f.type === "number"
              ? <input type="number" min="0" value={values?.[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
                  onFocus={()=>setFocused(f.key)} onBlur={()=>setFocused(null)}
                  style={{ ...inputStyle(f.key), fontWeight:700, fontFamily:T.mono, fontSize:18 }} />
              : <textarea value={values?.[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
                  onFocus={()=>setFocused(f.key)} onBlur={()=>setFocused(null)}
                  style={{ ...inputStyle(f.key), minHeight:60, resize:"vertical", lineHeight:1.6, display:"block", fontSize:13 }} />
            }
          </div>
        ))}
        {connectRate && (
          <div style={{ background:"#eef2ff", border:`2px solid ${config.color}`, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:config.color, fontFamily:T.mono, letterSpacing:1.5 }}>CONNECT RATE (AUTO)</div>
            <div style={{ fontSize:24, fontWeight:900, color:config.color, fontFamily:T.font }}>{connectRate}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SOD FORM ─────────────────────────────────────────────────────────────────
function SODForm({ member, onSubmit }) {
  const [tasks, setTasks] = useState([{ task:"", priority:"High", eta:"EOD" }]);
  const [metrics, setMetrics] = useState("");
  const [blockers, setBlockers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateTask = (i,f,v) => setTasks(p => p.map((t,xi) => xi===i ? {...t,[f]:v} : t));
  const canSubmit = tasks.some(t => t.task.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const sod = { member, date:todayStr(), submittedAt:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}), tasks:tasks.filter(t=>t.task.trim()), metrics:metrics.trim(), blockers:blockers.trim() };
    const key = `sod-${todayStr()}`;
    const ex = await storage.get(key);
    const all = ex ? JSON.parse(ex.value) : {};
    all[member] = sod;
    await storage.set(key, JSON.stringify(all));
    setTimeout(() => onSubmit(sod), 700);
  };

  if (submitting) return (
    <div style={{ textAlign:"center", padding:"48px 20px" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font, marginBottom:6 }}>SOD Submitted!</div>
      <div style={{ fontSize:12, color:T.gray, fontFamily:T.mono }}>Unlocking Log In…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"#fff8f0", border:`2px solid ${T.orange}`, padding:"12px 16px", fontSize:12, color:T.darkGray, lineHeight:1.6 }}>
        📋 <strong>Submit your Start of Day report first.</strong> Your <strong>Log In will unlock</strong> after this.
      </div>
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>TODAY'S TASKS *</div>
          <button onClick={() => setTasks(p => [...p, {task:"",priority:"High",eta:"EOD"}])}
            style={{ background:"transparent", border:`1px solid #444`, color:"#aaa", padding:"3px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:T.mono }}>+ ADD</button>
        </div>
        <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
          {tasks.map((t,i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, paddingTop:12, minWidth:18 }}>{i+1}.</div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                <input value={t.task} onChange={e=>updateTask(i,"task",e.target.value)} placeholder={`Task ${i+1}…`}
                  style={{ width:"100%", background:T.bg, border:`2px solid ${T.black}`, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:T.body, color:T.black }} />
                <div style={{ display:"flex", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9, color:T.grayLight, fontFamily:T.mono, letterSpacing:1, marginBottom:3 }}>PRIORITY</div>
                    <select value={t.priority} onChange={e=>updateTask(i,"priority",e.target.value)}
                      style={{ width:"100%", background:T.bg, border:`2px solid ${priorityColor(t.priority)}`, padding:"6px 10px", fontSize:12, fontWeight:700, color:priorityColor(t.priority), outline:"none", fontFamily:T.mono }}>
                      {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9, color:T.grayLight, fontFamily:T.mono, letterSpacing:1, marginBottom:3 }}>TARGET TIME</div>
                    <select value={t.eta} onChange={e=>updateTask(i,"eta",e.target.value)}
                      style={{ width:"100%", background:T.bg, border:`2px solid ${T.black}`, padding:"6px 10px", fontSize:12, color:T.black, outline:"none", fontFamily:T.mono }}>
                      {TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {tasks.length > 1 && (
                <button onClick={()=>setTasks(p=>p.filter((_,xi)=>xi!==i))} style={{ background:"none", border:"none", color:T.grayLight, fontSize:16, cursor:"pointer", paddingTop:8 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>TODAY'S METRICS TARGET</div>
        </div>
        <textarea value={metrics} onChange={e=>setMetrics(e.target.value)} placeholder="e.g. 80 calls, 8 connects, 3 meetings booked…"
          style={{ width:"100%", minHeight:70, background:"transparent", border:"none", padding:14, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
      </div>
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>BLOCKERS (OPTIONAL)</div>
        </div>
        <textarea value={blockers} onChange={e=>setBlockers(e.target.value)} placeholder="Anything blocking you today?"
          style={{ width:"100%", minHeight:60, background:"transparent", border:"none", padding:14, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
      </div>
      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{ width:"100%", padding:"14px", background:canSubmit?T.orange:"#E5E0D8", color:canSubmit?"#fff":T.gray, border:"none", fontSize:13, fontWeight:700, cursor:canSubmit?"pointer":"not-allowed", letterSpacing:2, fontFamily:T.font }}>
        {canSubmit ? "✅  SUBMIT SOD & UNLOCK LOG IN" : "ADD AT LEAST ONE TASK TO CONTINUE"}
      </button>
    </div>
  );
}

// ─── EOD FORM ─────────────────────────────────────────────────────────────────
function EODForm({ member, sodTasks, hoursToday, onSubmit, onBack }) {
  const [taskStatus, setTaskStatus] = useState((sodTasks||[]).map(t => ({...t,done:false})));
  const [metricsValues, setMetricsValues] = useState({});
  const [highlight, setHighlight] = useState("");
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockerProblem, setBlockerProblem] = useState("");
  const [blockerSolutions, setBlockerSolutions] = useState(["","",""]);
  const [blockerRec, setBlockerRec] = useState("");
  const [tomorrowGoal, setTomorrowGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doneTasks = taskStatus.filter(t=>t.done).length;
  const totalTasks = taskStatus.length;
  const pct = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0;
  const hasMetrics = METRIC_FIELDS[member] ? Object.values(metricsValues).some(v=>String(v).trim()) : !!metricsValues?.text?.trim();
  const canSubmit = hasMetrics && tomorrowGoal.trim();

  const toggleTask = i => setTaskStatus(p => p.map((t,xi) => xi===i ? {...t,done:!t.done} : t));
  const setSolution = (i,v) => setBlockerSolutions(p => p.map((x,xi) => xi===i?v:x));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const eod = {
      member, date:todayStr(), submittedAt:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}),
      hoursToday, taskStatus, completionPct:pct, metricsRaw:metricsValues,
      metricsDisplay:serializeMetrics(member,metricsValues), highlight:highlight.trim(),
      blocker:hasBlocker ? {problem:blockerProblem.trim(),solutions:blockerSolutions.filter(s=>s.trim()),recommendation:blockerRec.trim()} : null,
      tomorrowGoal:tomorrowGoal.trim(),
    };
    const key = `eod-${todayStr()}`;
    const ex = await storage.get(key);
    const all = ex ? JSON.parse(ex.value) : {};
    all[member] = eod;
    await storage.set(key, JSON.stringify(all));
    setTimeout(() => onSubmit(eod), 700);
  };

  if (submitting) return (
    <div style={{ textAlign:"center", padding:"48px 20px", animation:"slideIn 0.3s ease" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🌙</div>
      <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font, marginBottom:6 }}>EOD Submitted!</div>
      <div style={{ fontSize:12, color:T.gray, fontFamily:T.mono }}>Logging you out now…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"slideIn 0.3s ease" }}>
      <div style={{ background:"#f0fdf4", border:`2px solid ${T.green}`, padding:"12px 16px", fontSize:12, color:T.darkGray, lineHeight:1.6 }}>
        🌙 <strong>Submit your End of Day report to log out.</strong> This keeps Kristine and David aligned.
      </div>
      {taskStatus.length > 0 && (
        <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
          <div style={{ background:T.black, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>TASK RECAP — FROM YOUR SOD</div>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:T.mono, color:pct===100?T.green:T.yellow }}>{doneTasks}/{totalTasks} DONE · {pct}%</div>
          </div>
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
            <ProgressBar value={pct} height={5} />
            <div style={{ marginTop:4, display:"flex", flexDirection:"column", gap:5 }}>
              {taskStatus.map((t,i) => (
                <div key={i} onClick={()=>toggleTask(i)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:t.done?"#f0fdf4":T.bg, border:`2px solid ${t.done?T.green:T.black}`, cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ width:18, height:18, border:`2px solid ${t.done?T.green:T.borderDark}`, background:t.done?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {t.done && <span style={{ color:"#fff", fontSize:10, fontWeight:900 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, fontSize:12, color:t.done?T.grayLight:T.black, textDecoration:t.done?"line-through":"none" }}>{t.task}</div>
                  <Badge label={t.priority} color={priorityColor(t.priority)} />
                  <span style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono }}>{t.eta}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono }}>Tap a task to mark done / not done</div>
          </div>
        </div>
      )}
      <MetricsSection member={member} values={metricsValues} onChange={setMetricsValues} />
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>WIN OR HIGHLIGHT (OPTIONAL)</div>
        </div>
        <textarea value={highlight} onChange={e=>setHighlight(e.target.value)} placeholder="Any win, good convo, or something worth sharing today?"
          style={{ width:"100%", minHeight:60, background:"transparent", border:"none", padding:14, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
      </div>
      <div style={{ background:T.surface, border:`2px solid ${hasBlocker?T.orange:T.black}`, overflow:"hidden", transition:"border-color 0.2s" }}>
        <div style={{ background:T.black, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }} onClick={()=>setHasBlocker(!hasBlocker)}>
          <div style={{ fontSize:10, fontWeight:700, color:hasBlocker?T.orange:"#888", fontFamily:T.mono, letterSpacing:2 }}>⚠ BLOCKER TODAY?</div>
          <div style={{ fontSize:10, color:"#555", fontFamily:T.mono }}>{hasBlocker?"▲ REMOVE":"▼ ADD BLOCKER"}</div>
        </div>
        {hasBlocker && (
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12, animation:"slideIn 0.2s ease" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:T.red, fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>01 // NAME THE PROBLEM</div>
              <textarea value={blockerProblem} onChange={e=>setBlockerProblem(e.target.value)} placeholder="What exactly is blocking you? Be specific."
                style={{ width:"100%", minHeight:60, background:T.bg, border:`2px solid ${T.black}`, padding:12, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:T.yellow, fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>02 // 3 POSSIBLE SOLUTIONS</div>
              {blockerSolutions.map((s,i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, minWidth:16 }}>{i+1}.</div>
                  <input value={s} onChange={e=>setSolution(i,e.target.value)} placeholder={`Solution ${i+1}…`}
                    style={{ flex:1, background:T.bg, border:`2px solid ${T.black}`, padding:"8px 12px", fontSize:12, outline:"none", fontFamily:T.body, color:T.black }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:T.green, fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>03 // YOUR RECOMMENDATION</div>
              <textarea value={blockerRec} onChange={e=>setBlockerRec(e.target.value)} placeholder="Which solution do you recommend, and why?"
                style={{ width:"100%", minHeight:60, background:T.bg, border:`2px solid ${T.black}`, padding:12, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>TOMORROW'S #1 GOAL *</div>
        </div>
        <textarea value={tomorrowGoal} onChange={e=>setTomorrowGoal(e.target.value)} placeholder="What is the ONE most important thing you need to accomplish tomorrow?"
          style={{ width:"100%", minHeight:60, background:"transparent", border:"none", padding:14, fontSize:13, outline:"none", fontFamily:T.body, lineHeight:1.7, resize:"vertical", color:T.black, display:"block" }} />
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onBack} style={{ padding:"12px 20px", background:"transparent", color:T.gray, border:`2px solid ${T.black}`, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.mono, letterSpacing:1, whiteSpace:"nowrap" }}>← BACK</button>
        <button onClick={handleSubmit} disabled={!canSubmit}
          style={{ flex:1, padding:"14px", background:canSubmit?T.red:"#E5E0D8", color:canSubmit?"#fff":T.gray, border:"none", fontSize:13, fontWeight:700, cursor:canSubmit?"pointer":"not-allowed", letterSpacing:2, fontFamily:T.font }}>
          {canSubmit ? "🌙  SUBMIT EOD & LOG OUT" : "FILL IN METRICS + TOMORROW'S GOAL"}
        </button>
      </div>
    </div>
  );
}

// ─── WEEKLY SUMMARY VIEW ──────────────────────────────────────────────────────
function WeeklySummaryView({ logs, sodWeek, eodWeek }) {
  const weekDates = getWeekDates();
  const weekLabel = (() => {
    const s = new Date(weekDates[0]+"T12:00:00");
    const e = new Date(weekDates[4]+"T12:00:00");
    const fmt = d => d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
  })();

  const memberStats = TEAM_OPS.map(m => {
    const totalHrs = weekDates.reduce((a,d) => a + calcTotalHours(logs,m,d), 0);
    const presentDays = weekDates.filter(d => logs.some(l => l.member===m && l.date===d && l.type==="in")).length;
    const sodCount = weekDates.filter(d => sodWeek[d]?.[m]).length;
    const eodCount = weekDates.filter(d => eodWeek[d]?.[m]).length;
    const taskPcts = weekDates.map(d => eodWeek[d]?.[m]?.completionPct).filter(v => v!=null);
    const avgTask = taskPcts.length ? Math.round(taskPcts.reduce((a,b)=>a+b,0)/taskPcts.length) : null;
    const lateDays = weekDates.filter(d => calcIsLate(logs,m,d)).length;
    return { name:m.split(" ")[0], fullName:m, hours:parseFloat(totalHrs.toFixed(1)), days:presentDays, sodCount, eodCount, avgTask, lateDays };
  });

  const hoursData = memberStats.map(s => ({ name:s.name, value:s.hours }));
  const taskData = memberStats.filter(s => s.avgTask!=null).map(s => ({ name:s.name, value:s.avgTask }));

  const totalPresent = memberStats.reduce((a,s) => a+(s.days>0?1:0), 0);
  const totalHrs = memberStats.reduce((a,s) => a+s.hours, 0).toFixed(1);
  const sodCompliance = Math.round((memberStats.reduce((a,s) => a+s.sodCount,0) / (TEAM_OPS.length*5))*100);
  const avgTaskAll = taskData.length ? Math.round(taskData.reduce((a,d)=>a+d.value,0)/taskData.length) : 0;

  const barColor = (val, max) => {
    const pct = max ? val/max : 0;
    return pct >= 0.8 ? T.green : pct >= 0.5 ? T.yellow : T.red;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"slideIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ background:T.black, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>WEEK IN REVIEW</div>
          <div style={{ fontSize:14, fontWeight:700, color:"#fff", fontFamily:T.font, marginTop:2 }}>{weekLabel}</div>
        </div>
        <div style={{ fontSize:9, color:"#444", fontFamily:T.mono, textAlign:"right" }}>
          Generated {new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true})}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          ["TOTAL HOURS", totalHrs+"h", T.orange],
          ["ATTENDANCE RATE", Math.round((totalPresent/TEAM_OPS.length)*100)+"%", T.green],
          ["SOD COMPLIANCE", sodCompliance+"%", sodCompliance>=80?T.green:sodCompliance>=60?T.yellow:T.red],
          ["AVG TASK DONE", avgTaskAll+"%", avgTaskAll>=80?T.green:avgTaskAll>=60?T.yellow:T.red],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:T.black, padding:"14px 16px" }}>
            <div style={{ fontSize:8, color:"#555", fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:900, color:c, fontFamily:T.font, lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Hours chart */}
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>📊 HOURS WORKED THIS WEEK</div>
        </div>
        <div style={{ padding:"20px 16px 12px" }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hoursData} margin={{ top:5, right:5, bottom:5, left:-20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fontFamily:T.mono, fill:T.darkGray }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fontFamily:T.mono, fill:T.grayLight }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip unit="h" />} cursor={{ fill:"rgba(0,0,0,0.04)" }} />
              <Bar dataKey="value" radius={[2,2,0,0]} maxBarSize={52}>
                {hoursData.map((d,i) => <Cell key={i} fill={d.value>=7?T.orange:d.value>=4?T.yellow:T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:4 }}>
            {[[T.orange,"7h+ (on track)"],[T.yellow,"4–7h (partial)"],[T.red,"<4h (low)"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:T.grayLight, fontFamily:T.mono }}>
                <div style={{ width:10, height:10, background:c }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task completion chart */}
      {taskData.length > 0 && (
        <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
          <div style={{ background:T.black, padding:"10px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>✅ AVG TASK COMPLETION RATE</div>
          </div>
          <div style={{ padding:"20px 16px 12px" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={taskData} margin={{ top:5, right:5, bottom:5, left:-20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:10, fontFamily:T.mono, fill:T.darkGray }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize:9, fontFamily:T.mono, fill:T.grayLight }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip unit="%" />} cursor={{ fill:"rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[2,2,0,0]} maxBarSize={52}>
                  {taskData.map((d,i) => <Cell key={i} fill={d.value>=80?T.green:d.value>=60?T.yellow:T.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Compliance table */}
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
        <div style={{ background:T.black, padding:"10px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.orange, fontFamily:T.mono, letterSpacing:2 }}>📋 SOD / EOD COMPLIANCE — DAY BY DAY</div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:T.bg }}>
                <th style={{ padding:"8px 16px", textAlign:"left", fontSize:9, fontFamily:T.mono, color:T.grayLight, letterSpacing:1, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>MEMBER</th>
                {weekDates.map((d,i) => (
                  <th key={d} style={{ padding:"8px 10px", textAlign:"center", fontSize:9, fontFamily:T.mono, color:d===todayStr()?T.orange:T.grayLight, letterSpacing:1, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>
                    {DAY_LABELS[i]}{d===todayStr()?" ●":""}
                  </th>
                ))}
                <th style={{ padding:"8px 10px", textAlign:"center", fontSize:9, fontFamily:T.mono, color:T.grayLight, letterSpacing:1, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>HRS</th>
                <th style={{ padding:"8px 10px", textAlign:"center", fontSize:9, fontFamily:T.mono, color:T.grayLight, letterSpacing:1, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>LATE</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.map((s,ri) => (
                <tr key={s.fullName} style={{ background:ri%2===0?T.surface:T.bg }}>
                  <td style={{ padding:"9px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar name={s.fullName} size={22} />
                      <span style={{ fontSize:12, fontWeight:700 }}>{s.name}</span>
                    </div>
                  </td>
                  {weekDates.map(d => {
                    const hasSod = !!sodWeek[d]?.[s.fullName];
                    const hasEod = !!eodWeek[d]?.[s.fullName];
                    const present = logs.some(l => l.member===s.fullName && l.date===d && l.type==="in");
                    const cell = !present ? "—" : hasSod && hasEod ? "✓✓" : hasSod ? "S" : "○";
                    const cellColor = !present ? T.grayLight : hasSod && hasEod ? T.green : hasSod ? T.yellow : T.red;
                    return (
                      <td key={d} style={{ padding:"9px 10px", textAlign:"center", borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:11, fontWeight:900, color:cellColor, fontFamily:T.mono }}>{cell}</span>
                      </td>
                    );
                  })}
                  <td style={{ padding:"9px 10px", textAlign:"center", borderBottom:`1px solid ${T.border}`, fontSize:12, fontWeight:800, color:T.orange, fontFamily:T.font }}>{s.hours}h</td>
                  <td style={{ padding:"9px 10px", textAlign:"center", borderBottom:`1px solid ${T.border}` }}>
                    {s.lateDays > 0 ? <Badge label={`${s.lateDays}x`} color={T.red} /> : <span style={{ fontSize:10, color:T.green, fontFamily:T.mono, fontWeight:700 }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"8px 16px", fontSize:9, color:T.grayLight, fontFamily:T.mono }}>
          ✓✓ SOD + EOD done &nbsp;·&nbsp; S SOD only &nbsp;·&nbsp; ○ Present, no SOD &nbsp;·&nbsp; — Absent
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT VIEW ──────────────────────────────────────────────────────────────
function ExportView({ logs, sodWeek, eodWeek }) {
  const weekDates = getWeekDates();

  const buildAttendanceRows = () => logs.map(l => ({
    Date: l.date,
    Member: l.member,
    Type: l.type === "in" ? "Log In" : "Log Out",
    Time: l.time,
    Late: calcIsLate(logs, l.member, l.date) && l.type==="in" ? "Yes" : "No",
    "Hours That Day": calcTotalHours(logs, l.member, l.date),
  }));

  const buildSODRows = () => {
    const rows = [];
    weekDates.forEach(d => {
      TEAM_OPS.forEach(m => {
        const s = sodWeek[d]?.[m];
        rows.push({
          Date: d,
          Member: m,
          Submitted: s ? "Yes" : "No",
          "Submitted At": s?.submittedAt || "",
          "Task Count": s?.tasks?.length || 0,
          "Tasks": s?.tasks?.map(t=>`[${t.priority}] ${t.task} (${t.eta})`).join(" | ") || "",
          "Metrics Target": s?.metrics || "",
          Blockers: s?.blockers || "",
        });
      });
    });
    return rows;
  };

  const buildEODRows = () => {
    const rows = [];
    weekDates.forEach(d => {
      TEAM_OPS.forEach(m => {
        const e = eodWeek[d]?.[m];
        rows.push({
          Date: d,
          Member: m,
          Submitted: e ? "Yes" : "No",
          "Submitted At": e?.submittedAt || "",
          "Hours Today": e?.hoursToday || "",
          "Task Completion %": e?.completionPct != null ? e.completionPct+"%" : "",
          "Tasks Done": e?.taskStatus?.filter(t=>t.done).map(t=>t.task).join(" | ") || "",
          "Tasks Pending": e?.taskStatus?.filter(t=>!t.done).map(t=>t.task).join(" | ") || "",
          Metrics: e?.metricsDisplay || "",
          Highlight: e?.highlight || "",
          "Blocker": e?.blocker?.problem || "",
          "Tomorrow Goal": e?.tomorrowGoal || "",
        });
      });
    });
    return rows;
  };

  const weekRange = `${weekDates[0]}_to_${weekDates[4]}`;

  const exports = [
    {
      icon:"🗓", label:"Attendance Logs", desc:"Full history of all log-in / log-out entries",
      color:T.blue, count:`${logs.length} entries`,
      fn: () => exportCSV(buildAttendanceRows(), `leverage-attendance-all.csv`),
    },
    {
      icon:"📝", label:"SOD Reports", desc:"This week's Start of Day submissions — tasks, targets, blockers",
      color:T.green, count:`${weekDates.length * TEAM_OPS.length} rows`,
      fn: () => exportCSV(buildSODRows(), `leverage-sod-${weekRange}.csv`),
    },
    {
      icon:"🌙", label:"EOD Reports", desc:"This week's End of Day submissions — metrics, completions, goals",
      color:T.purple, count:`${weekDates.length * TEAM_OPS.length} rows`,
      fn: () => exportCSV(buildEODRows(), `leverage-eod-${weekRange}.csv`),
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"slideIn 0.3s ease" }}>
      <div style={{ background:"#f0f7ff", border:`2px solid ${T.blue}`, padding:"12px 16px", fontSize:12, color:T.darkGray, lineHeight:1.6 }}>
        📥 <strong>Export data as CSV.</strong> Open in Excel, Google Sheets, or any spreadsheet app.
      </div>
      {exports.map(ex => (
        <div key={ex.label} style={{ background:T.surface, border:`2px solid ${T.black}`, borderLeft:`4px solid ${ex.color}`, padding:20, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:32 }}>{ex.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, fontFamily:T.font, marginBottom:3 }}>{ex.label}</div>
              <div style={{ fontSize:11, color:T.gray, lineHeight:1.5, maxWidth:340 }}>{ex.desc}</div>
              <div style={{ fontSize:10, color:ex.color, fontFamily:T.mono, fontWeight:700, marginTop:4, letterSpacing:1 }}>{ex.count}</div>
            </div>
          </div>
          <button onClick={ex.fn}
            style={{ padding:"12px 24px", background:ex.color, color:"#fff", border:"none", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.mono, letterSpacing:1.5, whiteSpace:"nowrap", flexShrink:0 }}>
            ↓ EXPORT CSV
          </button>
        </div>
      ))}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, padding:"12px 16px", fontSize:11, color:T.grayLight, fontFamily:T.mono, lineHeight:1.8 }}>
        SOD + EOD exports cover the <strong style={{ color:T.darkGray }}>current week only</strong>.<br/>
        Attendance export includes <strong style={{ color:T.darkGray }}>all historical data</strong>.
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ logs, onClose }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [subView, setSubView] = useState("report");
  const [sodWeek, setSodWeek] = useState({});
  const [eodWeek, setEodWeek] = useState({});
  const [loading, setLoading] = useState(false);

  const attempt = () => {
    if (pw === ADMIN_PASSWORD) {
      setUnlocked(true);
      loadData();
    } else {
      setError(true); setShaking(true); setPw("");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const dates = getWeekDates();
    const sod = {}, eod = {};
    await Promise.all(dates.map(async d => {
      const [s, e] = await Promise.all([storage.get(`sod-${d}`), storage.get(`eod-${d}`)]);
      if (s) sod[d] = JSON.parse(s.value);
      if (e) eod[d] = JSON.parse(e.value);
    }));
    setSodWeek(sod);
    setEodWeek(eod);
    setLoading(false);
  };

  if (!unlocked) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font }}>Admin Access</div>
            <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>Enter admin password to view reports</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:`2px solid ${T.black}`, padding:"6px 14px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:T.mono, color:T.gray }}>← BACK</button>
        </div>
        <div style={{ background:T.black, border:`2px solid ${error?T.red:"#222"}`, padding:"32px 28px", animation:shaking?"shake 0.4s ease":"none", transition:"border-color 0.2s", maxWidth:400, margin:"0 auto", width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:16 }}>🛡️</div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:T.mono, marginBottom:4, letterSpacing:2 }}>ADMIN ZONE</div>
          <div style={{ fontSize:10, color:"#555", fontFamily:T.mono, marginBottom:20, letterSpacing:1 }}>Manager-only access</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw&&attempt()} placeholder="Admin password" autoFocus
            style={{ width:"100%", background:"#1a1a1a", border:`2px solid ${error?T.red:"#333"}`, color:"#fff", fontSize:15, padding:"12px 16px", outline:"none", fontFamily:T.mono, letterSpacing:3, textAlign:"center", marginBottom:12 }} />
          {error && <div style={{ fontSize:12, color:T.red, fontFamily:T.mono, marginBottom:10 }}>✗ INCORRECT PASSWORD</div>}
          <button onClick={attempt} disabled={!pw}
            style={{ width:"100%", padding:"12px", background:pw?T.orange:"#222", color:pw?"#fff":"#444", border:`2px solid ${pw?T.orange:"#333"}`, fontSize:12, fontWeight:700, cursor:pw?"pointer":"not-allowed", letterSpacing:2, fontFamily:T.mono }}>
            UNLOCK ADMIN →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"slideIn 0.3s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:T.orange, padding:"4px 10px" }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#fff", fontFamily:T.mono, letterSpacing:2 }}>🛡 ADMIN</span>
          </div>
          <div style={{ fontSize:15, fontWeight:700, fontFamily:T.font }}>Manager Dashboard</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadData} style={{ background:"none", border:`2px solid ${T.black}`, padding:"6px 14px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:T.mono, color:T.darkGray }}>↻ REFRESH</button>
          <button onClick={onClose} style={{ background:"none", border:`2px solid ${T.black}`, padding:"6px 14px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:T.mono, color:T.gray }}>← EXIT ADMIN</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <Pill label="📊 Weekly Report" active={subView==="report"} onClick={() => setSubView("report")} />
        <Pill label="📥 Export Data" active={subView==="export"} onClick={() => setSubView("export")} />
      </div>
      {loading ? <LoadingScreen /> : (
        subView === "report"
          ? <WeeklySummaryView logs={logs} sodWeek={sodWeek} eodWeek={eodWeek} />
          : <ExportView logs={logs} sodWeek={sodWeek} eodWeek={eodWeek} />
      )}
    </div>
  );
}

// ─── ATTENDANCE TRACKER ───────────────────────────────────────────────────────
function AttendanceTracker() {
  const [logs, setLogs] = useState([]);
  const [sodSubmissions, setSodSubmissions] = useState({});
  const [eodSubmissions, setEodSubmissions] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [confirmed, setConfirmed] = useState(false);
  const [showSodForm, setShowSodForm] = useState(false);
  const [showEodForm, setShowEodForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      storage.get("attendance-logs"),
      storage.get(`sod-${todayStr()}`),
      storage.get(`eod-${todayStr()}`),
    ]).then(([r,s,e]) => {
      if (r) setLogs(JSON.parse(r.value));
      if (s) setSodSubmissions(JSON.parse(s.value));
      if (e) setEodSubmissions(JSON.parse(e.value));
      setLoading(false);
    });
  }, []);

  const saveLogs = async nl => { setLogs(nl); await storage.set("attendance-logs", JSON.stringify(nl)); };
  const getMemberToday = m => logs.filter(l => l.member===m && l.date===todayStr());
  const getStatus = m => { const tl=getMemberToday(m); if(!tl.length) return "absent"; return tl[tl.length-1].type==="in"?"in":"out"; };
  const hasSodToday = m => !!sodSubmissions[m];
  const hasEodToday = m => !!eodSubmissions[m];

  const isLate = (m, date) => {
    const d = date||todayStr();
    const fi = logs.find(l=>l.member===m&&l.date===d&&l.type==="in");
    if (!fi) return false;
    const [h,min] = fi.time.split(":").map(Number);
    const [sh] = SHIFT_START.split(":").map(Number);
    return h>sh||(h===sh&&min>0);
  };

  const getTotalHours = (m, date) => {
    const dl = logs.filter(l=>l.member===m&&l.date===date);
    let total=0, inTime=null;
    for (const log of dl) {
      if (log.type==="in") inTime=log.timestamp;
      else if (log.type==="out"&&inTime) { total+=(new Date(log.timestamp)-new Date(inTime))/3600000; inTime=null; }
    }
    if (inTime) total+=(new Date()-new Date(inTime))/3600000;
    return total.toFixed(1);
  };

  const logAction = () => {
    if (!selectedMember) return;
    const status = getStatus(selectedMember);
    if (status!=="in"&&!hasSodToday(selectedMember)) { setShowSodForm(true); return; }
    if (status==="in"&&!hasEodToday(selectedMember)) { setShowEodForm(true); return; }
    if (status==="in") { setShowLogoutModal(true); return; }
    const ts = new Date().toISOString();
    const time = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    saveLogs([...logs,{id:Date.now(),member:selectedMember,type:"in",date:todayStr(),time,timestamp:ts}]);
    setConfirmed(true); setTimeout(()=>setConfirmed(false),2500);
  };

  const confirmLogout = () => {
    const ts = new Date().toISOString();
    const time = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    saveLogs([...logs,{id:Date.now(),member:selectedMember,type:"out",date:todayStr(),time,timestamp:ts}]);
    setShowLogoutModal(false);
    setConfirmed(true); setTimeout(()=>setConfirmed(false),2500);
  };

  const handleSODSubmit = async sod => {
    setSodSubmissions(p=>({...p,[sod.member]:sod})); setShowSodForm(false);
    const ts=new Date().toISOString(), time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    saveLogs([...logs,{id:Date.now(),member:sod.member,type:"in",date:todayStr(),time,timestamp:ts}]);
    setConfirmed(true); setTimeout(()=>setConfirmed(false),2500);
  };

  const handleEODSubmit = async eod => {
    setEodSubmissions(p=>({...p,[eod.member]:eod})); setShowEodForm(false);
    const ts=new Date().toISOString(), time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    saveLogs([...logs,{id:Date.now(),member:eod.member,type:"out",date:todayStr(),time,timestamp:ts}]);
    setConfirmed(true); setTimeout(()=>setConfirmed(false),2500);
  };

  const weekDates = getWeekDates();
  const statusColor = s => ({in:T.green,out:T.orange,absent:T.red}[s]||T.gray);
  const statusLabel = s => ({in:"LOGGED IN",out:"LOGGED OUT",absent:"ABSENT"}[s]||s);

  if (loading) return <LoadingScreen />;

  const memberStatus = selectedMember ? getStatus(selectedMember) : "absent";
  const isIn = memberStatus==="in";
  const hoursToday = selectedMember ? getTotalHours(selectedMember,todayStr()) : "0.0";
  const nowTimeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true});
  const inNow = TEAM_OPS.filter(m=>getStatus(m)==="in").length;
  const lateToday = TEAM_OPS.filter(m=>isLate(m)).length;
  const sodCount = Object.keys(sodSubmissions).length;
  const eodCount = Object.keys(eodSubmissions).length;

  if (showAdmin) return <AdminView logs={logs} onClose={() => setShowAdmin(false)} />;

  const LogoutModal = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:24 }}>
      <div style={{ background:T.surface, border:`3px solid ${T.red}`, padding:32, maxWidth:380, width:"100%", textAlign:"center", animation:"slideIn 0.2s ease" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🌙</div>
        <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font, marginBottom:8 }}>Confirm Log Out</div>
        <div style={{ fontSize:13, color:T.gray, fontFamily:T.body, marginBottom:6, lineHeight:1.6 }}>
          You're logging out as <strong style={{ color:T.black }}>{selectedMember}</strong>.
        </div>
        <div style={{ fontSize:12, color:T.grayLight, fontFamily:T.mono, marginBottom:24 }}>
          {nowTimeStr} · {hoursToday} hrs logged today
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setShowLogoutModal(false)}
            style={{ flex:1, padding:"12px", background:"transparent", color:T.gray, border:`2px solid ${T.black}`, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:T.mono, letterSpacing:1 }}>
            CANCEL
          </button>
          <button onClick={confirmLogout}
            style={{ flex:2, padding:"12px", background:T.red, color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:T.font, letterSpacing:2 }}>
            YES, LOG OUT
          </button>
        </div>
      </div>
    </div>
  );

  if (showSodForm && selectedMember) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font }}>{selectedMember}</div>
          <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>Submit SOD to unlock Log In</div>
        </div>
        <button onClick={()=>setShowSodForm(false)} style={{ background:"none", border:`2px solid ${T.black}`, padding:"6px 14px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:T.mono, color:T.gray }}>← BACK</button>
      </div>
      <SODForm member={selectedMember} onSubmit={handleSODSubmit} />
    </div>
  );

  if (showEodForm && selectedMember) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name={selectedMember} size={36} />
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:T.font }}>{selectedMember}</div>
            <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>Submit EOD to log out</div>
          </div>
        </div>
        <Badge label={`${hoursToday} hrs today`} color={T.orange} />
      </div>
      <EODForm member={selectedMember} sodTasks={sodSubmissions[selectedMember]?.tasks||[]} hoursToday={hoursToday} onSubmit={handleEODSubmit} onBack={()=>setShowEodForm(false)} />
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {showLogoutModal && <LogoutModal />}
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          ["IN NOW",inNow,T.green],
          ["SOD SUBMITTED",sodCount,sodCount===TEAM_OPS.length?T.green:T.yellow],
          ["EOD SUBMITTED",eodCount,eodCount===TEAM_OPS.length?T.green:eodCount>0?T.yellow:T.grayLight],
          ["LATE TODAY",lateToday,lateToday>0?T.red:T.green],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:T.black, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:"#666", fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>{l}</div>
            <div style={{ fontSize:28, fontWeight:900, color:c, fontFamily:T.font, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:9, color:"#555", fontFamily:T.mono, marginTop:4 }}>of {TEAM_OPS.length} team</div>
          </div>
        ))}
      </div>

      {/* Member Selector */}
      <div style={{ background:T.surface, border:`2px solid ${T.black}`, padding:20 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:T.orange, textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>SELECT YOUR NAME</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {TEAM_OPS.map(m => {
            const s=getStatus(m), hasSod=hasSodToday(m), hasEod=hasEodToday(m);
            const dot=!hasSod?T.red:hasEod?"#888":statusColor(s);
            return (
              <button key={m} onClick={() => { setSelectedMember(m); setConfirmed(false); setShowSodForm(false); setShowEodForm(false); }}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:selectedMember===m?T.black:T.bg, color:selectedMember===m?"#fff":T.darkGray, border:`2px solid ${selectedMember===m?T.black:T.borderDark}`, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:T.font, transition:"all 0.15s" }}>
                <Avatar name={m} size={24} muted={!hasSod} />{m.split(" ")[0]}
                <span style={{ width:8, height:8, borderRadius:"50%", background:dot, display:"inline-block", marginLeft:2, border:"1px solid rgba(0,0,0,0.2)" }} />
              </button>
            );
          })}
        </div>
        <div style={{ marginTop:10, fontSize:10, color:T.grayLight, fontFamily:T.mono }}>🔴 No SOD · 🟢 Logged in · 🟠 Logged out · ⚫ EOD done</div>
      </div>

      {/* Member Card */}
      {selectedMember && (
        <div style={{ background:isIn?"#F0FDF4":memberStatus==="out"?"#FFF7F5":"#FFF", border:`3px solid ${statusColor(memberStatus)}`, padding:28, textAlign:"center" }}>
          <Avatar name={selectedMember} size={64} />
          <div style={{ fontSize:20, fontWeight:700, marginTop:12, fontFamily:T.font }}>{selectedMember}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:8, flexWrap:"wrap" }}>
            <Badge label={statusLabel(memberStatus)} color={statusColor(memberStatus)} />
            {hasSodToday(selectedMember) && <Badge label={`SOD @ ${sodSubmissions[selectedMember]?.submittedAt}`} color={T.green} />}
            {hasEodToday(selectedMember) && <Badge label={`EOD @ ${eodSubmissions[selectedMember]?.submittedAt}`} color={T.purple} />}
            {!hasSodToday(selectedMember) && <Badge label="NO SOD YET" color={T.red} />}
            {isLate(selectedMember)&&isIn && <Badge label="LATE ARRIVAL" color={T.red} />}
          </div>
          <div style={{ fontSize:13, color:T.grayLight, fontFamily:T.mono, marginTop:10 }}>{nowTimeStr} · Shift {SHIFT_START}–{SHIFT_END}</div>
          {memberStatus!=="absent" && <div style={{ fontSize:22, fontWeight:900, color:T.orange, fontFamily:T.font, margin:"10px 0" }}>{hoursToday} hrs logged today</div>}
          {confirmed && <div style={{ fontSize:13, fontWeight:700, color:T.green, fontFamily:T.mono, letterSpacing:2, margin:"8px 0", animation:"pulse 0.6s ease" }}>✓ {isIn?"LOGGED IN":"LOGGED OUT"} SUCCESSFULLY</div>}

          {!hasSodToday(selectedMember)&&!isIn ? (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:12, color:T.red, fontFamily:T.mono, fontWeight:700, letterSpacing:1, marginBottom:10 }}>🔒 SUBMIT SOD FIRST TO LOG IN</div>
              <button onClick={()=>setShowSodForm(true)} style={{ width:"100%", maxWidth:340, padding:"16px", background:T.orange, color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:2, fontFamily:T.font }}>
                📋  SUBMIT SOD
              </button>
            </div>
          ) : isIn ? (
            <div style={{ marginTop:14 }}>
              {!hasEodToday(selectedMember) && <div style={{ fontSize:12, color:T.orange, fontFamily:T.mono, fontWeight:700, letterSpacing:1, marginBottom:10 }}>🔒 SUBMIT EOD FIRST TO LOG OUT</div>}
              <button onClick={logAction} style={{ width:"100%", maxWidth:340, padding:"18px", background:T.red, color:"#fff", border:"none", fontSize:16, fontWeight:700, cursor:"pointer", letterSpacing:3, fontFamily:T.font }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                🌙 {hasEodToday(selectedMember)?"LOG OUT":"SUBMIT EOD & LOG OUT"}
              </button>
            </div>
          ) : (
            <button onClick={logAction} style={{ width:"100%", maxWidth:340, padding:"18px", background:T.green, color:"#fff", border:"none", fontSize:16, fontWeight:700, cursor:"pointer", letterSpacing:3, fontFamily:T.font, marginTop:14 }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              🟢 LOG IN
            </button>
          )}

          {memberStatus!=="absent" && (
            <div style={{ marginTop:14, fontSize:11, color:T.grayLight, fontFamily:T.mono }}>
              {getMemberToday(selectedMember).map((l,i) => <span key={i} style={{ marginRight:12 }}>{l.type==="in"?"↑ IN":"↓ OUT"} {l.time}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[["today","📋 TODAY"],["sod","📝 SOD"],["eod","🌙 EOD"]].map(([v,l]) => (
            <Pill key={v} label={l} active={view===v} onClick={()=>setView(v)} />
          ))}
        </div>
        <button onClick={() => setShowAdmin(true)}
          style={{ padding:"5px 14px", fontSize:10, fontWeight:700, letterSpacing:1.5, background:"#111", color:T.orange, border:`2px solid ${T.orange}`, cursor:"pointer", fontFamily:T.mono }}>
          🛡 ADMIN
        </button>
      </div>

      {/* Today */}
      {view==="today" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {TEAM_OPS.map(m => {
            const s=getStatus(m), late=isLate(m), hours=getTotalHours(m,todayStr()), tl=getMemberToday(m);
            const firstIn=tl.find(l=>l.type==="in"), lastOut=[...tl].reverse().find(l=>l.type==="out");
            const hasSod=hasSodToday(m), hasEod=hasEodToday(m);
            return (
              <div key={m} style={{ background:T.surface, border:`2px solid ${T.black}`, borderLeft:`4px solid ${hasSod?statusColor(s):T.red}`, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Avatar name={m} muted={!hasSod} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{m}</div>
                    <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, marginTop:3, display:"flex", gap:12, flexWrap:"wrap" }}>
                      {firstIn && <span>IN: {firstIn.time}</span>}
                      {lastOut && <span>OUT: {lastOut.time}</span>}
                      {!tl.length && <span>No logs today</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {s!=="absent" && <span style={{ fontSize:13, fontWeight:800, color:T.orange, fontFamily:T.font }}>{hours}h</span>}
                    {!hasSod && <Badge label="NO SOD" color={T.red} />}
                    {hasSod&&!hasEod&&s==="out" && <Badge label="NO EOD" color={T.orange} />}
                    {hasEod && <Badge label="EOD ✓" color={T.purple} />}
                    {late && <Badge label="LATE" color={T.red} />}
                    <Badge label={statusLabel(s)} color={statusColor(s)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SOD View */}
      {view==="sod" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {TEAM_OPS.map(m => {
            const sod=sodSubmissions[m];
            return (
              <div key={m} style={{ background:T.surface, border:`2px solid ${T.black}`, borderLeft:`4px solid ${sod?T.green:T.red}`, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar name={m} size={32} muted={!sod} />
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{m}</div>
                      {sod ? <div style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>Submitted @ {sod.submittedAt} · {sod.tasks.length} tasks</div>
                           : <div style={{ fontSize:10, color:T.red, fontFamily:T.mono, marginTop:2 }}>No SOD submitted yet</div>}
                    </div>
                  </div>
                  {sod ? <Badge label="SOD ✓" color={T.green} /> : <Badge label="PENDING" color={T.red} />}
                </div>
                {sod && (
                  <div style={{ borderTop:`1px solid ${T.border}`, padding:"10px 16px", background:T.bg, display:"flex", flexDirection:"column", gap:5 }}>
                    {sod.tasks.map((t,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 12px", background:T.surface, borderLeft:`3px solid ${priorityColor(t.priority)}` }}>
                        <div style={{ flex:1, fontSize:12 }}>{t.task}</div>
                        <Badge label={t.priority} color={priorityColor(t.priority)} />
                        <span style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono }}>{t.eta}</span>
                      </div>
                    ))}
                    {sod.metrics && <div style={{ padding:"7px 12px", background:"#f0fdf4", borderLeft:`3px solid ${T.green}`, fontSize:12, color:T.darkGray }}><span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.green, display:"block", marginBottom:2 }}>METRICS TARGET</span>{sod.metrics}</div>}
                    {sod.blockers && <div style={{ padding:"7px 12px", background:"#fff8f0", borderLeft:`3px solid ${T.orange}`, fontSize:12, color:T.darkGray }}><span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.orange, display:"block", marginBottom:2 }}>BLOCKERS</span>{sod.blockers}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EOD View */}
      {view==="eod" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, letterSpacing:1, marginBottom:4 }}>
            EOD SUBMISSIONS — {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
          {TEAM_OPS.map(m => {
            const eod=eodSubmissions[m];
            return (
              <div key={m} style={{ background:T.surface, border:`2px solid ${T.black}`, borderLeft:`4px solid ${eod?T.purple:T.grayLight}`, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar name={m} size={32} muted={!eod} />
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{m}</div>
                      {eod ? <div style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>Submitted @ {eod.submittedAt} · {eod.hoursToday}h · {eod.completionPct}% tasks done</div>
                           : <div style={{ fontSize:10, color:T.grayLight, fontFamily:T.mono, marginTop:2 }}>No EOD submitted yet</div>}
                    </div>
                  </div>
                  {eod ? <Badge label="EOD ✓" color={T.purple} /> : <Badge label="PENDING" color={T.grayLight} />}
                </div>
                {eod && (
                  <div style={{ borderTop:`1px solid ${T.border}`, padding:"10px 16px", background:T.bg, display:"flex", flexDirection:"column", gap:6 }}>
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, color:T.purple, fontFamily:T.mono, letterSpacing:2, marginBottom:6 }}>TASK COMPLETION</div>
                      <ProgressBar value={eod.completionPct} height={5} color={T.purple} />
                      <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
                        {eod.taskStatus?.map((t,i) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:t.done?T.grayLight:T.black }}>
                            <span style={{ color:t.done?T.green:T.borderDark, fontWeight:900 }}>{t.done?"✓":"○"}</span>
                            <span style={{ textDecoration:t.done?"line-through":"none" }}>{t.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:"7px 12px", background:"#f0fdf4", borderLeft:`3px solid ${T.green}`, fontSize:12, color:T.darkGray }}>
                      <span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.green, display:"block", marginBottom:4 }}>ACTUAL METRICS</span>
                      <div style={{ whiteSpace:"pre-line", lineHeight:1.8 }}>{eod.metricsDisplay}</div>
                    </div>
                    {eod.highlight && <div style={{ padding:"7px 12px", background:"#fefce8", borderLeft:`3px solid ${T.yellow}`, fontSize:12, color:T.darkGray }}><span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.yellow, display:"block", marginBottom:2 }}>WIN / HIGHLIGHT</span>{eod.highlight}</div>}
                    {eod.blocker && (
                      <div style={{ padding:"7px 12px", background:"#fff8f0", borderLeft:`3px solid ${T.orange}`, fontSize:12, color:T.darkGray }}>
                        <span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.orange, display:"block", marginBottom:4 }}>⚠ BLOCKER</span>
                        <div style={{ marginBottom:4 }}><strong>Problem:</strong> {eod.blocker.problem}</div>
                        {eod.blocker.solutions.length>0 && <div style={{ marginBottom:4 }}><strong>Solutions:</strong> {eod.blocker.solutions.map((s,i)=>`${i+1}) ${s}`).join(" · ")}</div>}
                        {eod.blocker.recommendation && <div><strong>Rec:</strong> {eod.blocker.recommendation}</div>}
                      </div>
                    )}
                    <div style={{ padding:"7px 12px", background:"#f0f7ff", borderLeft:`3px solid ${T.blue}`, fontSize:12, color:T.darkGray }}>
                      <span style={{ fontSize:9, fontWeight:700, fontFamily:T.mono, color:T.blue, display:"block", marginBottom:2 }}>TOMORROW'S GOAL</span>
                      {eod.tomorrowGoal}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {view==="history" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[...new Set(logs.map(l=>l.date))].sort((a,b)=>b.localeCompare(a)).slice(0,21).map(date => {
            const mp=TEAM_OPS.filter(m=>logs.some(l=>l.member===m&&l.date===date));
            return (
              <div key={date} style={{ background:T.surface, border:`2px solid ${T.black}`, overflow:"hidden" }}>
                <div style={{ background:T.black, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#fff", fontFamily:T.mono }}>{new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
                  <span style={{ fontSize:10, color:T.orange, fontFamily:T.mono }}>{mp.length}/{TEAM_OPS.length} PRESENT</span>
                </div>
                <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                  {TEAM_OPS.map(m => {
                    const dl=logs.filter(l=>l.member===m&&l.date===date);
                    const firstIn=dl.find(l=>l.type==="in"), lastOut=[...dl].reverse().find(l=>l.type==="out");
                    const hrs=getTotalHours(m,date), late=isLate(m,date);
                    if (!dl.length) return (
                      <div key={m} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:`1px solid ${T.border}`, opacity:0.4 }}>
                        <Avatar name={m} size={22} muted /><span style={{ flex:1, fontSize:12, fontWeight:600 }}>{m}</span><Badge label="ABSENT" color={T.gray} />
                      </div>
                    );
                    return (
                      <div key={m} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                        <Avatar name={m} size={22} />
                        <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{m}</span>
                        <span style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono }}>IN: {firstIn?.time||"—"}</span>
                        <span style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono }}>OUT: {lastOut?.time||"—"}</span>
                        <span style={{ fontSize:12, fontWeight:800, color:T.orange, fontFamily:T.font, minWidth:32, textAlign:"right" }}>{hrs}h</span>
                        {late && <Badge label="LATE" color={T.red} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!logs.length && <div style={{ background:T.surface, border:`2px solid ${T.black}`, padding:40, textAlign:"center" }}><div style={{ fontSize:14, fontWeight:600, color:T.gray }}>No attendance logs yet</div></div>}
        </div>
      )}

      {/* Weekly */}
      {view==="weekly" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {TEAM_OPS.map(m => {
            const presentDays=weekDates.filter(d=>logs.some(l=>l.member===m&&l.date===d&&l.type==="in"));
            const lateDays=weekDates.filter(d=>isLate(m,d));
            const totalHrs=weekDates.reduce((a,d)=>a+parseFloat(getTotalHours(m,d)),0).toFixed(1);
            const pct=Math.round((presentDays.length/5)*100);
            return (
              <div key={m} style={{ background:T.surface, border:`2px solid ${T.black}`, padding:18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <Avatar name={m} size={44} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{m}</div>
                    <div style={{ fontSize:11, color:T.grayLight, fontFamily:T.mono, marginTop:3 }}>{presentDays.length}/5 days · {totalHrs} hrs</div>
                  </div>
                  <div style={{ fontSize:26, fontWeight:900, color:pct>=80?T.green:pct>=60?T.yellow:T.red, fontFamily:T.font }}>{pct}%</div>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {weekDates.map((d,i) => {
                    const present=presentDays.includes(d), late=lateDays.includes(d), isToday=d===todayStr();
                    const hrs=getTotalHours(m,d);
                    return (
                      <div key={d} style={{ flex:1, textAlign:"center" }}>
                        <div style={{ fontSize:9, color:isToday?T.orange:T.grayLight, fontFamily:T.mono, marginBottom:4, fontWeight:isToday?700:400 }}>{DAY_LABELS[i]}</div>
                        <div style={{ height:36, background:present?(late?T.yellow:T.green):T.border, border:`2px solid ${isToday?T.orange:present?(late?T.yellow:T.green):T.borderDark}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {present && <span style={{ fontSize:10, fontWeight:900, color:"#fff" }}>{hrs}h</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const attempt = () => {
    if (pw === CORRECT_PASSWORD) { setUnlocked(true); }
    else { setError(true); setShaking(true); setPw(""); setTimeout(()=>setShaking(false),500); setTimeout(()=>setError(false),2000); }
  };

  if (!unlocked) return (
    <>
      <GlobalStyle />
      <div style={{ minHeight:"100vh", background:T.black, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ width:"100%", maxWidth:400, textAlign:"center" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:36, fontWeight:700, color:"#fff", letterSpacing:4, fontFamily:T.font, lineHeight:1 }}>LEVERAGE<span style={{ color:T.orange }}>.</span></div>
            <div style={{ fontSize:10, color:"#444", fontFamily:T.mono, marginTop:8, letterSpacing:3 }}>OPERATIONS HUB</div>
          </div>
          <div style={{ fontSize:40, marginBottom:24 }}>🔐</div>
          <div style={{ background:"#111", border:`2px solid ${error?T.red:"#222"}`, padding:"32px 28px", animation:shaking?"shake 0.4s ease":"none", transition:"border-color 0.2s" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", fontFamily:T.mono, marginBottom:6, letterSpacing:2 }}>RESTRICTED ACCESS</div>
            <div style={{ fontSize:12, color:"#555", fontFamily:T.mono, marginBottom:24, letterSpacing:1 }}>Enter password to continue</div>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw&&attempt()} placeholder="Password" autoFocus
              style={{ width:"100%", background:"#1a1a1a", border:`2px solid ${error?T.red:"#333"}`, color:"#fff", fontSize:15, padding:"12px 16px", outline:"none", fontFamily:T.mono, letterSpacing:3, textAlign:"center", marginBottom:16 }} />
            {error && <div style={{ fontSize:12, color:T.red, fontFamily:T.mono, marginBottom:12 }}>✗ INCORRECT PASSWORD</div>}
            <button onClick={attempt} disabled={!pw}
              style={{ width:"100%", padding:"12px", background:pw?T.orange:"#222", color:pw?"#fff":"#444", border:`2px solid ${pw?T.orange:"#333"}`, fontSize:12, fontWeight:700, cursor:pw?"pointer":"not-allowed", letterSpacing:2, fontFamily:T.mono }}>
              UNLOCK →
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight:"100vh", background:T.bg }}>
        <header style={{ background:T.black, padding:"16px 28px", borderBottom:`3px solid ${T.orange}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:"#fff", letterSpacing:3, fontFamily:T.font }}>LEVERAGE<span style={{ color:T.orange }}>.</span></div>
            <div style={{ fontSize:9, color:"#555", fontFamily:T.mono, letterSpacing:2, marginTop:2 }}>ATTENDANCE + EOD</div>
          </div>
          <button onClick={()=>setUnlocked(false)} style={{ background:"transparent", border:`1px solid #333`, color:"#666", padding:"6px 14px", fontSize:10, cursor:"pointer", fontFamily:T.mono }}>🔒 LOCK</button>
        </header>
        <main style={{ maxWidth:760, margin:"0 auto", padding:"32px 24px 60px" }}>
          <AttendanceTracker />
        </main>
      </div>
    </>
  );
}
