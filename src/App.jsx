import { useState, useEffect, useRef } from "react";




const T = {
  bg:"#F5F5F0", surface:"#FFFFFF", border:"#E5E0D8", borderDark:"#C8C2B8",
  black:"#000000", orange:"#FF3300", orangeHov:"#CC2900", orangeSoft:"#FFF0ED",
  gray:"#6B7280", grayLight:"#9CA3AF", darkGray:"#374151",
  green:"#10B981", yellow:"#F59E0B", red:"#EF4444", purple:"#7C3AED",
  cream:"#F5F5F0",
  font:"'Space Grotesk','Arial Narrow',Arial,sans-serif",
  body:"'Space Grotesk','Segoe UI',Arial,sans-serif",
  mono:"'JetBrains Mono','Courier New',monospace",
};








const CORRECT_PASSWORD = "leverage2025";
const ADMIN_PASSWORD = "admin2025";
const COS_PASSWORD = "cos2025";
const SHIFT_START = "09:00";
const SHIFT_END = "17:00"; // ✅ 5 PM EST
const PRIORITY_OPTIONS = ["High","Medium","Low"];
const TIME_OPTIONS = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","EOD"];








const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};font-family:${T.body};color:${T.black};-webkit-font-smoothing:antialiased;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${T.black};border-radius:0;}
    ::placeholder{color:${T.grayLight};}
    select,input,textarea{font-family:${T.body};}
    button{font-family:${T.font};}
    a{color:${T.orange};text-decoration:none;}
    a:hover{text-decoration:underline;}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  `}</style>
);








const storage = {
  get: async (key) => { try { const r=await window.storage.get(key); if(!r) return null; return {value:typeof r.value==="string"?r.value:JSON.stringify(r.value)}; } catch { return null; } },
  set: async (key,value) => { try { await window.storage.set(key,value); } catch {} },
  delete: async (key) => { try { await window.storage.delete(key); } catch {} },
};








const todayStr = () => new Date().toISOString().split('T')[0];
const weekLabel = () => {
  const now=new Date(),day=now.getDay(),mon=new Date(now);
  mon.setDate(now.getDate()-(day===0?6:day-1));
  return `Week of ${mon.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`;
};








async function claudeFetch(body) {
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)});
  return r.json();
}
async function callClaude(prompt, maxTokens=2000) {
  const data=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]});
  if(data.error) throw new Error(data.error.message);
  const text=data.content?.find(b=>b.type==="text")?.text||"";
  const clean=text.replace(/```json|```/g,"").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
}








const priorityColor = p => ({High:T.red,Medium:T.yellow,Low:T.green,high:T.red,medium:T.yellow,low:T.green}[p]||T.gray);








// ─── NOTIFICATION SYSTEM ──────────────────────────────────────────────────────
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};








const showNotification = (title, body, icon = "🔔") => {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>` });
  }
};








// ─── SLACK INTEGRATION ────────────────────────────────────────────────────────
// ─── SLACK INTEGRATION ────────────────────────────────────────────────────────
const sendToSlack = async (message, userId = null, isAnnouncement = false) => {
  console.log("🔵 Sending to Slack via API route");
  console.log("📝 Message:", message);
  console.log("👤 Target:", userId ? `DM to ${userId}` : isAnnouncement ? "#team-announcements" : "#attendance-admin");
  
  try {
    const response = await fetch("/api/slack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, userId, isAnnouncement })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Slack message sent:", data);
    } else {
      console.error("❌ Slack error:", data.error);
    }
  } catch (error) {
    console.error("❌ Slack fetch error:", error);
  }
};




// ─── API BACKEND (Vercel KV) ─────────────────────────────────────────────────
const api = {
  // Attendance endpoints
  getAttendance: async () => {
    try {
      const response = await fetch("/api/attendance");
      const data = await response.json();
      if (data.success) return data.logs;
      console.error("API error:", data.error);
      // Fallback to localStorage
      const backup = localStorage.getItem("attendance-logs-backup");
      return backup ? JSON.parse(backup) : [];
    } catch (error) {
      console.error("API fetch error:", error);
      const backup = localStorage.getItem("attendance-logs-backup");
      return backup ? JSON.parse(backup) : [];
    }
  },


  saveAttendance: async (logs) => {
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", logs })
      });
      const data = await response.json();
      if (!data.success) {
        console.error("API save error:", data.error);
      }
      // Always save to localStorage as backup
      localStorage.setItem("attendance-logs-backup", JSON.stringify(logs));
      return data.success;
    } catch (error) {
      console.error("API save error:", error);
      localStorage.setItem("attendance-logs-backup", JSON.stringify(logs));
      return false;
    }
  },


  // SOD endpoints
  getSOD: async (date) => {
    try {
      const response = await fetch(`/api/sod?date=${date}`);
      const data = await response.json();
      if (data.success) return data.submissions || {};
      console.error("API error:", data.error);
      // Fallback to localStorage
      const backup = localStorage.getItem(`sod-${date}-backup`);
      return backup ? JSON.parse(backup) : {};
    } catch (error) {
      console.error("API fetch error:", error);
      const backup = localStorage.getItem(`sod-${date}-backup`);
      return backup ? JSON.parse(backup) : {};
    }
  },


  saveSOD: async (date, member, sodData) => {
    try {
      const response = await fetch("/api/sod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, member, sodData })
      });
      const data = await response.json();
      if (data.success) {
        // Save to localStorage backup
        localStorage.setItem(`sod-${date}-backup`, JSON.stringify(data.submissions));
        return data.submissions;
      }
      console.error("API save error:", data.error);
      return null;
    } catch (error) {
      console.error("API save error:", error);
      return null;
    }
  },


  // EOD endpoints
  getEOD: async (date) => {
    try {
      const response = await fetch(`/api/eod?date=${date}`);
      const data = await response.json();
      if (data.success) return data.submissions || {};
      console.error("API error:", data.error);
      // Fallback to localStorage
      const backup = localStorage.getItem(`eod-${date}-backup`);
      return backup ? JSON.parse(backup) : {};
    } catch (error) {
      console.error("API fetch error:", error);
      const backup = localStorage.getItem(`eod-${date}-backup`);
      return backup ? JSON.parse(backup) : {};
    }
  },


  saveEOD: async (date, member, eodData) => {
    try {
      const response = await fetch("/api/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, member, eodData })
      });
      const data = await response.json();
      if (data.success) {
        // Save to localStorage backup
        localStorage.setItem(`eod-${date}-backup`, JSON.stringify(data.submissions));
        return data.submissions;
      }
      console.error("API save error:", data.error);
      return null;
    } catch (error) {
      console.error("API save error:", error);
      return null;
    }
  },


  // Announcements endpoints
  getAnnouncements: async () => {
    try {
      const response = await fetch("/api/announcements");
      const data = await response.json();
      if (data.success) return data.announcements || [];
      console.error("API error:", data.error);
      // Fallback to localStorage
      const backup = localStorage.getItem("announcements-backup");
      return backup ? JSON.parse(backup) : [];
    } catch (error) {
      console.error("API fetch error:", error);
      const backup = localStorage.getItem("announcements-backup");
      return backup ? JSON.parse(backup) : [];
    }
  },


  saveAnnouncements: async (announcements) => {
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", announcements })
      });
      const data = await response.json();
      if (!data.success) {
        console.error("API save error:", data.error);
      }
      // Always save to localStorage as backup
      localStorage.setItem("announcements-backup", JSON.stringify(announcements));
      return data.success;
    } catch (error) {
      console.error("API save error:", error);
      localStorage.setItem("announcements-backup", JSON.stringify(announcements));
      return false;
    }
  }
};




// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
const generateInsights = async (memberData) => {
  const prompt = `Analyze this team member's performance data and provide 3 short, actionable insights:








Member: ${memberData.name}
Role: ${memberData.role}
This Week:
${memberData.metrics.map(m => `- ${m.name}: ${m.value} (Target: ${m.target})`).join("\n")}








Provide insights in JSON format:
{
  "insights": [
    {"type": "positive|warning|neutral", "text": "brief insight here"},
    {"type": "positive|warning|neutral", "text": "brief insight here"},
    {"type": "positive|warning|neutral", "text": "brief insight here"}
  ]
}`;








  try {
    return await callClaude(prompt, 1000);
  } catch (error) {
    console.error("AI insights error:", error);
    return { insights: [] };
  }
};








// ─── EXPORT FUNCTIONS ─────────────────────────────────────────────────────────
const exportToCSV = (data, filename) => {
  const csv = data.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};








const exportToPDF = async (elementId, filename) => {
  // Simple PDF export using print functionality
  const printWindow = window.open("", "", "height=600,width=800");
  const element = document.getElementById(elementId);
  if (!element) return;
  printWindow.document.write("<html><head><title>" + filename + "</title>");
  printWindow.document.write('<style>body{font-family:Arial;padding:20px;}</style>');
  printWindow.document.write("</head><body>");
  printWindow.document.write(element.innerHTML);
  printWindow.document.write("</body></html>");
  printWindow.document.close();
  printWindow.print();
};








// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Badge = ({label,color=T.orange,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",background:bg||"transparent",color,border:`1.5px solid ${color}`,borderRadius:0,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1.5,fontFamily:T.mono,textTransform:"uppercase"}}>{label}</span>
);
const Pill = ({label,active,onClick}) => {
  const [hov,setHov]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,letterSpacing:1.5,background:active?T.black:hov?T.black:T.surface,color:active?T.orange:hov?"#fff":T.gray,border:`2px solid ${T.black}`,cursor:"pointer",transition:"all 0.15s",fontFamily:T.mono,textTransform:"uppercase"}}>{label}</button>;
};
const Card = ({children,style={},hover=false}) => {
  const [isHov,setIsHov]=useState(false);
  return <div onMouseEnter={()=>hover&&setIsHov(true)} onMouseLeave={()=>hover&&setIsHov(false)} style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,borderTop:hover&&isHov?`4px solid ${T.orange}`:`2px solid ${T.black}`,transition:"border-top 0.15s",overflow:"hidden",...style}}>{children}</div>;
};
const CardLabel = ({children,color=T.orange}) => <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color,textTransform:"uppercase",fontFamily:T.mono}}>{children}</div>;
const SectionHeader = ({label,action}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`2px solid ${T.black}`,background:T.black}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:3,height:14,background:T.orange,flexShrink:0}} />
      <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:"#fff",textTransform:"uppercase",fontFamily:T.mono}}>{label}</div>
    </div>
    {action}
  </div>
);
const Input = ({value,onChange,placeholder,type="text",style={},...props}) => {
  const [focused,setFocused]=useState(false);
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",background:T.surface,border:`2px solid ${focused?T.orange:T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.body,transition:"border-color 0.15s",...style}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} {...props} />;
};
const Textarea = ({label,value,onChange,placeholder,minHeight=120}) => {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{background:T.surface,border:`2px solid ${focused?T.orange:T.black}`,borderRadius:0,overflow:"hidden",transition:"border-color 0.15s"}}>
      {label&&<div style={{padding:"12px 16px",borderBottom:`2px solid ${T.black}`,background:T.black}}><div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:T.orange,textTransform:"uppercase",fontFamily:T.mono}}>{label}</div></div>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",minHeight,background:"transparent",border:"none",color:T.black,fontSize:13,padding:16,resize:"vertical",outline:"none",fontFamily:T.body,lineHeight:1.7,display:"block"}} />
    </div>
  );
};
const Btn = ({onClick,disabled,loading,label,color,icon,variant="primary"}) => {
  const [hov,setHov]=useState(false);
  const bg=disabled?"#E5E0D8":variant==="ghost"?"transparent":hov?T.orange:(color||T.black);
  const col=disabled?T.gray:variant==="ghost"?T.black:"#fff";
  const border=variant==="ghost"?`2px solid ${T.black}`:disabled?`2px solid ${T.border}`:`2px solid ${T.black}`;
  return <button onClick={onClick} disabled={disabled||loading} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{width:"100%",padding:"12px 20px",borderRadius:0,background:bg,color:col,border,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:2,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.15s",fontFamily:T.font,textTransform:"uppercase"}}>{icon&&<span style={{fontSize:14}}>{icon}</span>}{loading?"GENERATING…":label}</button>;
};
const CopyBtn = ({text}) => {
  const [copied,setCopied]=useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:copied?T.green:T.black,color:"#fff",border:"none",borderRadius:0,padding:"5px 14px",fontSize:10,fontWeight:700,cursor:"pointer",transition:"background 0.2s",fontFamily:T.mono,letterSpacing:1}}>{copied?"✓ COPIED":"COPY"}</button>;
};
const Err = ({msg}) => msg?<div style={{background:T.orangeSoft,border:`2px solid ${T.orange}`,borderRadius:0,padding:"12px 16px",color:T.orange,fontSize:13,display:"flex",gap:8,alignItems:"flex-start"}}><span>⚠</span><span>{msg}</span></div>:null;
const Bullets = ({label,items,color}) => {
  if(!items?.length) return null;
  return <Card style={{padding:16}}><CardLabel color={color}>{label}</CardLabel><div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>{items.map((w,i)=><div key={i} style={{fontSize:13,color:T.darkGray,lineHeight:1.6,paddingLeft:12,borderLeft:`2px solid ${color}`}}>{w}</div>)}</div></Card>;
};
const ProgressBar = ({value,color,height=6}) => (
  <div style={{background:T.border,borderRadius:0,height,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${value}%`,background:value===100?T.green:(color||T.orange),borderRadius:0,transition:"width 0.4s ease"}} />
  </div>
);
const Avatar = ({name,size=32,muted=false}) => {
  const initials=name.split(" ").map(n=>n[0]).slice(0,2).join("");
  const hue=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return <div style={{width:size,height:size,borderRadius:0,background:muted?"#ddd":`hsl(${hue},60%,88%)`,color:muted?"#999":`hsl(${hue},50%,35%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,flexShrink:0,fontFamily:T.font,border:`2px solid ${muted?"#ccc":T.black}`}}>{initials}</div>;
};
const LoadingScreen = () => (
  <div style={{padding:60,textAlign:"center"}}>
    <div style={{width:40,height:40,border:`3px solid ${T.border}`,borderTopColor:T.orange,borderRadius:"50%",margin:"0 auto 16px",animation:"spin 0.8s linear infinite"}} />
    <div style={{fontSize:12,color:T.grayLight,fontFamily:T.mono,letterSpacing:2}}>LOADING…</div>
  </div>
);








// ─── PROPOSAL HELPERS ─────────────────────────────────────────────────────────
const isSectionHeader=(line)=>{if(line.length<5) return false;const twoDigits=line[0]>="0"&&line[0]<="9"&&line[1]>="0"&&line[1]<="9";return twoDigits&&line.indexOf("//")!==-1;};
const parseSectionHeader=(line)=>{const slashIdx=line.indexOf("//");return {num:line.slice(0,2),title:line.slice(slashIdx+2).trim()};};
const isKeyInsight=(line)=>line.toUpperCase().indexOf("KEY INSIGHT")!==-1&&line.indexOf("//")!==-1;
const isTableRow=(line)=>line.includes("|")&&line.split("|").length>=3;
const isDividerRow=(line)=>{const stripped=line.replace(/[\|\s\-]/g,"");return stripped.length===0;};
const isAllCapsSubtitle=(line)=>{if(line.length<4||line.length>60) return false;if(line[0]>="0"&&line[0]<="9") return false;return line===line.toUpperCase();};
const parseProposalText=(text)=>{
  const blocks=[];const lines=text.split("\n");let i=0;
  while(i<lines.length){
    const line=lines[i].trim();
    if(isSectionHeader(line)){const parsed=parseSectionHeader(line);blocks.push({type:"section",num:parsed.num,title:parsed.title});i++;continue;}
    if(isKeyInsight(line)){const insightLines=[];i++;while(i<lines.length&&lines[i].trim()!==""&&!isSectionHeader(lines[i].trim())){insightLines.push(lines[i].trim());i++;}blocks.push({type:"insight",content:insightLines.join(" ")});continue;}
    if(isTableRow(line)){const tableLines=[];while(i<lines.length&&lines[i].includes("|")){tableLines.push(lines[i].trim());i++;}const trows=tableLines.filter(l=>!isDividerRow(l)).map(l=>l.split("|").map(c=>c.trim()).filter(c=>c.length>0));if(trows.length>0) blocks.push({type:"table",rows:trows});continue;}
    if(line===""){blocks.push({type:"spacer"});i++;continue;}
    if(isAllCapsSubtitle(line)){blocks.push({type:"subtitle",content:line});i++;continue;}
    const paraLines=[];
    while(i<lines.length&&lines[i].trim()!==""&&!isSectionHeader(lines[i].trim())&&!isTableRow(lines[i].trim())&&!isKeyInsight(lines[i].trim())){paraLines.push(lines[i].trim());i++;}
    if(paraLines.length>0) blocks.push({type:"para",content:paraLines.join(" ")});
  }
  return blocks;
};
const ProposalTable = ({rows}) => {
  if(!rows||rows.length===0) return null;
  const header=rows[0],body=rows.slice(1);
  const thStyle={padding:"10px 14px",color:"#fff",textAlign:"left",fontWeight:700,letterSpacing:1,fontSize:10};
  const tdStyle={padding:"9px 14px",color:T.black,fontSize:12};
  return <table style={{width:"100%",borderCollapse:"collapse",margin:"16px 0",fontFamily:T.mono,fontSize:12}}><thead><tr style={{background:T.black}}>{header.map((h,hi)=><th key={hi} style={thStyle}>{h}</th>)}</tr></thead><tbody>{body.map((row,ri)=><tr key={ri} style={{background:ri%2===0?T.cream:"#EBEBDF",borderBottom:"1px solid "+T.border}}>{row.map((cell,ci)=><td key={ci} style={tdStyle}>{cell}</td>)}</tr>)}</tbody></table>;
};
const BrandedProposal = ({proposal,rfp}) => {
  const now=new Date();
  const monthYear=now.toLocaleDateString("en-US",{month:"long",year:"numeric"}).toUpperCase();
  const text=proposal.full_proposal_text||"";
  const blocks=parseProposalText(text);
  return (
    <div style={{fontFamily:T.body,background:T.cream,border:`2px solid ${T.black}`,overflow:"hidden"}}>
      <div style={{background:T.black,padding:"32px 40px",borderBottom:`4px solid ${T.orange}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
          <div>
            <div style={{fontSize:32,fontWeight:700,color:"#fff",letterSpacing:4,fontFamily:T.font,lineHeight:1}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
            <div style={{fontSize:10,color:"#555",fontFamily:T.mono,marginTop:6,letterSpacing:3}}>CLIENT PROPOSAL // {rfp?.organization?.toUpperCase()||"CLIENT"}</div>
            <div style={{fontSize:10,color:"#444",fontFamily:T.mono,marginTop:2,letterSpacing:2}}>PREPARED {monthYear}</div>
          </div>
        </div>
        <div style={{borderTop:"1px solid #2a2a2a",paddingTop:24}}>
          <div style={{fontSize:36,fontWeight:700,color:"#fff",lineHeight:1.1,letterSpacing:1,textTransform:"uppercase",maxWidth:520,fontFamily:T.font}}>{proposal.subject_line||`A NEW REVENUE CHANNEL FOR ${rfp?.organization?.toUpperCase()}`}</div>
        </div>
      </div>
      <div style={{padding:"36px 40px",background:T.cream}}>
        {blocks.map((block,i)=>{
          if(block.type==="section") return <div key={i} style={{marginTop:i===0?0:32,marginBottom:16,borderTop:i===0?"none":`1px solid ${T.black}`,paddingTop:i===0?0:24}}><div style={{display:"flex",alignItems:"baseline",gap:10}}><span style={{fontSize:11,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>{block.num} //</span><span style={{fontSize:16,fontWeight:700,color:T.black,fontFamily:T.font,letterSpacing:1,textTransform:"uppercase"}}>{block.title}</span></div></div>;
          if(block.type==="subtitle") return <div key={i} style={{fontSize:11,fontWeight:700,color:T.black,fontFamily:T.mono,letterSpacing:2,marginTop:20,marginBottom:8,textTransform:"uppercase"}}>{block.content}</div>;
          if(block.type==="insight") return <div key={i} style={{background:T.black,border:`2px solid ${T.orange}`,padding:"16px 20px",margin:"20px 0"}}><div style={{fontSize:9,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:3,marginBottom:8}}>// KEY INSIGHT</div><div style={{fontSize:13,color:"#fff",lineHeight:1.7,fontFamily:T.body}}>{block.content}</div></div>;
          if(block.type==="table") return <ProposalTable key={i} rows={block.rows} />;
          if(block.type==="spacer") return <div key={i} style={{height:8}} />;
          if(block.type==="para") return <p key={i} style={{fontSize:13,color:T.black,lineHeight:1.8,margin:"0 0 12px",fontFamily:T.body}}>{block.content}</p>;
          return null;
        })}
      </div>
      <div style={{padding:"14px 40px",background:T.cream,borderTop:`2px solid ${T.black}`,display:"flex",gap:8,justifyContent:"flex-end"}}><CopyBtn text={text} /></div>
    </div>
  );
};








// ─── TEAM / KPI DATA ──────────────────────────────────────────────────────────
const TEAM_OPS=["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const ADMIN_USERS = ["Kristine Mirabueno", "David Perlov"];
const isAdmin = (name) => ADMIN_USERS.includes(name);
// ✅ FLEXI TIME MEMBERS (no late tracking, no fixed end time)
const FLEXI_TIME_MEMBERS = ["Suki Santos", "Kristine Miel Zulaybar"];
const DEFAULT_SLACK_IDS={"David Perlov":"U08BQH5JJDD","Cyril Butanas":"U09HHPVSSUQ","Caleb Bentil":"U0AE1T4N7A8","Darlene Mae Malolos":"U0A8GV25V0A","Suki Santos":"U093GFVM7D1","Kristine Miel Zulaybar":"U093GFXPK3M","Kristine Mirabueno":"U09QJGY27JP"};
const INPUT_TYPES=[{key:"transcript",label:"Meeting Transcript"},{key:"sod",label:"SOD Report"},{key:"email",label:"Emails"},{key:"slack",label:"Slack"}];
const KPI_DATA = {
  "Caleb Bentil": {
    color:"#6366f1",emoji:"📞",role:"Outbound Specialist",
    categories:[
      {name:"Activity",metrics:[{name:"Calls Dialed",target:"80/day",stretch:"100+/day",notes:"Total dials incl. voicemails"},{name:"Live Connect Rate",target:"10%",stretch:"15%+",notes:"Conversations / total dials"},{name:"Voicemail Drop Rate",target:"≤60%",stretch:"≤50%",notes:"Track voicemail script effectiveness"}]},
      {name:"Pipeline",metrics:[{name:"Qualified Conversations",target:"8/day",stretch:"12+/day",notes:"Prospect showed interest"},{name:"Meetings Booked",target:"3/week",stretch:"5+/week",notes:"Confirmed calendar invites sent"},{name:"Follow-ups Sent",target:"100% of convos",stretch:"Same day",notes:"Email or message after every live connect"}]},
    ],
    eod:["Calls dialed: __","Live connects: __ (__% connect rate)","Meetings booked: __","Notable conversations: [brief summary]","Blocker (if any): [problem + 3 solutions + recommendation]","Tomorrow's goal: __"]
  },
  "Darlene Mae Malolos": {
    color:"#ec4899",emoji:"🎨",role:"Graphic Designer",
    categories:[
      {name:"Output",metrics:[{name:"Designs Delivered",target:"Per agreed scope/week",stretch:"Ahead of deadline",notes:"Defined each week in SOD"},{name:"On-Brief Accuracy",target:"90%",stretch:"95%+",notes:"Designs meeting brief without major revisions"},{name:"Revision Rounds",target:"≤2 per asset",stretch:"≤1 per asset",notes:"Tracks brief clarity and execution"}]},
      {name:"Quality & Timeliness",metrics:[{name:"Turnaround Time",target:"24–48hrs",stretch:"Same day (simple assets)",notes:"From brief received to first draft"},{name:"Brand Consistency",target:"100%",stretch:"100%",notes:"Fonts, colors, tone vs brand guide"},{name:"Stakeholder Satisfaction",target:"Approved w/o major rework",stretch:"Praised / reused",notes:"Reviewed weekly by Kristine or David"}]},
    ],
    eod:["Assets completed today: __ (list titles)","In progress: [asset name + % complete]","Revision requests received: __","Blocker (if any): [problem + 3 solutions + recommendation]","Tomorrow's goal: __"]
  },
  "Cyril Butanas": {
    color:"#10b981",emoji:"🌟",role:"Influencer Outreach Specialist",
    categories:[
      {name:"Sourcing & Outreach",metrics:[{name:"Influencers Sourced",target:"20/week",stretch:"30+/week",notes:"Qualified profiles added to pipeline"},{name:"Outreach Messages Sent",target:"30/week",stretch:"50+/week",notes:"Initial DMs or emails sent"},{name:"Response Rate",target:"20%",stretch:"30%+",notes:"Replies received / messages sent"}]},
      {name:"Relationships & Campaign",metrics:[{name:"Influencers Onboarded",target:"3/week",stretch:"5+/week",notes:"Confirmed partnerships ready for activation"},{name:"Follow-up Rate",target:"100% of non-replies",stretch:"Within 48hrs",notes:"Every unanswered outreach gets 1 follow-up"},{name:"Campaign Tracking Accuracy",target:"100%",stretch:"100%",notes:"Pipeline tracker updated daily"}]},
    ],
    eod:["Influencers sourced today: __","Outreach sent: __ | Responses received: __","New partnerships confirmed: __","Relationship updates: [name + status + next step]","Blocker (if any): [problem + 3 solutions + recommendation]","Tomorrow's goal: __"]
  },
  "Suki Santos": {
    color:"#f59e0b",emoji:"🔍",role:"Research & Sourcing Specialist",
    categories:[
      {name:"Sourcing",metrics:[{name:"Leads Sourced",target:"30/week",stretch:"50+/week",notes:"Contacts added to outreach list"},{name:"Lead Qualification Rate",target:"80%",stretch:"90%+",notes:"Leads that meet ICP criteria"},{name:"Data Completeness",target:"90%",stretch:"95%+",notes:"Name, title, company, email/phone, LinkedIn"}]},
      {name:"Research",metrics:[{name:"Research Tasks Completed",target:"Per agreed scope",stretch:"Ahead of deadline",notes:"Defined at start of each week"},{name:"Research Accuracy",target:"95%",stretch:"99%+",notes:"Verified against source; spot-checked weekly"},{name:"Turnaround Time",target:"Within 24hrs",stretch:"Same day",notes:"Time from request to delivery"}]},
    ],
    eod:["Leads sourced today: __ (__ qualify)","Research task status: [task name + % complete]","Data quality flag (if any): [issue + fix]","Blocker (if any): [problem + 3 solutions + recommendation]","Tomorrow's goal: __"]
  },
};








// ─── SOD FORM ─────────────────────────────────────────────────────────────────
const emptyTask = () => ({task:"",priority:"High",eta:"EOD"});








function SODForm({member, onSubmit}) {
  const [tasks,setTasks]=useState([emptyTask()]);
  const [metrics,setMetrics]=useState("");
  const [blockers,setBlockers]=useState("");
  const [submitting,setSubmitting]=useState(false);








  const updateTask=(i,field,val)=>setTasks(prev=>prev.map((t,idx)=>idx===i?{...t,[field]:val}:t));
  const addTask=()=>setTasks(prev=>[...prev,emptyTask()]);
  const removeTask=(i)=>setTasks(prev=>prev.filter((_,idx)=>idx!==i));
  const canSubmit=tasks.some(t=>t.task.trim());








  const handleSubmit=async()=>{
    if(!canSubmit) return;
    setSubmitting(true);
    const sod={
      member,date:todayStr(),
      submittedAt:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}),
      tasks:tasks.filter(t=>t.task.trim()),
      metrics:metrics.trim(),
      blockers:blockers.trim(),
    };
    // Save to storage
    const key=`sod-${todayStr()}`;
    const existing=await storage.get(key);
    const allSods=existing?JSON.parse(existing.value):{};
    allSods[member]=sod;
    await storage.set(key,JSON.stringify(allSods));
    setTimeout(()=>onSubmit(sod),800);
  };








  if(submitting) return (
    <div style={{textAlign:"center",padding:"48px 20px"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontSize:16,fontWeight:700,fontFamily:T.font,marginBottom:6}}>SOD Submitted!</div>
      <div style={{fontSize:12,color:T.gray,fontFamily:T.mono,letterSpacing:1}}>Unlocking your Log In…</div>
    </div>
  );








  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Banner */}
      <div style={{background:"#fff8f0",border:`2px solid ${T.orange}`,padding:"12px 16px",fontSize:12,color:T.darkGray,lineHeight:1.6}}>
        📋 <strong>Submit your Start of Day report first.</strong> Once submitted, your <strong>Log In button will unlock</strong>. Your SOD will be visible to Kristine and David.
      </div>








      {/* Tasks */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>TODAY'S TASKS *</div>
          <button onClick={addTask} style={{background:"transparent",border:`1px solid #444`,color:"#aaa",padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>+ ADD TASK</button>
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {tasks.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,paddingTop:12,minWidth:18}}>{i+1}.</div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                <input value={t.task} onChange={e=>updateTask(i,"task",e.target.value)} placeholder={`Task ${i+1}…`}
                  style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:T.body,color:T.black}} />
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:T.grayLight,fontFamily:T.mono,letterSpacing:1,marginBottom:3}}>PRIORITY</div>
                    <select value={t.priority} onChange={e=>updateTask(i,"priority",e.target.value)}
                      style={{width:"100%",background:T.bg,border:`2px solid ${priorityColor(t.priority)}`,padding:"6px 10px",fontSize:12,fontWeight:700,color:priorityColor(t.priority),outline:"none",fontFamily:T.mono}}>
                      {PRIORITY_OPTIONS.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:T.grayLight,fontFamily:T.mono,letterSpacing:1,marginBottom:3}}>TARGET TIME</div>
                    <select value={t.eta} onChange={e=>updateTask(i,"eta",e.target.value)}
                      style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,padding:"6px 10px",fontSize:12,color:T.black,outline:"none",fontFamily:T.mono}}>
                      {TIME_OPTIONS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {tasks.length>1&&<button onClick={()=>removeTask(i)} style={{background:"none",border:"none",color:T.grayLight,fontSize:16,cursor:"pointer",paddingTop:8}}>✕</button>}
            </div>
          ))}
        </div>
      </div>








      {/* Metrics */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}><div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>TODAY'S METRICS TARGET</div></div>
        <textarea value={metrics} onChange={e=>setMetrics(e.target.value)} placeholder="e.g. 80 calls, 8 connects, 3 meetings booked…"
          style={{width:"100%",minHeight:70,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>








      {/* Blockers */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}><div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>BLOCKERS OR CONCERNS</div></div>
        <textarea value={blockers} onChange={e=>setBlockers(e.target.value)} placeholder="Anything blocking you today? (optional)"
          style={{width:"100%",minHeight:60,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>








      {/* Submit */}
      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{width:"100%",padding:"14px",background:canSubmit?T.orange:"#E5E0D8",color:canSubmit?"#fff":T.gray,border:"none",fontSize:13,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font}}>
        {canSubmit?"✅  SUBMIT SOD & UNLOCK LOG IN":"ADD AT LEAST ONE TASK TO CONTINUE"}
      </button>
    </div>
  );
}
// ─── EOD FORM ─────────────────────────────────────────────────────────────────
function EODForm({member, onSubmit}) {
  const [eodReport,setEodReport]=useState("");
  const [metrics,setMetrics]=useState([]);
  const [managerNotes,setManagerNotes]=useState("");
  const [blockers,setBlockers]=useState("");
  const [submitting,setSubmitting]=useState(false);
  
  const kpiData=KPI_DATA[member];
  
  // Initialize metrics from KPI data
  useEffect(()=>{
    if(kpiData){
      const allMetrics=kpiData.categories.flatMap(cat=>
        cat.metrics.map(m=>({name:m.name,value:"",target:m.target,notes:m.notes}))
      );
      setMetrics(allMetrics);
    }
  },[member]);








  const updateMetric=(i,val)=>setMetrics(prev=>prev.map((m,idx)=>idx===i?{...m,value:val}:m));
  const canSubmit=eodReport.trim()&&metrics.every(m=>m.value.trim());








  const handleSubmit=async()=>{
    if(!canSubmit) return;
    setSubmitting(true);
    const eod={
      member,date:todayStr(),
      submittedAt:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}),
      eodReport:eodReport.trim(),
      metrics:metrics.filter(m=>m.value.trim()),
      managerNotes:managerNotes.trim(),
      blockers:blockers.trim(),
    };
    setTimeout(()=>onSubmit(eod),800);
  };








  if(submitting) return (
    <div style={{textAlign:"center",padding:"48px 20px"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontSize:16,fontWeight:700,fontFamily:T.font,marginBottom:6}}>EOD Submitted!</div>
      <div style={{fontSize:12,color:T.gray,fontFamily:T.mono,letterSpacing:1}}>Unlocking your Log Out…</div>
    </div>
  );








  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Banner */}
      <div style={{background:"#fff0f0",border:`2px solid ${T.red}`,padding:"12px 16px",fontSize:12,color:T.darkGray,lineHeight:1.6}}>
        📊 <strong>Submit your End of Day report and metrics.</strong> Once submitted, your <strong>Log Out button will unlock</strong>. Your EOD will be visible to Kristine and David.
      </div>








      {/* EOD Report */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>END OF DAY REPORT *</div>
        </div>
        <textarea value={eodReport} onChange={e=>setEodReport(e.target.value)} 
          placeholder={kpiData?.eod?.join("\n") || "Describe your accomplishments, challenges, and tomorrow's plan…"}
          style={{width:"100%",minHeight:140,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.mono,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>








      {/* Metrics */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>TODAY'S METRICS *</div>
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
          {kpiData && kpiData.categories.map((cat,ci)=>(
            <div key={ci}>
              <div style={{fontSize:10,fontWeight:700,color:T.grayLight,fontFamily:T.mono,letterSpacing:2,marginBottom:8}}>{cat.name.toUpperCase()}</div>
              {cat.metrics.map((metric,mi)=>{
                const idx=metrics.findIndex(m=>m.name===metric.name);
                if(idx===-1) return null;
                return (
                  <div key={mi} style={{marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.black,marginBottom:4}}>{metric.name}</div>
                    <div style={{fontSize:10,color:T.grayLight,marginBottom:4,fontFamily:T.mono}}>Target: {metric.target} · {metric.notes}</div>
                    <input value={metrics[idx].value} onChange={e=>updateMetric(idx,e.target.value)} 
                      placeholder={`Enter your ${metric.name.toLowerCase()}…`}
                      style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:T.body,color:T.black}} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>




      {/* Manager Notes */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>MANAGER NOTES (OPTIONAL)</div>
        </div>
        <textarea value={managerNotes} onChange={e=>setManagerNotes(e.target.value)} 
          placeholder="Any special notes, feedback, or context for your manager…"
          style={{width:"100%",minHeight:70,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>




      {/* Blockers */}
      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>BLOCKERS (OPTIONAL)</div>
        </div>
        <textarea value={blockers} onChange={e=>setBlockers(e.target.value)} 
          placeholder="What's blocking you or needs manager attention? (optional)"
          style={{width:"100%",minHeight:70,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>


      {/* Submit */}
      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{width:"100%",padding:"14px",background:canSubmit?T.red:"#E5E0D8",color:canSubmit?"#fff":T.gray,border:"none",fontSize:13,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font}}>
        {canSubmit?"✅  SUBMIT EOD & UNLOCK LOG OUT":"COMPLETE ALL FIELDS TO CONTINUE"}
      </button>
    </div>
  );
}
// ─── COMMENTS & NOTES SYSTEM ──────────────────────────────────────────────────
function CommentsPanel({member, date, type}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);








  useEffect(() => {
    const loadComments = async () => {
      const key = `comments-${type}-${member}-${date}`;
      const data = await storage.get(key);
      if (data) setComments(JSON.parse(data.value));
      setLoading(false);
    };
    loadComments();
  }, [member, date, type]);








  const addComment = async () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      text: newComment.trim(),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    const updated = [...comments, comment];
    setComments(updated);
    await storage.set(`comments-${type}-${member}-${date}`, JSON.stringify(updated));
    setNewComment("");
  };








  if (loading) return <div style={{ padding: 16, textAlign: "center", color: T.grayLight, fontSize: 12 }}>Loading comments...</div>;








  return (
    <div style={{ background: T.surface, border: `2px solid ${T.black}`, overflow: "hidden" }}>
      <div style={{ background: T.black, padding: "10px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, fontFamily: T.mono, letterSpacing: 2 }}>MANAGER NOTES</div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {comments.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: T.grayLight, fontSize: 12 }}>No notes yet</div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ padding: "10px 14px", background: T.bg, borderLeft: `3px solid ${T.orange}` }}>
            <div style={{ fontSize: 11, color: T.grayLight, fontFamily: T.mono, marginBottom: 4 }}>{c.time}</div>
            <div style={{ fontSize: 13, color: T.black, lineHeight: 1.6 }}>{c.text}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addComment()}
            placeholder="Add a manager note..."
            style={{ flex: 1, background: T.bg, border: `2px solid ${T.black}`, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: T.body, color: T.black }}
          />
          <button onClick={addComment} disabled={!newComment.trim()}
            style={{ padding: "9px 18px", background: newComment.trim() ? T.orange : "#E5E0D8", color: newComment.trim() ? "#fff" : T.gray, border: "none", fontSize: 12, fontWeight: 700, cursor: newComment.trim() ? "pointer" : "not-allowed", letterSpacing: 1, fontFamily: T.mono }}>
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}








// ─── AI INSIGHTS PANEL ────────────────────────────────────────────────────────
function AIInsightsPanel({member, memberData}) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);








  const generate = async () => {
    setLoading(true);
    const result = await generateInsights(memberData);
    setInsights(result.insights || []);
    setLastGenerated(new Date().toLocaleTimeString());
    setLoading(false);
  };








  const iconMap = { positive: "✅", warning: "⚠️", neutral: "💡" };
  const colorMap = { positive: T.green, warning: T.orange, neutral: T.purple };








  return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ padding: "12px 16px", borderBottom: `2px solid ${T.black}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardLabel color={T.purple}>🤖 AI INSIGHTS</CardLabel>
        <button onClick={generate} disabled={loading}
          style={{ padding: "5px 12px", fontSize: 10, fontWeight: 700, background: loading ? "#E5E0D8" : T.purple, color: loading ? T.gray : "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1, fontFamily: T.mono }}>
          {loading ? "ANALYZING..." : "GENERATE"}
        </button>
      </div>
      <div style={{ padding: 14 }}>
        {insights.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: T.grayLight, fontSize: 12 }}>
            Click "Generate" to get AI-powered insights
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((insight, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: T.bg, borderLeft: `3px solid ${colorMap[insight.type]}` }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{iconMap[insight.type]}</span>
                <div style={{ fontSize: 13, color: T.black, lineHeight: 1.6 }}>{insight.text}</div>
              </div>
            ))}
            {lastGenerated && (
              <div style={{ fontSize: 10, color: T.grayLight, fontFamily: T.mono, textAlign: "right", marginTop: 4 }}>
                Generated at {lastGenerated}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}








// ─── METRICS CHART COMPONENT ──────────────────────────────────────────────────
function MetricsChart({data, title, color}) {
  // Simple bar chart visualization
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div style={{ background: T.surface, border: `2px solid ${T.black}`, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.black, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((item, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: T.darkGray }}>{item.label}</span>
              <span style={{ fontWeight: 700, color }}>{item.value}</span>
            </div>
            <div style={{ background: T.border, height: 8, borderRadius: 0 }}>
              <div style={{ background: color, height: "100%", width: `${(item.value / maxValue) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}








// ─── WEEKLY PERFORMANCE DASHBOARD ─────────────────────────────────────────────
function WeeklyPerformanceDashboard({logs, sodSubmissions, eodSubmissions}) {
  const [selectedMember, setSelectedMember] = useState("Caleb Bentil");
  const [aiInsights, setAiInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);








  const getWeekDates = () => {
    const d = new Date(), day = d.getDay(), mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(mon);
      date.setDate(mon.getDate() + i);
      return date.toISOString().split("T")[0];
    });
  };








  const weekDates = getWeekDates();
  const trackedMembers = ["Caleb Bentil", "Darlene Mae Malolos", "Cyril Butanas"];








  // Calculate scores for each member
  const calculateScore = (member) => {
    let score = 0;
    weekDates.forEach(date => {
      const dayLogs = logs.filter(l => l.member === member && l.date === date);
      if (dayLogs.length > 0) score += 20; // Attendance
      const sodKey = `sod-${date}`;
      // SOD and EOD would need to check per-date storage, simplified here
      score += Math.random() * 20; // Placeholder
    });
    return Math.min(100, score).toFixed(0);
  };








  const generateTeamInsights = async () => {
    setLoadingInsights(true);
    const prompt = `Analyze this team's weekly performance and provide 3 key insights:








Team Members: ${trackedMembers.join(", ")}
Week: ${weekLabel()}








Performance Summary:
${trackedMembers.map(m => `- ${m}: ${calculateScore(m)}% score this week`).join("\n")}








Provide insights in JSON format:
{
  "insights": [
    {"type": "positive|warning|action", "text": "brief insight"},
    {"type": "positive|warning|action", "text": "brief insight"},
    {"type": "positive|warning|action", "text": "brief insight"}
  ]
}`;








    try {
      const result = await callClaude(prompt, 1000);
      setAiInsights(result.insights || []);
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    setLoadingInsights(false);
  };








  const memberScores = trackedMembers.map(m => ({
    member: m,
    score: calculateScore(m),
    color: calculateScore(m) >= 80 ? T.green : calculateScore(m) >= 60 ? T.yellow : T.red
  }));








  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <Card style={{ padding: "20px 24px", background: T.black }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: T.font }}>Weekly Performance Dashboard</div>
            <div style={{ fontSize: 11, color: "#666", fontFamily: T.mono, marginTop: 4 }}>{weekLabel()}</div>
          </div>
          <button onClick={generateTeamInsights} disabled={loadingInsights}
            style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, background: loadingInsights ? "#444" : T.orange, color: "#fff", border: "none", cursor: loadingInsights ? "not-allowed" : "pointer", letterSpacing: 1, fontFamily: T.mono }}>
            {loadingInsights ? "ANALYZING..." : "🤖 AI INSIGHTS"}
          </button>
        </div>
      </Card>








      {/* AI Team Insights */}
      {aiInsights.length > 0 && (
        <Card>
          <div style={{ padding: "12px 16px", borderBottom: `2px solid ${T.black}` }}>
            <CardLabel color={T.purple}>🤖 TEAM AI INSIGHTS</CardLabel>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {aiInsights.map((insight, i) => {
              const iconMap = { positive: "✅", warning: "⚠️", action: "🎯" };
              const colorMap = { positive: T.green, warning: T.orange, action: T.purple };
              return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: T.bg, borderLeft: `3px solid ${colorMap[insight.type] || T.purple}` }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{iconMap[insight.type] || "💡"}</span>
                  <div style={{ fontSize: 13, color: T.black, lineHeight: 1.6 }}>{insight.text}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}








      {/* Performance Scorecards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {memberScores.map(ms => (
          <Card key={ms.member} style={{ padding: 18, textAlign: "center", borderTop: `4px solid ${ms.color}` }} hover>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{ms.member.split(" ")[0]}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: ms.color, fontFamily: T.font, lineHeight: 1 }}>{ms.score}%</div>
            <div style={{ fontSize: 10, color: T.grayLight, fontFamily: T.mono, marginTop: 4 }}>WEEKLY SCORE</div>
          </Card>
        ))}
      </div>








      {/* Member Details */}
      <Card>
        <div style={{ padding: "12px 16px", borderBottom: `2px solid ${T.black}` }}>
          <CardLabel>SELECT TEAM MEMBER</CardLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {trackedMembers.map(m => (
              <Pill key={m} label={m.split(" ")[0].toUpperCase()} active={selectedMember === m} onClick={() => setSelectedMember(m)} />
            ))}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Weekly Metrics - {selectedMember.split(" ")[0]}</div>
          {/* Placeholder metrics visualization */}
          <MetricsChart
            title="Daily Activity"
            color={T.orange}
            data={weekDates.map((d, i) => ({
              label: ["Mon", "Tue", "Wed", "Thu", "Fri"][i],
              value: Math.floor(Math.random() * 100) + 50
            }))}
          />
        </div>
      </Card>
    </div>
  );
}








// ─── NOTIFICATION CENTER ──────────────────────────────────────────────────────
function NotificationCenter({notifications, onDismiss}) {
  if(!notifications.length) return null;
  return (
    <div style={{position:"fixed",top:70,right:20,zIndex:1000,display:"flex",flexDirection:"column",gap:10,maxWidth:340}}>
      {notifications.map(n=>{
        const bg=n.type==="warning"?"#fff8f0":n.type==="error"?"#fef2f2":"#f0fdf4";
        const border=n.type==="warning"?T.orange:n.type==="error"?T.red:T.green;
        const icon=n.type==="warning"?"⚠":n.type==="error"?"✗":"✓";
        return (
          <div key={n.id} style={{background:bg,border:`2px solid ${border}`,padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:16}}>{icon}</span>
            <div style={{flex:1,fontSize:12,color:T.darkGray,lineHeight:1.5}}>{n.message}</div>
            <button onClick={()=>onDismiss(n.id)} style={{background:"none",border:"none",color:T.grayLight,fontSize:14,cursor:"pointer",padding:0}}>✕</button>
          </div>
        );
      })}
    </div>
  );
}








// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportAttendanceCSV(logs, weekDates, TEAM_OPS) {
  const rows=[["Member","Mon","Tue","Wed","Thu","Fri","Total Hours","Late Days","Absent Days"]];
  TEAM_OPS.forEach(member=>{
    const hours=weekDates.map(date=>{
      const dl=logs.filter(l=>l.member===member&&l.date===date);
      let total=0,inTime=null;
      for(const log of dl){
        if(log.type==="in") inTime=log.timestamp;
        else if(log.type==="out"&&inTime){total+=(new Date(log.timestamp)-new Date(inTime))/3600000;inTime=null;}
      }
      if(inTime) total+=(new Date()-new Date(inTime))/3600000;
      return total.toFixed(1);
    });
    const totalHours=hours.reduce((a,h)=>a+parseFloat(h),0).toFixed(1);
    const lateDays=weekDates.filter(date=>{
      const firstIn=logs.find(l=>l.member===member&&l.date===date&&l.type==="in");
      if(!firstIn) return false;
      const[h,m]=firstIn.time.split(":").map(Number);
      const[sh,sm]=SHIFT_START.split(":").map(Number);
      return h>sh||(h===sh&&m>sm);
    }).length;
    const absentDays=weekDates.filter(d=>!logs.some(l=>l.member===member&&l.date===d&&l.type==="in")).length;
    rows.push([member,...hours,totalHours,lateDays,absentDays]);
  });
  const csv=rows.map(r=>r.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`attendance-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}








// ═════════════════════════════════════════════════════════════════════════════
// KPI TRACKING SYSTEM - Features A + C + E
// ═════════════════════════════════════════════════════════════════════════════








// ─── KPI CONFIGURATION ───────────────────────────────────────────────────────
const KPI_CONFIG = {
  "Caleb Bentil": {
    name: "Caleb", role: "Outbound", color: "#6366f1", emoji: "📞",
    metrics: [
      { key: "calls", label: "Calls Dialed", target: 80, stretch: 100, regex: /calls?\s*(?:dialed)?:?\s*(\d+)/i, daily: true },
      { key: "connects", label: "Live Connects", target: 8, stretch: 12, regex: /(?:live\s*)?connects?:?\s*(\d+)/i, daily: true },
      { key: "meetings", label: "Meetings Booked", target: 3, stretch: 5, regex: /meetings?.*?:?\s*(\d+)/i, weekly: true }
    ]
  },
  "Cyril Butanas": {
    name: "Cyril", role: "Influencer Outreach", color: "#10b981", emoji: "🌟",
    metrics: [
      { key: "outreach", label: "Outreach Sent", target: 6, stretch: 10, regex: /outreach.*?:?\s*(\d+)/i, daily: true },
      { key: "responses", label: "Responses", target: 1, stretch: 2, regex: /responses?:?\s*(\d+)/i, daily: true },
      { key: "partnerships", label: "Partnerships", target: 3, stretch: 5, regex: /partner.*?:?\s*(\d+)/i, weekly: true }
    ]
  },
  "Darlene Mae Malolos": {
    name: "Darlene", role: "Designer", color: "#ec4899", emoji: "🎨",
    metrics: [
      { key: "designs", label: "Designs Delivered", target: 10, stretch: 15, regex: /(?:designs?|assets?).*?:?\s*(\d+)/i, weekly: true },
      { key: "revisions", label: "Avg Revisions", target: 2, stretch: 1, regex: /revision.*?:?\s*(\d+)/i, weekly: true, inverse: true }
    ]
  }
};








// Extract metrics from EOD text
const extractKPIs = (text, member) => {
  const config = KPI_CONFIG[member];
  if (!config) return {};
  const metrics = {};
  config.metrics.forEach(m => {
    const match = text.match(m.regex);
    if (match) metrics[m.key] = parseInt(match[1]);
  });
  return metrics;
};








// Calculate score (0-100)
const calcKPIScore = (val, target, stretch, inverse = false) => {
  if (val == null) return null;
  if (inverse) {
    if (val <= stretch) return 100;
    if (val >= target) return 60;
    return 60 + ((target - val) / (target - stretch)) * 40;
  }
  if (val >= stretch) return 100;
  if (val < target * 0.6) return 0;
  if (val < target) return (val / target) * 80;
  return 80 + ((val - target) / (stretch - target)) * 20;
};








// Get color for score
const kpiColor = (score) => {
  if (!score) return "#9ca3af";
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};








// ─── LIVE KPI DASHBOARD (Feature A) ──────────────────────────────────────────
function LiveKPIDashboard({ eodSubmissions }) {
  const [member, setMember] = useState("Caleb Bentil");
  const [period, setPeriod] = useState("week");
  
  const config = KPI_CONFIG[member];
  if (!config) return <div>No config for {member}</div>;
  
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (period === "today") return [todayStr];
    
    if (period === "week") {
      const dates = [];
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      for (let i = 0; i < 5; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
      return dates;
    }
    
    const dates = [];
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split("T")[0]);
    }
    return dates;
  };
  
  const dates = getDateRange();
  
  const totals = {};
  dates.forEach(date => {
    const eod = eodSubmissions[`${member}-${date}`];
    if (eod) {
      const extracted = extractKPIs(eod.summary || "", member);
      Object.keys(extracted).forEach(key => {
        totals[key] = (totals[key] || 0) + extracted[key];
      });
    }
  });
  
  const scores = config.metrics.map(m => {
    const val = totals[m.key];
    const score = calcKPIScore(val, m.target, m.stretch, m.inverse);
    return { ...m, value: val, score };
  });
  
  const avgScore = scores.filter(s => s.score).reduce((sum, s) => sum + s.score, 0) / (scores.filter(s => s.score).length || 1);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>📊 Live KPI Dashboard</h2>
          <p style={{ fontSize: 11, color: T.grayLight, margin: "3px 0 0 0" }}>Real-time tracking from EOD submissions</p>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["today", "week", "month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                background: period === p ? T.black : T.bg,
                color: period === p ? "#fff" : T.gray,
                border: `2px solid ${T.black}`, fontFamily: T.mono
              }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.keys(KPI_CONFIG).map(m => {
          const cfg = KPI_CONFIG[m];
          return (
            <button key={m} onClick={() => setMember(m)}
              style={{
                padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: member === m ? cfg.color : T.bg,
                color: member === m ? "#fff" : T.gray,
                border: `2px solid ${member === m ? cfg.color : T.border}`,
                display: "flex", alignItems: "center", gap: 6
              }}>
              <span>{cfg.emoji}</span> {cfg.name}
            </button>
          );
        })}
      </div>
      
      <Card style={{ background: T.black, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#888", fontFamily: T.mono, letterSpacing: 2, marginBottom: 4 }}>PERFORMANCE SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: kpiColor(avgScore) }}>
            {avgScore.toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, color: "#666", marginTop: 3 }}>
            {avgScore >= 80 ? "🎯 Exceeding!" : avgScore >= 60 ? "📈 On track" : "⚠️ Attention"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#888", fontFamily: T.mono }}>PERIOD</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 3 }}>
            {period.toUpperCase()}
          </div>
        </div>
      </Card>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scores.map((s, i) => {
          const progress = s.value ? Math.min((s.value / s.stretch) * 100, 100) : 0;
          const color = kpiColor(s.score);
          
          return (
            <Card key={i} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: T.grayLight, fontFamily: T.mono, marginTop: 1 }}>
                    Target: {s.target} • Stretch: {s.stretch}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color }}>{s.value ?? "—"}</div>
                  {s.score && <div style={{ fontSize: 9, color: T.grayLight }}>{s.score.toFixed(0)}%</div>}
                </div>
              </div>
              
              <div style={{ width: "100%", height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: color, transition: "width 0.3s" }} />
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <div style={{ fontSize: 8, color: s.value >= s.target ? color : "#ddd", fontWeight: 700, fontFamily: T.mono }}>
                  {s.value >= s.target ? "✓ TARGET" : "TARGET"}
                </div>
                <div style={{ fontSize: 8, color: s.value >= s.stretch ? color : "#ddd", fontWeight: 700, fontFamily: T.mono }}>
                  {s.value >= s.stretch ? "✓ STRETCH" : "STRETCH"}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {scores.filter(s => s.value).length === 0 && (
        <Card style={{ padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.gray }}>No data yet for {period}</div>
          <div style={{ fontSize: 11, color: T.grayLight, marginTop: 4 }}>EOD submissions will populate this dashboard</div>
        </Card>
      )}
    </div>
  );
}








// ─── ADVANCED ANALYTICS (Feature C) ──────────────────────────────────────────
function AdvancedAnalytics({ logs, sodSubmissions, eodSubmissions }) {
  const [view, setView] = useState("30day");
  
  const getLast30Days = () => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };
  
  const getLast90Days = () => {
    const dates = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };
  
  const dates = view === "30day" ? getLast30Days() : getLast90Days();
  const members = TEAM_OPS;
  
  const attendanceData = dates.map(date => {
    const present = members.filter(m => 
      logs.some(l => l.member === m && l.date === date && l.type === "in")
    ).length;
    return { date, rate: (present / members.length) * 100, present };
  });
  
  const sodData = dates.map(date => {
    const submitted = members.filter(m => sodSubmissions[`${m}-${date}`]).length;
    return { date, rate: (submitted / members.length) * 100 };
  });
  
  const eodData = dates.map(date => {
    const submitted = members.filter(m => eodSubmissions[`${m}-${date}`]).length;
    return { date, rate: (submitted / members.length) * 100 };
  });
  
  const lateData = dates.map(date => {
    const late = members.filter(m => {
      const firstIn = logs.find(l => l.member === m && l.date === date && l.type === "in");
      if (!firstIn) return false;
      const [h, mins] = firstIn.time.split(":").map(Number);
      const [sh, sm] = SHIFT_START.split(":").map(Number);
      return h > sh || (h === sh && mins > sm);
    }).length;
    return { date, count: late };
  });
  
  const avgAttendance = attendanceData.reduce((sum, d) => sum + d.rate, 0) / attendanceData.length;
  const avgSOD = sodData.reduce((sum, d) => sum + d.rate, 0) / sodData.length;
  const avgEOD = eodData.reduce((sum, d) => sum + d.rate, 0) / eodData.length;
  const totalLate = lateData.reduce((sum, d) => sum + d.count, 0);
  
  const dayOfWeekStats = {};
  dates.forEach(date => {
    const d = new Date(date + "T12:00:00");
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    if (!dayOfWeekStats[dayName]) dayOfWeekStats[dayName] = { attendance: [], sod: [], eod: [] };
    
    const attData = attendanceData.find(a => a.date === date);
    const sodDat = sodData.find(s => s.date === date);
    const eodDat = eodData.find(e => e.date === date);
    
    if (attData) dayOfWeekStats[dayName].attendance.push(attData.rate);
    if (sodDat) dayOfWeekStats[dayName].sod.push(sodDat.rate);
    if (eodDat) dayOfWeekStats[dayName].eod.push(eodDat.rate);
  });
  
  const dayAvg = Object.keys(dayOfWeekStats).map(day => ({
    day,
    attendance: dayOfWeekStats[day].attendance.reduce((s, v) => s + v, 0) / (dayOfWeekStats[day].attendance.length || 1)
  })).sort((a, b) => b.attendance - a.attendance);
  
  const recent7 = attendanceData.slice(-7);
  const prev7 = attendanceData.slice(-14, -7);
  const recentAvg = recent7.reduce((s, d) => s + d.rate, 0) / 7;
  const prevAvg = prev7.reduce((s, d) => s + d.rate, 0) / 7;
  const trend = recentAvg > prevAvg ? "up" : recentAvg < prevAvg ? "down" : "flat";
  const trendPercent = ((recentAvg - prevAvg) / prevAvg * 100).toFixed(1);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>📈 Advanced Analytics</h2>
          <p style={{ fontSize: 11, color: T.grayLight, margin: "3px 0 0 0" }}>Trends, patterns & predictions</p>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["30day", "90day", "patterns"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                background: view === v ? T.black : T.bg,
                color: view === v ? "#fff" : T.gray,
                border: `2px solid ${T.black}`, fontFamily: T.mono
              }}>
              {v === "patterns" ? "INSIGHTS" : v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <Card style={{ padding: "12px 14px", background: T.black }}>
          <div style={{ fontSize: 9, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>AVG ATTENDANCE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: avgAttendance >= 90 ? T.green : T.yellow }}>
            {avgAttendance.toFixed(0)}%
          </div>
          <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>Last {dates.length} days</div>
        </Card>
        
        <Card style={{ padding: "12px 14px", background: T.black }}>
          <div style={{ fontSize: 9, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>AVG SOD RATE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: avgSOD >= 90 ? T.green : T.yellow }}>
            {avgSOD.toFixed(0)}%
          </div>
          <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>Last {dates.length} days</div>
        </Card>
        
        <Card style={{ padding: "12px 14px", background: T.black }}>
          <div style={{ fontSize: 9, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>AVG EOD RATE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: avgEOD >= 90 ? T.green : T.yellow }}>
            {avgEOD.toFixed(0)}%
          </div>
          <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>Last {dates.length} days</div>
        </Card>
        
        <Card style={{ padding: "12px 14px", background: T.black }}>
          <div style={{ fontSize: 9, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>LATE ARRIVALS</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: totalLate > 5 ? T.red : T.green }}>
            {totalLate}
          </div>
          <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>Last {dates.length} days</div>
        </Card>
      </div>
      
      <Card style={{ padding: "14px 16px", background: trend === "up" ? "#f0fdf4" : trend === "down" ? "#fef2f2" : "#f9fafb", border: `2px solid ${trend === "up" ? T.green : trend === "down" ? T.red : T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 24 }}>{trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️"}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.black }}>
              7-Day Trend: {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
            </div>
            <div style={{ fontSize: 10, color: T.grayLight }}>
              {trend !== "flat" && `${Math.abs(parseFloat(trendPercent))}% ${trend === "up" ? "increase" : "decrease"} vs previous week`}
              {trend === "flat" && "No significant change detected"}
            </div>
          </div>
        </div>
      </Card>
      
      {view === "patterns" && (
        <>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🎯 Best Performing Days</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dayAvg.slice(0, 3).map((d, i) => (
                <div key={d.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: i === 0 ? "#f0fdf4" : T.bg, borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{d.day}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? T.green : T.black }}>{d.attendance.toFixed(0)}%</div>
                    <div style={{ fontSize: 9, color: T.grayLight }}>attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card style={{ padding: "16px 18px", background: "#fffbeb", border: `2px solid ${T.yellow}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: T.black }}>💡 Predictive Insights</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: T.darkGray, lineHeight: 1.6 }}>
              {trend === "up" && <li>Team performance is improving - maintain current momentum</li>}
              {trend === "down" && <li>Performance declining - consider team check-in or process review</li>}
              {avgAttendance < 85 && <li>Attendance below target - review remote work policies or team wellness</li>}
              {avgSOD < 80 && <li>SOD submission rate low - consider automated reminders at 8:30 AM</li>}
              {totalLate > 10 && <li>Multiple late arrivals - review start time or flexibility options</li>}
              {dayAvg[0] && <li>{dayAvg[0].day} is your strongest day - schedule important work then</li>}
            </ul>
          </Card>
        </>
      )}
      
      {view !== "patterns" && (
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Attendance Trend ({dates.length} days)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
            {attendanceData.map((d, i) => {
              const height = (d.rate / 100) * 80;
              const color = d.rate >= 90 ? T.green : d.rate >= 70 ? T.yellow : T.red;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ height: `${height}px`, background: color, borderRadius: "2px 2px 0 0" }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: T.grayLight, fontFamily: T.mono }}>
            <span>{new Date(dates[0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span>{new Date(dates[dates.length - 1] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </Card>
      )}
    </div>
  );
}








// ─── AUTO PERFORMANCE REVIEWS (Feature E) ────────────────────────────────────
function AutoPerformanceReviews({ logs, sodSubmissions, eodSubmissions }) {
  const [selectedMember, setSelectedMember] = useState("Caleb Bentil");
  const [generating, setGenerating] = useState(false);
  const [review, setReview] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const generateReview = async () => {
    setGenerating(true);
    setReview(null);
    
    try {
      const [year, monthNum] = month.split("-");
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      
      const dates = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split("T")[0]);
      }
      
      const attendance = {
        total_days: dates.length,
        present: dates.filter(d => logs.some(l => l.member === selectedMember && l.date === d && l.type === "in")).length,
        late: dates.filter(d => {
          const firstIn = logs.find(l => l.member === selectedMember && l.date === d && l.type === "in");
          if (!firstIn) return false;
          const [h, m] = firstIn.time.split(":").map(Number);
          const [sh, sm] = SHIFT_START.split(":").map(Number);
          return h > sh || (h === sh && m > sm);
        }).length
      };
      
      const sodCount = dates.filter(d => sodSubmissions[`${selectedMember}-${d}`]).length;
      const eodCount = dates.filter(d => eodSubmissions[`${selectedMember}-${d}`]).length;
      
      const kpiData = {};
      dates.forEach(d => {
        const eod = eodSubmissions[`${selectedMember}-${d}`];
        if (eod) {
          const extracted = extractKPIs(eod.summary || "", selectedMember);
          Object.keys(extracted).forEach(key => {
            kpiData[key] = (kpiData[key] || []);
            kpiData[key].push(extracted[key]);
          });
        }
      });
      
      const kpiSummary = {};
      Object.keys(kpiData).forEach(key => {
        const values = kpiData[key];
        kpiSummary[key] = {
          avg: (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1),
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
      
      const prompt = `Generate a professional monthly performance review for ${selectedMember}.








DATA FOR ${month}:








ATTENDANCE:
- Working days: ${attendance.total_days}
- Days present: ${attendance.present} (${((attendance.present / attendance.total_days) * 100).toFixed(0)}%)
- Late arrivals: ${attendance.late}








SUBMISSIONS:
- SOD submitted: ${sodCount}/${attendance.total_days} (${((sodCount / attendance.total_days) * 100).toFixed(0)}%)
- EOD submitted: ${eodCount}/${attendance.total_days} (${((eodCount / attendance.total_days) * 100).toFixed(0)}%)








KPI PERFORMANCE:
${Object.keys(kpiSummary).map(k => `- ${k}: avg ${kpiSummary[k].avg}, range ${kpiSummary[k].min}-${kpiSummary[k].max}`).join("\n")}








Generate a review with:
1. Overall Score (0-100)
2. Performance Summary (2-3 sentences)
3. Key Strengths (2-3 bullet points)
4. Areas for Improvement (2-3 bullet points)
5. Trend Analysis (improving/stable/declining + explanation)
6. Recommendations (2-3 actionable items)








Format as JSON:
{
  "score": <number>,
  "summary": "<text>",
  "strengths": ["<point1>", "<point2>", ...],
  "improvements": ["<point1>", "<point2>", ...],
  "trend": "<up/stable/down>",
  "trend_note": "<explanation>",
  "recommendations": ["<rec1>", "<rec2>", ...]
}`;
      
      const result = await callClaude(prompt, 1500);
      const parsed = JSON.parse(result);
      
      setReview({
        ...parsed,
        member: selectedMember,
        month,
        generated_at: new Date().toISOString(),
        data: { attendance, sodCount, eodCount, kpiSummary }
      });
      
    } catch (error) {
      console.error("Review generation error:", error);
      alert("Failed to generate review. Please try again.");
    } finally {
      setGenerating(false);
    }
  };
  
  const exportReview = () => {
    if (!review) return;
    
    const text = `
MONTHLY PERFORMANCE REVIEW
${review.member} — ${review.month}
Generated: ${new Date(review.generated_at).toLocaleDateString()}








━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━








OVERALL SCORE: ${review.score}/100








PERFORMANCE SUMMARY:
${review.summary}








KEY STRENGTHS:
${review.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}








AREAS FOR IMPROVEMENT:
${review.improvements.map((s, i) => `${i + 1}. ${s}`).join("\n")}








TREND ANALYSIS:
${review.trend === "up" ? "↗️ Improving" : review.trend === "down" ? "↘️ Declining" : "→ Stable"} — ${review.trend_note}








RECOMMENDATIONS:
${review.recommendations.map((s, i) => `${i + 1}. ${s}`).join("\n")}








━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━








DATA SUMMARY:
- Attendance: ${review.data.attendance.present}/${review.data.attendance.total_days} days
- SOD Submissions: ${review.data.sodCount}/${review.data.attendance.total_days}
- EOD Submissions: ${review.data.eodCount}/${review.data.attendance.total_days}
- Late Arrivals: ${review.data.attendance.late}
`.trim();
    
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-${review.member.replace(/\s+/g, "-")}-${review.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>📝 Auto Performance Reviews</h2>
        <p style={{ fontSize: 11, color: T.grayLight, margin: "3px 0 0 0" }}>AI-generated monthly summaries</p>
      </div>
      
      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.grayLight, fontFamily: T.mono, display: "block", marginBottom: 4 }}>TEAM MEMBER</label>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `2px solid ${T.border}`, fontFamily: T.font }}>
              {Object.keys(KPI_CONFIG).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.grayLight, fontFamily: T.mono, display: "block", marginBottom: 4 }}>MONTH</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `2px solid ${T.border}`, fontFamily: T.font }} />
          </div>
          
          <div style={{ paddingTop: 18 }}>
            <button onClick={generateReview} disabled={generating}
              style={{
                padding: "8px 18px", fontSize: 11, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer",
                background: T.orange, color: "#fff", border: "none", fontFamily: T.mono
              }}>
              {generating ? "GENERATING..." : "🤖 GENERATE"}
            </button>
          </div>
        </div>
      </Card>
      
      {review && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card style={{ background: T.black, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>PERFORMANCE SCORE</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: review.score >= 80 ? T.green : review.score >= 60 ? T.yellow : T.red }}>
                {review.score}/100
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#888", fontFamily: T.mono, marginBottom: 4 }}>TREND</div>
              <div style={{ fontSize: 20 }}>
                {review.trend === "up" ? "📈" : review.trend === "down" ? "📉" : "➡️"}
              </div>
              <div style={{ fontSize: 10, color: "#fff", marginTop: 2 }}>
                {review.trend === "up" ? "Improving" : review.trend === "down" ? "Declining" : "Stable"}
              </div>
            </div>
          </Card>
          
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, fontFamily: T.mono, marginBottom: 6 }}>SUMMARY</div>
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, color: T.black }}>{review.summary}</p>
          </Card>
          
          <Card style={{ padding: "14px 16px", background: "#f0fdf4", border: `2px solid ${T.green}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.green, fontFamily: T.mono, marginBottom: 8 }}>✅ STRENGTHS</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: T.darkGray }}>
              {review.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Card>
          
          <Card style={{ padding: "14px 16px", background: "#fffbeb", border: `2px solid ${T.yellow}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.yellow, fontFamily: T.mono, marginBottom: 8 }}>⚠️ AREAS FOR IMPROVEMENT</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: T.darkGray }}>
              {review.improvements.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Card>
          
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, fontFamily: T.mono, marginBottom: 8 }}>💡 RECOMMENDATIONS</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: T.darkGray }}>
              {review.recommendations.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </Card>
          
          <button onClick={exportReview}
            style={{
              padding: "10px 18px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: T.black, color: "#fff", border: "none", fontFamily: T.mono
            }}>
            💾 EXPORT AS TEXT
          </button>
        </div>
      )}
      
      {!review && !generating && (
        <Card style={{ padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.gray }}>No review generated yet</div>
          <div style={{ fontSize: 11, color: T.grayLight, marginTop: 4 }}>Select member and month, then click Generate</div>
        </Card>
      )}
    </div>
  );
}








// ─── ATTENDANCE TRACKER ───────────────────────────────────────────────────────
function AttendanceTracker() {
  const [logs,setLogs]=useState([]);
  const [sodSubmissions,setSodSubmissions]=useState({});
  const [eodSubmissions,setEodSubmissions]=useState({});
  const [selectedMember,setSelectedMember]=useState(null);
  const [currentUser,setCurrentUser]=useState(null);
  const [showUserSelect,setShowUserSelect]=useState(true);
  const [view,setView]=useState("today");
  const [loading,setLoading]=useState(true);
  const [now,setNow]=useState(new Date());
  const [confirmed,setConfirmed]=useState(false);
  const [showSodForm,setShowSodForm]=useState(false);
  const [showEodForm,setShowEodForm]=useState(false);
  const [notifications,setNotifications]=useState([]);
  const [autoLogoutSettings]=useState({enabled:true,maxHours:10});
  const [showAdminAccess,setShowAdminAccess]=useState(false);
  const [adminPassword,setAdminPassword]=useState("");
  const [adminError,setAdminError]=useState(false);
  const [isAdminMode,setIsAdminMode]=useState(false);
  const [slackWebhook,setSlackWebhook]=useState("");
  const [notificationsEnabled,setNotificationsEnabled]=useState(false);
  const [showExportMenu,setShowExportMenu]=useState(false);








  // Define ALL helper functions FIRST (before useEffect hooks use them)
  const saveLogs=async(nl)=>{
    setLogs(nl);
    await api.saveAttendance(nl);
    console.log("✅ Logs saved to KV backend:", nl.length, "entries");
  };








  const getMemberToday=(member)=>logs.filter(l=>l.member===member&&l.date===todayStr());
  const getStatus=(member)=>{
    const tl=getMemberToday(member);
    if(!tl.length) return "absent";
    return tl[tl.length-1].type==="in"?"in":"out";
  };
  const hasSodToday=(member)=>!!sodSubmissions[member];
  const hasEodToday=(member)=>!!eodSubmissions[member];








  const isLate=(member,date)=>{
    // ✅ FLEXI TIME: Skip late tracking for flexi members
    if(FLEXI_TIME_MEMBERS.includes(member)) return false;
    const d=date||todayStr();
    const firstIn=logs.find(l=>l.member===member&&l.date===d&&l.type==="in");
    if(!firstIn) return false;
    const [h,m]=firstIn.time.split(":").map(Number);
    const [sh,sm]=SHIFT_START.split(":").map(Number);
    return h>sh||(h===sh&&m>sm);
  };








  const getTotalHours=(member,date)=>{
    const dl=logs.filter(l=>l.member===member&&l.date===date);
    let total=0,inTime=null;
    for(const log of dl){
      if(log.type==="in") inTime=log.timestamp;
      else if(log.type==="out"&&inTime){total+=(new Date(log.timestamp)-new Date(inTime))/3600000;inTime=null;}
    }
    if(inTime) total+=(new Date()-new Date(inTime))/3600000;
    return total.toFixed(1);
  };








  const getWeekDates=()=>{
    const d=new Date(),day=d.getDay(),mon=new Date(d);
    mon.setDate(d.getDate()-(day===0?6:day-1));
    return Array.from({length:5},(_, i)=>{const date=new Date(mon);date.setDate(mon.getDate()+i);return date.toISOString().split("T")[0];});
  };








  const addNotification=(message,type="warning")=>{
    const id=Date.now();
    setNotifications(prev=>[...prev,{id,message,type}]);
    setTimeout(()=>setNotifications(prev=>prev.filter(n=>n.id!==id)),8000);
  };








  const verifyAdminPassword=()=>{
    if(adminPassword===ADMIN_PASSWORD){
      setIsAdminMode(true);
      setShowAdminAccess(false);
      setAdminPassword("");
    } else {
      setAdminError(true);
      setAdminPassword("");
      setTimeout(()=>setAdminError(false),2000);
    }
  };








  // NOW useEffect hooks can safely use these functions








  useEffect(()=>{
    const timer=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(timer);
  },[]);








  // Auto-logout
  useEffect(()=>{
    if(!autoLogoutSettings.enabled) return;
    const check=setInterval(()=>{
      const loggedIn=logs.filter(l=>l.type==="in"&&l.date===todayStr()&&!logs.some(o=>o.type==="out"&&o.member===l.member&&o.date===todayStr()&&o.timestamp>l.timestamp));
      loggedIn.forEach(log=>{
        const hours=(new Date()-new Date(log.timestamp))/3600000;
        if(hours>=autoLogoutSettings.maxHours){
          const ts=new Date().toISOString();
          const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
          const nl=[...logs,{id:Date.now()+Math.random(),member:log.member,type:"out",date:todayStr(),time,timestamp:ts,auto:true}];
          saveLogs(nl);
          addNotification(`${log.member.split(" ")[0]} auto-logged out after ${autoLogoutSettings.maxHours} hours`,"warning");
        }
      });
    },60000);
    return ()=>clearInterval(check);
  },[logs,autoLogoutSettings]);








  // SOD reminder at 8:55 AM
  useEffect(()=>{
    const check=setInterval(()=>{
      const h=now.getHours(),m=now.getMinutes();
      if(h===8&&m===55){
        const pending=TEAM_OPS.filter(mem=>!sodSubmissions[mem]);
        if(pending.length>0) {
          // Individual user only sees their own reminder
          if(isAdminMode) {
            // Admin sees all pending
            addNotification(`${pending.length} team member(s) haven't submitted SOD yet: ${pending.map(n=>n.split(" ")[0]).join(", ")}`,"warning");
            if(notificationsEnabled) {
              showNotification("⏰ SOD Reminder", `${pending.length} team members need to submit SOD`, "📋");
            }
          } else if(pending.includes(currentUser)) {
            // Individual user only sees their own reminder
            addNotification(`You haven't submitted your SOD yet!`,"warning");
            if(notificationsEnabled) {
              showNotification("⏰ SOD Reminder", `${currentUser.split(" ")[0]}, please submit your SOD`, "📋");
            }
          }
          // Slack notification - send DM to each person who hasn't submitted
          pending.forEach(memberName => {
            const userSlackId = DEFAULT_SLACK_IDS[memberName];
            if (userSlackId) {
              sendToSlack(`⏰ *SOD Reminder*\n\nHi! You haven't submitted your Start of Day (SOD) yet.\n\nPlease submit before starting work today! 📋`, userSlackId);
            }
          });
        }
      }
    },60000);
    return ()=>clearInterval(check);
  },[now,sodSubmissions,notificationsEnabled,currentUser,isAdminMode]);








  // EOD reminder at 5:45 PM
  useEffect(()=>{
    const check=setInterval(()=>{
      const h=now.getHours(),m=now.getMinutes();
      if(h===17&&m===45){
        const stillIn=TEAM_OPS.filter(mem=>getStatus(mem)==="in"&&!eodSubmissions[mem]);
        if(stillIn.length>0) {
          // For individual users: only show notification if THEY are still logged in
          if(isAdminMode) {
            // Admin sees all
            addNotification(`${stillIn.length} team member(s) need to submit EOD: ${stillIn.map(n=>n.split(" ")[0]).join(", ")}`,"warning");
            if(notificationsEnabled) {
              showNotification("⏰ EOD Reminder", `${stillIn.length} team members need to submit EOD before logout`, "📊");
            }
          } else if(stillIn.includes(currentUser)) {
            // Individual user only sees their own reminder
            addNotification(`You need to submit your EOD before logging out!`,"warning");
            if(notificationsEnabled) {
              showNotification("⏰ EOD Reminder", `${currentUser.split(" ")[0]}, please submit your EOD before logout`, "📊");
            }
          }
          // Slack notification - send DM to each person who needs to submit EOD
          stillIn.forEach(memberName => {
            const userSlackId = DEFAULT_SLACK_IDS[memberName];
            if (userSlackId) {
              sendToSlack(`⏰ *EOD Reminder*\n\nHi! Please submit your End of Day (EOD) report before logging out.\n\nYour shift ends at 5:00 PM. Don't forget to log your metrics! 📊`, userSlackId);
            }
          });
        }
      }
    },60000);
    return ()=>clearInterval(check);
  },[now,eodSubmissions,logs,notificationsEnabled,currentUser,isAdminMode]);








  // Logout reminder at 6:30 PM
  useEffect(()=>{
    const check=setInterval(()=>{
      const h=now.getHours(),m=now.getMinutes();
      if(h===18&&m===30){
        // ✅ FLEXI TIME: Exclude flexi members from logout reminder
        const stillIn=TEAM_OPS.filter(mem=>getStatus(mem)==="in" && !FLEXI_TIME_MEMBERS.includes(mem));
        if(stillIn.length>0) {
          // For individual users: only show notification if THEY are still logged in
          if(isAdminMode) {
            // Admin sees all
            addNotification(`${stillIn.length} team member(s) still logged in: ${stillIn.map(n=>n.split(" ")[0]).join(", ")}`,"warning");
            if(notificationsEnabled) {
              showNotification("⚠️ Still Logged In", `${stillIn.length} team members haven't logged out yet`, "🔴");
            }
          } else if(stillIn.includes(currentUser)) {
            // Individual user only sees their own reminder
            addNotification(`You're still logged in after shift hours. Please log out.`,"warning");
            if(notificationsEnabled) {
              showNotification("⚠️ Still Logged In", `${currentUser.split(" ")[0]}, please log out`, "🔴");
            }
          }
          // Slack notification - send DM to each person still logged in
          stillIn.forEach(memberName => {
            const userSlackId = DEFAULT_SLACK_IDS[memberName];
            if (userSlackId) {
              sendToSlack(`⚠️ *Still Logged In*\n\nHi! You're still logged in after shift hours (ended at 5:00 PM).\n\nPlease make sure to log out and submit your EOD if you haven't already! 🔴`, userSlackId);
            }
          });
        }
      }
    },60000);
    return ()=>clearInterval(check);
  },[now,logs,notificationsEnabled,currentUser,isAdminMode]);








  useEffect(()=>{
    const loadData = async () => {
      try {
        console.log("🔵 Loading all data from KV backend...");
        const today = todayStr();
        console.log("📅 Today's date:", today);
        
        // Load attendance logs from API
        const loadedLogs = await api.getAttendance();
        if (loadedLogs.length > 0) {
          setLogs(loadedLogs);
          console.log("✅ Loaded logs from API:", loadedLogs.length, "entries");
        } else {
          // Try migrating from localStorage
          const backup = localStorage.getItem("attendance-logs-backup");
          if (backup) {
            const migratedLogs = JSON.parse(backup);
            setLogs(migratedLogs);
            await api.saveAttendance(migratedLogs);
            console.log("✅ Migrated logs from localStorage:", migratedLogs.length, "entries");
          } else {
            console.log("ℹ️ No logs found");
          }
        }
        
        // Load SOD submissions from API
        const loadedSod = await api.getSOD(today);
        if (Object.keys(loadedSod).length > 0) {
          setSodSubmissions(loadedSod);
          console.log("✅ Loaded SOD from API:", Object.keys(loadedSod).length, "submissions");
          console.log("📋 SOD members:", Object.keys(loadedSod).join(", "));
        } else {
          // Try migrating from localStorage
          const backup = localStorage.getItem(`sod-${today}-backup`);
          if (backup) {
            const migratedSod = JSON.parse(backup);
            setSodSubmissions(migratedSod);
            
            // CRITICAL: Actually migrate each submission to KV backend now!
            console.log("🔄 Migrating SOD data to KV backend...");
            for (const [member, sodData] of Object.entries(migratedSod)) {
              await api.saveSOD(today, member, sodData);
            }
            console.log("✅ Migrated SOD from localStorage:", Object.keys(migratedSod).length, "submissions");
          } else {
            console.log("ℹ️ No SOD submissions found for today");
          }
        }
        
        // Load EOD submissions from API
        const loadedEod = await api.getEOD(today);
        if (Object.keys(loadedEod).length > 0) {
          setEodSubmissions(loadedEod);
          console.log("✅ Loaded EOD from API:", Object.keys(loadedEod).length, "submissions");
          console.log("📋 EOD members:", Object.keys(loadedEod).join(", "));
        } else {
          // Try migrating from localStorage
          const backup = localStorage.getItem(`eod-${today}-backup`);
          if (backup) {
            const migratedEod = JSON.parse(backup);
            setEodSubmissions(migratedEod);
            
            // CRITICAL: Actually migrate each submission to KV backend now!
            console.log("🔄 Migrating EOD data to KV backend...");
            for (const [member, eodData] of Object.entries(migratedEod)) {
              await api.saveEOD(today, member, eodData);
            }
            console.log("✅ Migrated EOD from localStorage:", Object.keys(migratedEod).length, "submissions");
          } else {
            console.log("ℹ️ No EOD submissions found for today");
          }
        }
        
        // Load Slack webhook (legacy)
        const webhookResult = await storage.get("slack-webhook");
        if(webhookResult?.value) {
          setSlackWebhook(webhookResult.value);
        }
        
        console.log("✅ All data loaded successfully from KV backend");
      } catch(error) {
        console.error("❌ Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Request notification permission
    requestNotificationPermission().then(granted => setNotificationsEnabled(granted));
  },[]);








  const logAction=()=>{
    if(!selectedMember) return;
    const status=getStatus(selectedMember);
    // Check for SOD when logging IN
    if(status!=="in"&&!hasSodToday(selectedMember)){
      setShowSodForm(true);
      return;
    }
    // Check for EOD when logging OUT
    if(status==="in"&&!hasEodToday(selectedMember)){
      setShowEodForm(true);
      return;
    }
    const type=status==="in"?"out":"in";
    const ts=new Date().toISOString();
    const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    const nl=[...logs,{id:Date.now(),member:selectedMember,type,date:todayStr(),time,timestamp:ts}];
    saveLogs(nl);
    setConfirmed(true);
    setTimeout(()=>setConfirmed(false),2500);
  };




  // ─── EOD SUMMARY FUNCTIONS ────────────────────────────────────────────────
  const getPresentMembers = () => {
    // Get members who logged IN today
    const today = todayStr();
    const todayLogs = logs.filter(l => l.date === today && l.type === "in");
    return [...new Set(todayLogs.map(l => l.member))];
  };


  const checkAllCompleted = async () => {
    const today = todayStr();
    const presentMembers = getPresentMembers();
    
    if (presentMembers.length === 0) return false;
    
    // Load latest SOD and EOD data
    const sodData = await api.getSOD(today);
    const eodData = await api.getEOD(today);
    
    // Check if all present members have both SOD and EOD
    for (const member of presentMembers) {
      if (!sodData[member] || !eodData[member]) {
        return false; // Not everyone completed
      }
    }
    
    return true; // All present members completed both!
  };


  const generateDailySummary = async () => {
    const today = todayStr();
    const presentMembers = getPresentMembers();
    const sodData = await api.getSOD(today);
    const eodData = await api.getEOD(today);
    
    const date = new Date().toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric", year: "numeric"});
    
    let summary = `📊 *DAILY EOD SUMMARY - ${date}*\n`;
    summary += `✅ All ${presentMembers.length}/${presentMembers.length} members completed EOD\n\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const member of presentMembers) {
      const sod = sodData[member];
      const eod = eodData[member];
      
      summary += `👤 *${member.toUpperCase()}*\n`;
      
      // Role-specific icons
      const roleIcons = {
        "Caleb Bentil": "📞 Outbound Specialist",
        "Cyril Butanas": "🌟 Influencer Outreach",
        "Suki Santos": "🔧 Lead Operations",
        "Kristine Miel Zulaybar": "📊 Lead Enrichment",
        "Darlene Mae Malolos": "🎨 Graphic Designer",
        "Kristine Mirabueno": "👑 Operations Manager"
      };
      
      if (roleIcons[member]) {
        summary += `${roleIcons[member]}\n\n`;
      }
      
      // SOD - Tasks planned
      if (sod && sod.tasks && sod.tasks.length > 0) {
        summary += `📋 *Planned Tasks:*\n`;
        sod.tasks.slice(0, 3).forEach(task => {
          summary += `• ${task.task}\n`;
        });
        summary += `\n`;
      }
      
      // EOD - Accomplishments
      if (eod && eod.metrics && eod.metrics.length > 0) {
        summary += `🎯 *Key Accomplishments:*\n`;
        eod.metrics.forEach(metric => {
          summary += `• *${metric.name}:* ${metric.value}\n`;
        });
      }
      
      summary += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    summary += `📎 View full details: https://bwl-ops-hub.vercel.app`;
    
    return summary;
  };


  const sendDailySummary = async () => {
    console.log("🎉 All present members completed SOD & EOD! Sending summary...");
    
    const summary = await generateDailySummary();
    
    // Send to David (DM)
    const davidSlackId = DEFAULT_SLACK_IDS["David Perlov"];
    if (davidSlackId) {
      await sendToSlack(summary, davidSlackId);
      console.log("✅ Summary sent to David");
    }
    
    // Send to #attendance-admin channel
    await sendToSlack(summary);
    console.log("✅ Summary sent to #attendance-admin");
  };








  const handleSODSubmit=async(sod)=>{
    const today = todayStr();
    
    // Save to KV backend (it handles merging with existing data)
    const updatedSubmissions = await api.saveSOD(today, sod.member, sod);
    
    if (updatedSubmissions) {
      setSodSubmissions(updatedSubmissions);
      console.log("✅ SOD saved for", sod.member, "- Total:", Object.keys(updatedSubmissions).length);
      console.log("📋 All SOD members:", Object.keys(updatedSubmissions).join(", "));
    } else {
      console.error("❌ Error saving SOD to backend");
      // Still update local state
      setSodSubmissions(prev => ({...prev, [sod.member]: sod}));
    }
    
    setShowSodForm(false);
    const ts=new Date().toISOString();
    const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    const nl=[...logs,{id:Date.now(),member:sod.member,type:"in",date:today,time,timestamp:ts}];
    saveLogs(nl);
    setConfirmed(true);
    setTimeout(()=>setConfirmed(false),2500);
    
    // Slack notifications
    const sodCount = updatedSubmissions ? Object.keys(updatedSubmissions).length : 1;
    const userSlackId = DEFAULT_SLACK_IDS[sod.member];
    
    // Personal DM to user
    if (userSlackId) {
      sendToSlack(`🟢 *You logged in at ${time}*`, userSlackId);
      sendToSlack(`✅ *Your SOD was submitted!*\n\n*Tasks for today:*\n${sod.tasks.map((t,i)=>`${i+1}. ${t.task} [${t.priority}]`).join("\n")}\n\n*Metrics:* ${sod.metrics || "None specified"}`, userSlackId);
    }
    
    // Admin summary to channel
    const tasksList = sod.tasks.map((t,i)=>`${i+1}. ${t.task} [${t.priority}]`).join("\n");
    sendToSlack(`📋 *SOD Update:* ${sod.member} submitted SOD (${sodCount}/${TEAM_OPS.length} complete)\n\n*Tasks for today:*\n${tasksList}\n\n*Metrics:* ${sod.metrics || "None specified"}`);
    
    // AUTO-IMPORT: Create tasks from SOD
    try {
      console.log(`🎯 SOD Auto-Import: Processing ${sod.tasks.length} tasks for ${sod.member}`);
      
      let createdCount = 0;
      for (const task of sod.tasks) {
        if (task.task && task.task.trim().length > 0) {
          console.log(`  → Creating task: "${task.task}" [${task.priority}]`);
          
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              task: {
                title: task.task,
                description: `Auto-imported from ${sod.member}'s SOD on ${today}`,
                assignee: sod.member,
                status: "pending",
                priority: task.priority.toLowerCase() || "medium",
                dueDate: null,
                blockedBy: null,
                createdBy: "System (SOD)",
                source: "sod"
              }
            })
          });
          
          const result = await response.json();
          if (result.success) {
            createdCount++;
            console.log(`  ✅ Task created: ${result.task.id}`);
          } else {
            console.error(`  ❌ Failed to create task:`, result.error);
          }
        }
      }
      
      console.log(`✅ Auto-Import Complete: Created ${createdCount}/${sod.tasks.length} tasks`);
    } catch (error) {
      console.error("❌ SOD Auto-Import Error:", error);
    }
  };








  const handleEODSubmit=async(eod)=>{
    const today = todayStr();
    
    // Save to KV backend (it handles merging with existing data)
    const updatedSubmissions = await api.saveEOD(today, eod.member, eod);
    
    if (updatedSubmissions) {
      setEodSubmissions(updatedSubmissions);
      console.log("✅ EOD saved for", eod.member, "- Total:", Object.keys(updatedSubmissions).length);
      console.log("📋 All EOD members:", Object.keys(updatedSubmissions).join(", "));
    } else {
      console.error("❌ Error saving EOD to backend");
      // Still update local state
      setEodSubmissions(prev => ({...prev, [eod.member]: eod}));
    }
    
    setShowEodForm(false);
    const ts=new Date().toISOString();
    const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    const nl=[...logs,{id:Date.now(),member:eod.member,type:"out",date:today,time,timestamp:ts}];
    saveLogs(nl);
    setConfirmed(true);
    setTimeout(()=>setConfirmed(false),2500);
    
    // Slack notifications
    const eodCount = updatedSubmissions ? Object.keys(updatedSubmissions).length : 1;
    const metricsText = eod.metrics.map(m => `• ${m.name}: ${m.value}`).join("\n");
    const userSlackId = DEFAULT_SLACK_IDS[eod.member];
    
    // Build comprehensive EOD summary
    let eodSummary = `📊 *EOD Report:*\n${eod.eodReport}\n\n*Today's Metrics:*\n${metricsText}`;
    if (eod.managerNotes && eod.managerNotes.trim()) {
      eodSummary += `\n\n*Manager Notes:*\n${eod.managerNotes}`;
    }
    if (eod.blockers && eod.blockers.trim()) {
      eodSummary += `\n\n🚧 *Blockers:*\n${eod.blockers}`;
    }
    
    // Personal DM to user
    if (userSlackId) {
      sendToSlack(`🔴 *You logged out at ${time}*`, userSlackId);
      sendToSlack(`✅ *Your EOD was submitted!*\n\n${eodSummary}\n\nGreat work today! 🎉`, userSlackId);
    }
    
    // Admin summary to channel
    sendToSlack(`📊 *EOD Update:* ${eod.member} submitted EOD (${eodCount} today)\n\n${eodSummary}`);
    
    // AUTO-COMPLETE: Mark tasks done from EOD
    try {
      console.log(`🎯 EOD Auto-Complete: Checking tasks for ${eod.member}`);
      
      // Get all tasks for this member
      const tasksRes = await fetch("/api/tasks");
      const tasksData = await tasksRes.json();
      
      if (tasksData.success) {
        const userTasks = tasksData.tasks.filter(t => 
          t.assignee === eod.member && 
          t.status !== "done"
        );
        
        console.log(`  Found ${userTasks.length} pending tasks for ${eod.member}`);
        
        const eodText = (eod.eodReport || "").toLowerCase();
        const completionIndicators = [
          "completed", "finished", "done", "shipped", "delivered", 
          "sent", "submitted", "✓", "✅", "☑", "accomplished"
        ];
        
        let completedCount = 0;
        
        // Check each task if it's mentioned as completed in EOD
        for (const task of userTasks) {
          const taskTitle = task.title.toLowerCase();
          
          // Check if task title appears in EOD
          if (eodText.includes(taskTitle)) {
            // Check if mentioned with completion indicator
            const isCompleted = completionIndicators.some(indicator => {
              const regex = new RegExp(`${indicator}.*${taskTitle}|${taskTitle}.*${indicator}`, 'i');
              return eodText.match(regex);
            });
            
            if (isCompleted) {
              console.log(`  → Marking done: "${task.title}"`);
              
              // Mark task as done
              const updateRes = await fetch("/api/tasks", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  taskId: task.id, 
                  updates: { 
                    status: "done",
                    completedAt: new Date().toISOString()
                  }
                })
              });
              
              const updateResult = await updateRes.json();
              if (updateResult.success) {
                completedCount++;
                console.log(`  ✅ Task marked as done: ${task.id}`);
              } else {
                console.error(`  ❌ Failed to mark done:`, updateResult.error);
              }
            }
          }
        }
        
        console.log(`✅ Auto-Complete: Marked ${completedCount}/${userTasks.length} tasks as done`);
      } else {
        console.error("❌ Failed to fetch tasks:", tasksData.error);
      }
    } catch (error) {
      console.error("❌ EOD Auto-Complete Error:", error);
    }
    
    // Check if all present members completed both SOD & EOD
    setTimeout(async () => {
      const allCompleted = await checkAllCompleted();
      if (allCompleted) {
        await sendDailySummary();
      }
    }, 1000); // Small delay to ensure state updates
  };








  const deleteLog=(id)=>{const nl=logs.filter(l=>l.id!==id);saveLogs(nl);};
  const statusColor=(s)=>({in:T.green,out:T.orange,absent:T.red}[s]||T.gray);
  const statusLabel=(s)=>({in:"LOGGED IN",out:"LOGGED OUT",absent:"ABSENT"}[s]||s);








  if(loading) return <LoadingScreen />;








  const isCurrentUserAdmin=isAdminMode;
  const viewMembers=isCurrentUserAdmin?TEAM_OPS:[currentUser];








  // Calculate all variables needed for rendering (BEFORE any return statements)
  const memberStatus=selectedMember?getStatus(selectedMember):"absent";
  const isIn=memberStatus==="in";
  const hoursToday=selectedMember?getTotalHours(selectedMember,todayStr()):0;
  const weekDates=getWeekDates();
  const nowTimeStr=now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true});
  const presentToday=TEAM_OPS.filter(m=>getStatus(m)!=="absent").length;
  const lateToday=TEAM_OPS.filter(m=>isLate(m)).length;
  const inNow=TEAM_OPS.filter(m=>getStatus(m)==="in").length;
  const sodCount=Object.keys(sodSubmissions).length;
  const eodCount=Object.keys(eodSubmissions).length;
  
  // Weekly summary calculations for admin
  const weeklyTotal=isCurrentUserAdmin?weekDates.reduce((sum,d)=>sum+TEAM_OPS.reduce((s,m)=>s+parseFloat(getTotalHours(m,d)),0),0):0;
  const avgHoursPerDay=isCurrentUserAdmin?(weeklyTotal/(weekDates.length*TEAM_OPS.length)).toFixed(1):0;
  const lateArrivals=isCurrentUserAdmin?weekDates.reduce((s,d)=>s+TEAM_OPS.filter(m=>isLate(m,d)).length,0):0;
  const perfectAttendance=isCurrentUserAdmin?TEAM_OPS.filter(m=>weekDates.every(d=>!isLate(m,d)&&logs.some(l=>l.member===m&&l.date===d&&l.type==="in"))).length:0;








  // Admin Access Modal
  if(showAdminAccess) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:480}}>
        <Card style={{padding:32,textAlign:"center",border:`3px solid ${adminError?T.red:T.orange}`}}>
          <div style={{fontSize:48,marginBottom:20}}>🛡️</div>
          <div style={{fontSize:20,fontWeight:700,fontFamily:T.font,marginBottom:6}}>Admin Access</div>
          <div style={{fontSize:12,color:T.grayLight,fontFamily:T.mono,marginBottom:24,letterSpacing:1}}>
            Enter admin password to continue
          </div>
          <div style={{background:T.black,padding:"20px 24px",marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:3,marginBottom:10}}>ADMIN ZONE</div>
            <div style={{fontSize:10,color:"#666",fontFamily:T.mono,letterSpacing:1}}>Manager-only access</div>
          </div>
          <input 
            type="password" 
            value={adminPassword} 
            onChange={e=>setAdminPassword(e.target.value)} 
            onKeyDown={e=>e.key==="Enter"&&adminPassword&&verifyAdminPassword()}
            placeholder="●●●●●●●●"
            autoFocus
            style={{width:"100%",background:T.black,border:`2px solid ${adminError?T.red:T.black}`,color:"#fff",fontSize:16,padding:"14px 18px",outline:"none",fontFamily:T.mono,letterSpacing:4,textAlign:"center",marginBottom:16}} />
          {adminError&&<div style={{fontSize:12,color:T.red,fontFamily:T.mono,marginBottom:12,letterSpacing:1,fontWeight:700}}>✗ INCORRECT PASSWORD</div>}
          <button onClick={verifyAdminPassword} disabled={!adminPassword}
            style={{width:"100%",padding:"14px",background:adminPassword?T.orange:"#E5E0D8",color:adminPassword?"#fff":T.gray,border:"none",fontSize:13,fontWeight:700,cursor:adminPassword?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font,marginBottom:12}}>
            {adminPassword?"UNLOCK ADMIN →":"ENTER PASSWORD"}
          </button>
          <button onClick={()=>{setShowAdminAccess(false);setAdminPassword("");setAdminError(false);}}
            style={{width:"100%",padding:"12px",background:"transparent",color:T.gray,border:`2px solid ${T.black}`,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.mono}}>
            ← BACK
          </button>
        </Card>
      </div>
    </div>
  );








  // User selection screen
  if(showUserSelect||!currentUser) return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{padding:20}}>
        <CardLabel color={T.orange}>SELECT YOUR NAME TO CONTINUE</CardLabel>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:16}}>
          {TEAM_OPS.map(m=>{
            const hasSod=hasSodToday(m);
            const admin=isAdmin(m);
            return (
              <button key={m} onClick={()=>{setCurrentUser(m);setSelectedMember(m);setShowUserSelect(false);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"14px 18px",borderRadius:0,background:T.bg,color:T.darkGray,border:`2px solid ${T.black}`,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,transition:"all 0.15s",position:"relative"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.orange}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.black}>
                {admin&&<div style={{position:"absolute",top:4,right:4,fontSize:9,fontWeight:700,color:T.orange,fontFamily:T.mono}}>🔑</div>}
                <Avatar name={m} size={48} muted={!hasSod} />
                <span>{m}</span>
                <span style={{width:10,height:10,borderRadius:"50%",background:hasSod?statusColor(getStatus(m)):T.red,border:"1px solid rgba(0,0,0,0.2)"}} />
              </button>
            );
          })}
        </div>
      </Card>
      <Card style={{padding:"16px 20px",textAlign:"center",cursor:"pointer",border:`2px solid ${T.black}`}} hover onClick={()=>setShowAdminAccess(true)}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:18}}>🛡️</span>
          <div style={{fontSize:13,fontWeight:700,fontFamily:T.mono,letterSpacing:2,color:T.orange}}>ADMIN ACCESS</div>
        </div>
      </Card>
    </div>
  );








  if(showSodForm&&selectedMember) return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <NotificationCenter notifications={notifications} onDismiss={id=>setNotifications(prev=>prev.filter(n=>n.id!==id))} />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,fontFamily:T.font}}>{selectedMember}</div>
          <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Submit SOD to unlock Log In</div>
        </div>
        <button onClick={()=>setShowSodForm(false)} style={{background:"none",border:`2px solid ${T.black}`,padding:"6px 14px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1,color:T.gray}}>← BACK</button>
      </div>
      <SODForm member={selectedMember} onSubmit={handleSODSubmit} />
    </div>
  );








  if(showEodForm&&selectedMember) return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <NotificationCenter notifications={notifications} onDismiss={id=>setNotifications(prev=>prev.filter(n=>n.id!==id))} />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,fontFamily:T.font}}>{selectedMember}</div>
          <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Submit EOD and Metrics to unlock Log Out</div>
        </div>
        <button onClick={()=>setShowEodForm(false)} style={{background:"none",border:`2px solid ${T.black}`,padding:"6px 14px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1,color:T.gray}}>← BACK</button>
      </div>
      <EODForm member={selectedMember} onSubmit={handleEODSubmit} />
    </div>
  );








  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}} id="attendance-main">
      <NotificationCenter notifications={notifications} onDismiss={id=>setNotifications(prev=>prev.filter(n=>n.id!==id))} />








      {/* STATS BAR */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {isCurrentUserAdmin ? (
          [["IN NOW",inNow,T.green],["SOD SUBMITTED",sodCount,sodCount===TEAM_OPS.length?T.green:T.yellow],["EOD SUBMITTED",eodCount,eodCount===inNow?T.green:T.red],["LATE TODAY",lateToday,lateToday>0?T.red:T.green]].map(([l,v,c])=>(
            <div key={l} style={{background:T.black,border:`2px solid ${T.black}`,padding:"14px 18px"}}>
              <div style={{fontSize:9,color:"#666",fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>{l}</div>
              <div style={{fontSize:28,fontWeight:900,color:c,fontFamily:T.font,lineHeight:1}}>{v}</div>
              <div style={{fontSize:9,color:"#555",fontFamily:T.mono,marginTop:4}}>of {TEAM_OPS.length} team</div>
            </div>
          ))
        ) : (
          [["STATUS",statusLabel(memberStatus),statusColor(memberStatus)],["HOURS TODAY",hoursToday+"h",T.orange],["SOD",hasSodToday(currentUser)?"✓ SUBMITTED":"PENDING",hasSodToday(currentUser)?T.green:T.red],["EOD",hasEodToday(currentUser)?"✓ SUBMITTED":"PENDING",hasEodToday(currentUser)?T.green:T.red]].map(([l,v,c])=>(
            <div key={l} style={{background:T.black,border:`2px solid ${T.black}`,padding:"14px 18px"}}>
              <div style={{fontSize:9,color:"#666",fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>{l}</div>
              <div style={{fontSize:24,fontWeight:900,color:c,fontFamily:T.font,lineHeight:1}}>{v}</div>
            </div>
          ))
        )}
      </div>








      {/* SWITCH USER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:12,color:T.grayLight,fontFamily:T.mono}}>Logged in as: <strong>{currentUser}</strong>{isCurrentUserAdmin&&<span style={{color:T.orange,marginLeft:6}}>🔑 ADMIN</span>}</div>
          {notificationsEnabled && <Badge label="🔔 NOTIF ON" color={T.green} />}
        </div>
        <div style={{display:"flex",gap:8}}>
          {isCurrentUserAdmin && (
            <button onClick={async ()=>{
              try {
                await sendToSlack(`🔔 *Slack Integration Test*\nTest message from ${currentUser}`);
                alert(`✅ Test message sent!\n\nCheck #attendance-admin channel in Slack.`);
              } catch (error) {
                alert(`❌ Failed to send test message.\n\nMake sure VITE_SLACK_BOT_TOKEN is configured in Vercel environment variables.`);
              }
            }}
              style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:T.purple,color:"#fff",border:`2px solid ${T.black}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
              💬 TEST SLACK
            </button>
          )}
          {!isCurrentUserAdmin ? (
            <button onClick={()=>setShowAdminAccess(true)} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>🛡️ ADMIN</button>
          ) : (
            <button onClick={()=>{setIsAdminMode(false);setSelectedMember(currentUser);}} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:T.red,color:"#fff",border:`2px solid ${T.red}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>← EXIT ADMIN</button>
          )}
          <button onClick={()=>{setCurrentUser(null);setSelectedMember(null);setShowUserSelect(true);setIsAdminMode(false);}} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:T.bg,color:T.darkGray,border:`2px solid ${T.black}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SWITCH USER</button>
        </div>
      </div>








      {/* PENDING SOD WARNING */}
      {sodCount < TEAM_OPS.length && isCurrentUserAdmin && (
        <div style={{background:"#fef2f2",border:`2px solid ${T.red}`,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.red,fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>⚠ PENDING SOD — CANNOT LOG IN YET</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TEAM_OPS.filter(m=>!hasSodToday(m)).map(m=>(
              <div key={m} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",border:`1px solid ${T.red}`,padding:"3px 10px"}}>
                <Avatar name={m} size={18} muted />
                <span style={{fontSize:11,fontWeight:600,color:T.red}}>{m.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}








      {/* MEMBER SELECTOR (ADMIN sees all, non-admin sees only self) */}
      {isCurrentUserAdmin && (
        <Card style={{padding:20}}>
          <CardLabel color={T.orange}>SELECT TEAM MEMBER</CardLabel>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
            {TEAM_OPS.map(m=>{
              const s=getStatus(m);
              const hasSod=hasSodToday(m);
              return (
                <button key={m} onClick={()=>{setSelectedMember(m);setConfirmed(false);setShowSodForm(false);}}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:0,background:selectedMember===m?T.black:T.bg,color:selectedMember===m?"#fff":T.darkGray,border:`2px solid ${selectedMember===m?T.black:T.borderDark}`,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,transition:"all 0.15s"}}>
                  <Avatar name={m} size={24} muted={!hasSod} />
                  {m.split(" ")[0]}
                  <span style={{width:8,height:8,borderRadius:"50%",background:hasSod?statusColor(s):T.red,display:"inline-block",marginLeft:2,border:"1px solid rgba(0,0,0,0.2)"}} title={hasSod?"SOD submitted":"No SOD yet"} />
                </button>
              );
            })}
          </div>
          <div style={{marginTop:10,fontSize:10,color:T.grayLight,fontFamily:T.mono}}>🔴 Red dot = no SOD submitted yet · Cannot log in without SOD</div>
        </Card>
      )}








      {/* LOG IN/OUT CARD */}
      {selectedMember&&(
        <Card style={{padding:28,border:`3px solid ${statusColor(memberStatus)}`,textAlign:"center",background:isIn?"#F0FDF4":memberStatus==="out"?"#FFF7F5":"#FFF"}}>
          <Avatar name={selectedMember} size={64} />
          <div style={{fontSize:20,fontWeight:700,marginTop:12,fontFamily:T.font}}>{selectedMember}</div>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <Badge label={statusLabel(memberStatus)} color={statusColor(memberStatus)} />
            {hasSodToday(selectedMember)&&<Badge label={`SOD @ ${sodSubmissions[selectedMember]?.submittedAt}`} color={T.green} />}
            {!hasSodToday(selectedMember)&&<Badge label="NO SOD YET" color={T.red} />}
            {hasEodToday(selectedMember)&&<Badge label={`EOD @ ${eodSubmissions[selectedMember]?.submittedAt}`} color={T.green} />}
            {!hasEodToday(selectedMember)&&isIn&&<Badge label="NO EOD YET" color={T.red} />}
            {isLate(selectedMember)&&memberStatus==="in"&&<Badge label="LATE ARRIVAL" color={T.red} />}
          </div>
          <div style={{fontSize:13,color:T.grayLight,fontFamily:T.mono,marginTop:10}}>
            {nowTimeStr} · Shift {SHIFT_START}–{SHIFT_END}
          </div>
          {memberStatus!=="absent"&&(
            <div style={{fontSize:22,fontWeight:900,color:T.orange,fontFamily:T.font,margin:"10px 0"}}>{hoursToday} hrs logged today</div>
          )}
          {confirmed&&(
            <div style={{fontSize:13,fontWeight:700,color:T.green,fontFamily:T.mono,letterSpacing:2,margin:"8px 0",animation:"pulse 0.6s ease"}}>
              ✓ {isIn?"LOGGED IN":"LOGGED OUT"} SUCCESSFULLY
            </div>
          )}








          {!hasSodToday(selectedMember)&&!isIn ? (
            <div style={{marginTop:14}}>
              <div style={{fontSize:12,color:T.red,fontFamily:T.mono,fontWeight:700,letterSpacing:1,marginBottom:10}}>
                🔒 SUBMIT SOD FIRST TO LOG IN
              </div>
              <button onClick={()=>setShowSodForm(true)}
                style={{width:"100%",maxWidth:340,padding:"16px",borderRadius:0,background:T.orange,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
                📋  SUBMIT SOD
              </button>
            </div>
          ) : !hasEodToday(selectedMember)&&isIn ? (
            <div style={{marginTop:14}}>
              <div style={{fontSize:12,color:T.red,fontFamily:T.mono,fontWeight:700,letterSpacing:1,marginBottom:10}}>
                🔒 SUBMIT EOD & METRICS TO LOG OUT
              </div>
              <button onClick={()=>setShowEodForm(true)}
                style={{width:"100%",maxWidth:340,padding:"16px",borderRadius:0,background:T.red,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
                📊  SUBMIT EOD & METRICS
              </button>
            </div>
          ) : (
            <button onClick={logAction}
              style={{width:"100%",maxWidth:340,padding:"18px",borderRadius:0,background:isIn?T.red:T.green,color:"#fff",border:"none",fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:3,fontFamily:T.font,marginTop:14,transition:"opacity 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              {isIn?"🔴  LOG OUT":"🟢  LOG IN"}
            </button>
          )}








          {memberStatus!=="absent"&&(
            <div style={{marginTop:14,fontSize:11,color:T.grayLight,fontFamily:T.mono}}>
              {getMemberToday(selectedMember).map((l,i)=>(
                <span key={i} style={{marginRight:12}}>{l.type==="in"?"↑ IN":"↓ OUT"} {l.time}{l.auto?" (auto)":""}</span>
              ))}
            </div>
          )}
        </Card>
      )}








      {/* VIEW TABS */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["today","📋 TODAY"],["sod","📝 SOD TODAY"],["eod","📊 EOD TODAY"],["history","🗓 HISTORY"],["weekly","📊 WEEKLY"],["performance","🎯 PERFORMANCE"],...(isCurrentUserAdmin?[["kpis","📊 LIVE KPIs"],["analytics","📈 ANALYTICS"],["reports","📊 REPORTS"],["reviews","📝 REVIEWS"]]:[] )].map(([v,l])=>(
            <Pill key={v} label={l} active={view===v} onClick={()=>setView(v)} />
          ))}
        </div>
        {isCurrentUserAdmin && (
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowExportMenu(!showExportMenu)}
              style={{padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,letterSpacing:1.5,background:T.green,color:"#fff",border:`2px solid ${T.black}`,cursor:"pointer",fontFamily:T.mono,textTransform:"uppercase"}}>
              💾 EXPORT
            </button>
            {showExportMenu && (
              <div style={{position:"absolute",right:0,top:40,background:T.surface,border:`2px solid ${T.black}`,padding:8,minWidth:180,zIndex:100}}>
                <button onClick={()=>{exportAttendanceCSV(logs,getWeekDates(),TEAM_OPS);setShowExportMenu(false);}}
                  style={{width:"100%",padding:"8px 12px",background:"transparent",color:T.black,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",marginBottom:4,fontFamily:T.mono}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  📄 Weekly CSV
                </button>
                <button onClick={()=>{
                  const data = [
                    ["Date","Member","SOD Tasks","EOD Metrics","Hours Worked"],
                    ...TEAM_OPS.map(m => {
                      const sod = sodSubmissions[m];
                      const eod = eodSubmissions[m];
                      const hours = getTotalHours(m,todayStr());
                      return [todayStr(),m,sod?sod.tasks.length:0,eod?eod.metrics.length:0,hours];
                    })
                  ];
                  exportToCSV(data,`daily-report-${todayStr()}.csv`);
                  setShowExportMenu(false);
                }}
                  style={{width:"100%",padding:"8px 12px",background:"transparent",color:T.black,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",marginBottom:4,fontFamily:T.mono}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  📊 Daily Report CSV
                </button>
                <button onClick={()=>{alert("PDF export will open print dialog");exportToPDF("attendance-main","attendance-report.pdf");setShowExportMenu(false);}}
                  style={{width:"100%",padding:"8px 12px",background:"transparent",color:T.black,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:T.mono}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  📑 PDF Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>








      {/* ADMIN REPORTS VIEW */}
      {view==="reports"&&isCurrentUserAdmin&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[["TOTAL HOURS",weeklyTotal.toFixed(1)+"h",T.purple],["AVG HRS/DAY",avgHoursPerDay+"h",T.green],["LATE ARRIVALS",lateArrivals,lateArrivals>0?T.red:T.green],["PERFECT ATTENDANCE",perfectAttendance,T.green]].map(([l,v,c])=>(
              <div key={l} style={{background:T.black,padding:"14px 18px"}}>
                <div style={{fontSize:9,color:"#666",fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>{l}</div>
                <div style={{fontSize:24,fontWeight:900,color:c,fontFamily:T.font,lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
          
          <Card>
            <div style={{padding:"12px 18px",borderBottom:`2px solid ${T.black}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <CardLabel color={T.orange}>WEEKLY SUMMARY — {weekLabel()}</CardLabel>
              <button onClick={()=>exportAttendanceCSV(logs,weekDates,TEAM_OPS)} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:T.green,color:"#fff",border:`2px solid ${T.green}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>EXPORT CSV</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg,borderBottom:`2px solid ${T.black}`}}>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,fontFamily:T.mono,color:T.darkGray}}>MEMBER</th>
                  {["MON","TUE","WED","THU","FRI"].map(d=><th key={d} style={{padding:"10px 14px",textAlign:"center",fontSize:10,fontWeight:700,fontFamily:T.mono,color:T.darkGray}}>{d}</th>)}
                  <th style={{padding:"10px 14px",textAlign:"center",fontSize:10,fontWeight:700,fontFamily:T.mono,color:T.darkGray}}>TOTAL</th>
                  <th style={{padding:"10px 14px",textAlign:"center",fontSize:10,fontWeight:700,fontFamily:T.mono,color:T.darkGray}}>STATUS</th>
                </tr></thead>
                <tbody>
                  {TEAM_OPS.map(member=>{
                    const hours=weekDates.map(d=>getTotalHours(member,d));
                    const total=hours.reduce((a,h)=>a+parseFloat(h),0).toFixed(1);
                    const lateDays=weekDates.filter(d=>isLate(member,d)).length;
                    const absentDays=weekDates.filter(d=>!logs.some(l=>l.member===member&&l.date===d&&l.type==="in")).length;
                    return (
                      <tr key={member} style={{borderBottom:`1px solid ${T.border}`}}>
                        <td style={{padding:"10px 14px",fontSize:12,fontWeight:600}}>{member}</td>
                        {hours.map((h,i)=>{
                          const date=weekDates[i];
                          const late=isLate(member,date);
                          const absent=parseFloat(h)===0;
                          return <td key={i} style={{padding:"10px 14px",textAlign:"center",fontSize:11,fontWeight:700,color:absent?T.gray:late?T.yellow:T.green}}>{absent?"—":h+"h"}</td>;
                        })}
                        <td style={{padding:"10px 14px",textAlign:"center",fontSize:12,fontWeight:800,color:T.orange}}>{total}h</td>
                        <td style={{padding:"10px 14px",textAlign:"center"}}>
                          {absentDays>0&&<Badge label={`${absentDays}x ABSENT`} color={T.gray} />}
                          {lateDays>0&&<Badge label={`${lateDays}x LATE`} color={T.red} />}
                          {absentDays===0&&lateDays===0&&<Badge label="✓" color={T.green} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>








          <Card style={{padding:18}}>
            <CardLabel color={T.yellow}>OVERTIME TRACKER (8+ hr days)</CardLabel>
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
              {TEAM_OPS.map(member=>{
                const otDays=weekDates.filter(d=>parseFloat(getTotalHours(member,d))>=8);
                const otHours=otDays.reduce((s,d)=>s+(parseFloat(getTotalHours(member,d))-8),0).toFixed(1);
                if(otDays.length===0) return null;
                return (
                  <div key={member} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.bg,border:`2px solid ${T.black}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Avatar name={member} size={28} />
                      <span style={{fontSize:13,fontWeight:600}}>{member}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:T.grayLight,fontFamily:T.mono}}>{otDays.length} days</span>
                      <span style={{fontSize:16,fontWeight:800,color:T.yellow,fontFamily:T.font}}>+{otHours}h</span>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </Card>
        </div>
      )}








      {/* TODAY VIEW */}
      {view==="today"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {viewMembers.map(member=>{
            const status=getStatus(member);
            const late=isLate(member);
            const hours=getTotalHours(member,todayStr());
            const tl=getMemberToday(member);
            const firstIn=tl.find(l=>l.type==="in");
            const lastOut=[...tl].reverse().find(l=>l.type==="out");
            const hasSod=hasSodToday(member);
            return (
              <Card key={member} style={{padding:16,borderLeft:`4px solid ${hasSod?statusColor(status):T.red}`}} hover>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Avatar name={member} muted={!hasSod} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{member}</div>
                    <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginTop:3,display:"flex",gap:12,flexWrap:"wrap"}}>
                      {firstIn&&<span>IN: {firstIn.time}</span>}
                      {lastOut&&<span>OUT: {lastOut.time}</span>}
                      {!tl.length&&<span>No logs today</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {status!=="absent"&&<span style={{fontSize:13,fontWeight:800,color:T.orange,fontFamily:T.font}}>{hours}h</span>}
                      {!hasSod&&<Badge label="NO SOD" color={T.red} />}
                      {late&&<Badge label="LATE" color={T.red} />}
                      <Badge label={statusLabel(status)} color={statusColor(status)} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}








      {/* SOD TODAY VIEW */}
      {view==="sod"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,letterSpacing:1,marginBottom:4}}>TODAY'S SOD SUBMISSIONS — {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
          {viewMembers.map(member=>{
            const sod=sodSubmissions[member];
            return (
              <div key={member}>
                <Card style={{overflow:"hidden",borderLeft:`4px solid ${sod?T.green:T.red}`}}>
                  <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Avatar name={member} size={32} muted={!sod} />
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{member}</div>
                        {sod&&<div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Submitted @ {sod.submittedAt} · {sod.tasks.length} tasks</div>}
                      </div>
                    </div>
                    {sod ? <Badge label={`SOD ✓`} color={T.green} /> : <Badge label="PENDING" color={T.red} />}
                  </div>
                  {sod&&(
                    <div style={{borderTop:`1px solid ${T.border}`,padding:"10px 16px",background:T.bg,display:"flex",flexDirection:"column",gap:6}}>
                      {sod.tasks.map((t,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:T.surface,borderLeft:`3px solid ${priorityColor(t.priority)}`}}>
                          <div style={{flex:1,fontSize:12,color:T.black}}>{t.task}</div>
                          <Badge label={t.priority} color={priorityColor(t.priority)} />
                          <span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>{t.eta}</span>
                        </div>
                      ))}
                      {sod.metrics&&(
                        <div style={{padding:"7px 12px",background:"#f0fdf4",borderLeft:`3px solid ${T.green}`,fontSize:12,color:T.darkGray}}>
                          <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.green,display:"block",marginBottom:2}}>METRICS TARGET</span>
                          {sod.metrics}
                        </div>
                      )}
                      {sod.blockers&&(
                        <div style={{padding:"7px 12px",background:"#fff8f0",borderLeft:`3px solid ${T.orange}`,fontSize:12,color:T.darkGray}}>
                          <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.orange,display:"block",marginBottom:2}}>BLOCKERS</span>
                          {sod.blockers}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
                {isCurrentUserAdmin && sod && (
                  <div style={{marginTop:8}}>
                    <CommentsPanel member={member} date={todayStr()} type="sod" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}








      {/* EOD TODAY VIEW */}
      {view==="eod"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,letterSpacing:1,marginBottom:4}}>TODAY'S EOD SUBMISSIONS — {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
          {viewMembers.map(member=>{
            const eod=eodSubmissions[member];
            const kpiData=KPI_DATA[member];
            return (
              <div key={member}>
                <Card style={{overflow:"hidden",borderLeft:`4px solid ${eod?T.green:T.red}`}}>
                  <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Avatar name={member} size={32} muted={!eod} />
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{member}</div>
                        {eod&&<div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Submitted @ {eod.submittedAt} · {eod.metrics.length} metrics</div>}
                      </div>
                    </div>
                    {eod ? <Badge label={`EOD ✓`} color={T.green} /> : <Badge label="PENDING" color={T.red} />}
                  </div>
                  {eod&&(
                    <div style={{borderTop:`1px solid ${T.border}`,padding:"10px 16px",background:T.bg,display:"flex",flexDirection:"column",gap:8}}>
                      {eod.eodReport&&(
                        <div style={{padding:"10px 14px",background:T.surface,borderLeft:`3px solid ${T.orange}`}}>
                          <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.orange,display:"block",marginBottom:6}}>EOD REPORT</span>
                          <pre style={{fontSize:12,color:T.darkGray,fontFamily:T.mono,lineHeight:1.6,margin:0,whiteSpace:"pre-wrap"}}>{eod.eodReport}</pre>
                        </div>
                      )}
                      {kpiData && kpiData.categories.map((cat,ci)=>{
                        const catMetrics=eod.metrics.filter(m=>cat.metrics.some(cm=>cm.name===m.name));
                        if(catMetrics.length===0) return null;
                        return (
                          <div key={ci}>
                            <div style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.grayLight,letterSpacing:2,marginBottom:6,marginLeft:2}}>{cat.name.toUpperCase()}</div>
                            {catMetrics.map((m,mi)=>(
                              <div key={mi} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",background:T.surface,borderLeft:`3px solid ${kpiData.color}`,marginBottom:4}}>
                                <div>
                                  <div style={{fontSize:12,fontWeight:600,color:T.black}}>{m.name}</div>
                                  <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Target: {m.target}</div>
                                </div>
                                <div style={{fontSize:15,fontWeight:800,color:kpiData.color,fontFamily:T.font}}>{m.value}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
                {isCurrentUserAdmin && eod && kpiData && (
                  <>
                    <div style={{marginTop:8}}>
                      <CommentsPanel member={member} date={todayStr()} type="eod" />
                    </div>
                    <AIInsightsPanel 
                      member={member} 
                      memberData={{
                        name: member,
                        role: kpiData.role,
                        metrics: eod.metrics
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}








      {/* HISTORY VIEW */}
      {view==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[...new Set(logs.map(l=>l.date))].sort((a,b)=>b.localeCompare(a)).slice(0,21).map(date=>{
            const membersWithLogs=viewMembers.filter(m=>logs.some(l=>l.member===m&&l.date===date));
            return (
              <Card key={date}>
                <div style={{background:T.black,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#fff",fontFamily:T.mono}}>{new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
                  <span style={{fontSize:10,color:T.orange,fontFamily:T.mono}}>{membersWithLogs.length}/{viewMembers.length} PRESENT</span>
                </div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
                  {viewMembers.map(member=>{
                    const dl=logs.filter(l=>l.member===member&&l.date===date);
                    const firstIn=dl.find(l=>l.type==="in");
                    const lastOut=[...dl].reverse().find(l=>l.type==="out");
                    const hrs=getTotalHours(member,date);
                    const late=isLate(member,date);
                    if(!dl.length) return (
                      <div key={member} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${T.border}`,opacity:0.4}}>
                        <Avatar name={member} size={22} muted /><span style={{flex:1,fontSize:12,fontWeight:600}}>{member}</span><Badge label="ABSENT" color={T.gray} />
                      </div>
                    );
                    return (
                      <div key={member} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
                        <Avatar name={member} size={22} />
                        <span style={{flex:1,fontSize:12,fontWeight:600}}>{member}</span>
                        <span style={{fontSize:11,color:T.grayLight,fontFamily:T.mono}}>IN: {firstIn?.time||"—"}</span>
                        <span style={{fontSize:11,color:T.grayLight,fontFamily:T.mono}}>OUT: {lastOut?.time||"—"}</span>
                        <span style={{fontSize:12,fontWeight:800,color:T.orange,fontFamily:T.font,minWidth:32,textAlign:"right"}}>{hrs}h</span>
                        {late&&<Badge label="LATE" color={T.red} />}
                        {isCurrentUserAdmin&&<button onClick={()=>saveLogs(logs.filter(l=>!dl.map(x=>x.id).includes(l.id)))} style={{background:"none",border:"none",cursor:"pointer",color:T.grayLight,fontSize:14,padding:"0 4px"}}>🗑</button>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
          {logs.length===0&&<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No attendance logs yet</div></Card>}
        </div>
      )}








      {/* WEEKLY SUMMARY */}
      {view==="weekly"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Card style={{background:T.black,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><CardLabel color={T.orange}>{weekLabel()}</CardLabel><div style={{fontSize:11,color:"#666",fontFamily:T.mono,marginTop:4}}>Mon–Fri · Shift {SHIFT_START}–{SHIFT_END}</div></div>
          </Card>
          {viewMembers.map(member=>{
            const presentDays=weekDates.filter(d=>logs.some(l=>l.member===member&&l.date===d&&l.type==="in"));
            const lateDays=weekDates.filter(d=>isLate(member,d));
            const absentDays=weekDates.filter(d=>!logs.some(l=>l.member===member&&l.date===d&&l.type==="in"));
            const totalHrs=weekDates.reduce((a,d)=>a+parseFloat(getTotalHours(member,d)),0).toFixed(1);
            const pct=Math.round((presentDays.length/5)*100);
            return (
              <Card key={member} style={{padding:18}} hover>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                  <Avatar name={member} size={44} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15}}>{member}</div>
                    <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginTop:3}}>{presentDays.length}/5 days · {totalHrs} hrs total</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {lateDays.length>0&&<Badge label={`${lateDays.length}x LATE`} color={T.red} />}
                    {absentDays.length>0&&<Badge label={`${absentDays.length}x ABSENT`} color={T.gray} />}
                    <div style={{fontSize:26,fontWeight:900,color:pct>=80?T.green:pct>=60?T.yellow:T.red,fontFamily:T.font,lineHeight:1,minWidth:44,textAlign:"right"}}>{pct}%</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  {weekDates.map((d,i)=>{
                    const present=presentDays.includes(d);
                    const late=lateDays.includes(d);
                    const isToday=d===todayStr();
                    const dayLogs=logs.filter(l=>l.member===member&&l.date===d);
                    const firstIn=dayLogs.find(l=>l.type==="in");
                    const hrs=getTotalHours(member,d);
                    const dayName=["MON","TUE","WED","THU","FRI"][i];
                    return (
                      <div key={d} style={{flex:1,textAlign:"center"}}>
                        <div style={{fontSize:9,color:isToday?T.orange:T.grayLight,fontFamily:T.mono,marginBottom:4,fontWeight:isToday?700:400}}>{dayName}</div>
                        <div style={{height:36,background:present?(late?T.yellow:T.green):T.border,border:`2px solid ${isToday?T.orange:present?(late?T.yellow:T.green):T.borderDark}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {present&&<span style={{fontSize:10,fontWeight:900,color:"#fff"}}>{hrs}h</span>}
                        </div>
                        {present&&<div style={{fontSize:8,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>{firstIn?.time||""}</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:12,marginTop:10}}>
                  <span style={{fontSize:10,color:T.green,fontFamily:T.mono}}>■ On Time</span>
                  <span style={{fontSize:10,color:T.yellow,fontFamily:T.mono}}>■ Late</span>
                  <span style={{fontSize:10,color:T.border,fontFamily:T.mono}}>■ Absent</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}








      {/* WEEKLY PERFORMANCE DASHBOARD */}
      {view==="performance"&&isCurrentUserAdmin&&(
        <WeeklyPerformanceDashboard logs={logs} sodSubmissions={sodSubmissions} eodSubmissions={eodSubmissions} />
      )}








      {/* LIVE KPI DASHBOARD */}
      {view==="kpis"&&isCurrentUserAdmin&&(
        <LiveKPIDashboard eodSubmissions={eodSubmissions} />
      )}








      {/* ADVANCED ANALYTICS */}
      {view==="analytics"&&isCurrentUserAdmin&&(
        <AdvancedAnalytics logs={logs} sodSubmissions={sodSubmissions} eodSubmissions={eodSubmissions} />
      )}








      {/* AUTO PERFORMANCE REVIEWS */}
      {view==="reviews"&&isCurrentUserAdmin&&(
        <AutoPerformanceReviews logs={logs} sodSubmissions={sodSubmissions} eodSubmissions={eodSubmissions} />
      )}
    </div>
  );
}








// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ navigate, sendToSlack }) {
  const date=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase();
  const getGreeting=()=>{const now=new Date();const estHour=parseInt(now.toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",hour12:false}));if(estHour>=5&&estHour<12) return "MORNING.";if(estHour>=12&&estHour<17) return "AFTERNOON.";if(estHour>=17&&estHour<21) return "EVENING.";return "NIGHT.";};
  const greeting=getGreeting();
  const [announcements,setAnnouncements]=useState([]);
  const [isLoadingAnnouncements,setIsLoadingAnnouncements]=useState(true);
  const [editing,setEditing]=useState(null);const [newNote,setNewNote]=useState("");const [showInput,setShowInput]=useState(false);const [authorName,setAuthorName]=useState("Kristine");
  
  // Load announcements from storage on mount
  useEffect(()=>{
    const loadAnnouncements = async () => {
      try {
        const loadedAnnouncements = await api.getAnnouncements();
        
        if (loadedAnnouncements.length > 0) {
          setAnnouncements(loadedAnnouncements);
          console.log("✅ Loaded announcements from API:", loadedAnnouncements.length);
        } else {
          // Try migrating from localStorage
          const backup = localStorage.getItem("announcements-backup");
          if (backup) {
            const migratedAnnouncements = JSON.parse(backup);
            setAnnouncements(migratedAnnouncements);
            await api.saveAnnouncements(migratedAnnouncements);
            console.log("✅ Migrated announcements from localStorage");
          } else {
            // Only set default if both API and backup are empty (first time)
            const defaultAnnouncement = [{
              id:1,
              text:"Welcome to the Leverage Operations Hub. Use this space for team-wide notes and announcements.",
              author:"David Perlov",
              date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
            }];
            setAnnouncements(defaultAnnouncement);
            await api.saveAnnouncements(defaultAnnouncement);
          }
        }
      } catch(error) {
        console.error("Error loading announcements:", error);
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };
    loadAnnouncements();
  },[]);
  
  // Save announcements to storage
  const saveAnnouncements=async(newAnnouncements)=>{
    setAnnouncements(newAnnouncements);
    await api.saveAnnouncements(newAnnouncements);
    console.log("✅ Announcements saved to KV backend");
  };
  
  const addNote=()=>{
    if(!newNote.trim()) return;
    const note={id:Date.now(),text:newNote.trim(),author:authorName||"Team",date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})};
    const updated=[note,...announcements];
    saveAnnouncements(updated);
    setNewNote("");
    setShowInput(false);
    // Send to #team-announcements with @channel mention
    sendToSlack(`<!channel> 📢 *NEW ANNOUNCEMENT*\n\n*${note.author}* posted:\n"${note.text}"\n\n_Posted: ${note.date}_`, null, true);
  };
  const deleteNote=(id)=>{
    const updated=announcements.filter(a=>a.id!==id);
    saveAnnouncements(updated);
  };
  const saveEdit=(id,text)=>{
    const announcement=announcements.find(a=>a.id===id);
    const updated=announcements.map(a=>a.id===id?{...a,text}:a);
    saveAnnouncements(updated);
    setEditing(null);
    // Send to #team-announcements with @channel mention
    if(announcement) {
      sendToSlack(`<!channel> ✏️ *ANNOUNCEMENT UPDATED*\n\n*${announcement.author}* edited:\n"${text}"\n\n_Updated: ${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}_`, null, true);
    }
  };
  return (
    <div style={{background:"#F5F5F0",border:"2px solid #000",fontFamily:T.body}}>
      <div style={{padding:"0 32px",borderBottom:"3px solid #000"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 12px",borderBottom:"1px solid #C8C2B8"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}><span style={{fontSize:11,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono}}>LEVERAGE.</span><span style={{fontSize:11,color:"#9CA3AF",letterSpacing:2,fontFamily:T.mono}}>OPERATIONS HUB</span></div>
          <span style={{fontSize:10,color:"#9CA3AF",letterSpacing:2,fontFamily:T.mono}}>{date}</span>
        </div>
        <div style={{padding:"24px 0 0"}}>
          <div style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:700,lineHeight:0.88,letterSpacing:-3,textTransform:"uppercase",color:"#000"}}>GOOD<br/><span style={{WebkitTextStroke:"2px #000",color:"transparent",letterSpacing:-2}}>{greeting}</span></div>
          <p style={{fontSize:13,color:"#9CA3AF",fontFamily:T.mono,letterSpacing:1,marginTop:14,marginBottom:20}}>HERE'S YOUR DAILY REMINDER OF WHY WE'RE HERE.</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
        <div style={{padding:"36px 32px",borderRight:"1px solid #C8C2B8"}}><div style={{width:32,height:3,background:T.orange,marginBottom:20}} /><div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:14}}>OUR MISSION</div><p style={{fontSize:18,fontWeight:700,lineHeight:1.5,color:"#000"}}>We exist to deliver best-in-class results — with speed, precision, and genuine care.</p><p style={{fontSize:13,color:"#6B7280",lineHeight:1.8,marginTop:14}}>We're not here to be average. We're here to make success an inevitability.</p></div>
        <div style={{padding:"36px 32px",background:"#000"}}><div style={{width:32,height:3,background:T.orange,marginBottom:20}} /><div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:14}}>WHAT WE BELIEVE</div><p style={{fontSize:14,lineHeight:1.9,color:"#E5E0D8"}}>Great work comes from people who think independently, act proactively, and hold themselves to a high standard — not because they're told to, but because they genuinely care about the outcome.</p></div>
      </div>
      <div style={{borderTop:"3px solid #000",padding:"28px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:"#9CA3AF",fontFamily:T.mono}}>ANNOUNCEMENTS & NOTES</div></div>
          <button onClick={()=>setShowInput(!showInput)} style={{padding:"8px 18px",borderRadius:0,background:showInput?T.black:T.orange,color:"#fff",border:`2px solid ${showInput?T.black:T.orange}`,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:T.mono}}>{showInput?"✕ CANCEL":"+ ADD NOTE"}</button>
        </div>
        {showInput&&(
          <div style={{background:T.surface,border:`2px solid ${T.orange}`,padding:18,marginBottom:18}}>
            <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>YOUR NAME</div>
            <input value={authorName} onChange={e=>setAuthorName(e.target.value)} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"8px 12px",outline:"none",fontFamily:T.body,marginBottom:10}} />
            <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>NOTE</div>
            <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Type your announcement…" style={{width:"100%",minHeight:80,background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical",lineHeight:1.7,display:"block",marginBottom:10}} />
            <button onClick={addNote} disabled={!newNote.trim()} style={{padding:"9px 24px",background:newNote.trim()?T.black:T.border,color:newNote.trim()?"#fff":T.gray,border:`2px solid ${newNote.trim()?T.black:T.border}`,fontSize:11,fontWeight:700,cursor:newNote.trim()?"pointer":"not-allowed",fontFamily:T.mono,letterSpacing:1}}>POST NOTE</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {isLoadingAnnouncements ? (
            <div style={{background:T.surface,border:`2px solid ${T.black}`,padding:24,textAlign:"center"}}>
              <p style={{fontSize:13,color:T.gray,fontFamily:T.mono}}>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{background:T.surface,border:`2px solid ${T.black}`,padding:24,textAlign:"center"}}>
              <p style={{fontSize:13,color:T.gray,fontFamily:T.mono}}>No announcements yet. Click "+ ADD NOTE" to create one.</p>
            </div>
          ) : (
            announcements.map(a=>(
              <div key={a.id} style={{background:T.surface,border:`2px solid ${T.black}`,borderLeft:`4px solid ${T.orange}`,padding:18}}>
                {editing===a.id?(<EditNote note={a} onSave={saveEdit} onCancel={()=>setEditing(null)} />):(
                  <div>
                    <p style={{fontSize:13,color:T.black,lineHeight:1.7,margin:"0 0 12px"}}>{a.text}</p>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:1}}>{a.author.toUpperCase()}</span><span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>· {a.date}</span></div>
                      <div style={{display:"flex",gap:6}}><button onClick={()=>setEditing(a.id)} style={{background:"none",border:`2px solid ${T.black}`,padding:"3px 10px",fontSize:10,color:T.gray,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>EDIT</button><button onClick={()=>deleteNote(a.id)} style={{background:"none",border:`2px solid ${T.red}`,padding:"3px 10px",fontSize:10,color:T.red,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>DELETE</button></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div style={{borderTop:"3px solid #000",padding:"28px 32px",background:"#000",display:"flex",justifyContent:"space-between",alignItems:"center",gap:24}}>
        <div><div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:6}}>COMPANY ETHOS</div><p style={{fontSize:13,color:"#888",fontFamily:T.mono,margin:0}}>Our values, principles, and standards.</p></div>
        <button onClick={()=>navigate&&navigate("culture")} style={{padding:"12px 28px",background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font,whiteSpace:"nowrap"}}>→ VIEW COMPANY ETHOS</button>
      </div>
    </div>
  );
}
function EditNote({note,onSave,onCancel}) {
  const [text,setText]=useState(note.text);
  return (
    <div>
      <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus style={{width:"100%",minHeight:80,background:T.bg,border:`2px solid ${T.orange}`,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical",lineHeight:1.7,display:"block",marginBottom:10}} />
      <div style={{display:"flex",gap:8}}><button onClick={()=>onSave(note.id,text)} style={{padding:"7px 18px",background:T.green,color:"#fff",border:`2px solid ${T.green}`,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE</button><button onClick={onCancel} style={{padding:"7px 18px",background:"transparent",color:T.gray,border:`2px solid ${T.black}`,fontSize:10,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button></div>
    </div>
  );
}








// ─── CULTURE ──────────────────────────────────────────────────────────────────
function CultureDashboard() {
  const [activeTab,setActiveTab]=useState('ethos');
  const now=new Date();const monthYear=now.toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase();
  const tabs=[{key:'ethos',label:'WHO WE ARE'},{key:'values',label:'VALUES'},{key:'behaviors',label:'IN PRACTICE'},{key:'standard',label:'STANDARD'}];
  return (
    <div style={{background:"#FAFAF8",border:"2px solid #0A0A0A",fontFamily:T.body}}>
      <div style={{borderBottom:"3px solid #0A0A0A",padding:"0 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0 12px",borderBottom:"1px solid #E0DDD8"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}><span style={{fontSize:11,fontWeight:700,letterSpacing:3,color:'#FF3300',fontFamily:T.mono}}>LEVERAGE.</span><span style={{fontSize:11,color:"#6B7280",letterSpacing:2,fontFamily:T.mono}}>INTERNAL</span></div>
          <span style={{fontSize:10,color:"#6B7280",letterSpacing:2,fontFamily:T.mono}}>VOL. 01 — {monthYear}</span>
        </div>
        <div style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:700,lineHeight:0.9,letterSpacing:-2,textTransform:"uppercase",padding:"24px 0 0"}}>COMPANY<br/><span style={{WebkitTextStroke:"2px #0A0A0A",color:"transparent"}}>ETHOS</span></div>
        <div style={{display:"flex",marginTop:20,borderTop:"1px solid #E0DDD8"}}>
          {tabs.map((t,i)=>(<button key={t.key} onClick={()=>setActiveTab(t.key)} style={{flex:1,padding:"12px 8px",background:activeTab===t.key?"#0A0A0A":"#FAFAF8",color:activeTab===t.key?"#fff":"#6B7280",border:"none",borderRight:i===tabs.length-1?"none":"1px solid #E0DDD8",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:T.mono,letterSpacing:2,textTransform:"uppercase"}}>{t.label}</button>))}
        </div>
      </div>
      <div style={{padding:"0 40px 60px"}}>
        {activeTab==='ethos'&&(<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}><div style={{padding:"40px 40px 40px 0",borderRight:"1px solid #E0DDD8"}}><span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'#FF3300',marginBottom:20,fontFamily:T.mono,display:'block'}}>OUR MISSION</span><p style={{fontSize:22,fontWeight:700,lineHeight:1.3}}>We exist to deliver best-in-class results — with speed, precision, and genuine care.</p></div><div style={{padding:"40px 0 40px 40px"}}><span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'#FF3300',marginBottom:20,fontFamily:T.mono,display:'block'}}>WHAT WE BELIEVE</span><p style={{fontSize:15,lineHeight:1.8}}>Great work comes from people who think independently, act proactively, and hold themselves to a high standard.</p></div></div></>)}
        {activeTab==='values'&&(<><div style={{padding:"32px 0 24px",borderBottom:"1px solid #E0DDD8"}}><span style={{fontSize:11,color:"#6B7280",letterSpacing:3,fontFamily:T.mono}}>SIX PRINCIPLES WE LIVE BY</span></div>{[["01","Proactivity","Don't wait to be told. If you see a gap, fill it."],["02","Independent Thinking","Think before you ask. Come with a point of view."],["03","Performance Mindedness","Know your numbers. Set your goals. Track your progress."],["04","Collaboration","We push each other to be better — with respect."],["05","Ownership","Your work is your name. Take pride in it."],["06","Growth Mindset","Get better every week than you were the week before."]].map(([num,title,desc])=>(<div key={num} style={{display:"grid",gridTemplateColumns:"80px 1fr 2fr",borderBottom:"1px solid #E0DDD8",alignItems:"center"}}><div style={{padding:"24px 0",borderRight:"1px solid #E0DDD8",textAlign:"center",fontSize:11,fontWeight:700,fontFamily:T.mono,color:"#6B7280"}}>{num}</div><div style={{padding:"24px 32px",borderRight:"1px solid #E0DDD8",fontSize:22,fontWeight:700}}>{title}</div><div style={{padding:"24px 32px",fontSize:13,color:"#6B7280",lineHeight:1.7}}>{desc}</div></div>))}</>)}
        {activeTab==='behaviors'&&(<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}><div style={{padding:"20px 32px 16px 0",borderRight:"1px solid #E0DDD8",fontSize:10,fontWeight:700,fontFamily:T.mono,color:"#16a34a",letterSpacing:3}}>✅ WE DO THIS</div><div style={{padding:"20px 0 16px 32px",fontSize:10,fontWeight:700,fontFamily:T.mono,color:"#FF3300",letterSpacing:3}}>✗ NOT THIS</div></div>{[["Start each day with a clear, specific goal","Clock in with a vague 'working on things today'"],["End each day with a real recap: numbers, progress","Send the same update copy-pasted from yesterday"],["Spot a recurring problem? Bring 3 solutions","Drop the problem on someone else's lap"]].map(([d,dont],i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}><div style={{padding:"22px 32px 22px 0",borderRight:"1px solid #E0DDD8",display:"flex",gap:12}}><div style={{width:20,height:20,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:900,color:"#fff"}}>✓</div><p style={{fontSize:14,fontWeight:600,lineHeight:1.5}}>{d}</p></div><div style={{padding:"22px 0 22px 32px",display:"flex",gap:12}}><div style={{width:20,height:20,background:"#F0EFEB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:900,color:"#6B7280"}}>✗</div><p style={{fontSize:14,color:"#6B7280",textDecoration:"line-through",lineHeight:1.5}}>{dont}</p></div></div>))}</>)}
        {activeTab==='standard'&&(<><div style={{padding:"40px 0 32px"}}><div style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:700,lineHeight:0.95,textTransform:"uppercase",maxWidth:500}}>THE PROBLEM-SOLVING STANDARD</div></div>{[["01","DIAGNOSE","Name the Problem","What exactly is happening? Be specific."],["02","THINK","Propose 3 Solutions","List at least 3 options with honest pros and cons."],["03","DECIDE","Give Your Recommendation","Pick one. Tell us why."]].map(([num,tag,name,desc])=>(<div key={num} style={{display:"grid",gridTemplateColumns:"80px 160px 1fr",borderBottom:"1px solid #E0DDD8"}}><div style={{borderRight:"1px solid #E0DDD8",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 0",fontSize:28,fontWeight:700,color:"#FF3300"}}>{num}</div><div style={{borderRight:"1px solid #E0DDD8",padding:"32px 20px"}}><span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:"#FF3300",letterSpacing:3,display:"block"}}>{tag}</span><span style={{fontSize:15,fontWeight:700}}>{name}</span></div><div style={{padding:32,fontSize:13,color:"#6B7280",lineHeight:1.8}}>{desc}</div></div>))}</>)}
      </div>
    </div>
  );
}








// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({slackToken,setSlackToken,slackIds,setSlackIds,onChangePassword,sendToSlack}) {
  const [token,setToken]=useState(slackToken||"");const [ids,setIds]=useState(slackIds||DEFAULT_SLACK_IDS);const [saved,setSaved]=useState(false);const [newPw,setNewPw]=useState("");const [confirmPw,setConfirmPw]=useState("");const [pwMsg,setPwMsg]=useState(null);
  const [debugData,setDebugData]=useState(null);const [debugLoading,setDebugLoading]=useState(false);
  
  const save=async()=>{setSlackToken(token);setSlackIds(ids);await storage.set("slack-token",token);await storage.set("slack-ids",JSON.stringify(ids));setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const changePw=async()=>{
    if(!newPw||newPw.length<6){setPwMsg({type:"error",text:"Password must be at least 6 characters"});return;}
    if(newPw!==confirmPw){setPwMsg({type:"error",text:"Passwords do not match"});return;}
    await storage.set("app-password",newPw);onChangePassword(newPw);setNewPw("");setConfirmPw("");
    setPwMsg({type:"success",text:"Password updated successfully"});setTimeout(()=>setPwMsg(null),3000);
  };
  
  const loadDebugData = async () => {
    setDebugLoading(true);
    try {
      const todayStr = () => new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).split("/").reverse().join("-");
      const logs = await storage.get("attendance-logs");
      const sod = await storage.get(`sod-${todayStr()}`);
      const eod = await storage.get(`eod-${todayStr()}`);
      const announcements = await storage.get("announcements");
      
      setDebugData({
        logs: logs?.value ? JSON.parse(logs.value).length : 0,
        sod: sod?.value ? Object.keys(JSON.parse(sod.value)).length : 0,
        eod: eod?.value ? Object.keys(JSON.parse(eod.value)).length : 0,
        announcements: announcements?.value ? JSON.parse(announcements.value).length : 0,
        raw: {
          logs: logs?.value ? JSON.parse(logs.value).slice(0,3) : [],
          sod: sod?.value ? Object.keys(JSON.parse(sod.value)) : [],
          eod: eod?.value ? Object.keys(JSON.parse(eod.value)) : [],
          announcements: announcements?.value ? JSON.parse(announcements.value).slice(0,2) : []
        }
      });
    } catch(error) {
      setDebugData({error: error.message});
    } finally {
      setDebugLoading(false);
    }
  };
  
  const testSlack = async () => {
    sendToSlack(`🧪 *Test Message*\n\nThis is a test from Settings panel.\n\n_Sent at ${new Date().toLocaleTimeString()}_`);
    alert("Test message sent to #attendance-admin! Check Slack.");
  };
  
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card><SectionHeader label="Slack Bot Token" /><div style={{padding:16}}><input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="xoxb-…" style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}} /></div></Card>
      <Card><SectionHeader label="Slack User IDs" /><div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>{Object.entries(ids).map(([name,id])=>(<div key={name} style={{display:"flex",alignItems:"center",gap:12}}><Avatar name={name} size={28} /><div style={{width:130,fontSize:12,fontWeight:600,flexShrink:0}}>{name.split(" ")[0]}</div><input value={id} onChange={e=>setIds(p=>({...p,[name]:e.target.value}))} placeholder="U0XXXXXXXXX" style={{flex:1,background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:12,padding:"8px 12px",outline:"none",fontFamily:T.mono}} /></div>))}</div></Card>
      <Btn onClick={save} label={saved?"✓ SAVED":"SAVE SETTINGS"} color={saved?T.green:T.black} />
      
      <Card>
        <SectionHeader label="🧪 Test Slack Integration" />
        <div style={{padding:16}}>
          <button onClick={testSlack} style={{padding:"11px 20px",background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1,width:"100%"}}>SEND TEST MESSAGE</button>
        </div>
      </Card>
      
      <Card>
        <SectionHeader label="🔍 Debug Storage" />
        <div style={{padding:16}}>
          <button onClick={loadDebugData} disabled={debugLoading} style={{padding:"11px 20px",background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1,width:"100%",marginBottom:14}}>
            {debugLoading ? "LOADING..." : "CHECK STORAGE"}
          </button>
          {debugData && (
            <div style={{background:"#f5f5f0",border:`2px solid ${T.black}`,padding:14,fontFamily:T.mono,fontSize:12}}>
              {debugData.error ? (
                <div style={{color:T.red}}>❌ Error: {debugData.error}</div>
              ) : (
                <>
                  <div style={{marginBottom:10}}>
                    <div style={{fontWeight:700,color:T.orange,marginBottom:6}}>📊 STORAGE SUMMARY:</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>Attendance Logs: <strong>{debugData.logs}</strong></div>
                      <div>Announcements: <strong>{debugData.announcements}</strong></div>
                      <div>SOD Today: <strong>{debugData.sod}</strong></div>
                      <div>EOD Today: <strong>{debugData.eod}</strong></div>
                    </div>
                  </div>
                  {debugData.logs > 0 && (
                    <div style={{marginTop:10,fontSize:11,color:T.gray}}>
                      <div style={{fontWeight:700,marginBottom:4}}>Recent Logs:</div>
                      {debugData.raw.logs.map((l,i)=>(<div key={i}>• {l.member} - {l.type} at {l.time}</div>))}
                    </div>
                  )}
                  {debugData.sod > 0 && (
                    <div style={{marginTop:10,fontSize:11,color:T.gray}}>
                      <div style={{fontWeight:700,marginBottom:4}}>SOD Submitted By:</div>
                      {debugData.raw.sod.map((name,i)=>(<div key={i}>• {name}</div>))}
                    </div>
                  )}
                  {debugData.announcements > 0 && (
                    <div style={{marginTop:10,fontSize:11,color:T.gray}}>
                      <div style={{fontWeight:700,marginBottom:4}}>Recent Announcements:</div>
                      {debugData.raw.announcements.map((a,i)=>(<div key={i}>• {a.author}: {a.text.substring(0,50)}...</div>))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>
      
      <Card><SectionHeader label="🔐 Change Password" /><div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
        <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>NEW PASSWORD</div><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}} /></div>
        <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>CONFIRM PASSWORD</div><input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&changePw()} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}} /></div>
        {pwMsg&&<div style={{fontSize:12,color:pwMsg.type==="success"?T.green:T.red,fontFamily:T.mono,fontWeight:600}}>{pwMsg.type==="success"?"✓":"✗"} {pwMsg.text}</div>}
        <button onClick={changePw} disabled={!newPw||!confirmPw} style={{padding:"11px 20px",background:newPw&&confirmPw?T.black:"#E5E0D8",color:newPw&&confirmPw?"#fff":T.gray,border:`2px solid ${newPw&&confirmPw?T.black:"#E5E0D8"}`,fontSize:12,fontWeight:700,cursor:newPw&&confirmPw?"pointer":"not-allowed",fontFamily:T.mono,letterSpacing:1}}>UPDATE PASSWORD</button>
      </div></Card>
    </div>
  );
}





// ═══════════════════════════════════════════════════════════════════════════
// TASK MANAGEMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TEAM_MEMBERS = ["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];

const taskAPI = {
  getAll: async () => { const res = await fetch("/api/tasks"); const data = await res.json(); return data.success ? data.tasks : []; },
  create: async (task) => { const res = await fetch("/api/tasks", {method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify({ task })}); const data = await res.json(); return data.success ? data.task : null; },
  update: async (taskId, updates) => { const res = await fetch("/api/tasks", {method: "PUT",headers: { "Content-Type": "application/json" },body: JSON.stringify({ taskId, updates })}); const data = await res.json(); return data.success ? data.task : null; },
  delete: async (taskId) => { const res = await fetch("/api/tasks", {method: "DELETE",headers: { "Content-Type": "application/json" },body: JSON.stringify({ taskId })}); const data = await res.json(); return data.success; }
};

const isOverdue = (dueDate) => { if (!dueDate) return false; return new Date(dueDate) < new Date(); };
const formatDate = (dateStr) => { if (!dateStr) return ""; return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };

function AdminGate({ onUnlock }) {
  const [pw, setPw] = useState("");const [error, setError] = useState(false);const [shaking, setShaking] = useState(false);
  const attempt = () => { if (pw === ADMIN_PASSWORD) { onUnlock(); } else { setError(true);setShaking(true);setPw("");setTimeout(() => setShaking(false), 500);setTimeout(() => setError(false), 2000); } };
  return (<div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "100%", maxWidth: 400, background: T.surface, border: `2px solid ${T.black}`, padding: 32 }}><div style={{ fontSize: 32, marginBottom: 8, textAlign: "center" }}>🔐</div><div style={{ fontSize: 12, fontWeight: 700, color: T.black, fontFamily: T.mono, marginBottom: 4, letterSpacing: 2, textAlign: "center" }}>ADMIN ACCESS REQUIRED</div><div style={{ fontSize: 11, color: T.gray, fontFamily: T.mono, marginBottom: 24, textAlign: "center" }}>Tasks module is restricted to admins only</div><input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && pw && attempt()} placeholder="Admin Password" autoFocus style={{width: "100%",background: T.bg,border: `2px solid ${error ? T.red : T.black}`,color: T.black,fontSize: 14,padding: "10px 14px",outline: "none",fontFamily: T.mono,letterSpacing: 2,textAlign: "center",marginBottom: 12,animation: shaking ? "shake 0.4s ease" : "none"}} />{error && (<div style={{ fontSize: 11, color: T.red, fontFamily: T.mono, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>✗ INCORRECT PASSWORD</div>)}<button onClick={attempt} disabled={!pw} style={{width: "100%",padding: "10px",background: pw ? T.orange : T.border,color: pw ? "#fff" : T.gray,border: `2px solid ${pw ? T.orange : T.black}`,fontSize: 11,fontWeight: 700,cursor: pw ? "pointer" : "not-allowed",letterSpacing: 2,fontFamily: T.mono}}>UNLOCK →</button></div></div>);
}

function TaskCard({ task, onClick, allTasks }) {
  const blockedByTask = task.blockedBy ? allTasks.find(t => t.id === task.blockedBy) : null;
  return (<div onClick={onClick} style={{background: T.surface,border: `2px solid ${T.black}`,padding: 14,marginBottom: 10,cursor: "pointer",transition: "all 0.15s"}} onMouseEnter={e => {e.currentTarget.style.borderColor = T.orange;e.currentTarget.style.transform = "translateY(-2px)";}} onMouseLeave={e => {e.currentTarget.style.borderColor = T.black;e.currentTarget.style.transform = "translateY(0)";}}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{fontSize: 9,fontWeight: 700,padding: "2px 8px",background: priorityColor(task.priority) + "20",color: priorityColor(task.priority),border: `1px solid ${priorityColor(task.priority)}`,fontFamily: T.mono,letterSpacing: 1}}>{task.priority.toUpperCase()}</span>{task.dueDate && (<span style={{fontSize: 10,color: isOverdue(task.dueDate) ? T.red : T.gray,fontFamily: T.mono,fontWeight: isOverdue(task.dueDate) ? 700 : 400}}>{isOverdue(task.dueDate) ? "⚠️ " : "📅 "}{formatDate(task.dueDate)}</span>)}</div><div style={{ fontSize: 13, fontWeight: 700, color: T.black, marginBottom: 6,lineHeight: 1.3}}>{task.title}</div><div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, marginBottom: 8 }}>👤 {task.assignee}</div>{blockedByTask && (<div style={{fontSize: 10,color: T.red,background: T.red + "10",border: `1px solid ${T.red}`,padding: "4px 8px",fontFamily: T.mono,marginBottom: 6}}>🔒 Blocked by: {blockedByTask.title}</div>)}{task.source !== "manual" && (<div style={{fontSize: 9,color: T.purple,fontFamily: T.mono,letterSpacing: 1}}>⚡ Auto-imported from {task.source.toUpperCase()}</div>)}{task.comments && task.comments.length > 0 && (<div style={{fontSize: 10,color: T.gray,fontFamily: T.mono,marginTop: 6}}>💬 {task.comments.length} comment{task.comments.length !== 1 ? "s" : ""}</div>)}</div>);
}

function CreateTaskModal({ onClose, onCreate, allTasks }) {
  const [formData, setFormData] = useState({title: "",description: "",assignee: TEAM_MEMBERS[0],priority: "medium",dueDate: "",blockedBy: null});
  const handleCreate = () => {if (!formData.title.trim()) return;onCreate({...formData,createdBy: "Admin",source: "manual"});onClose();};
  return (<div style={{position: "fixed",top: 0,left: 0,right: 0,bottom: 0,background: "rgba(0,0,0,0.5)",display: "flex",alignItems: "center",justifyContent: "center",zIndex: 1000,padding: 24}}><div style={{background: T.surface,border: `2px solid ${T.black}`,maxWidth: 500,width: "100%",maxHeight: "90vh",overflowY: "auto"}}><div style={{padding: "16px 20px",borderBottom: `2px solid ${T.black}`,display: "flex",justifyContent: "space-between",alignItems: "center",background: T.orange}}><div style={{fontSize: 14,fontWeight: 700,color: "#fff",fontFamily: T.mono,letterSpacing: 2}}>➕ CREATE NEW TASK</div><button onClick={onClose} style={{background: "none",border: "none",color: "#fff",fontSize: 18,cursor: "pointer",padding: 4}}>✕</button></div><div style={{ padding: 24 }}><div style={{ marginBottom: 16 }}><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>TASK TITLE *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Review Q3 metrics report" autoFocus style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.body}}/></div><div style={{ marginBottom: 16 }}><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>DESCRIPTION</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional details..." rows={3} style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.body,resize: "vertical"}}/></div><div style={{display: "grid",gridTemplateColumns: "1fr 1fr",gap: 12,marginBottom: 16}}><div><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>ASSIGNEE *</label><select value={formData.assignee} onChange={e => setFormData({ ...formData, assignee: e.target.value })} style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.body}}>{TEAM_MEMBERS.map(m => (<option key={m} value={m}>{m}</option>))}</select></div><div><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>PRIORITY</label><select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.body}}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div><div style={{display: "grid",gridTemplateColumns: "1fr 1fr",gap: 12,marginBottom: 24}}><div><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>DUE DATE</label><input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.mono}}/></div><div><label style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>BLOCKED BY</label><select value={formData.blockedBy || ""} onChange={e => setFormData({ ...formData, blockedBy: e.target.value ? parseInt(e.target.value) : null })} style={{width: "100%",padding: "10px 12px",border: `2px solid ${T.black}`,fontSize: 13,outline: "none",fontFamily: T.body}}><option value="">None</option>{allTasks.filter(t => t.status !== "done").map(t => (<option key={t.id} value={t.id}>{t.title}</option>))}</select></div></div><div style={{ display: "flex", gap: 10 }}><button onClick={handleCreate} disabled={!formData.title.trim()} style={{flex: 1,padding: "12px",background: formData.title.trim() ? T.orange : T.border,color: formData.title.trim() ? "#fff" : T.gray,border: `2px solid ${T.black}`,fontSize: 11,fontWeight: 700,cursor: formData.title.trim() ? "pointer" : "not-allowed",letterSpacing: 2,fontFamily: T.mono}}>CREATE TASK</button><button onClick={onClose} style={{padding: "12px 20px",background: T.surface,color: T.black,border: `2px solid ${T.black}`,fontSize: 11,fontWeight: 700,cursor: "pointer",letterSpacing: 2,fontFamily: T.mono}}>CANCEL</button></div></div></div></div>);
}

function TaskDetailModal({ task, onClose, onUpdate, onDelete, allTasks }) {
  const [comment, setComment] = useState("");const blockedByTask = task.blockedBy ? allTasks.find(t => t.id === task.blockedBy) : null;
  const addComment = () => {if (!comment.trim()) return;const newComment = {author: "Admin",text: comment,timestamp: new Date().toISOString()};onUpdate(task.id, {comments: [...(task.comments || []), newComment]});setComment("");};
  const changeStatus = (newStatus) => {onUpdate(task.id, { status: newStatus });};
  return (<div style={{position: "fixed",top: 0,left: 0,right: 0,bottom: 0,background: "rgba(0,0,0,0.5)",display: "flex",alignItems: "center",justifyContent: "center",zIndex: 1000,padding: 24}}><div style={{background: T.surface,border: `2px solid ${T.black}`,maxWidth: 600,width: "100%",maxHeight: "90vh",overflowY: "auto"}}><div style={{padding: "16px 20px",borderBottom: `2px solid ${T.black}`,display: "flex",justifyContent: "space-between",alignItems: "center",background: T.black}}><div style={{fontSize: 14,fontWeight: 700,color: "#fff",fontFamily: T.mono,letterSpacing: 2}}>TASK DETAILS</div><button onClick={onClose} style={{background: "none",border: "none",color: "#fff",fontSize: 18,cursor: "pointer",padding: 4}}>✕</button></div><div style={{ padding: 24 }}><div style={{ marginBottom: 20 }}><div style={{display: "flex",gap: 8,alignItems: "center",marginBottom: 8}}><span style={{fontSize: 9,fontWeight: 700,padding: "3px 10px",background: priorityColor(task.priority) + "20",color: priorityColor(task.priority),border: `1px solid ${priorityColor(task.priority)}`,fontFamily: T.mono,letterSpacing: 1}}>{task.priority.toUpperCase()}</span>{task.dueDate && (<span style={{fontSize: 11,color: isOverdue(task.dueDate) ? T.red : T.gray,fontFamily: T.mono,fontWeight: isOverdue(task.dueDate) ? 700 : 400}}>{isOverdue(task.dueDate) ? "⚠️ OVERDUE: " : "📅 Due: "}{formatDate(task.dueDate)}</span>)}</div><div style={{fontSize: 18,fontWeight: 700,color: T.black,lineHeight: 1.3}}>{task.title}</div></div><div style={{background: T.bg,border: `1px solid ${T.border}`,padding: 12,marginBottom: 20,fontSize: 11,fontFamily: T.mono,color: T.gray}}><div>👤 Assigned to: <strong style={{ color: T.black }}>{task.assignee}</strong></div><div>🎯 Created by: {task.createdBy} on {formatDate(task.createdAt)}</div>{task.completedAt && (<div>✅ Completed: {formatDate(task.completedAt)}</div>)}{task.source !== "manual" && (<div>⚡ Source: Auto-imported from {task.source.toUpperCase()}</div>)}</div>{task.description && (<div style={{ marginBottom: 20 }}><div style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,marginBottom: 8,letterSpacing: 1}}>DESCRIPTION</div><div style={{fontSize: 13,color: T.darkGray,lineHeight: 1.6,background: T.bg,padding: 12,border: `1px solid ${T.border}`}}>{task.description}</div></div>)}{blockedByTask && (<div style={{marginBottom: 20,background: T.red + "10",border: `2px solid ${T.red}`,padding: 12}}><div style={{fontSize: 11,fontWeight: 700,color: T.red,fontFamily: T.mono,marginBottom: 4,letterSpacing: 1}}>🔒 BLOCKED BY</div><div style={{fontSize: 13,color: T.black,fontWeight: 600}}>{blockedByTask.title}</div><div style={{fontSize: 11,color: T.gray,fontFamily: T.mono,marginTop: 4}}>Status: {blockedByTask.status}</div></div>)}<div style={{ marginBottom: 24 }}><div style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,marginBottom: 8,letterSpacing: 1}}>CHANGE STATUS</div><div style={{ display: "flex", gap: 8 }}>{["pending", "in_progress", "done"].map(status => (<button key={status} onClick={() => changeStatus(status)} disabled={task.status === status} style={{flex: 1,padding: "8px",background: task.status === status ? T.black : T.surface,color: task.status === status ? "#fff" : T.black,border: `2px solid ${T.black}`,fontSize: 10,fontWeight: 700,cursor: task.status === status ? "default" : "pointer",letterSpacing: 1,fontFamily: T.mono,opacity: task.status === status ? 1 : 0.6}}>{status === "pending" && "PENDING"}{status === "in_progress" && "IN PROGRESS"}{status === "done" && "DONE"}</button>))}</div></div><div style={{ marginBottom: 20 }}><div style={{fontSize: 11,fontWeight: 700,color: T.black,fontFamily: T.mono,marginBottom: 8,letterSpacing: 1}}>💬 COMMENTS ({task.comments?.length || 0})</div>{task.comments && task.comments.length > 0 && (<div style={{maxHeight: 200,overflowY: "auto",marginBottom: 12,background: T.bg,border: `1px solid ${T.border}`,padding: 12}}>{task.comments.map((c, i) => (<div key={i} style={{marginBottom: i < task.comments.length - 1 ? 12 : 0,paddingBottom: i < task.comments.length - 1 ? 12 : 0,borderBottom: i < task.comments.length - 1 ? `1px solid ${T.border}` : "none"}}><div style={{fontSize: 10,color: T.gray,fontFamily: T.mono,marginBottom: 4}}><strong>{c.author}</strong> · {formatDate(c.timestamp)}</div><div style={{fontSize: 12,color: T.black,lineHeight: 1.5}}>{c.text}</div></div>))}</div>)}<div style={{ display: "flex", gap: 8 }}><input type="text" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && comment.trim() && addComment()} placeholder="Add a comment..." style={{flex: 1,padding: "8px 12px",border: `2px solid ${T.black}`,fontSize: 12,outline: "none",fontFamily: T.body}}/><button onClick={addComment} disabled={!comment.trim()} style={{padding: "8px 16px",background: comment.trim() ? T.orange : T.border,color: comment.trim() ? "#fff" : T.gray,border: `2px solid ${T.black}`,fontSize: 10,fontWeight: 700,cursor: comment.trim() ? "pointer" : "not-allowed",letterSpacing: 1,fontFamily: T.mono}}>POST</button></div></div><button onClick={() => {if (confirm("Are you sure you want to delete this task?")) {onDelete(task.id);onClose();}}} style={{width: "100%",padding: "10px",background: T.surface,color: T.red,border: `2px solid ${T.red}`,fontSize: 10,fontWeight: 700,cursor: "pointer",letterSpacing: 2,fontFamily: T.mono}}>🗑️ DELETE TASK</button></div></div></div>);
}

function TaskBoard({ tasks, onTaskClick }) {
  const columns = [{key: "pending",label: "📋 PENDING",color: T.gray},{key: "in_progress",label: "⚡ IN PROGRESS",color: T.yellow},{key: "done",label: "✅ DONE",color: T.green}];
  return (<div style={{display: "grid",gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",gap: 16,marginTop: 20}}>{columns.map(col => {const columnTasks = tasks.filter(t => t.status === col.key);return (<div key={col.key}><div style={{background: T.black,color: "#fff",padding: "10px 14px",marginBottom: 12,display: "flex",justifyContent: "space-between",alignItems: "center",border: `2px solid ${T.black}`,borderBottom: `3px solid ${col.color}`}}><span style={{fontSize: 11,fontWeight: 700,fontFamily: T.mono,letterSpacing: 2}}>{col.label}</span><span style={{fontSize: 12,fontWeight: 700,background: col.color + "30",color: col.color,padding: "2px 8px",border: `1px solid ${col.color}`}}>{columnTasks.length}</span></div><div style={{ minHeight: 200 }}>{columnTasks.length === 0 ? (<div style={{background: T.bg,border: `2px dashed ${T.border}`,padding: 24,textAlign: "center",color: T.gray,fontSize: 11,fontFamily: T.mono}}>No tasks</div>) : (columnTasks.map(task => (<TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} allTasks={tasks}/>)))}</div></div>);})}</div>);
}

function TaskManagement() {
  const [adminUnlocked, setAdminUnlocked] = useState(false);const [tasks, setTasks] = useState([]);const [loading, setLoading] = useState(true);const [showCreateModal, setShowCreateModal] = useState(false);const [selectedTask, setSelectedTask] = useState(null);const [filterAssignee, setFilterAssignee] = useState("all");const [filterPriority, setFilterPriority] = useState("all");
  useEffect(() => {if (adminUnlocked) {loadTasks();}}, [adminUnlocked]);
  const loadTasks = async () => {setLoading(true);const fetchedTasks = await taskAPI.getAll();setTasks(fetchedTasks);setLoading(false);};
  const handleCreateTask = async (taskData) => {const newTask = await taskAPI.create(taskData);if (newTask) {setTasks([...tasks, newTask]);}};
  const handleUpdateTask = async (taskId, updates) => {const updatedTask = await taskAPI.update(taskId, updates);if (updatedTask) {setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));if (selectedTask?.id === taskId) {setSelectedTask(updatedTask);}}};
  const handleDeleteTask = async (taskId) => {const success = await taskAPI.delete(taskId);if (success) {setTasks(tasks.filter(t => t.id !== taskId));}};
  const filteredTasks = tasks.filter(t => {if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;if (filterPriority !== "all" && t.priority !== filterPriority) return false;return true;});
  const stats = {total: tasks.length,pending: tasks.filter(t => t.status === "pending").length,inProgress: tasks.filter(t => t.status === "in_progress").length,done: tasks.filter(t => t.status === "done").length,overdue: tasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== "done").length};
  if (!adminUnlocked) {return <AdminGate onUnlock={() => setAdminUnlocked(true)} />;}
  if (loading) {return (<div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center",fontSize: 14,color: T.gray,fontFamily: T.mono}}>Loading tasks...</div>);}
  return (<div><div style={{display: "flex",justifyContent: "space-between",alignItems: "center",marginBottom: 24,paddingBottom: 16,borderBottom: `2px solid ${T.black}`}}><div><h1 style={{fontSize: 24,fontWeight: 700,color: T.black,margin: "0 0 4px 0",fontFamily: T.font,letterSpacing: -1}}>TASK MANAGEMENT</h1><p style={{fontSize: 12,color: T.gray,margin: 0,fontFamily: T.mono}}>Organize and track team assignments</p></div><button onClick={() => setShowCreateModal(true)} style={{padding: "10px 20px",background: T.orange,color: "#fff",border: `2px solid ${T.black}`,fontSize: 11,fontWeight: 700,cursor: "pointer",letterSpacing: 2,fontFamily: T.mono,display: "flex",alignItems: "center",gap: 8}}>➕ NEW TASK</button></div><div style={{display: "grid",gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",gap: 12,marginBottom: 24}}><div style={{background: T.surface,border: `2px solid ${T.black}`,padding: 14,textAlign: "center"}}><div style={{ fontSize: 28, fontWeight: 700, color: T.black }}>{stats.total}</div><div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>TOTAL</div></div><div style={{background: T.surface,border: `2px solid ${T.black}`,padding: 14,textAlign: "center",borderBottom: `3px solid ${T.gray}`}}><div style={{ fontSize: 28, fontWeight: 700, color: T.gray }}>{stats.pending}</div><div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>PENDING</div></div><div style={{background: T.surface,border: `2px solid ${T.black}`,padding: 14,textAlign: "center",borderBottom: `3px solid ${T.yellow}`}}><div style={{ fontSize: 28, fontWeight: 700, color: T.yellow }}>{stats.inProgress}</div><div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>IN PROGRESS</div></div><div style={{background: T.surface,border: `2px solid ${T.black}`,padding: 14,textAlign: "center",borderBottom: `3px solid ${T.green}`}}><div style={{ fontSize: 28, fontWeight: 700, color: T.green }}>{stats.done}</div><div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>DONE</div></div>{stats.overdue > 0 && (<div style={{background: T.red + "10",border: `2px solid ${T.red}`,padding: 14,textAlign: "center"}}><div style={{ fontSize: 28, fontWeight: 700, color: T.red }}>{stats.overdue}</div><div style={{ fontSize: 10, color: T.red, fontFamily: T.mono, letterSpacing: 1 }}>OVERDUE</div></div>)}</div><div style={{background: T.surface,border: `2px solid ${T.black}`,padding: 16,marginBottom: 24,display: "grid",gridTemplateColumns: "1fr 1fr",gap: 12}}><div><label style={{fontSize: 10,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>FILTER BY ASSIGNEE</label><select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{width: "100%",padding: "8px 10px",border: `2px solid ${T.black}`,fontSize: 12,fontFamily: T.body}}><option value="all">All Team Members</option>{TEAM_MEMBERS.map(m => (<option key={m} value={m}>{m}</option>))}</select></div><div><label style={{fontSize: 10,fontWeight: 700,color: T.black,fontFamily: T.mono,display: "block",marginBottom: 6,letterSpacing: 1}}>FILTER BY PRIORITY</label><select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{width: "100%",padding: "8px 10px",border: `2px solid ${T.black}`,fontSize: 12,fontFamily: T.body}}><option value="all">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div><TaskBoard tasks={filteredTasks} onTaskClick={setSelectedTask}/>{showCreateModal && (<CreateTaskModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTask} allTasks={tasks}/>)}{selectedTask && (<TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} allTasks={tasks}/>)}</div>);
}


// ═══════════════════════════════════════════════════════════════════════════
// COS AI INSIGHTS COMPONENT
// Private AI Chief of Staff Dashboard - Kristine Only
// ═══════════════════════════════════════════════════════════════════════════
// COS AI INSIGHTS COMPONENT
// Private AI Chief of Staff Dashboard - Kristine Only
// ═══════════════════════════════════════════════════════════════════════════

function CoSInsights() {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  // Password gate
  if (!unlocked) {
    return <CoSPasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Main dashboard
  return (
    <div>
      <CoSHeader onRefresh={() => generateCoSInsights(setLoading, setInsights, setLastRefresh, setError)} lastRefresh={lastRefresh} loading={loading} />
      
      {error && <ErrorBanner error={error} />}
      
      {loading && <LoadingState />}
      
      {!loading && insights && (
        <>
          <PerformanceSummary summary={insights.summary} />
          <RedFlags flags={insights.redFlags} />
          <GreenFlags flags={insights.greenFlags} />
          <Recommendations recs={insights.recommendations} />
          <TrendAnalysis trends={insights.trends} />
          <ActionItems items={insights.actionItems} />
        </>
      )}
      
      {!loading && !insights && (
        <EmptyState onGenerate={() => generateCoSInsights(setLoading, setInsights, setLastRefresh, setError)} />
      )}
    </div>
  );
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function CoSPasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  
  const attempt = () => {
    if (pw === COS_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setPw("");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, background: T.surface, border: `2px solid ${T.black}`, padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>🤖</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.black, fontFamily: T.mono, marginBottom: 6, letterSpacing: 2, textAlign: "center" }}>
          COS AI INSIGHTS
        </div>
        <div style={{ fontSize: 11, color: T.gray, fontFamily: T.mono, marginBottom: 24, textAlign: "center", lineHeight: 1.6 }}>
          Private AI Chief of Staff Dashboard<br/>Kristine's eyes only
        </div>
        
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && pw && attempt()}
          placeholder="CoS Password"
          autoFocus
          style={{
            width: "100%",
            background: T.bg,
            border: `2px solid ${error ? T.red : T.black}`,
            color: T.black,
            fontSize: 14,
            padding: "10px 14px",
            outline: "none",
            fontFamily: T.mono,
            letterSpacing: 2,
            textAlign: "center",
            marginBottom: 12,
            animation: shaking ? "shake 0.4s ease" : "none"
          }}
        />
        
        {error && (
          <div style={{ fontSize: 11, color: T.red, fontFamily: T.mono, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>
            ✗ INCORRECT PASSWORD
          </div>
        )}
        
        <button
          onClick={attempt}
          disabled={!pw}
          style={{
            width: "100%",
            padding: "10px",
            background: pw ? T.purple : T.border,
            color: pw ? "#fff" : T.gray,
            border: `2px solid ${pw ? T.purple : T.black}`,
            fontSize: 11,
            fontWeight: 700,
            cursor: pw ? "pointer" : "not-allowed",
            letterSpacing: 2,
            fontFamily: T.mono
          }}
        >
          UNLOCK →
        </button>
        
        <div style={{ marginTop: 20, padding: 12, background: T.purple + "10", border: `1px solid ${T.purple}`, fontSize: 10, color: T.darkGray, fontFamily: T.mono, lineHeight: 1.6 }}>
          ℹ️ This dashboard uses Claude API to analyze team performance. Cost: ~₱84/month.
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function CoSHeader({ onRefresh, lastRefresh, loading }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: `2px solid ${T.black}`
    }}>
      <div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: T.black,
          margin: "0 0 4px 0",
          fontFamily: T.font,
          letterSpacing: -1
        }}>
          🤖 AI CHIEF OF STAFF INSIGHTS
        </h1>
        <p style={{ fontSize: 12, color: T.gray, margin: 0, fontFamily: T.mono }}>
          {lastRefresh 
            ? `Last updated: ${new Date(lastRefresh).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
            : "Private strategic analysis powered by Claude AI"
          }
        </p>
      </div>
      
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          padding: "10px 20px",
          background: loading ? T.border : T.purple,
          color: loading ? T.gray : "#fff",
          border: `2px solid ${T.black}`,
          fontSize: 11,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: 2,
          fontFamily: T.mono,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        {loading ? "ANALYZING..." : "🔄 REFRESH"}
      </button>
    </div>
  );
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      padding: 40,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 2s infinite" }}>🤖</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.black, marginBottom: 8, fontFamily: T.mono }}>
        ANALYZING TEAM PERFORMANCE...
      </div>
      <div style={{ fontSize: 12, color: T.gray, fontFamily: T.mono, lineHeight: 1.6 }}>
        Reviewing SOD/EOD submissions, attendance logs, and task progress.<br/>
        This may take 10-15 seconds.
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onGenerate }) {
  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      padding: 40,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.black, marginBottom: 8 }}>
        No Insights Generated Yet
      </div>
      <div style={{ fontSize: 13, color: T.gray, marginBottom: 24, lineHeight: 1.6 }}>
        Click below to analyze current team performance and generate AI insights.
      </div>
      <button
        onClick={onGenerate}
        style={{
          padding: "12px 24px",
          background: T.purple,
          color: "#fff",
          border: `2px solid ${T.black}`,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: 2,
          fontFamily: T.mono
        }}
      >
        GENERATE INSIGHTS
      </button>
    </div>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function ErrorBanner({ error }) {
  return (
    <div style={{
      background: T.red + "10",
      border: `2px solid ${T.red}`,
      padding: 16,
      marginBottom: 20,
      fontSize: 12,
      color: T.darkGray,
      fontFamily: T.mono,
      lineHeight: 1.6
    }}>
      <strong style={{ color: T.red }}>⚠️ Error generating insights:</strong> {error}
    </div>
  );
}

// ─── PERFORMANCE SUMMARY ──────────────────────────────────────────────────────
function PerformanceSummary({ summary }) {
  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.black,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2
      }}>
        📊 PERFORMANCE SUMMARY
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 14, color: T.black, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {summary}
        </div>
      </div>
    </div>
  );
}

// ─── RED FLAGS ────────────────────────────────────────────────────────────────
function RedFlags({ flags }) {
  if (!flags || flags.length === 0) {
    return (
      <div style={{
        background: T.green + "10",
        border: `2px solid ${T.green}`,
        padding: 20,
        marginBottom: 20,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.green, fontFamily: T.mono }}>
          NO RED FLAGS DETECTED
        </div>
        <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>
          Team is performing well across all metrics
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.red,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>⚠️ RED FLAGS - ISSUES DETECTED</span>
        <span style={{
          background: "#fff",
          color: T.red,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          border: "1px solid #fff"
        }}>
          {flags.length}
        </span>
      </div>
      <div style={{ padding: 20 }}>
        {flags.map((flag, i) => (
          <div
            key={i}
            style={{
              background: T.red + "10",
              border: `2px solid ${T.red}`,
              padding: 14,
              marginBottom: i < flags.length - 1 ? 12 : 0,
              borderLeft: `4px solid ${T.red}`
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 6, fontFamily: T.mono }}>
              ⚠️ {flag.title}
            </div>
            <div style={{ fontSize: 12, color: T.darkGray, lineHeight: 1.6 }}>
              {flag.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GREEN FLAGS ──────────────────────────────────────────────────────────────
function GreenFlags({ flags }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.green,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>✅ GREEN FLAGS - WINS & STRENGTHS</span>
        <span style={{
          background: "#fff",
          color: T.green,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          border: "1px solid #fff"
        }}>
          {flags.length}
        </span>
      </div>
      <div style={{ padding: 20 }}>
        {flags.map((flag, i) => (
          <div
            key={i}
            style={{
              background: T.green + "10",
              border: `2px solid ${T.green}`,
              padding: 14,
              marginBottom: i < flags.length - 1 ? 12 : 0,
              borderLeft: `4px solid ${T.green}`
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: T.green, marginBottom: 6, fontFamily: T.mono }}>
              ✅ {flag.title}
            </div>
            <div style={{ fontSize: 12, color: T.darkGray, lineHeight: 1.6 }}>
              {flag.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RECOMMENDATIONS ──────────────────────────────────────────────────────────
function Recommendations({ recs }) {
  if (!recs || recs.length === 0) return null;

  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.purple,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>💡 STRATEGIC RECOMMENDATIONS</span>
        <span style={{
          background: "#fff",
          color: T.purple,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          border: "1px solid #fff"
        }}>
          {recs.length}
        </span>
      </div>
      <div style={{ padding: 20 }}>
        {recs.map((rec, i) => (
          <div
            key={i}
            style={{
              background: T.purple + "10",
              border: `2px solid ${T.purple}`,
              padding: 14,
              marginBottom: i < recs.length - 1 ? 12 : 0,
              borderLeft: `4px solid ${T.purple}`
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 6, fontFamily: T.mono }}>
              💡 {rec.title}
            </div>
            <div style={{ fontSize: 12, color: T.darkGray, lineHeight: 1.6, marginBottom: 8 }}>
              {rec.description}
            </div>
            {rec.action && (
              <div style={{
                fontSize: 11,
                color: T.purple,
                fontFamily: T.mono,
                fontWeight: 600,
                marginTop: 8
              }}>
                → Action: {rec.action}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TREND ANALYSIS ───────────────────────────────────────────────────────────
function TrendAnalysis({ trends }) {
  if (!trends || trends.length === 0) return null;

  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.orange,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2
      }}>
        📈 TREND ANALYSIS
      </div>
      <div style={{ padding: 20 }}>
        {trends.map((trend, i) => (
          <div
            key={i}
            style={{
              background: T.bg,
              border: `2px solid ${T.border}`,
              padding: 14,
              marginBottom: i < trends.length - 1 ? 12 : 0
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: T.black, marginBottom: 4 }}>
              {trend.metric}
            </div>
            <div style={{ fontSize: 12, color: T.gray, lineHeight: 1.6 }}>
              {trend.observation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ACTION ITEMS ─────────────────────────────────────────────────────────────
function ActionItems({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      background: T.surface,
      border: `2px solid ${T.black}`,
      marginBottom: 20,
      overflow: "hidden"
    }}>
      <div style={{
        background: T.black,
        color: "#fff",
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.mono,
        letterSpacing: 2
      }}>
        🎯 ACTION ITEMS
      </div>
      <div style={{ padding: 20 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: i < items.length - 1 ? 12 : 0,
              padding: 14,
              background: T.bg,
              border: `2px solid ${T.border}`,
              borderLeft: `4px solid ${T.orange}`
            }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: T.orange,
              fontFamily: T.mono,
              flexShrink: 0
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.black, marginBottom: 4 }}>
                {item.task}
              </div>
              <div style={{ fontSize: 11, color: T.gray, fontFamily: T.mono }}>
                Priority: {item.priority} | Owner: {item.owner}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI ANALYSIS ENGINE ───────────────────────────────────────────────────────
async function generateCoSInsights(setLoading, setInsights, setLastRefresh, setError) {
  setLoading(true);
  setError(null);

  try {
    // Fetch all data
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log("🤖 CoS Insights: Fetching data...");

    const [sodRes, eodRes, attendanceRes, tasksRes] = await Promise.all([
      fetch(`/api/attendance/sod?date=${today}`),
      fetch(`/api/attendance/eod?date=${today}`),
      fetch(`/api/attendance`),
      fetch(`/api/tasks`)
    ]);

    const sodData = await sodRes.json();
    const eodData = await eodRes.json();
    const attendanceData = await attendanceRes.json();
    const tasksData = await tasksRes.json();

    console.log("📊 Data fetched:", { 
      sod: sodData.success, 
      eod: eodData.success, 
      attendance: attendanceData.success, 
      tasks: tasksData.success 
    });

    // Prepare analysis prompt
    const prompt = `You are an AI Chief of Staff analyzing team performance data for BuildWithLeverage, a growth marketing agency.

TEAM MEMBERS:
- Suki Santos (Operations Lead)
- Kristine Mirabueno (Chief of Staff / EA)
- Kristine Miel Zulaybar (Specialist)
- Caleb Bentil (Outbound Specialist - KPIs: Calls Dialed, Live Connects, Meetings Booked)
- David Perlov (Founder/CEO)
- Cyril Butanas (Influencer Outreach Specialist - KPIs: Influencers Sourced, Outreach Sent, Partnerships)
- Darlene Mae Malolos (Graphic Designer - KPIs: Assets Completed, Revision Rounds, Turnaround Time)

TODAY'S DATA (${today}):

SOD Submissions:
${JSON.stringify(sodData.success ? sodData.submissions : {}, null, 2)}

EOD Submissions:
${JSON.stringify(eodData.success ? eodData.submissions : {}, null, 2)}

Recent Attendance:
${JSON.stringify(attendanceData.success ? attendanceData.logs.slice(-20) : [], null, 2)}

Active Tasks:
${JSON.stringify(tasksData.success ? tasksData.tasks : [], null, 2)}

ANALYSIS REQUIREMENTS:
Respond ONLY with valid JSON. No markdown, no backticks, no preamble.

{
  "summary": "2-3 sentence high-level performance summary",
  "redFlags": [
    {"title": "Issue name", "description": "Specific concern with data backing"}
  ],
  "greenFlags": [
    {"title": "Win/strength name", "description": "What's working well"}
  ],
  "recommendations": [
    {
      "title": "Recommendation name",
      "description": "Why this matters",
      "action": "Specific next step"
    }
  ],
  "trends": [
    {"metric": "Metric name", "observation": "What the data shows"}
  ],
  "actionItems": [
    {
      "task": "Specific action to take",
      "priority": "High/Medium/Low",
      "owner": "Team member name"
    }
  ]
}

FOCUS ON:
1. SOD/EOD compliance rates
2. Task completion patterns
3. Performance vs KPIs (for role-specific metrics)
4. Attendance consistency
5. Workload distribution
6. Quality indicators (revision rates, connect rates, etc.)

Be specific, actionable, and data-driven. Flag real issues but also celebrate wins.`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Parse AI response
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const insights = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));

    setInsights(insights);
    setLastRefresh(new Date().toISOString());
    setLoading(false);
  } catch (error) {
    console.error("Error generating insights:", error);
    setError(error.message);
    setLoading(false);
  }
}
// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV=[
  {key:"dashboard",label:"Dashboard"},
  {key:"attendance",label:"Attendance"},
  {key:"tasks",label:"Tasks"},
  {key:"cos-insights",label:"CoS Insights"},
  {key:"culture",label:"Culture"},
  {key:"settings",label:"Settings"},
];
const PAGE_ICONS={dashboard:"⚡",attendance:"🕐",tasks:"🎯","cos-insights":"🤖",settings:"⚙️",culture:"🏛️"};








function TopNav({page,navigate,isMobile,onLock}) {
  const [openGroup,setOpenGroup]=useState(null);const [menuOpen,setMenuOpen]=useState(false);
  const closeTimer=useRef(null);
  const openMenu=(key)=>{clearTimeout(closeTimer.current);setOpenGroup(key);};
  const closeMenu=()=>{closeTimer.current=setTimeout(()=>setOpenGroup(null),120);};
  return (
    <header style={{background:T.black,height:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:200,borderBottom:`3px solid ${T.orange}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",letterSpacing:3,fontFamily:T.font,cursor:"pointer"}} onClick={()=>navigate("dashboard")}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
        <div style={{height:20,width:1,background:"#333"}} />
        <div style={{fontSize:10,color:"#555",fontFamily:T.mono,letterSpacing:2}}>OPS HUB</div>
      </div>
      {isMobile?(
        <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:4}}>{menuOpen?"✕":"≡"}</button>
      ):(
        <nav style={{display:"flex",height:"100%",alignItems:"stretch"}}>
          {NAV.map(n=>{
            const isActive=page===n.key||n.children?.some(c=>c.key===page);
            return (
              <div key={n.key} style={{position:"relative",display:"flex",alignItems:"stretch"}} onMouseEnter={()=>n.children&&openMenu(n.key)} onMouseLeave={()=>n.children&&closeMenu()}>
                <button onClick={()=>!n.children&&navigate(n.key)}
                  style={{height:"100%",padding:"0 14px",background:isActive?T.orange:"transparent",color:isActive?"#fff":"#aaa",border:"none",borderBottom:isActive?`3px solid ${T.orange}`:"3px solid transparent",fontSize:10,fontWeight:700,cursor:n.children?"default":"pointer",letterSpacing:2,fontFamily:T.mono,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                  onMouseEnter={e=>{if(!isActive){e.currentTarget.style.color="#fff";e.currentTarget.style.background="#ffffff14";}}}
                  onMouseLeave={e=>{if(!isActive){e.currentTarget.style.color="#aaa";e.currentTarget.style.background="transparent";}}}>
                  {n.label.toUpperCase()}{n.children&&<span style={{fontSize:8,opacity:0.7}}>▾</span>}
                </button>
                {n.children&&openGroup===n.key&&(
                  <div style={{position:"absolute",top:"100%",left:0,background:T.black,border:`1px solid #2a2a2a`,borderTop:`3px solid ${T.orange}`,minWidth:200,boxShadow:"0 12px 40px rgba(0,0,0,0.4)",zIndex:300,padding:"6px 0"}}
                    onMouseEnter={()=>clearTimeout(closeTimer.current)} onMouseLeave={closeMenu}>
                    {n.children.map(c=>(
                      <button key={c.key} onClick={()=>{navigate(c.key);setOpenGroup(null);}}
                        style={{display:"flex",alignItems:"center",width:"100%",padding:"10px 18px",background:page===c.key?"#ffffff12":"transparent",color:page===c.key?T.orange:"#ccc",border:"none",borderLeft:page===c.key?`3px solid ${T.orange}`:"3px solid transparent",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",letterSpacing:1,fontFamily:T.mono}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#ffffff12";e.currentTarget.style.color="#fff";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=page===c.key?"#ffffff12":"transparent";e.currentTarget.style.color=page===c.key?T.orange:"#ccc";}}>
                        {c.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={onLock} style={{height:"100%",padding:"0 14px",background:"transparent",color:"#555",border:"none",fontSize:16,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#555"}>🔒</button>
        </nav>
      )}
      {isMobile&&menuOpen&&(
        <div style={{position:"fixed",top:58,left:0,right:0,bottom:0,background:T.black,zIndex:199,overflowY:"auto",padding:16}}>
          {NAV.map(n=>n.children?(
            <div key={n.key} style={{marginBottom:16}}><div style={{fontSize:10,color:"#555",fontWeight:700,letterSpacing:3,padding:"6px 10px 4px",fontFamily:T.mono}}>{n.label.toUpperCase()}</div>{n.children.map(c=>(<button key={c.key} onClick={()=>{navigate(c.key);setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"10px 16px",background:page===c.key?T.orange:"transparent",color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",marginBottom:2,fontFamily:T.mono}}>{c.label.toUpperCase()}</button>))}</div>
          ):(
            <button key={n.key} onClick={()=>{navigate(n.key);setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"10px 16px",background:page===n.key?T.orange:"transparent",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",marginBottom:2,fontFamily:T.mono}}>{n.label.toUpperCase()}</button>
          ))}
          <button onClick={()=>{onLock();setMenuOpen(false);}} style={{display:"block",width:"100%",padding:"10px 16px",background:"transparent",color:"#888",border:"none",fontSize:12,cursor:"pointer",textAlign:"left",fontFamily:T.mono}}>🔒 LOCK</button>
        </div>
      )}
    </header>
  );
}








function PageWrapper({page,children}) {
  const allPages=NAV.flatMap(n=>n.children?n.children:[n]);
  const current=allPages.find(n=>n.key===page);
  const parent=NAV.find(n=>n.children?.some(c=>c.key===page));
  if(page==="dashboard"||page==="culture") return <main style={{maxWidth:960,margin:"0 auto",padding:"32px 24px 60px"}}>{children}</main>;
  return (
    <main style={{maxWidth:920,margin:"0 auto",padding:"32px 24px 60px"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20,paddingBottom:12,borderBottom:`2px solid ${T.black}`}}>
        {parent&&<><span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,letterSpacing:1}}>{parent.label.toUpperCase()}</span><span style={{fontSize:10,color:T.borderDark}}>›</span></>}
        <span style={{fontSize:10,color:T.orange,fontWeight:700,fontFamily:T.mono,letterSpacing:2}}>{PAGE_ICONS[page]} {current?.label?.toUpperCase()||page.toUpperCase()}</span>
      </div>
      {children}
    </main>
  );
}








// ─── APP ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// AUTO-RECONCILE ATTENDANCE LOGS
// Runs on page load to fix attendance from SOD/EOD submissions
// ═══════════════════════════════════════════════════════════════════════════
const reconcileAttendance = async () => {
  try {
    console.log('🔄 Auto-reconciling attendance logs...');
    
    // Get all attendance logs from backend
    const attendanceRes = await fetch('/api/attendance');
    const attendanceData = await attendanceRes.json();
    let logs = attendanceData.success ? attendanceData.logs : [];
    
    // Get recent dates to check (last 7 days)
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    let changesNeeded = false;
    
    // For each date, check SOD/EOD submissions and create missing logs
    for (const date of dates) {
      // Get SOD submissions for this date
      const sodRes = await fetch(`/api/sod?date=${date}`);
      const sodData = await sodRes.json();
      const sodSubmissions = sodData.success ? sodData.data || {} : {};
      
      // Get EOD submissions for this date
      const eodRes = await fetch(`/api/eod?date=${date}`);
      const eodData = await eodRes.json();
      const eodSubmissions = eodData.success ? eodData.data || {} : {};
      
      // Create IN logs for all SOD submissions
      Object.keys(sodSubmissions).forEach(member => {
        const existingIn = logs.find(l => 
          l.member === member && l.date === date && l.type === 'in'
        );
        
        if (!existingIn) {
          // Create missing IN log
          const sodTime = sodSubmissions[member].submittedAt || '09:00 AM';
          const timestamp = new Date(`${date}T09:00:00`).toISOString();
          
          logs.push({
            id: `auto-in-${date}-${member.replace(/\s/g, '-')}`,
            member,
            type: 'in',
            date,
            time: '09:00',
            timestamp
          });
          
          changesNeeded = true;
          console.log(`  ✅ Created IN log for ${member} on ${date}`);
        }
      });
      
      // Create OUT logs for all EOD submissions
      Object.keys(eodSubmissions).forEach(member => {
        const existingOut = logs.find(l => 
          l.member === member && l.date === date && l.type === 'out'
        );
        
        if (!existingOut) {
          // Create missing OUT log
          const eodTime = eodSubmissions[member].submittedAt || '05:00 PM';
          const timestamp = new Date(`${date}T17:00:00`).toISOString();
          
          logs.push({
            id: `auto-out-${date}-${member.replace(/\s/g, '-')}`,
            member,
            type: 'out',
            date,
            time: '17:00',
            timestamp
          });
          
          changesNeeded = true;
          console.log(`  ✅ Created OUT log for ${member} on ${date}`);
        }
      });
    }
    
    // Deduplicate logs (keep only one IN and one OUT per member per date)
    const deduped = {};
    logs.forEach(log => {
      const key = `${log.member}-${log.date}-${log.type}`;
      if (!deduped[key] || new Date(log.timestamp) > new Date(deduped[key].timestamp)) {
        deduped[key] = log;
      }
    });
    
    const finalLogs = Object.values(deduped);
    
    if (finalLogs.length !== logs.length) {
      changesNeeded = true;
      console.log(`  🧹 Removed ${logs.length - finalLogs.length} duplicate logs`);
    }
    
    // Save if changes were made
    if (changesNeeded) {
      const saveRes = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: finalLogs })
      });
      
      const saveData = await saveRes.json();
      
      if (saveData.success) {
        console.log('✅ Attendance auto-reconciled successfully!');
        return true;
      } else {
        console.error('❌ Failed to save reconciled logs:', saveData.error);
        return false;
      }
    } else {
      console.log('✅ Attendance logs already correct - no changes needed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Auto-reconcile failed:', error);
    return false;
  }
};




export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [currentPassword,setCurrentPassword]=useState(CORRECT_PASSWORD);
  const [page,setPage]=useState("dashboard");
  const [slackToken,setSlackToken]=useState("");
  const [slackIds,setSlackIds]=useState(DEFAULT_SLACK_IDS);
  const isMobile=useIsMobile();
  const [pw,setPw]=useState("");const [error,setError]=useState(false);const [shaking,setShaking]=useState(false);








  useEffect(()=>{
    storage.get("app-password").then(r=>{if(r?.value) setCurrentPassword(r.value);});
    Promise.all([storage.get("slack-token"),storage.get("slack-ids")]).then(([t,ids])=>{if(t) setSlackToken(t.value);if(ids) setSlackIds(JSON.parse(ids.value));});
  },[]);

  // Auto-reconcile attendance logs when app unlocks
  useEffect(()=>{
    if(unlocked){
      reconcileAttendance();
    }
  },[unlocked]);








  const attempt=()=>{
    if(pw===currentPassword){setUnlocked(true);}
    else{setError(true);setShaking(true);setPw("");setTimeout(()=>setShaking(false),500);setTimeout(()=>setError(false),2000);}
  };








  if(!unlocked) return (
    <>
      <GlobalStyle />
      <div style={{minHeight:"100vh",background:T.black,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:400,textAlign:"center"}}>
          <div style={{marginBottom:40}}>
            <div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:4,fontFamily:T.font,lineHeight:1}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
            <div style={{fontSize:10,color:"#444",fontFamily:T.mono,marginTop:8,letterSpacing:3}}>OPERATIONS HUB</div>
          </div>
          <div style={{fontSize:40,marginBottom:24}}>🔐</div>
          <div style={{background:"#111",border:`2px solid ${error?T.red:"#222"}`,padding:"32px 28px",animation:shaking?"shake 0.4s ease":"none",transition:"border-color 0.2s"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:T.mono,marginBottom:6,letterSpacing:2}}>RESTRICTED ACCESS</div>
            <div style={{fontSize:12,color:"#555",fontFamily:T.mono,marginBottom:24,letterSpacing:1}}>Enter password to continue</div>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw&&attempt()} placeholder="Password" autoFocus
              style={{width:"100%",background:"#1a1a1a",border:`2px solid ${error?T.red:"#333"}`,color:"#fff",fontSize:15,padding:"12px 16px",outline:"none",fontFamily:T.mono,letterSpacing:3,textAlign:"center",marginBottom:16,transition:"border-color 0.2s"}} />
            {error&&<div style={{fontSize:12,color:T.red,fontFamily:T.mono,marginBottom:12,letterSpacing:1}}>✗ INCORRECT PASSWORD</div>}
            <button onClick={attempt} disabled={!pw} style={{width:"100%",padding:"12px",background:pw?T.orange:"#222",color:pw?"#fff":"#444",border:`2px solid ${pw?T.orange:"#333"}`,fontSize:12,fontWeight:700,cursor:pw?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.mono}}>UNLOCK →</button>
          </div>
          <div style={{fontSize:10,color:"#333",fontFamily:T.mono,marginTop:20,letterSpacing:2}}>BUILDWITHLEVERAGE.COM</div>
        </div>
      </div>
    </>
  );








  const navigate=(key)=>{setPage(key);window.scrollTo({top:0,behavior:"smooth"});};








  const renderPage=()=>{
    switch(page){
      case "dashboard": return <Dashboard navigate={navigate} sendToSlack={sendToSlack} />;
      case "attendance": return <AttendanceTracker />;
      case "tasks": return <TaskManagement />;
      case "cos-insights": return <CoSInsights />;
      case "culture": return <CultureDashboard />;
      case "settings": return <Settings slackToken={slackToken} setSlackToken={setSlackToken} slackIds={slackIds} setSlackIds={setSlackIds} onChangePassword={setCurrentPassword} sendToSlack={sendToSlack} />;
      default: return <Dashboard navigate={navigate} />;
    }
  };








  return (
    <>
      <GlobalStyle />
      <div style={{minHeight:"100vh",background:T.bg}}>
        <TopNav page={page} navigate={navigate} isMobile={isMobile} onLock={()=>setUnlocked(false)} />
        <PageWrapper page={page}>{renderPage()}</PageWrapper>
      </div>
    </>
  );
}
