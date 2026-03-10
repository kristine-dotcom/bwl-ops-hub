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


const todayStr = () => new Date().toISOString().split("T")[0];
const weekLabel = () => {
  const now=new Date(),day=now.getDay(),mon=new Date(now);
  mon.setDate(now.getDate()-(day===0?6:day-1));
  return `Week of ${mon.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`;
};
const useIsMobile = () => {
  const [m,setM]=useState(window.innerWidth<=768);
  useEffect(()=>{ const h=()=>setM(window.innerWidth<=768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]);
  return m;
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
    try {
      await storage.set("attendance-logs",JSON.stringify(nl));
      localStorage.setItem("attendance-logs-backup", JSON.stringify(nl)); // Backup
      console.log("✅ Logs saved:", nl.length, "entries");
    } catch(error) {
      console.error("❌ Error saving logs:", error);
    }
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
        console.log("🔵 Loading all data from storage...");
        const today = todayStr();
        console.log("📅 Today's date key:", today);
        
        // Load attendance logs
        const logsResult = await storage.get("attendance-logs");
        if(logsResult?.value) {
          const loadedLogs = JSON.parse(logsResult.value);
          setLogs(loadedLogs);
          localStorage.setItem("attendance-logs-backup", logsResult.value); // Backup
          console.log("✅ Loaded logs from storage:", loadedLogs.length, "entries");
        } else {
          // Try localStorage backup
          const backup = localStorage.getItem("attendance-logs-backup");
          if(backup) {
            const loadedLogs = JSON.parse(backup);
            setLogs(loadedLogs);
            await storage.set("attendance-logs", backup); // Restore to storage
            console.log("✅ Restored logs from localStorage backup:", loadedLogs.length, "entries");
          } else {
            console.log("ℹ️ No logs found in storage or backup");
          }
        }
        
        // Load SOD submissions for today
        const sodKey = `sod-${today}`;
        console.log("🔍 Looking for SOD with key:", sodKey);
        const sodResult = await storage.get(sodKey);
        if(sodResult?.value) {
          const loadedSod = JSON.parse(sodResult.value);
          setSodSubmissions(loadedSod);
          console.log("✅ Loaded SOD from artifact storage:", Object.keys(loadedSod).length, "submissions");
          console.log("📋 SOD members:", Object.keys(loadedSod).join(", "));
        } else {
          console.log("ℹ️ No SOD submissions found for today");
        }
        
        // Load EOD submissions for today
        const eodKey = `eod-${today}`;
        console.log("🔍 Looking for EOD with key:", eodKey);
        const eodResult = await storage.get(eodKey);
        if(eodResult?.value) {
          const loadedEod = JSON.parse(eodResult.value);
          setEodSubmissions(loadedEod);
          console.log("✅ Loaded EOD from artifact storage:", Object.keys(loadedEod).length, "submissions");
          console.log("📋 EOD members:", Object.keys(loadedEod).join(", "));
        } else {
          console.log("ℹ️ No EOD submissions found for today");
        }
        
        // Load Slack webhook (legacy)
        const webhookResult = await storage.get("slack-webhook");
        if(webhookResult?.value) {
          setSlackWebhook(webhookResult.value);
        }
        
        console.log("✅ All data loaded successfully");
      } catch(error) {
        console.error("❌ Error loading data from storage:", error);
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


  const handleSODSubmit=async(sod)=>{
    const updated={...sodSubmissions,[sod.member]:sod};
    setSodSubmissions(updated);
    const sodKey = `sod-${todayStr()}`;
    const sodData = JSON.stringify(updated);
    try {
      await storage.set(sodKey, sodData);
      console.log("✅ SOD saved for", sod.member, "- Key:", sodKey, "- Total:", Object.keys(updated).length);
      console.log("📋 All SOD members:", Object.keys(updated).join(", "));
    } catch(error) {
      console.error("❌ Error saving SOD:", error);
    }
    setShowSodForm(false);
    const ts=new Date().toISOString();
    const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    const nl=[...logs,{id:Date.now(),member:sod.member,type:"in",date:todayStr(),time,timestamp:ts}];
    saveLogs(nl);
    setConfirmed(true);
    setTimeout(()=>setConfirmed(false),2500);
    
    // Slack notifications
    const sodCount = Object.keys(updated).length;
    const userSlackId = DEFAULT_SLACK_IDS[sod.member];
    
    // Personal DM to user
    if (userSlackId) {
      sendToSlack(`🟢 *You logged in at ${time}*`, userSlackId);
      sendToSlack(`✅ *Your SOD was submitted!*\n\n*Tasks for today:*\n${sod.tasks.map((t,i)=>`${i+1}. ${t.task} [${t.priority}]`).join("\n")}\n\n*Metrics:* ${sod.metrics || "None specified"}`, userSlackId);
    }
    
    // Admin summary to channel
    const tasksList = sod.tasks.map((t,i)=>`${i+1}. ${t.task} [${t.priority}]`).join("\n");
    sendToSlack(`📋 *SOD Update:* ${sod.member} submitted SOD (${sodCount}/${TEAM_OPS.length} complete)\n\n*Tasks for today:*\n${tasksList}\n\n*Metrics:* ${sod.metrics || "None specified"}`);
  };


  const handleEODSubmit=async(eod)=>{
    const updated={...eodSubmissions,[eod.member]:eod};
    setEodSubmissions(updated);
    const eodKey = `eod-${todayStr()}`;
    const eodData = JSON.stringify(updated);
    try {
      await storage.set(eodKey, eodData);
      console.log("✅ EOD saved for", eod.member, "- Key:", eodKey, "- Total:", Object.keys(updated).length);
      console.log("📋 All EOD members:", Object.keys(updated).join(", "));
    } catch(error) {
      console.error("❌ Error saving EOD:", error);
    }
    setShowEodForm(false);
    const ts=new Date().toISOString();
    const time=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
    const nl=[...logs,{id:Date.now(),member:eod.member,type:"out",date:todayStr(),time,timestamp:ts}];
    saveLogs(nl);
    setConfirmed(true);
    setTimeout(()=>setConfirmed(false),2500);
    
    // Slack notifications
    const eodCount = Object.keys(updated).length;
    const metricsText = eod.metrics.map(m => `• ${m.name}: ${m.value}`).join("\n");
    const userSlackId = DEFAULT_SLACK_IDS[eod.member];
    
    // Personal DM to user
    if (userSlackId) {
      sendToSlack(`🔴 *You logged out at ${time}*`, userSlackId);
      sendToSlack(`📊 *Your EOD was submitted!*\n\n*Today's Metrics:*\n${metricsText}\n\nGreat work today! 🎉`, userSlackId);
    }
    
    // Admin summary to channel
    sendToSlack(`📊 *EOD Update:* ${eod.member} submitted EOD (${eodCount} today)\n\n*Today's Metrics:*\n${metricsText}`);
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


// ─── OPS PULSE ────────────────────────────────────────────────────────────────
function OpsPulse({slackIds}) {
  const [inputs,setInputs]=useState({transcript:"",sod:"",email:"",slack:""});
  const [activeTab,setActiveTab]=useState("transcript");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [checked,setChecked]=useState({});
  const [selectedMember,setSelectedMember]=useState(null);
  const [view,setView]=useState("sod");
  const [slackStatus,setSlackStatus]=useState({});
  const [showInput,setShowInput]=useState(false);
  const [storageLoading,setStorageLoading]=useState(true);
  const [history,setHistory]=useState([]);
  const [dmContext,setDmContext]=useState({});
  const [showDmContext,setShowDmContext]=useState({});
  const [editingTask,setEditingTask]=useState(null);
  const [editingTaskText,setEditingTaskText]=useState("");
  const [showKpi,setShowKpi]=useState(true);
  const [showEod,setShowEod]=useState(false);
  const [sodSubmissions,setSodSubmissions]=useState({});
  const [expandedSod,setExpandedSod]=useState(null);


  useEffect(()=>{
    Promise.all([
      storage.get("ops-pulse-current"),
      storage.get("ops-pulse-checked"),
      storage.get("ops-pulse-history"),
      storage.get(`sod-${todayStr()}`)
    ]).then(([r,c,h,s])=>{
      if(r) setResult(JSON.parse(r.value));
      if(c) setChecked(JSON.parse(c.value));
      if(h) setHistory(JSON.parse(h.value));
      if(s) setSodSubmissions(JSON.parse(s.value));
      setStorageLoading(false);
    });
  },[]);


  // Refresh SOD every 30s
  useEffect(()=>{
    const t=setInterval(async()=>{
      const s=await storage.get(`sod-${todayStr()}`);
      if(s) setSodSubmissions(JSON.parse(s.value));
    },30000);
    return ()=>clearInterval(t);
  },[]);


  const isOverdue=(dueDay)=>{if(!dueDay) return false;const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];return days.indexOf(dueDay)!==-1&&days.indexOf(dueDay)<new Date().getDay();};


  const saveToHistory=async(res,chk)=>{
    const weekKey=(()=>{const d=new Date();const day=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));return mon.toISOString().split("T")[0];})();
    const memberStats=TEAM_OPS.map(m=>{const tasks=res?.team_tasks?.[m]?.tasks||[];const done=tasks.filter((_,i)=>chk[`${m}-${i}`]).length;const overdue=tasks.filter((t,i)=>!chk[`${m}-${i}`]&&isOverdue(t.due_day)).length;return {name:m,total:tasks.length,done,overdue,blockers:res?.team_tasks?.[m]?.blockers||[]};});
    const total=memberStats.reduce((a,m)=>a+m.total,0);const done=memberStats.reduce((a,m)=>a+m.done,0);
    const snapshot={weekKey,weekLabel:weekLabel(),savedAt:new Date().toISOString(),teamCompletion:total?Math.round((done/total)*100):0,totalTasks:total,doneTasks:done,overdueCount:memberStats.reduce((a,m)=>a+m.overdue,0),memberStats,blockers:memberStats.flatMap(m=>m.blockers),summary:res?.week_summary||""};
    const existing=await storage.get("ops-pulse-history");let hist=existing?JSON.parse(existing.value):[];hist=hist.filter(h=>h.weekKey!==weekKey);hist=[snapshot,...hist].slice(0,4);setHistory(hist);await storage.set("ops-pulse-history",JSON.stringify(hist));
  };


  const clearTasks=async()=>{if(result) await saveToHistory(result,checked);setResult(null);setChecked({});await storage.delete("ops-pulse-current");await storage.delete("ops-pulse-checked");};


  const sendDM=async(member,extraContext)=>{
    const userId=slackIds?.[member];if(!userId){setSlackStatus(p=>({...p,[member]:"NO ID"}));return;}
    const tokenData=await storage.get("slack-token");const token=tokenData?.value;if(!token){setSlackStatus(p=>({...p,[member]:"NO TOKEN"}));return;}
    const tasks=result?.team_tasks?.[member]?.tasks||[];
    const taskLines=tasks.map((t,i)=>`${i+1}. [${t.priority?.toUpperCase()}] ${t.task}${t.due?` (${t.due})`:""}`).join("\n");
    const contextNote=extraContext?.trim()?`\n\n📌 *Note from Kristine:*\n${extraContext}`:"";
    const text=`*Your Tasks — ${weekLabel()}*\nHi ${member.split(" ")[0]}! Here are your tasks for this week:\n\n${taskLines}${contextNote}\n\n_Sent from BWL Operations Hub_`;
    setSlackStatus(p=>({...p,[member]:"SENDING…"}));
    try {
      const res=await fetch("https://slack.com/api/chat.postMessage",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({channel:userId,text})});
      const data=await res.json();if(!data.ok) throw new Error(data.error);
      setSlackStatus(p=>({...p,[member]:"SENT ✓"}));setShowDmContext(p=>({...p,[member]:false}));setDmContext(p=>({...p,[member]:""}));
    } catch {setSlackStatus(p=>({...p,[member]:"FAILED"}));}
    setTimeout(()=>setSlackStatus(p=>({...p,[member]:null})),3000);
  };


  const addTask=async(member)=>{const newTask={task:"New task",priority:"medium",due:"EOW",due_day:"Friday",type:"action"};const updated={...result,team_tasks:{...result.team_tasks,[member]:{...result.team_tasks[member],tasks:[...(result.team_tasks[member]?.tasks||[]),newTask]}}};setResult(updated);await storage.set("ops-pulse-current",JSON.stringify(updated));};
  const deleteTask=async(member,idx)=>{const tasks=result.team_tasks[member].tasks.filter((_,i)=>i!==idx);const updated={...result,team_tasks:{...result.team_tasks,[member]:{...result.team_tasks[member],tasks}}};setResult(updated);const newChecked={...checked};delete newChecked[`${member}-${idx}`];setChecked(newChecked);await storage.set("ops-pulse-current",JSON.stringify(updated));await storage.set("ops-pulse-checked",JSON.stringify(newChecked));};
  const saveTaskEdit=async(member,idx)=>{const tasks=[...result.team_tasks[member].tasks];tasks[idx]={...tasks[idx],task:editingTaskText};const updated={...result,team_tasks:{...result.team_tasks,[member]:{...result.team_tasks[member],tasks}}};setResult(updated);setEditingTask(null);await storage.set("ops-pulse-current",JSON.stringify(updated));};
  const updateTaskField=async(member,idx,field,value)=>{const tasks=[...result.team_tasks[member].tasks];tasks[idx]={...tasks[idx],[field]:value};const updated={...result,team_tasks:{...result.team_tasks,[member]:{...result.team_tasks[member],tasks}}};setResult(updated);await storage.set("ops-pulse-current",JSON.stringify(updated));};


  const hasInput=Object.values(inputs).some(v=>v.trim());


  const generate=async()=>{
    setLoading(true);setResult(null);setError(null);setChecked({});
    await storage.delete("ops-pulse-current");await storage.delete("ops-pulse-checked");
    const context=INPUT_TYPES.filter(t=>inputs[t.key].trim()).map(t=>`=== ${t.label} ===\n${inputs[t.key]}`).join("\n\n");
    const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
    const prompt=`You are AI Chief of Staff for BuildWithLeverage. Today is ${today}. Generate weekly tasks per team member. Team: ${TEAM_OPS.join(", ")}. IMPORTANT: SOD Report tasks belong to Kristine Mirabueno unless stated otherwise. For each task include due_day (Monday/Tuesday/Wednesday/Thursday/Friday/EOW). INPUTS:\n${context}\nReturn ONLY valid JSON: {"week_summary":"...","team_tasks":{"Suki Santos":{"role":"...","tasks":[{"task":"...","priority":"high|medium|low","due":"...","due_day":"Monday","type":"action|follow-up|proactive"}],"blockers":[]},"Kristine Mirabueno":{"role":"...","tasks":[],"blockers":[]},"Kristine Miel Zulaybar":{"role":"...","tasks":[],"blockers":[]},"Caleb Bentil":{"role":"...","tasks":[],"blockers":[]},"David Perlov":{"role":"...","tasks":[],"blockers":[]},"Cyril Butanas":{"role":"...","tasks":[],"blockers":[]},"Darlene Mae Malolos":{"role":"...","tasks":[],"blockers":[]}},"follow_ups_needed":["..."],"risks":["..."]}`;
    try {
      const data=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:8000,messages:[{role:"user",content:prompt}]});
      if(data.error) throw new Error(data.error.message);
      const text=data.content?.find(b=>b.type==="text")?.text||"";
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
      setResult(parsed);setShowInput(false);await storage.set("ops-pulse-current",JSON.stringify(parsed));
    } catch(e){setError(e.message);}
    setLoading(false);
  };


  const toggleCheck=async(member,idx)=>{const newChecked={...checked,[`${member}-${idx}`]:!checked[`${member}-${idx}`]};setChecked(newChecked);await storage.set("ops-pulse-checked",JSON.stringify(newChecked));};
  const getProgress=m=>{const t=result?.team_tasks?.[m]?.tasks||[];if(!t.length) return 0;return Math.round((t.filter((_,i)=>checked[`${m}-${i}`]).length/t.length)*100);};
  const teamProgress=()=>{if(!result) return 0;let total=0,done=0;TEAM_OPS.forEach(m=>{const t=result.team_tasks?.[m]?.tasks||[];total+=t.length;done+=t.filter((_,i)=>checked[`${m}-${i}`]).length;});return total?Math.round((done/total)*100):0;};
  const pColor=p=>({high:T.red,medium:T.yellow,low:T.green}[p]||T.gray);
  const tIcon=t=>({action:"→","follow-up":"↻",proactive:"↑"}[t]||"·");


  const sodCount=Object.keys(sodSubmissions).length;
  const notSubmitted=TEAM_OPS.filter(m=>!sodSubmissions[m]);


  if(storageLoading) return <LoadingScreen />;


  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>


      {/* VIEW TABS — SOD now first */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[["sod",`📝 SOD TODAY (${sodCount}/${TEAM_OPS.length})`],["team","👥 TASKS"],["person","👤 MEMBER"],["history","📋 HISTORY"]].map(([v,l])=>(
          <Pill key={v} label={l} active={view===v} onClick={()=>{setView(v);if(v==="team") setSelectedMember(null);}} />
        ))}
        {view!=="sod"&&(
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={()=>setShowInput(!showInput)}
              style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:showInput?T.black:T.orange,color:"#fff",border:`2px solid ${showInput?T.black:T.orange}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
              {showInput?"✕ CLOSE":result?"+ NEW WEEK":"+ GENERATE TASKS"}
            </button>
            {result&&<button onClick={clearTasks} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:"#FEF2F2",color:T.red,border:`2px solid ${T.red}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>CLEAR</button>}
          </div>
        )}
      </div>


      {/* ── SOD VIEW (default) ── */}
      {view==="sod"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[["SOD SUBMITTED",sodCount,sodCount===TEAM_OPS.length?T.green:T.yellow],["PENDING",notSubmitted.length,notSubmitted.length>0?T.red:T.green],["DATE",new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),T.orange]].map(([l,v,c])=>(
              <div key={l} style={{background:T.black,padding:"14px 18px"}}>
                <div style={{fontSize:9,color:"#555",fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>{l}</div>
                <div style={{fontSize:26,fontWeight:900,color:c,fontFamily:T.font,lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>


          {notSubmitted.length>0&&(
            <div style={{background:"#fef2f2",border:`2px solid ${T.red}`,padding:"10px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:T.red,fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>⚠ WAITING FOR SOD — CANNOT LOG IN</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {notSubmitted.map(m=>(
                  <div key={m} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",border:`1px solid ${T.red}`,padding:"3px 10px"}}>
                    <Avatar name={m} size={18} muted /><span style={{fontSize:11,fontWeight:600,color:T.red}}>{m.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


          {TEAM_OPS.map(member=>{
            const sod=sodSubmissions[member];
            const isExpanded=expandedSod===member;
            return (
              <Card key={member} style={{overflow:"hidden",borderLeft:`4px solid ${sod?T.green:T.red}`}}>
                <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:sod?"pointer":"default"}} onClick={()=>sod&&setExpandedSod(isExpanded?null:member)}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Avatar name={member} size={36} muted={!sod} />
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{member}</div>
                      {sod
                        ?<div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginTop:2}}>Submitted @ {sod.submittedAt} · {sod.tasks.length} task{sod.tasks.length!==1?"s":""}{sod.blockers?" · ⚠ blocker":""}</div>
                        :<div style={{fontSize:10,color:T.red,fontFamily:T.mono,marginTop:2}}>No SOD submitted yet</div>
                      }
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {sod?<Badge label="SOD ✓" color={T.green} />:<Badge label="PENDING" color={T.red} />}
                    {sod&&<span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>{isExpanded?"▲":"▼"}</span>}
                  </div>
                </div>
                {sod&&isExpanded&&(
                  <div style={{borderTop:`2px solid ${T.black}`,padding:14,background:T.bg,display:"flex",flexDirection:"column",gap:6}}>
                    {sod.tasks.map((t,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface,borderLeft:`3px solid ${priorityColor(t.priority)}`}}>
                        <div style={{flex:1,fontSize:12,color:T.black}}>{t.task}</div>
                        <Badge label={t.priority} color={priorityColor(t.priority)} />
                        <span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>{t.eta}</span>
                      </div>
                    ))}
                    {sod.metrics&&(
                      <div style={{padding:"8px 12px",background:"#f0fdf4",borderLeft:`3px solid ${T.green}`,fontSize:12,color:T.darkGray}}>
                        <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.green,display:"block",marginBottom:2}}>METRICS TARGET</span>{sod.metrics}
                      </div>
                    )}
                    {sod.blockers&&(
                      <div style={{padding:"8px 12px",background:"#fff8f0",borderLeft:`3px solid ${T.orange}`,fontSize:12,color:T.darkGray}}>
                        <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:T.orange,display:"block",marginBottom:2}}>BLOCKERS</span>{sod.blockers}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}


      {/* Generate input */}
      {view!=="sod"&&(showInput||!result)&&(
        <Card>
          <div style={{display:"flex",borderBottom:`2px solid ${T.black}`}}>
            {INPUT_TYPES.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{flex:1,padding:"12px 8px",fontSize:11,fontWeight:700,background:activeTab===t.key?T.black:"transparent",color:activeTab===t.key?T.orange:T.gray,border:"none",borderBottom:activeTab===t.key?`3px solid ${T.orange}`:"3px solid transparent",cursor:"pointer",transition:"all 0.15s",fontFamily:T.mono,letterSpacing:1,textTransform:"uppercase"}}>
                {t.label}{inputs[t.key].trim()&&<span style={{marginLeft:4,color:T.green,fontSize:14}}>·</span>}
              </button>
            ))}
          </div>
          <textarea value={inputs[activeTab]} onChange={e=>setInputs(p=>({...p,[activeTab]:e.target.value}))} placeholder={`Paste ${INPUT_TYPES.find(t=>t.key===activeTab)?.label} here…`}
            style={{width:"100%",minHeight:140,background:"transparent",border:"none",color:T.black,fontSize:13,padding:18,resize:"vertical",outline:"none",fontFamily:T.body,lineHeight:1.7,display:"block"}} />
          <div style={{padding:"0 16px 16px"}}><Btn onClick={generate} disabled={!hasInput} loading={loading} label={`Generate Ops Pulse — ${weekLabel()}`} icon="⚡" /></div>
          {error&&<div style={{padding:"0 16px 16px"}}><Err msg={error} /></div>}
        </Card>
      )}


      {result&&view!=="sod"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <CardLabel color={T.orange}>{weekLabel()}</CardLabel>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:28,fontWeight:900,color:teamProgress()===100?T.green:T.orange,fontFamily:T.font,lineHeight:1}}>{teamProgress()}%</div>
                <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>TEAM DONE</div>
              </div>
            </div>
            <ProgressBar value={teamProgress()} height={8} />
            <p style={{margin:"14px 0 0",color:T.darkGray,fontSize:13,lineHeight:1.7}}>{result.week_summary}</p>
          </Card>


          {view==="team"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {TEAM_OPS.map(member=>{
                const d=result.team_tasks?.[member];if(!d) return null;
                const tasks=d.tasks||[],p=getProgress(member);
                const overdueCount=tasks.filter((t,i)=>!checked[`${member}-${i}`]&&isOverdue(t.due_day)).length;
                const hasSod=!!sodSubmissions[member];
                return (
                  <Card key={member} hover>
                    <div onClick={()=>{setSelectedMember(member);setView("person");}} style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                      <Avatar name={member} muted={!hasSod} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                          <span style={{fontWeight:600,fontSize:14}}>{member}</span>
                          <span style={{fontSize:11,color:T.grayLight}}>{d.role}</span>
                          {!hasSod&&<Badge label="NO SOD" color={T.red} />}
                          {overdueCount>0&&<Badge label={`${overdueCount} overdue`} color={T.red} />}
                        </div>
                        <ProgressBar value={p} height={5} />
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                        <span style={{fontSize:14,fontWeight:800,color:p===100?T.green:T.orange,fontFamily:T.font,minWidth:36,textAlign:"right"}}>{p}%</span>
                        <button onClick={e=>{e.stopPropagation();sendDM(member,"");}}
                          style={{background:slackStatus[member]?T.green:T.black,color:"#fff",border:"none",borderRadius:0,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:T.mono,letterSpacing:1}}>
                          {slackStatus[member]||"DM"}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div style={{marginLeft:"auto"}}>
                <button onClick={()=>TEAM_OPS.forEach(m=>{if(result?.team_tasks?.[m]?.tasks?.length) sendDM(m,"");})}
                  style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:"#1a1a2e",color:"#a78bfa",border:"2px solid #2a2a4a",cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                  SLACK ALL
                </button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                <Bullets label="Follow-ups Needed" items={result.follow_ups_needed} color={T.green} />
                <Bullets label="Risks" items={result.risks} color={T.red} />
              </div>
            </div>
          )}


          {view==="person"&&(
            <div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                {TEAM_OPS.map(m=><Pill key={m} label={`${m.split(" ")[0]} ${getProgress(m)}%`} active={selectedMember===m} onClick={()=>setSelectedMember(m)} />)}
              </div>
              {selectedMember&&(()=>{
                const d=result.team_tasks?.[selectedMember];if(!d) return null;
                const tasks=d.tasks||[],done=tasks.filter((_,i)=>checked[`${selectedMember}-${i}`]).length,p=tasks.length?Math.round((done/tasks.length)*100):0;
                const hasSod=!!sodSubmissions[selectedMember];
                const sod=sodSubmissions[selectedMember];
                return (
                  <Card style={{padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <Avatar name={selectedMember} size={44} muted={!hasSod} />
                        <div>
                          <div style={{fontWeight:700,fontSize:16}}>{selectedMember}</div>
                          <div style={{fontSize:12,color:T.grayLight,marginTop:2}}>{d.role}</div>
                          {hasSod&&<div style={{fontSize:10,color:T.green,fontFamily:T.mono,marginTop:3}}>SOD @ {sod.submittedAt}</div>}
                          {!hasSod&&<div style={{fontSize:10,color:T.red,fontFamily:T.mono,marginTop:3}}>No SOD submitted</div>}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:26,fontWeight:900,color:p===100?T.green:T.orange,fontFamily:T.font,lineHeight:1}}>{p}%</div>
                        <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>{done}/{tasks.length} DONE</div>
                      </div>
                    </div>
                    <ProgressBar value={p} height={7} />


                    {/* SOD summary inline */}
                    {sod&&(
                      <div style={{marginTop:14,background:T.bg,border:`2px solid ${T.green}`,padding:12}}>
                        <div style={{fontSize:9,fontWeight:700,color:T.green,fontFamily:T.mono,letterSpacing:2,marginBottom:8}}>TODAY'S SOD</div>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {sod.tasks.map((t,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.darkGray}}>
                              <span style={{color:priorityColor(t.priority)}}>·</span>{t.task}
                              <span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginLeft:"auto"}}>{t.eta}</span>
                            </div>
                          ))}
                          {sod.metrics&&<div style={{fontSize:11,color:T.green,fontFamily:T.mono,marginTop:4}}>📊 {sod.metrics}</div>}
                          {sod.blockers&&<div style={{fontSize:11,color:T.orange,fontFamily:T.mono,marginTop:2}}>⚠ {sod.blockers}</div>}
                        </div>
                      </div>
                    )}


                    <div style={{marginTop:14,background:T.bg,border:`2px solid ${T.black}`,padding:12}}>
                      {showDmContext[selectedMember]?(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{fontSize:11,color:T.gray,fontWeight:700,letterSpacing:1,fontFamily:T.mono}}>ADD NOTE TO SLACK DM (OPTIONAL)</div>
                          <textarea value={dmContext[selectedMember]||""} onChange={e=>setDmContext(p=>({...p,[selectedMember]:e.target.value}))} placeholder="e.g. Please prioritize the first 2 tasks this week…"
                            style={{width:"100%",minHeight:70,background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical"}} />
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>sendDM(selectedMember,dmContext[selectedMember])} style={{flex:1,padding:"9px 0",background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>{slackStatus[selectedMember]||"SEND DM"}</button>
                            <button onClick={()=>setShowDmContext(p=>({...p,[selectedMember]:false}))} style={{padding:"9px 16px",background:T.surface,color:T.gray,border:`2px solid ${T.black}`,fontSize:11,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setShowDmContext(p=>({...p,[selectedMember]:true}))} style={{flex:1,padding:"9px 0",background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>📩 SEND SLACK DM</button>
                          <button onClick={()=>addTask(selectedMember)} style={{padding:"9px 16px",background:T.surface,color:T.orange,border:`2px solid ${T.orange}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>+ ADD TASK</button>
                        </div>
                      )}
                    </div>
                    <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                      {tasks.map((t,i)=>{
                        const key=`${selectedMember}-${i}`,isDone=checked[key],overdue=!isDone&&isOverdue(t.due_day);
                        const isEditingThis=editingTask===key;
                        return (
                          <div key={i} style={{background:isDone?"#F0FDF4":overdue?"#FFF7F5":T.bg,padding:"12px 14px",border:`2px solid ${isDone?T.green:overdue?T.orange:T.black}`}}>
                            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                              <div onClick={()=>!isEditingThis&&toggleCheck(selectedMember,i)} style={{width:20,height:20,border:`2px solid ${isDone?T.green:overdue?T.orange:T.black}`,background:isDone?T.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,cursor:"pointer"}}>
                                {isDone&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
                              </div>
                              <div style={{flex:1}}>
                                {isEditingThis?(
                                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    <input autoFocus value={editingTaskText} onChange={e=>setEditingTaskText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") saveTaskEdit(selectedMember,i);if(e.key==="Escape") setEditingTask(null);}}
                                      style={{width:"100%",background:T.surface,border:`2px solid ${T.orange}`,color:T.black,fontSize:13,padding:"6px 10px",outline:"none",fontFamily:T.body}} />
                                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                      <select value={t.priority} onChange={e=>updateTaskField(selectedMember,i,"priority",e.target.value)} style={{background:T.surface,border:`2px solid ${T.black}`,color:T.black,fontSize:11,padding:"4px 8px",outline:"none"}}>{["high","medium","low"].map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}</select>
                                      <select value={t.due_day} onChange={e=>updateTaskField(selectedMember,i,"due_day",e.target.value)} style={{background:T.surface,border:`2px solid ${T.black}`,color:T.black,fontSize:11,padding:"4px 8px",outline:"none"}}>{["Monday","Tuesday","Wednesday","Thursday","Friday","EOW"].map(d=><option key={d} value={d}>{d}</option>)}</select>
                                      <button onClick={()=>saveTaskEdit(selectedMember,i)} style={{background:T.green,color:"#fff",border:`2px solid ${T.green}`,padding:"4px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE</button>
                                      <button onClick={()=>setEditingTask(null)} style={{background:T.bg,color:T.gray,border:`2px solid ${T.black}`,padding:"4px 12px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button>
                                    </div>
                                  </div>
                                ):(
                                  <>
                                    <div style={{fontSize:13,color:isDone?T.grayLight:T.black,textDecoration:isDone?"line-through":"none",lineHeight:1.5}}><span style={{opacity:0.5,marginRight:6}}>{tIcon(t.type)}</span>{t.task}</div>
                                    <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                                      <Badge label={t.priority} color={pColor(t.priority)} />
                                      {t.due_day&&<span style={{fontSize:10,color:overdue?T.orange:T.grayLight,fontFamily:T.mono}}>{overdue?"⚠ OVERDUE · ":""}{t.due_day}</span>}
                                    </div>
                                  </>
                                )}
                              </div>
                              {!isEditingThis&&(
                                <div style={{display:"flex",gap:2,flexShrink:0}}>
                                  <button onClick={()=>{setEditingTask(key);setEditingTaskText(t.task);}} style={{background:"transparent",border:"none",color:T.grayLight,fontSize:14,cursor:"pointer",padding:"2px 6px"}}>✏️</button>
                                  <button onClick={()=>deleteTask(selectedMember,i)} style={{background:"transparent",border:"none",color:T.grayLight,fontSize:14,cursor:"pointer",padding:"2px 6px"}}>🗑</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {d.blockers?.length>0&&(
                      <div style={{background:T.orangeSoft,border:`2px solid ${T.orange}`,padding:"12px 16px",marginTop:14}}>
                        <CardLabel color={T.orange}>Blockers</CardLabel>
                        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>{d.blockers.map((b,i)=><div key={i} style={{fontSize:13,color:T.darkGray}}>· {b}</div>)}</div>
                      </div>
                    )}
                    {KPI_DATA[selectedMember]&&(()=>{
                      const kpi=KPI_DATA[selectedMember];
                      return (
                        <div style={{marginTop:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.black,padding:"10px 14px",cursor:"pointer"}} onClick={()=>setShowKpi(!showKpi)}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:14}}>{kpi.emoji}</span>
                              <span style={{fontSize:10,fontWeight:700,letterSpacing:2,color:kpi.color,fontFamily:T.mono}}>KPI TARGETS</span>
                              <span style={{fontSize:10,color:"#555",fontFamily:T.mono}}>{kpi.role}</span>
                            </div>
                            <span style={{fontSize:10,color:"#555",fontFamily:T.mono}}>{showKpi?"▲ HIDE":"▼ SHOW"}</span>
                          </div>
                          {showKpi&&(
                            <div style={{border:`2px solid ${T.black}`,borderTop:"none",padding:14,display:"flex",flexDirection:"column",gap:12}}>
                              {kpi.categories.map((cat,ci)=>(
                                <div key={ci}>
                                  <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:T.grayLight,fontFamily:T.mono,marginBottom:8}}>{cat.name.toUpperCase()}</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                    {cat.metrics.map((m,mi)=>(
                                      <div key={mi} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",background:T.bg,borderLeft:`3px solid ${kpi.color}`}}>
                                        <div style={{flex:1}}>
                                          <div style={{fontSize:12,fontWeight:700,color:T.black}}>{m.name}</div>
                                          <div style={{fontSize:10,color:T.grayLight,marginTop:2,fontFamily:T.mono}}>{m.notes}</div>
                                        </div>
                                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                                          <span style={{fontSize:10,fontWeight:700,color:kpi.color,fontFamily:T.mono,background:kpi.color+"18",padding:"2px 6px",letterSpacing:1}}>TARGET: {m.target}</span>
                                          <span style={{fontSize:9,color:T.yellow,fontFamily:T.mono,background:T.yellow+"18",padding:"2px 6px",letterSpacing:1}}>STRETCH: {m.stretch}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
                                <button onClick={e=>{e.stopPropagation();setShowEod(!showEod);}} style={{background:"transparent",border:`2px solid ${T.black}`,padding:"6px 14px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1,color:T.darkGray}}>
                                  📝 {showEod?"HIDE":"VIEW"} EOD TEMPLATE
                                </button>
                                {showEod&&(
                                  <div style={{marginTop:10,background:"#1a1a1a",padding:14}}>
                                    <div style={{fontSize:9,color:kpi.color,fontWeight:700,letterSpacing:2,fontFamily:T.mono,marginBottom:10}}>END-OF-DAY UPDATE FORMAT</div>
                                    {kpi.eod.map((line,li)=>(
                                      <div key={li} style={{fontSize:12,color:"#ccc",fontFamily:T.mono,marginBottom:8,lineHeight:1.6}}><span style={{color:kpi.color,marginRight:6}}>·</span>{line}</div>
                                    ))}
                                    <div style={{marginTop:10,padding:"8px 12px",background:"#2a1a1a",borderLeft:`3px solid ${T.orange}`}}>
                                      <div style={{fontSize:10,color:T.orange,fontFamily:T.mono,lineHeight:1.6}}>📌 If there's a blocker: name the issue → 3 solutions → 1 recommendation.</div>
                                    </div>
                                    <button onClick={()=>navigator.clipboard.writeText(kpi.eod.join("\n"))} style={{marginTop:10,background:T.black,color:"#fff",border:`1px solid #333`,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>COPY TEMPLATE</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </Card>
                );
              })()}
            </div>
          )}


          {view==="history"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {history.length===0?(
                <Card style={{padding:40,textAlign:"center"}}>
                  <div style={{fontSize:32,marginBottom:12}}>📋</div>
                  <div style={{fontSize:14,fontWeight:600,color:T.black,marginBottom:6}}>No history yet</div>
                  <div style={{fontSize:13,color:T.grayLight}}>History is saved automatically when you start a new week.</div>
                </Card>
              ):history.map((h,hi)=>(
                <Card key={hi}>
                  <div style={{background:T.black,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:T.font}}>{h.weekLabel.toUpperCase()}</div>
                      <div style={{fontSize:11,color:T.gray,fontFamily:T.mono,marginTop:2}}>{new Date(h.savedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:30,fontWeight:900,color:h.teamCompletion===100?T.green:T.orange,fontFamily:T.font,lineHeight:1}}>{h.teamCompletion}%</div>
                      <div style={{fontSize:10,color:T.gray,fontFamily:T.mono}}>{h.doneTasks}/{h.totalTasks} DONE</div>
                    </div>
                  </div>
                  <div style={{padding:16}}>
                    <ProgressBar value={h.teamCompletion} height={5} />
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:14}}>
                      {[["TASKS",`${h.doneTasks}/${h.totalTasks}`,T.orange],["OVERDUE",h.overdueCount,h.overdueCount>0?T.red:T.green],["BLOCKERS",h.blockers.length,h.blockers.length>0?T.yellow:T.green]].map(([l,v,c])=>(
                        <div key={l} style={{background:T.bg,border:`2px solid ${T.black}`,padding:"10px 12px"}}>
                          <div style={{fontSize:9,color:T.grayLight,fontFamily:T.mono,letterSpacing:2,marginBottom:4}}>{l}</div>
                          <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:T.font}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
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
        const result = await storage.get("announcements");
        if(result?.value) {
          setAnnouncements(JSON.parse(result.value));
          localStorage.setItem("announcements-backup", result.value); // Backup
        } else {
          // Try localStorage backup
          const backup = localStorage.getItem("announcements-backup");
          if(backup) {
            setAnnouncements(JSON.parse(backup));
            await storage.set("announcements", backup); // Restore to storage
            console.log("✅ Restored announcements from localStorage backup");
          } else {
            // Only set default if storage AND backup are empty (first time)
            const defaultAnnouncement = [{
              id:1,
              text:"Welcome to the Leverage Operations Hub. Use this space for team-wide notes and announcements.",
              author:"David Perlov",
              date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
            }];
            setAnnouncements(defaultAnnouncement);
            const defaultData = JSON.stringify(defaultAnnouncement);
            await storage.set("announcements", defaultData);
            localStorage.setItem("announcements-backup", defaultData);
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
    const data = JSON.stringify(newAnnouncements);
    try {
      await storage.set("announcements", data);
      localStorage.setItem("announcements-backup", data); // Backup
      console.log("✅ Announcements saved to storage");
    } catch(error) {
      console.error("❌ Error saving announcements:", error);
      // Save to localStorage anyway as fallback
      localStorage.setItem("announcements-backup", data);
      console.log("⚠️ Saved announcements to localStorage backup only");
    }
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


// ─── RFP ENGINE ───────────────────────────────────────────────────────────────
const urgencyTag=(deadline)=>{if(!deadline) return null;const d=new Date(deadline),now=new Date(),diff=Math.ceil((d-now)/86400000);if(isNaN(diff)) return null;if(diff<0) return {label:"EXPIRED",color:T.gray};if(diff<=7) return {label:`${diff}d left`,color:T.red};if(diff<=21) return {label:`${diff}d left`,color:T.yellow};return {label:`${diff}d left`,color:T.green};};
function RFPEngine() {
  const [keywords,setKeywords]=useState("");const [rfps,setRfps]=useState([]);const [selected,setSelected]=useState(null);const [proposal,setProposal]=useState(null);const [loading,setLoading]=useState({search:false,proposal:false});const [error,setError]=useState(null);const [view,setView]=useState("search");const [tracker,setTracker]=useState([]);const [expandedScore,setExpandedScore]=useState(null);const [editedProposalText,setEditedProposalText]=useState("");
  useEffect(()=>{storage.get("rfp-tracker").then(s=>{if(s) setTracker(JSON.parse(s.value));});},[]);
  const setLoad=(k,v)=>setLoading(p=>({...p,[k]:v}));
  const persist=async(list)=>{setTracker(list);await storage.set("rfp-tracker",JSON.stringify(list));};
  const saveToTracker=(rfp,pt)=>{const e={id:Date.now(),title:rfp.title,organization:rfp.organization,type:rfp.type||"Other",budget:rfp.budget,deadline:rfp.deadline||"",services:rfp.services_needed||[],score:rfp.relevance_score,proposal:pt,status:"draft",revenue:"",notes:"",source_url:rfp.source_url||"",created_at:new Date().toISOString()};persist([e,...tracker]);};
  const updateStatus=(id,status)=>persist(tracker.map(t=>t.id===id?{...t,status}:t));
  const del=(id)=>persist(tracker.filter(t=>t.id!==id));
  const search=async()=>{
    setLoad("search",true);setError(null);setRfps([]);setSelected(null);setProposal(null);
    const prompt=`RFP research specialist for BuildWithLeverage. Find RFPs for: ${keywords}. Today is ${new Date().toISOString().split("T")[0]}. Return ONLY valid JSON: {"rfps":[{"id":"1","title":"...","organization":"...","type":"Government|Corporate|Nonprofit|Other","budget":"...","deadline":"YYYY-MM-DD or empty string","description":"2-3 sentences","relevance_score":85,"score_breakdown":{"strengths":["s1"],"gaps":["g1"],"overall":"1 sentence"},"why_bwl_can_win":"...","services_needed":["Outbound"],"source_url":"","source":""}]}`;
    try {
      const data=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:4000,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:prompt}]});
      if(data.error) throw new Error(data.error.message);
      const raw=data.content?.find(b=>b.type==="text")?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      setRfps(JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1)).rfps||[]);
    } catch(e){setError(e.message);}
    setLoad("search",false);
  };
  const genProposal=async(rfp)=>{
    setSelected(rfp);setProposal(null);setLoad("proposal",true);setError(null);
    try {
      const metaPrompt=`Proposal writer for BuildWithLeverage. RFP: ${rfp.title} | Org: ${rfp.organization} | Type: ${rfp.type} | Budget: ${rfp.budget} | Services: ${(rfp.services_needed||[]).join(", ")} Return ONLY valid JSON: {"subject_line":"A NEW [X] FOR [ORG]","why_bwl":["reason"],"relevant_results":["result"],"investment":"price","timeline":"timeline","requirements_checklist":[{"requirement":"req","addressed":true,"how":"how"}]}`;
      const d1=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:metaPrompt}]});
      if(d1.error) throw new Error(d1.error.message);
      const t1=(d1.content?.find(b=>b.type==="text")?.text||"").replace(/```json|```/g,"").trim();
      const meta=JSON.parse(t1.slice(t1.indexOf("{"),t1.lastIndexOf("}")+1));
      const textPrompt=`Senior proposal writer for LEVERAGE. Stats: $125M revenue, 11X ROAS, 20+ companies. RFP: ${rfp.title} | Org: ${rfp.organization} | Type: ${rfp.type} | Budget: ${rfp.budget} | Services: ${(rfp.services_needed||[]).join(", ")}\nWrite full proposal with sections: 01 // THE OPPORTUNITY, 02 // WHAT WE BUILD, 03 // THE PILOT, 04 // THE MATH (pipe table), 05 // INVESTMENT (pipe table), 06 // NEXT STEPS. Use // KEY INSIGHT for standout points. Plain text only.`;
      const d2=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:[{role:"user",content:textPrompt}]});
      if(d2.error) throw new Error(d2.error.message);
      const proposalText=d2.content?.find(b=>b.type==="text")?.text||"";
      setProposal({...meta,full_proposal_text:proposalText});setEditedProposalText(proposalText);
    } catch(e){setError(e.message);}
    setLoad("proposal",false);
  };
  const sc=s=>s>=80?T.green:s>=60?T.yellow:T.red;
  const ss=s=>({draft:{color:T.gray,label:"DRAFT"},submitted:{color:T.yellow,label:"SUBMITTED"},won:{color:T.green,label:"WON"},lost:{color:T.red,label:"LOST"}}[s]||{color:T.gray,label:s});
  const won=tracker.filter(t=>t.status==="won");
  const submitted=tracker.filter(t=>["submitted","won","lost"].includes(t.status));
  const winRate=submitted.length?Math.round((won.length/submitted.length)*100):0;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:8}}><Pill label="🔍 FIND RFPs" active={view==="search"} onClick={()=>setView("search")} /><Pill label={`📊 PIPELINE (${tracker.length})`} active={view==="tracker"} onClick={()=>setView("tracker")} /></div>
      {view==="search"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card><SectionHeader label="Search RFPs" /><div style={{padding:16,display:"flex",gap:10}}><Input value={keywords} onChange={setKeywords} placeholder="e.g. marketing services, digital advertising…" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&keywords.trim()&&search()} /><button onClick={search} disabled={!keywords.trim()||loading.search} style={{background:keywords.trim()?T.black:"#E5E0D8",color:keywords.trim()?"#fff":T.gray,border:`2px solid ${keywords.trim()?T.black:"#E5E0D8"}`,padding:"10px 20px",fontSize:12,fontWeight:700,cursor:keywords.trim()?"pointer":"not-allowed",whiteSpace:"nowrap",fontFamily:T.mono,letterSpacing:1}}>{loading.search?"SEARCHING…":"SEARCH"}</button></div></Card>
          <Err msg={error} />
          {rfps.length>0&&!proposal&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {rfps.map((rfp,i)=>{
                const urg=urgencyTag(rfp.deadline),isExp=expandedScore===rfp.id;
                return (
                  <Card key={i} style={{padding:18}} hover>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{rfp.title}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><span style={{fontSize:12,color:T.gray}}>{rfp.organization}</span><Badge label={rfp.type} color={T.gray} />{urg&&<Badge label={urg.label} color={urg.color} />}{rfp.budget&&<Badge label={rfp.budget} color={T.green} />}</div></div>
                      <div style={{textAlign:"center",marginLeft:14}}><div style={{fontSize:28,fontWeight:900,color:sc(rfp.relevance_score),fontFamily:T.font,lineHeight:1}}>{rfp.relevance_score}</div><button onClick={()=>setExpandedScore(isExp?null:rfp.id)} style={{fontSize:10,color:T.orange,fontWeight:700,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:T.mono}}>{isExp?"HIDE":"WHY?"}</button></div>
                    </div>
                    {isExp&&rfp.score_breakdown&&(<div style={{background:T.bg,border:`2px solid ${T.black}`,padding:14,marginBottom:10}}><CardLabel>Score Breakdown</CardLabel><div style={{fontSize:12,color:T.darkGray,margin:"8px 0"}}>{rfp.score_breakdown.overall}</div></div>)}
                    <p style={{margin:"0 0 10px",fontSize:13,color:T.darkGray,lineHeight:1.6}}>{rfp.description}</p>
                    {rfp.services_needed?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{rfp.services_needed.map((s,j)=><Badge key={j} label={s} color={T.orange} />)}</div>}
                    <button onClick={()=>genProposal(rfp)} style={{width:"100%",padding:"10px 0",background:loading.proposal&&selected?.id===rfp.id?"#E5E0D8":T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>{loading.proposal&&selected?.id===rfp.id?"GENERATING…":"GENERATE PROPOSAL"}</button>
                  </Card>
                );
              })}
            </div>
          )}
          {proposal&&selected&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><CardLabel>Branded Proposal</CardLabel><Pill label="← BACK" onClick={()=>{setProposal(null);setSelected(null);}} /></div>
              <BrandedProposal proposal={{...proposal,full_proposal_text:editedProposalText}} rfp={selected} />
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>navigator.clipboard.writeText(editedProposalText)} style={{flex:1,padding:12,background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>COPY</button>
                <button onClick={()=>{saveToTracker(selected,editedProposalText);setView("tracker");setProposal(null);setSelected(null);}} style={{flex:1,padding:12,background:T.green,color:"#fff",border:`2px solid ${T.green}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE TO PIPELINE</button>
              </div>
            </div>
          )}
        </div>
      )}
      {view==="tracker"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{background:T.black,padding:20}}><CardLabel color={T.orange}>Win Rate</CardLabel><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:14}}>{[["Total",tracker.length,T.orange],["Won",won.length,T.green],["Lost",tracker.filter(t=>t.status==="lost").length,T.red],["Win Rate",`${winRate}%`,winRate>=50?T.green:T.red]].map(([l,v,c])=>(<div key={l} style={{textAlign:"center",background:"#ffffff0d",border:"1px solid #333",padding:"12px 6px"}}><div style={{fontSize:22,fontWeight:900,color:c,fontFamily:T.font}}>{v}</div><div style={{fontSize:9,color:"#999",fontWeight:700,marginTop:2,fontFamily:T.mono}}>{l.toUpperCase()}</div></div>))}</div></Card>
          {tracker.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No proposals saved yet</div></Card>:
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {tracker.map(t=>(<Card key={t.id} style={{padding:18}} hover><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{t.title}</div><div style={{fontSize:11,color:T.gray,marginTop:3}}>{t.organization}</div></div><Badge label={ss(t.status).label} color={ss(t.status).color} /></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{t.status==="draft"&&<button onClick={()=>updateStatus(t.id,"submitted")} style={{background:T.bg,color:T.yellow,border:`2px solid ${T.yellow}`,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>SUBMITTED</button>}{t.status==="submitted"&&<><button onClick={()=>updateStatus(t.id,"won")} style={{background:T.bg,color:T.green,border:`2px solid ${T.green}`,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>WON</button><button onClick={()=>updateStatus(t.id,"lost")} style={{background:T.bg,color:T.red,border:`2px solid ${T.red}`,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>LOST</button></>}<button onClick={()=>del(t.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,padding:"6px 12px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button></div></Card>))}
            </div>
          }
        </div>
      )}
    </div>
  );
}


// ─── COS TOOLS ────────────────────────────────────────────────────────────────
function WeeklyReport() {
  const [updates,setUpdates]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Generate weekly status report for Kristine Mirabueno (CoS/EA) at BuildWithLeverage. Updates: ${updates}. Return ONLY valid JSON: {"executive_summary":"TL;DR","wins":["w1"],"in_progress":[{"item":"...","status":"..."}],"blockers":["b1"],"next_week":["p1"],"david_needs_to_know":["item"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Your Updates This Week" value={updates} onChange={setUpdates} placeholder="Type your updates…" /><Btn onClick={gen} disabled={!updates.trim()} loading={loading} label="Generate Weekly Report" icon="📄" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:20}}><CardLabel color={T.orange}>TL;DR</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:14,lineHeight:1.7}}>{result.executive_summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Wins" items={result.wins} color={T.green} /><Bullets label="Blockers" items={result.blockers} color={T.red} /></div><Bullets label="Next Week" items={result.next_week} color={T.purple} /></>}</div>);
}
function ExecComms() {
  const [context,setContext]=useState("");const [tone,setTone]=useState("professional");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`CoS at BuildWithLeverage. Tone: ${tone}. Context: ${context}. Return ONLY valid JSON: {"subject":"subject","draft":"complete message","alt_version":"alternative","tips":["tip"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["professional","friendly","direct","urgent"].map(t=><Pill key={t} label={t.toUpperCase()} active={tone===t} onClick={()=>setTone(t)} />)}</div><Textarea label="Context" value={context} onChange={setContext} placeholder="What do you need to communicate?" /><Btn onClick={gen} disabled={!context.trim()} loading={loading} label="Draft Comms" icon="✏️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject</CardLabel><div style={{fontSize:15,fontWeight:700,color:"#fff",marginTop:6}}>{result.subject}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Draft</CardLabel><CopyBtn text={result.draft} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.draft}</div></div></>}</div>);
}
function DailyBriefing() {
  const [input,setInput]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`AI Chief of Staff briefing for David Perlov, CEO. Input: ${input}. Return ONLY valid JSON: {"summary":"TL;DR","urgent_items":["item"],"fyi_items":["item"],"decisions_needed":["decision"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Updates / Reports / Slack" value={input} onChange={setInput} placeholder="Paste anything for today's briefing…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="Generate Daily Briefing" icon="☀️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>TL;DR</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:14,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Urgent" items={result.urgent_items} color={T.red} /><Bullets label="Decisions Needed" items={result.decisions_needed} color={T.purple} /></div><Bullets label="FYI" items={result.fyi_items} color={T.yellow} /></>}</div>);
}
function TeamPerformance() {
  const [input,setInput]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Analyze team performance for BuildWithLeverage. Team: ${TEAM_OPS.join(", ")}. Input: ${input}. Return ONLY valid JSON: {"overall_health":"green|yellow|red","summary":"overview","top_performers":["name: reason"],"needs_attention":["name: reason"],"recommended_actions":["action"],"david_focus":"what David should focus on"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  const hColor=h=>({green:T.green,yellow:T.yellow,red:T.red}[h]||T.gray);
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Team Updates / Reports" value={input} onChange={setInput} placeholder="Paste any team updates…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="Analyze Team Performance" icon="📊" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardLabel color={T.orange}>Team Health</CardLabel>{result.overall_health&&<Badge label={result.overall_health.toUpperCase()} color={hColor(result.overall_health)} />}</div><p style={{margin:0,color:"#fff",fontSize:13,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Top Performers" items={result.top_performers} color={T.green} /><Bullets label="Needs Attention" items={result.needs_attention} color={T.red} /></div><Bullets label="Recommended Actions" items={result.recommended_actions} color={T.yellow} /></>}</div>);
}
function StrategicDecision() {
  const [situation,setSituation]=useState("");const [options,setOptions]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Strategic advisor for David Perlov. Situation: ${situation}. Options: ${options||"not specified"}. Return ONLY valid JSON: {"recommendation":"recommended path","confidence":"high|medium|low","pros_cons":[{"option":"name","pros":["p1"],"cons":["c1"]}],"risks":"key risk","next_steps":["step"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  const confColor=c=>({high:T.green,medium:T.yellow,low:T.red}[c]||T.gray);
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Situation / Decision" value={situation} onChange={setSituation} placeholder="Describe the strategic decision…" /><Textarea label="Options (Optional)" value={options} onChange={setOptions} placeholder="List the options…" minHeight={80} /><Btn onClick={gen} disabled={!situation.trim()} loading={loading} label="Analyze Decision" icon="🧠" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><CardLabel color={T.orange}>Recommendation</CardLabel>{result.confidence&&<Badge label={`${result.confidence} confidence`} color={confColor(result.confidence)} />}</div><p style={{margin:0,color:"#fff",fontSize:14,lineHeight:1.7}}>{result.recommendation}</p></Card>{result.pros_cons?.map((o,i)=>(<Card key={i} style={{padding:16}}><div style={{fontWeight:700,fontSize:14,marginBottom:10}}>{o.option}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Pros" items={o.pros} color={T.green} /><Bullets label="Cons" items={o.cons} color={T.red} /></div></Card>))}<Bullets label="Next Steps" items={result.next_steps} color={T.purple} /></>}</div>);
}


// ─── OUTBOUND ─────────────────────────────────────────────────────────────────
function SequenceBuilder() {
  const [icp,setIcp]=useState("");const [goal,setGoal]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Build 3-email cold sequence for BuildWithLeverage. ICP: ${icp}. Goal: ${goal}. Return ONLY valid JSON: {"sequence_name":"name","emails":[{"step":1,"subject":"s","body":"full email","send_day":"Day 1","goal":"g"},{"step":2,"subject":"s","body":"full email","send_day":"Day 3","goal":"g"},{"step":3,"subject":"s","body":"full email","send_day":"Day 7","goal":"g"}],"tips":["t"]}`;try{const r=await callClaude(prompt,3000);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Target Audience / ICP" value={icp} onChange={setIcp} placeholder="Who are you targeting?" minHeight={80} /><Textarea label="Campaign Goal" value={goal} onChange={setGoal} placeholder="e.g. Book discovery call…" minHeight={70} /><Btn onClick={gen} disabled={!icp.trim()||!goal.trim()} loading={loading} label="Build Email Sequence" icon="✉️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Sequence: {result.sequence_name}</CardLabel></Card>{result.emails?.map((e,i)=>(<Card key={i} style={{padding:18}}><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><Badge label={`EMAIL ${e.step}`} color={T.black} bg={T.black} /><span style={{fontSize:10,color:T.gray,fontFamily:T.mono}}>{e.send_day}</span></div><div style={{fontSize:12,fontWeight:600,marginBottom:8,color:T.darkGray}}>Subject: {e.subject}</div><div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",background:T.bg,border:`2px solid ${T.black}`,padding:14}}>{e.body}</div></Card>))}</>}</div>);
}
function LeadResearch() {
  const [target,setTarget]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Lead research for BuildWithLeverage. Research: ${target}. Return ONLY valid JSON: {"company_summary":"2-3 sentences","pain_points":["p"],"why_bwl_fits":"reason","recommended_angle":"angle","talking_points":["t"],"estimated_fit_score":85}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Company / Lead to Research" value={target} onChange={setTarget} placeholder="Company name, website, or lead details…" minHeight={90} /><Btn onClick={gen} disabled={!target.trim()} loading={loading} label="Research Lead" icon="🔍" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{flex:1}}><CardLabel color={T.orange}>Overview</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.company_summary}</p></div><div style={{textAlign:"center",marginLeft:20}}><div style={{fontSize:34,fontWeight:900,color:result.estimated_fit_score>=80?T.green:result.estimated_fit_score>=60?T.yellow:T.red,fontFamily:T.font,lineHeight:1}}>{result.estimated_fit_score}</div><div style={{fontSize:9,color:T.gray,fontWeight:700,fontFamily:T.mono}}>FIT SCORE</div></div></div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Pain Points" items={result.pain_points} color={T.red} /><Bullets label="Talking Points" items={result.talking_points} color={T.purple} /></div></>}</div>);
}
function ColdEmailWriter() {
  const [lead,setLead]=useState("");const [offer,setOffer]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Top SDR at BuildWithLeverage. Write cold email. Lead: ${lead}. Offer: ${offer||"BWL growth services"}. Return ONLY valid JSON: {"subject_line":"s","email_body":"complete cold email under 150 words","alt_subject":"alt","follow_up":"day-3 follow-up","tips":["t"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Lead Info" value={lead} onChange={setLead} placeholder="Company, contact, role, pain points…" minHeight={90} /><Textarea label="Offer / Angle (Optional)" value={offer} onChange={setOffer} placeholder="What are you pitching?" minHeight={70} /><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="Write Cold Email" icon="✉️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject Lines</CardLabel><div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:8}}>{result.subject_line}</div><div style={{fontSize:13,color:"#777",marginTop:6}}>Alt: {result.alt_subject}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Main Draft</CardLabel><CopyBtn text={result.email_body} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.email_body}</div></div></>}</div>);
}
function CallScript() {
  const [lead,setLead]=useState("");const [goal]=useState("book a discovery call");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Build cold call script for BuildWithLeverage. Lead: ${lead}. Goal: ${goal}. Return ONLY valid JSON: {"opener":"opener","value_prop":"value prop","discovery_questions":["q1","q2"],"objection_handling":[{"objection":"o","response":"r"}],"cta":"CTA","full_script":"complete script"}`;try{const r=await callClaude(prompt,2500);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Lead / Company Info" value={lead} onChange={setLead} placeholder="Who are you calling?" minHeight={90} /><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="Generate Call Script" icon="📞" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Opener</CardLabel><p style={{margin:"8px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.opener}</p></Card><Bullets label="Discovery Questions" items={result.discovery_questions} color={T.purple} /><Card style={{padding:16}}><CardLabel color={T.yellow}>Objection Handling</CardLabel><div style={{marginTop:10}}>{result.objection_handling?.map((o,i)=><div key={i} style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:T.red,marginBottom:4}}>"{o.objection}"</div><div style={{fontSize:12,lineHeight:1.5,color:T.darkGray}}>→ {o.response}</div></div>)}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Full Script</CardLabel><CopyBtn text={result.full_script} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.full_script}</div></div></>}</div>);
}
function AfterCallAutomation() {
  const [callNotes,setCallNotes]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`SDR at BuildWithLeverage. After-call automation: ${callNotes}. Return ONLY valid JSON: {"call_summary":"summary","outcome":"connected|no_answer|left_voicemail|not_interested|interested|meeting_booked","crm_notes":"CRM note","follow_up_email":{"subject":"s","body":"email"},"next_action":"next action"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Call Notes" value={callNotes} onChange={setCallNotes} placeholder="What happened on the call?" /><Btn onClick={gen} disabled={!callNotes.trim()} loading={loading} label="Generate After-Call Pack" icon="🗒️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Summary</CardLabel><p style={{margin:"8px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.call_summary}</p></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>CRM Notes</CardLabel><CopyBtn text={result.crm_notes} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.crm_notes}</div></div></>}</div>);
}


// ─── INFLUENCER ───────────────────────────────────────────────────────────────
function InfluencerOutreach() {
  const [influencer,setInfluencer]=useState("");const [campaign,setCampaign]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Influencer outreach for BuildWithLeverage. Influencer: ${influencer}. Campaign: ${campaign}. Return ONLY valid JSON: {"subject":"subject","outreach_message":"complete outreach","follow_up":"day-3 follow-up","tips":["t"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Influencer Info" value={influencer} onChange={setInfluencer} placeholder="Name, niche, platform, followers…" minHeight={80} /><Textarea label="Campaign / Brand" value={campaign} onChange={setCampaign} placeholder="What brand or campaign?" minHeight={80} /><Btn onClick={gen} disabled={!influencer.trim()||!campaign.trim()} loading={loading} label="Generate Outreach" icon="📲" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject</CardLabel><div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:6}}>{result.subject}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Outreach</CardLabel><CopyBtn text={result.outreach_message} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.outreach_message}</div></div><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}
function CampaignBrief() {
  const [details,setDetails]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Campaign brief for BuildWithLeverage. Details: ${details}. Return ONLY valid JSON: {"campaign_name":"n","objective":"o","deliverables":["d"],"timeline":"t","kpis":["k"],"dos":["do"],"donts":["dont"],"full_brief":"complete brief"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Campaign Details" value={details} onChange={setDetails} placeholder="Brand, product, goal, audience, budget…" /><Btn onClick={gen} disabled={!details.trim()} loading={loading} label="Build Campaign Brief" icon="📋" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Campaign: {result.campaign_name}</CardLabel><div style={{fontSize:13,color:"#ccc",lineHeight:1.6,marginTop:8}}>{result.objective}</div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="KPIs" items={result.kpis} color={T.green} /><Bullets label="Do's" items={result.dos} color={T.green} /><Bullets label="Don'ts" items={result.donts} color={T.red} /></div></>}</div>);
}
function InfluencerTracker() {
  const [influencers,setInfluencers]=useState([]);const [form,setForm]=useState({name:"",handle:"",platform:"Instagram",niche:"",followers:"",status:"under_nego",rate:"",notes:"",email:"",contact:""});const [showForm,setShowForm]=useState(false);const [filter,setFilter]=useState("all");
  useEffect(()=>{storage.get("influencer-tracker").then(s=>{if(s) setInfluencers(JSON.parse(s.value));});},[]);
  const save=async(list)=>{setInfluencers(list);await storage.set("influencer-tracker",JSON.stringify(list));};
  const add=()=>{save([{...form,id:Date.now(),created_at:new Date().toISOString()},...influencers]);setForm({name:"",handle:"",platform:"Instagram",niche:"",followers:"",status:"under_nego",rate:"",notes:"",email:"",contact:""});setShowForm(false);};
  const del=(id)=>save(influencers.filter(i=>i.id!==id));
  const updateStatus=(id,status)=>save(influencers.map(i=>i.id===id?{...i,status}:i));
  const statuses={active:{label:"ACTIVE",color:T.green},paid:{label:"PAID",color:T.purple},under_nego:{label:"NEGOTIATING",color:T.yellow},completed:{label:"COMPLETED",color:T.gray},declined:{label:"DECLINED",color:T.red}};
  const filtered=filter==="all"?influencers:influencers.filter(i=>i.status===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["all","ALL"],...Object.entries(statuses).map(([k,v])=>[k,v.label])].map(([k,l])=>(<Pill key={k} label={`${l} (${k==="all"?influencers.length:influencers.filter(i=>i.status===k).length})`} active={filter===k} onClick={()=>setFilter(k)} />))}
        <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"5px 14px",fontSize:10,fontWeight:700,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>+ ADD</button>
      </div>
      {showForm&&(<Card><SectionHeader label="Add Influencer" /><div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["name","NAME *"],["handle","HANDLE"],["niche","NICHE"],["followers","FOLLOWERS"],["rate","RATE"],["email","EMAIL"]].map(([k,l])=>(<div key={k}><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>{l}</div><Input value={form[k]} onChange={v=>setForm(p=>({...p,[k]:v}))} /></div>))}<div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>PLATFORM</div><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{["Instagram","TikTok","YouTube","Twitter/X","Facebook"].map(p=><option key={p}>{p}</option>)}</select></div><div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div></div><div style={{padding:"0 16px 16px"}}><Btn onClick={add} disabled={!form.name.trim()} label="ADD INFLUENCER" /></div></Card>)}
      {filtered.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No influencers yet</div></Card>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(inf=>(<Card key={inf.id} style={{padding:16}} hover><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontWeight:700,fontSize:15}}>{inf.name}</div><div style={{fontSize:12,color:T.gray,marginTop:3}}>@{inf.handle} · {inf.platform}</div></div><Badge label={statuses[inf.status]?.label} color={statuses[inf.status]?.color} /></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(statuses).filter(([k])=>k!==inf.status).map(([k,v])=>(<button key={k} onClick={()=>updateStatus(inf.id,k)} style={{background:T.bg,color:v.color,border:`2px solid ${v.color}`,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>→ {v.label}</button>))}<button onClick={()=>del(inf.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button></div></Card>))}</div>
      }
    </div>
  );
}
function ContentTracker() {
  const [posts,setPosts]=useState([]);const [form,setForm]=useState({influencer:"",platform:"Instagram",content_type:"Post",caption:"",post_date:"",status:"planned",link:""});const [showForm,setShowForm]=useState(false);const [filter,setFilter]=useState("all");
  useEffect(()=>{storage.get("content-tracker").then(s=>{if(s) setPosts(JSON.parse(s.value));});},[]);
  const save=async(list)=>{setPosts(list);await storage.set("content-tracker",JSON.stringify(list));};
  const add=()=>{save([{...form,id:Date.now(),created_at:new Date().toISOString()},...posts]);setForm({influencer:"",platform:"Instagram",content_type:"Post",caption:"",post_date:"",status:"planned",link:""});setShowForm(false);};
  const del=(id)=>save(posts.filter(p=>p.id!==id));
  const updateStatus=(id,status)=>save(posts.map(p=>p.id===id?{...p,status}:p));
  const statuses={planned:{label:"PLANNED",color:T.purple},submitted:{label:"SUBMITTED",color:T.yellow},live:{label:"LIVE",color:T.green},revision:{label:"REVISION",color:T.orange},approved:{label:"APPROVED",color:T.green}};
  const filtered=filter==="all"?posts:posts.filter(p=>p.status===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["all","ALL"],...Object.entries(statuses).map(([k,v])=>[k,v.label])].map(([k,l])=>(<Pill key={k} label={`${l} (${k==="all"?posts.length:posts.filter(p=>p.status===k).length})`} active={filter===k} onClick={()=>setFilter(k)} />))}
        <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"5px 14px",fontSize:10,fontWeight:700,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,cursor:"pointer",fontFamily:T.mono}}>+ ADD CONTENT</button>
      </div>
      {showForm&&(<Card><SectionHeader label="Add Content" /><div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["influencer","INFLUENCER *"],["link","POST LINK"]].map(([k,l])=>(<div key={k}><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>{l}</div><Input value={form[k]} onChange={v=>setForm(p=>({...p,[k]:v}))} /></div>))}<div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>PLATFORM</div><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{["Instagram","TikTok","YouTube","Twitter/X","Facebook"].map(o=><option key={o}>{o}</option>)}</select></div><div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div></div><div style={{padding:"0 16px 16px"}}><Btn onClick={add} disabled={!form.influencer.trim()} label="ADD CONTENT" /></div></Card>)}
      {filtered.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No content tracked yet</div></Card>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(post=>(<Card key={post.id} style={{padding:16}} hover><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontWeight:700,fontSize:15}}>{post.influencer}</div><div style={{fontSize:12,color:T.gray,marginTop:3}}>{post.platform} · {post.content_type}</div></div><Badge label={statuses[post.status]?.label} color={statuses[post.status]?.color} /></div>{post.caption&&<div style={{fontSize:12,color:T.darkGray,background:T.bg,border:`2px solid ${T.black}`,padding:"8px 12px",marginBottom:10}}>{post.caption}</div>}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(statuses).filter(([k])=>k!==post.status).map(([k,v])=>(<button key={k} onClick={()=>updateStatus(post.id,k)} style={{background:T.bg,color:v.color,border:`2px solid ${v.color}`,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>→ {v.label}</button>))}<button onClick={()=>del(post.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button></div></Card>))}</div>
      }
    </div>
  );
}


// ─── DESIGN ───────────────────────────────────────────────────────────────────
function DesignBrief() {
  const [request,setRequest]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Creative director at BuildWithLeverage. Build design brief: ${request}. Return ONLY valid JSON: {"project_title":"t","objective":"o","deliverables":["d"],"mood":["v"],"brand_guidelines":["g"],"full_brief":"complete brief"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Design Request" value={request} onChange={setRequest} placeholder="What needs to be designed?" /><Btn onClick={gen} disabled={!request.trim()} loading={loading} label="Generate Design Brief" icon="🎨" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Project: {result.project_title}</CardLabel><div style={{fontSize:13,color:"#ccc",lineHeight:1.6,marginTop:8}}>{result.objective}</div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="Mood / Vibe" items={result.mood} color="#a855f7" /></div><Bullets label="Brand Guidelines" items={result.brand_guidelines} color={T.orange} /></>}</div>);
}
function FeedbackSummary() {
  const [feedback,setFeedback]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Summarize design feedback for BuildWithLeverage. Feedback: ${feedback}. Return ONLY valid JSON: {"summary":"overview","required_changes":["c"],"nice_to_have":["n"],"keep_as_is":["k"],"designer_message":"message to designer"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Feedback" value={feedback} onChange={setFeedback} placeholder="Paste raw feedback…" /><Btn onClick={gen} disabled={!feedback.trim()} loading={loading} label="Summarize Feedback" icon="🖊" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Overview</CardLabel><p style={{margin:"8px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Required Changes" items={result.required_changes} color={T.red} /><Bullets label="Nice to Have" items={result.nice_to_have} color={T.yellow} /></div><Bullets label="Keep As Is" items={result.keep_as_is} color={T.green} /></>}</div>);
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


// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV=[
  {key:"dashboard",label:"Dashboard"},
  {key:"attendance",label:"Attendance"},
  {key:"ops-pulse",label:"Ops Pulse"},
  {key:"rfp",label:"RFP Engine"},
  {key:"cos",label:"CoS Tools",children:[{key:"weekly-report",label:"Weekly Report"},{key:"exec-comms",label:"Exec Comms"},{key:"daily-briefing",label:"Daily Briefing"},{key:"team-performance",label:"Team Performance"},{key:"strategic-decision",label:"Strategic Decision"}]},
  {key:"culture",label:"Culture"},
  {key:"settings",label:"Settings"},
];
const PAGE_ICONS={dashboard:"⚡",attendance:"🕐","ops-pulse":"📋",rfp:"📊","weekly-report":"📄","exec-comms":"✏️","daily-briefing":"☀️","team-performance":"👥","strategic-decision":"🧠","sequence-builder":"✉️","lead-research":"🔍","cold-email":"📧","call-script":"📞","after-call":"🗒️","influencer-outreach":"📲","campaign-brief":"📋","influencer-tracker":"👥","content-tracker":"📅","design-brief":"🎨","feedback-summary":"🖊",settings:"⚙️",culture:"🏛️"};


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
      case "ops-pulse": return <OpsPulse slackIds={slackIds} />;
      case "rfp": return <RFPEngine />;
      case "weekly-report": return <WeeklyReport />;
      case "exec-comms": return <ExecComms />;
      case "daily-briefing": return <DailyBriefing />;
      case "team-performance": return <TeamPerformance />;
      case "strategic-decision": return <StrategicDecision />;
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
