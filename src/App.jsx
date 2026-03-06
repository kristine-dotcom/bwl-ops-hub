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
  `}</style>
);

// ─── PASSWORD GATE ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const attempt = () => {
    if (pw === CORRECT_PASSWORD) {
      onUnlock();
    } else {
      setError(true); setShaking(true); setPw("");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:T.black,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400,textAlign:"center"}}>
        <div style={{marginBottom:40}}>
          <div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:4,fontFamily:T.font,lineHeight:1}}>
            LEVERAGE<span style={{color:T.orange}}>.</span>
          </div>
          <div style={{fontSize:10,color:"#444",fontFamily:T.mono,marginTop:8,letterSpacing:3}}>OPERATIONS HUB</div>
        </div>
        <div style={{fontSize:40,marginBottom:24}}>🔐</div>
        <div style={{background:"#111",border:`2px solid ${error?T.red:"#222"}`,borderRadius:0,padding:"32px 28px",animation:shaking?"shake 0.4s ease":"none",transition:"border-color 0.2s"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:T.font,marginBottom:6,letterSpacing:1}}>RESTRICTED ACCESS</div>
          <div style={{fontSize:12,color:"#555",fontFamily:T.mono,marginBottom:24}}>Enter password to continue</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw&&attempt()} placeholder="Password" autoFocus
            style={{width:"100%",background:"#1a1a1a",border:`2px solid ${error?T.red:"#333"}`,borderRadius:0,color:"#fff",fontSize:15,padding:"12px 16px",outline:"none",fontFamily:T.mono,letterSpacing:3,textAlign:"center",marginBottom:16,transition:"border-color 0.2s"}} />
          {error&&<div style={{fontSize:12,color:T.red,fontFamily:T.mono,marginBottom:12,letterSpacing:1}}>✗ INCORRECT PASSWORD</div>}
          <button onClick={attempt} disabled={!pw}
            style={{width:"100%",padding:"12px",borderRadius:0,background:pw?T.orange:"#222",color:pw?"#fff":"#444",border:`2px solid ${pw?T.orange:"#333"}`,fontSize:13,fontWeight:700,cursor:pw?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font,transition:"all 0.15s"}}>
            UNLOCK →
          </button>
        </div>
        <div style={{fontSize:10,color:"#333",fontFamily:T.mono,marginTop:20,letterSpacing:2}}>BUILDWITHLEVERAGE.COM</div>
      </div>
    </div>
  );
}

const storage = {
  get: async (key) => {
    try { const r=await window.storage.get(key); if(!r) return null; return {value:typeof r.value==="string"?r.value:JSON.stringify(r.value)}; } catch { return null; }
  },
  set: async (key,value) => { try { await window.storage.set(key,value); } catch {} },
  delete: async (key) => { try { await window.storage.delete(key); } catch {} },
};

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
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  return r.json();
}

async function callClaude(prompt, maxTokens=2000) {
  const data=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]});
  if(data.error) throw new Error(data.error.message);
  const text=data.content?.find(b=>b.type==="text")?.text||"";
  const clean=text.replace(/```json|```/g,"").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
}

// ─── GLOBAL COMPONENTS ────────────────────────────────────────────────────────

const Badge = ({label,color=T.orange,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",background:bg||"transparent",color,border:`1.5px solid ${color}`,borderRadius:0,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1.5,fontFamily:T.mono,textTransform:"uppercase"}}>
    {label}
  </span>
);

const Pill = ({label,color=T.orange,active,onClick}) => {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,letterSpacing:1.5,background:active?T.black:hov?T.black:T.surface,color:active?T.orange:hov?"#fff":T.gray,border:`2px solid ${T.black}`,cursor:"pointer",transition:"all 0.15s",fontFamily:T.mono,textTransform:"uppercase"}}>
      {label}
    </button>
  );
};

const Card = ({children,style={},hover=false}) => {
  const [isHov,setIsHov]=useState(false);
  return (
    <div onMouseEnter={()=>hover&&setIsHov(true)} onMouseLeave={()=>hover&&setIsHov(false)}
      style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,borderTop:hover&&isHov?`4px solid ${T.orange}`:`2px solid ${T.black}`,boxShadow:"none",transition:"border-top 0.15s",overflow:"hidden",...style}}>
      {children}
    </div>
  );
};

const CardLabel = ({children,color=T.orange}) => (
  <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color,textTransform:"uppercase",fontFamily:T.mono}}>{children}</div>
);

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
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",background:T.surface,border:`2px solid ${focused?T.orange:T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.body,transition:"border-color 0.15s",...style}}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} {...props} />
  );
};

const Textarea = ({label,value,onChange,placeholder,minHeight=120}) => {
  const [focused,setFocused]=useState(false);
  return (
    <div style={{background:T.surface,border:`2px solid ${focused?T.orange:T.black}`,borderRadius:0,overflow:"hidden",transition:"border-color 0.15s"}}>
      {label&&<div style={{padding:"12px 16px",borderBottom:`2px solid ${T.black}`,background:T.black}}><div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:T.orange,textTransform:"uppercase",fontFamily:T.mono}}>{label}</div></div>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",minHeight,background:"transparent",border:"none",color:T.black,fontSize:13,padding:16,resize:"vertical",outline:"none",fontFamily:T.body,lineHeight:1.7,display:"block"}} />
    </div>
  );
};

const Btn = ({onClick,disabled,loading,label,color,icon,variant="primary"}) => {
  const [hov,setHov]=useState(false);
  const bg=disabled?"#E5E0D8":variant==="ghost"?"transparent":hov?T.orange:(color||T.black);
  const col=disabled?T.gray:variant==="ghost"?T.black:"#fff";
  const border=variant==="ghost"?`2px solid ${T.black}`:disabled?`2px solid ${T.border}`:`2px solid ${T.black}`;
  return (
    <button onClick={onClick} disabled={disabled||loading} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:"100%",padding:"12px 20px",borderRadius:0,background:bg,color:col,border,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:2,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.15s",fontFamily:T.font,textTransform:"uppercase"}}>
      {icon&&<span style={{fontSize:14}}>{icon}</span>}
      {loading?"GENERATING…":label}
    </button>
  );
};

const CopyBtn = ({text}) => {
  const [copied,setCopied]=useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
      style={{background:copied?T.green:T.black,color:"#fff",border:"none",borderRadius:0,padding:"5px 14px",fontSize:10,fontWeight:700,cursor:"pointer",transition:"background 0.2s",fontFamily:T.mono,letterSpacing:1}}>
      {copied?"✓ COPIED":"COPY"}
    </button>
  );
};

const Err = ({msg}) => msg?(
  <div style={{background:T.orangeSoft,border:`2px solid ${T.orange}`,borderRadius:0,padding:"12px 16px",color:T.orange,fontSize:13,display:"flex",gap:8,alignItems:"flex-start"}}>
    <span>⚠</span><span>{msg}</span>
  </div>
):null;

const Bullets = ({label,items,color}) => {
  if(!items?.length) return null;
  return (
    <Card style={{padding:16}}>
      <CardLabel color={color}>{label}</CardLabel>
      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
        {items.map((w,i)=><div key={i} style={{fontSize:13,color:T.darkGray,lineHeight:1.6,paddingLeft:12,borderLeft:`2px solid ${color}`}}>{w}</div>)}
      </div>
    </Card>
  );
};

const ProgressBar = ({value,color,height=6}) => (
  <div style={{background:T.border,borderRadius:0,height,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${value}%`,background:value===100?T.green:(color||T.orange),borderRadius:0,transition:"width 0.4s ease"}} />
  </div>
);

const StatBlock = ({label,value,sub,color}) => (
  <div style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,padding:"18px 20px"}}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:T.gray,textTransform:"uppercase",fontFamily:T.mono,marginBottom:8}}>{label}</div>
    <div style={{fontSize:32,fontWeight:900,color:color||T.orange,fontFamily:T.font,lineHeight:1,marginBottom:6}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono}}>{sub}</div>}
  </div>
);

const Avatar = ({name,size=32}) => {
  const initials=name.split(" ").map(n=>n[0]).slice(0,2).join("");
  const hue=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{width:size,height:size,borderRadius:0,background:`hsl(${hue},60%,88%)`,color:`hsl(${hue},50%,35%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,flexShrink:0,fontFamily:T.font,border:`2px solid ${T.black}`}}>{initials}</div>
  );
};

const LoadingScreen = () => (
  <div style={{padding:60,textAlign:"center"}}>
    <div style={{width:40,height:40,border:`3px solid ${T.border}`,borderTopColor:T.orange,borderRadius:"50%",margin:"0 auto 16px",animation:"spin 0.8s linear infinite"}} />
    <div style={{fontSize:12,color:T.grayLight,fontFamily:T.mono,letterSpacing:2}}>LOADING…</div>
  </div>
);

// ─── BRANDED PROPOSAL RENDERER ────────────────────────────────────────────────
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
  return (
    <table style={{width:"100%",borderCollapse:"collapse",margin:"16px 0",fontFamily:T.mono,fontSize:12}}>
      <thead><tr style={{background:T.black}}>{header.map((h,hi)=><th key={hi} style={thStyle}>{h}</th>)}</tr></thead>
      <tbody>{body.map((row,ri)=><tr key={ri} style={{background:ri%2===0?T.cream:"#EBEBDF",borderBottom:"1px solid "+T.border}}>{row.map((cell,ci)=><td key={ci} style={tdStyle}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
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
          <div style={{width:48,height:48,position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",bottom:6,left:6,width:4,height:42,background:"#fff",transform:"rotate(32deg)",transformOrigin:"bottom left",borderRadius:2}} />
            <div style={{position:"absolute",bottom:0,left:0,width:16,height:16,borderRadius:"50%",background:T.orange}} />
          </div>
        </div>
        <div style={{borderTop:"1px solid #2a2a2a",paddingTop:24}}>
          <div style={{fontSize:36,fontWeight:700,color:"#fff",lineHeight:1.1,letterSpacing:1,textTransform:"uppercase",maxWidth:520,fontFamily:T.font}}>
            {proposal.subject_line||`A NEW REVENUE CHANNEL FOR ${rfp?.organization?.toUpperCase()}`}
          </div>
          <div style={{fontSize:10,color:"#555",fontFamily:T.mono,marginTop:12,letterSpacing:4}}>P R E P A R E D &nbsp; F O R &nbsp; // &nbsp; {rfp?.organization?.toUpperCase()}</div>
        </div>
      </div>
      <div style={{padding:"36px 40px",background:T.cream}}>
        {blocks.map((block,i)=>{
          if(block.type==="section") return <div key={i} style={{marginTop:i===0?0:32,marginBottom:16,borderTop:i===0?"none":`1px solid ${T.black}`,paddingTop:i===0?0:24}}><div style={{display:"flex",alignItems:"baseline",gap:10}}><span style={{fontSize:11,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>{block.num} //</span><span style={{fontSize:16,fontWeight:700,color:T.black,fontFamily:T.font,letterSpacing:1,textTransform:"uppercase"}}>{block.title}</span></div></div>;
          if(block.type==="subtitle") return <div key={i} style={{fontSize:11,fontWeight:700,color:T.black,fontFamily:T.mono,letterSpacing:2,marginTop:20,marginBottom:8,textTransform:"uppercase"}}>{block.content}</div>;
          if(block.type==="insight") return <div key={i} style={{background:T.black,border:`2px solid ${T.orange}`,padding:"16px 20px",margin:"20px 0",position:"relative"}}><div style={{fontSize:9,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:3,marginBottom:8}}>// KEY INSIGHT</div><div style={{fontSize:13,color:"#fff",lineHeight:1.7,fontFamily:T.body}}>{block.content}</div></div>;
          if(block.type==="table") return <ProposalTable key={i} rows={block.rows} />;
          if(block.type==="spacer") return <div key={i} style={{height:8}} />;
          if(block.type==="para") return <p key={i} style={{fontSize:13,color:T.black,lineHeight:1.8,margin:"0 0 12px",fontFamily:T.body}}>{block.content}</p>;
          return null;
        })}
      </div>
      {proposal.requirements_checklist?.length>0&&(
        <div style={{padding:"0 40px 32px"}}>
          <div style={{borderTop:`2px solid ${T.black}`,paddingTop:24}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:16}}>// RFP REQUIREMENTS CHECKLIST</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {proposal.requirements_checklist.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:14,padding:"11px 16px",background:item.addressed?"#F0FDF4":"#FFF5F5",borderLeft:`3px solid ${item.addressed?T.green:T.red}`}}>
                  <span style={{fontSize:15,flexShrink:0,marginTop:1}}>{item.addressed?"✅":"❌"}</span>
                  <div><div style={{fontSize:12,fontWeight:700,color:T.black,fontFamily:T.font}}>{item.requirement}</div>{item.how&&<div style={{fontSize:11,color:T.gray,marginTop:3,fontFamily:T.mono,lineHeight:1.5}}>{item.how}</div>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{background:T.black,padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`4px solid ${T.orange}`}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:T.font,letterSpacing:1}}>David Perlov</div>
          <div style={{fontSize:9,color:T.orange,fontFamily:T.mono,letterSpacing:3,marginTop:4}}>FOUNDER</div>
          <div style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:T.font,letterSpacing:2,marginTop:2}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
        </div>
        <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#888",fontFamily:T.mono,lineHeight:2}}>david@buildwithleverage.com<br/>(201) 290-1536<br/>buildwithleverage.com</div></div>
      </div>
      <div style={{padding:"14px 40px",background:T.cream,borderTop:`2px solid ${T.black}`,display:"flex",gap:8,justifyContent:"flex-end"}}><CopyBtn text={text} /></div>
    </div>
  );
};

const TEAM_OPS=["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const DEFAULT_SLACK_IDS={"David Perlov":"U08BQH5JJDD","Cyril Butanas":"U09HHPVSSUQ","Caleb Bentil":"U0AE1T4N7A8","Darlene Mae Malolos":"U0A8GV25V0A","Suki Santos":"U093GFVM7D1","Kristine Miel Zulaybar":"U093GFXPK3M","Kristine Mirabueno":"U09QJGY27JP"};
const INPUT_TYPES=[{key:"transcript",label:"Meeting Transcript"},{key:"sod",label:"SOD Report"},{key:"email",label:"Emails"},{key:"slack",label:"Slack"}];

// ─── OPS PULSE ────────────────────────────────────────────────────────────────
function OpsPulse({slackIds}) {
  const [inputs,setInputs]=useState({transcript:"",sod:"",email:"",slack:""});
  const [activeTab,setActiveTab]=useState("transcript");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [checked,setChecked]=useState({});
  const [selectedMember,setSelectedMember]=useState(null);
  const [view,setView]=useState("team");
  const [slackStatus,setSlackStatus]=useState({});
  const [showInput,setShowInput]=useState(false);
  const [storageLoading,setStorageLoading]=useState(true);
  const [history,setHistory]=useState([]);
  const [dmContext,setDmContext]=useState({});
  const [showDmContext,setShowDmContext]=useState({});
  const [editingTask,setEditingTask]=useState(null);
  const [editingTaskText,setEditingTaskText]=useState("");

  useEffect(()=>{
    Promise.all([storage.get("ops-pulse-current"),storage.get("ops-pulse-checked"),storage.get("ops-pulse-history")])
      .then(([r,c,h])=>{if(r) setResult(JSON.parse(r.value));if(c) setChecked(JSON.parse(c.value));if(h) setHistory(JSON.parse(h.value));setStorageLoading(false);});
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

  if(storageLoading) return <LoadingScreen />;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:T.black,fontFamily:T.font}}>{weekLabel()}</div>
          {result&&<div style={{fontSize:12,color:T.grayLight,marginTop:2}}>Tasks loaded · {teamProgress()}% complete</div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {result&&<button onClick={clearTasks} style={{padding:"8px 16px",borderRadius:0,fontSize:11,fontWeight:700,background:"#FEF2F2",color:T.red,border:`2px solid ${T.red}`,cursor:"pointer",fontFamily:T.font,letterSpacing:1}}>CLEAR WEEK</button>}
          <button onClick={()=>setShowInput(!showInput)} style={{padding:"8px 18px",borderRadius:0,fontSize:11,fontWeight:700,background:showInput?T.black:T.orange,color:"#fff",border:`2px solid ${showInput?T.black:T.orange}`,cursor:"pointer",fontFamily:T.font,letterSpacing:1}}>
            {showInput?"✕ CLOSE":result?"+ NEW WEEK":"+ GENERATE TASKS"}
          </button>
        </div>
      </div>

      {(showInput||!result)&&(
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

      {result&&(
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

          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {[["team","👥 TEAM"],["person","👤 MEMBER"],["history","📋 HISTORY"]].map(([v,l])=>(
              <Pill key={v} label={l} active={view===v} onClick={()=>{setView(v);if(v==="team") setSelectedMember(null);}} />
            ))}
            <div style={{marginLeft:"auto"}}>
              <button onClick={()=>TEAM_OPS.forEach(m=>{if(result?.team_tasks?.[m]?.tasks?.length) sendDM(m,"");})}
                style={{padding:"6px 14px",borderRadius:0,fontSize:10,fontWeight:700,background:"#1a1a2e",color:"#a78bfa",border:"2px solid #2a2a4a",cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                SLACK ALL
              </button>
            </div>
          </div>

          {view==="team"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {TEAM_OPS.map(member=>{
                const d=result.team_tasks?.[member];if(!d) return null;
                const tasks=d.tasks||[],p=getProgress(member);
                const overdueCount=tasks.filter((t,i)=>!checked[`${member}-${i}`]&&isOverdue(t.due_day)).length;
                return (
                  <Card key={member} hover>
                    <div onClick={()=>{setSelectedMember(member);setView("person");}} style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                      <Avatar name={member} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                          <span style={{fontWeight:600,fontSize:14}}>{member}</span>
                          <span style={{fontSize:11,color:T.grayLight}}>{d.role}</span>
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
                return (
                  <Card style={{padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <Avatar name={selectedMember} size={44} />
                        <div><div style={{fontWeight:700,fontSize:16}}>{selectedMember}</div><div style={{fontSize:12,color:T.grayLight,marginTop:2}}>{d.role}</div></div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:26,fontWeight:900,color:p===100?T.green:T.orange,fontFamily:T.font,lineHeight:1}}>{p}%</div>
                        <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>{done}/{tasks.length} DONE</div>
                      </div>
                    </div>
                    <ProgressBar value={p} height={7} />
                    <div style={{marginTop:14,background:T.bg,border:`2px solid ${T.black}`,padding:12}}>
                      {showDmContext[selectedMember]?(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{fontSize:11,color:T.gray,fontWeight:700,letterSpacing:1,fontFamily:T.mono}}>ADD NOTE TO SLACK DM (OPTIONAL)</div>
                          <textarea value={dmContext[selectedMember]||""} onChange={e=>setDmContext(p=>({...p,[selectedMember]:e.target.value}))}
                            placeholder="e.g. Please prioritize the first 2 tasks this week…"
                            style={{width:"100%",minHeight:70,background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical"}} />
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>sendDM(selectedMember,dmContext[selectedMember])}
                              style={{flex:1,padding:"9px 0",borderRadius:0,background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                              {slackStatus[selectedMember]||"SEND DM"}
                            </button>
                            <button onClick={()=>setShowDmContext(p=>({...p,[selectedMember]:false}))}
                              style={{padding:"9px 16px",borderRadius:0,background:T.surface,color:T.gray,border:`2px solid ${T.black}`,fontSize:11,cursor:"pointer",fontFamily:T.mono}}>
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setShowDmContext(p=>({...p,[selectedMember]:true}))}
                            style={{flex:1,padding:"9px 0",borderRadius:0,background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                            📩 SEND SLACK DM
                          </button>
                          <button onClick={()=>addTask(selectedMember)}
                            style={{padding:"9px 16px",borderRadius:0,background:T.surface,color:T.orange,border:`2px solid ${T.orange}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                            + ADD TASK
                          </button>
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
                              <div onClick={()=>!isEditingThis&&toggleCheck(selectedMember,i)}
                                style={{width:20,height:20,borderRadius:0,border:`2px solid ${isDone?T.green:overdue?T.orange:T.black}`,background:isDone?T.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,cursor:"pointer"}}>
                                {isDone&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
                              </div>
                              <div style={{flex:1}}>
                                {isEditingThis?(
                                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    <input autoFocus value={editingTaskText} onChange={e=>setEditingTaskText(e.target.value)}
                                      onKeyDown={e=>{if(e.key==="Enter") saveTaskEdit(selectedMember,i);if(e.key==="Escape") setEditingTask(null);}}
                                      style={{width:"100%",background:T.surface,border:`2px solid ${T.orange}`,borderRadius:0,color:T.black,fontSize:13,padding:"6px 10px",outline:"none",fontFamily:T.body}} />
                                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                      <select value={t.priority} onChange={e=>updateTaskField(selectedMember,i,"priority",e.target.value)}
                                        style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:11,padding:"4px 8px",outline:"none"}}>
                                        {["high","medium","low"].map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
                                      </select>
                                      <select value={t.due_day} onChange={e=>updateTaskField(selectedMember,i,"due_day",e.target.value)}
                                        style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:11,padding:"4px 8px",outline:"none"}}>
                                        {["Monday","Tuesday","Wednesday","Thursday","Friday","EOW"].map(d=><option key={d} value={d}>{d}</option>)}
                                      </select>
                                      <button onClick={()=>saveTaskEdit(selectedMember,i)}
                                        style={{background:T.green,color:"#fff",border:`2px solid ${T.green}`,borderRadius:0,padding:"4px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE</button>
                                      <button onClick={()=>setEditingTask(null)}
                                        style={{background:T.bg,color:T.gray,border:`2px solid ${T.black}`,borderRadius:0,padding:"4px 12px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button>
                                    </div>
                                  </div>
                                ):(
                                  <>
                                    <div style={{fontSize:13,color:isDone?T.grayLight:T.black,textDecoration:isDone?"line-through":"none",lineHeight:1.5}}>
                                      <span style={{opacity:0.5,marginRight:6}}>{tIcon(t.type)}</span>{t.task}
                                    </div>
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
                        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                          {d.blockers.map((b,i)=><div key={i} style={{fontSize:13,color:T.darkGray}}>· {b}</div>)}
                        </div>
                      </div>
                    )}
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
                    <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:5}}>
                      {h.memberStats.filter(m=>m.total>0).map(m=>{
                        const pct=Math.round((m.done/m.total)*100);
                        return (
                          <div key={m.name} style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:76,fontSize:11,fontWeight:600,color:T.darkGray,flexShrink:0}}>{m.name.split(" ")[0]}</div>
                            <div style={{flex:1}}><ProgressBar value={pct} height={4} /></div>
                            <div style={{width:34,fontSize:11,fontWeight:800,color:pct===100?T.green:T.orange,textAlign:"right",fontFamily:T.font}}>{pct}%</div>
                            {m.overdue>0&&<Badge label={`${m.overdue} late`} color={T.red} />}
                          </div>
                        );
                      })}
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
function Dashboard({ navigate }) {
  const date=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase();

  const getGreeting=()=>{
    const now=new Date();
    const estHour=parseInt(now.toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",hour12:false}));
    if(estHour>=5&&estHour<12) return "MORNING.";
    if(estHour>=12&&estHour<17) return "AFTERNOON.";
    if(estHour>=17&&estHour<21) return "EVENING.";
    return "NIGHT.";
  };
  const greeting=getGreeting();

  const [announcements,setAnnouncements]=useState([{id:1,text:"Welcome to the Leverage Operations Hub. Use this space for team-wide notes and announcements.",author:"David Perlov",date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}]);
  const [editing,setEditing]=useState(null);
  const [newNote,setNewNote]=useState("");
  const [showInput,setShowInput]=useState(false);
  const [authorName,setAuthorName]=useState("Kristine");
  const [focused,setFocused]=useState(false);

  const addNote=()=>{if(!newNote.trim()) return;setAnnouncements(prev=>[{id:Date.now(),text:newNote.trim(),author:authorName||"Team",date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})},...prev]);setNewNote("");setShowInput(false);};
  const deleteNote=(id)=>setAnnouncements(prev=>prev.filter(a=>a.id!==id));
  const saveEdit=(id,text)=>{setAnnouncements(prev=>prev.map(a=>a.id===id?{...a,text}:a));setEditing(null);};

  return (
    <div style={{background:"#F5F5F0",border:"2px solid #000",fontFamily:T.body}}>
      {/* Masthead */}
      <div style={{padding:"0 32px",borderBottom:"3px solid #000"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 12px",borderBottom:"1px solid #C8C2B8"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono}}>LEVERAGE.</span>
            <span style={{fontSize:11,color:"#9CA3AF",letterSpacing:2,fontFamily:T.mono}}>OPERATIONS HUB</span>
          </div>
          <span style={{fontSize:10,color:"#9CA3AF",letterSpacing:2,fontFamily:T.mono}}>{date}</span>
        </div>
        <div style={{padding:"24px 0 0"}}>
          <div style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:700,lineHeight:0.88,letterSpacing:-3,textTransform:"uppercase",color:"#000"}}>
            GOOD<br/>
            <span style={{WebkitTextStroke:"2px #000",color:"transparent",letterSpacing:-2}}>{greeting}</span>
          </div>
          <p style={{fontSize:13,color:"#9CA3AF",fontFamily:T.mono,letterSpacing:1,marginTop:14,marginBottom:20}}>HERE'S YOUR DAILY REMINDER OF WHY WE'RE HERE.</p>
        </div>
      </div>

      {/* Mission + Belief */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
        <div style={{padding:"36px 32px",borderRight:"1px solid #C8C2B8"}}>
          <div style={{width:32,height:3,background:T.orange,marginBottom:20}} />
          <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:14}}>OUR MISSION</div>
          <p style={{fontSize:18,fontWeight:700,lineHeight:1.5,color:"#000"}}>We exist to deliver best-in-class results — with speed, precision, and genuine care.</p>
          <p style={{fontSize:13,color:"#6B7280",lineHeight:1.8,marginTop:14}}>We're not here to be average. We're here to make success an inevitability.</p>
        </div>
        <div style={{padding:"36px 32px",background:"#000"}}>
          <div style={{width:32,height:3,background:T.orange,marginBottom:20}} />
          <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:14}}>WHAT WE BELIEVE</div>
          <p style={{fontSize:14,lineHeight:1.9,color:"#E5E0D8"}}>Great work comes from people who think independently, act proactively, and hold themselves to a high standard — not because they're told to, but because they genuinely care about the outcome.</p>
        </div>
      </div>

      {/* Announcements */}
      <div style={{borderTop:"3px solid #000",padding:"28px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:"#9CA3AF",fontFamily:T.mono}}>ANNOUNCEMENTS & NOTES</div>
            <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginTop:3}}>Team-wide reminders and updates</div>
          </div>
          <button onClick={()=>setShowInput(!showInput)}
            style={{padding:"8px 18px",borderRadius:0,background:showInput?T.black:T.orange,color:"#fff",border:`2px solid ${showInput?T.black:T.orange}`,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:T.mono,transition:"background 0.15s"}}>
            {showInput?"✕ CANCEL":"+ ADD NOTE"}
          </button>
        </div>

        {showInput&&(
          <div style={{background:T.surface,border:`2px solid ${T.orange}`,padding:18,marginBottom:18}}>
            <div style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>YOUR NAME</div>
                <input value={authorName} onChange={e=>setAuthorName(e.target.value)}
                  style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"8px 12px",outline:"none",fontFamily:T.body}} />
              </div>
            </div>
            <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>NOTE</div>
            <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Type your announcement or note here…"
              style={{width:"100%",minHeight:80,background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical",lineHeight:1.7,display:"block",marginBottom:10}} />
            <button onClick={addNote} disabled={!newNote.trim()}
              style={{padding:"9px 24px",borderRadius:0,background:newNote.trim()?T.black:T.border,color:newNote.trim()?"#fff":T.gray,border:`2px solid ${newNote.trim()?T.black:T.border}`,fontSize:11,fontWeight:700,cursor:newNote.trim()?"pointer":"not-allowed",fontFamily:T.mono,letterSpacing:1}}>
              POST NOTE
            </button>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {announcements.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:T.grayLight,fontSize:13,fontFamily:T.mono}}>No announcements yet.</div>}
          {announcements.map(a=>(
            <div key={a.id} style={{background:T.surface,border:`2px solid ${T.black}`,borderLeft:`4px solid ${T.orange}`,padding:18}}>
              {editing===a.id?(
                <EditNote note={a} onSave={saveEdit} onCancel={()=>setEditing(null)} />
              ):(
                <div>
                  <p style={{fontSize:13,color:T.black,lineHeight:1.7,margin:"0 0 12px"}}>{a.text}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:1}}>{a.author.toUpperCase()}</span>
                      <span style={{fontSize:10,color:T.grayLight,fontFamily:T.mono}}>· {a.date}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditing(a.id)} style={{background:"none",border:`2px solid ${T.black}`,borderRadius:0,padding:"3px 10px",fontSize:10,color:T.gray,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>EDIT</button>
                      <button onClick={()=>deleteNote(a.id)} style={{background:"none",border:`2px solid ${T.red}`,borderRadius:0,padding:"3px 10px",fontSize:10,color:T.red,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>DELETE</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{borderTop:"3px solid #000",padding:"28px 32px",background:"#000",display:"flex",justifyContent:"space-between",alignItems:"center",gap:24}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.orange,fontFamily:T.mono,marginBottom:6}}>COMPANY ETHOS</div>
          <p style={{fontSize:13,color:"#888",fontFamily:T.mono,margin:0}}>Our values, principles, and standards — all in one place.</p>
        </div>
        <button onClick={()=>navigate&&navigate("culture")}
          style={{padding:"12px 28px",borderRadius:0,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font,whiteSpace:"nowrap",flexShrink:0,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="#CC2900"}
          onMouseLeave={e=>e.currentTarget.style.background=T.orange}>
          → VIEW COMPANY ETHOS
        </button>
      </div>
    </div>
  );
}

function EditNote({note,onSave,onCancel}) {
  const [text,setText]=useState(note.text);
  return (
    <div>
      <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus
        style={{width:"100%",minHeight:80,background:T.bg,border:`2px solid ${T.orange}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:T.body,resize:"vertical",lineHeight:1.7,display:"block",marginBottom:10}} />
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(note.id,text)} style={{padding:"7px 18px",borderRadius:0,background:T.green,color:"#fff",border:`2px solid ${T.green}`,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE</button>
        <button onClick={onCancel} style={{padding:"7px 18px",borderRadius:0,background:"transparent",color:T.gray,border:`2px solid ${T.black}`,fontSize:10,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── CULTURE DASHBOARD ────────────────────────────────────────────────────────
function CultureDashboard() {
  const [activeTab,setActiveTab]=useState('ethos');
  const now=new Date();
  const monthYear=now.toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase();
  const tabs=[{key:'ethos',label:'WHO WE ARE'},{key:'values',label:'VALUES'},{key:'behaviors',label:'IN PRACTICE'},{key:'standard',label:'STANDARD'}];

  return (
    <div style={{background:"#FAFAF8",border:"2px solid #0A0A0A",fontFamily:T.body}}>
      <div style={{borderBottom:"3px solid #0A0A0A",padding:"0 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0 12px",borderBottom:"1px solid #E0DDD8"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:3,color:'#FF3300',fontFamily:T.mono}}>LEVERAGE.</span>
            <span style={{fontSize:11,color:"#6B7280",letterSpacing:2,fontFamily:T.mono}}>INTERNAL</span>
          </div>
          <span style={{fontSize:10,color:"#6B7280",letterSpacing:2,fontFamily:T.mono}}>VOL. 01 — {monthYear}</span>
        </div>
        <div style={{fontSize:"clamp(40px,6vw,64px)",fontWeight:700,lineHeight:0.9,letterSpacing:-2,textTransform:"uppercase",padding:"24px 0 0"}}>
          COMPANY<br/><span style={{WebkitTextStroke:"2px #0A0A0A",color:"transparent"}}>ETHOS</span>
        </div>
        <div style={{display:"flex",marginTop:20,borderTop:"1px solid #E0DDD8"}}>
          {tabs.map((t,i)=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              style={{flex:1,padding:"12px 8px",background:activeTab===t.key?"#0A0A0A":"#FAFAF8",color:activeTab===t.key?"#fff":"#6B7280",border:"none",borderRight:i===tabs.length-1?"none":"1px solid #E0DDD8",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:T.mono,letterSpacing:2,textTransform:"uppercase",transition:"all 0.15s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"0 40px 60px"}}>
        {activeTab==='ethos'&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}>
              <div style={{padding:"40px 40px 40px 0",borderRight:"1px solid #E0DDD8"}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'#FF3300',marginBottom:20,fontFamily:T.mono,display:'block'}}>OUR MISSION</span>
                <p style={{fontSize:22,fontWeight:700,lineHeight:1.3}}>We exist to deliver best-in-class results — with speed, precision, and genuine care.</p>
                <p style={{fontSize:13,color:"#6B7280",lineHeight:1.8,marginTop:16}}>We're not here to be average. We're here to make success an inevitability.</p>
              </div>
              <div style={{padding:"40px 0 40px 40px"}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'#FF3300',marginBottom:20,fontFamily:T.mono,display:'block'}}>WHAT WE BELIEVE</span>
                <p style={{fontSize:15,lineHeight:1.8,color:"#0A0A0A"}}>Great work comes from people who think independently, act proactively, and hold themselves to a high standard — not because they're told to, but because they genuinely care about the outcome.</p>
                <div style={{marginTop:24,padding:"16px 20px",background:"#0A0A0A",borderLeft:"4px solid #FF3300"}}>
                  <p style={{fontSize:13,color:"#fff",fontFamily:T.mono,lineHeight:1.7}}>"Success is not a question.<br/>It's an inevitability."</p>
                  <p style={{fontSize:10,color:"#FF3300",marginTop:8,fontFamily:T.mono,letterSpacing:2}}>— DAVID PERLOV, FOUNDER</p>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderBottom:"1px solid #E0DDD8"}}>
              {[["$125M+","Revenue Generated"],["11X","Average ROAS"],["20+","Companies Served"]].map(([v,l],i)=>(
                <div key={i} style={{padding:"28px 24px",borderRight:i<2?"1px solid #E0DDD8":"none",textAlign:"center"}}>
                  <div style={{fontSize:40,fontWeight:700,color:"#FF3300",lineHeight:1}}>{v}</div>
                  <div style={{fontSize:10,fontFamily:T.mono,color:"#6B7280",letterSpacing:2,marginTop:6}}>{l}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {activeTab==='values'&&(
          <>
            <div style={{padding:"32px 0 24px",borderBottom:"1px solid #E0DDD8"}}><span style={{fontSize:11,color:"#6B7280",letterSpacing:3,fontFamily:T.mono}}>SIX PRINCIPLES WE LIVE BY</span></div>
            {[["01","Proactivity","Don't wait to be told. If you see a gap, fill it. If you see a problem, bring a solution. Never let someone else be your blocker."],["02","Independent Thinking","Think before you ask. Research before you escalate. Come with a point of view, not just a question."],["03","Performance Mindedness","Know your numbers. Set your goals. Track your progress. Celebrate wins — and learn from misses."],["04","Collaboration","We push each other to be better — with respect. We grow together, not at each other's expense."],["05","Ownership","Your work is your name. Take pride in it. If something breaks, own it and fix it. If something succeeds, own that too."],["06","Growth Mindset","Every role is a learning opportunity. Ask questions. Experiment. Get better every week than you were the week before."]].map(([num,title,desc])=>(
              <div key={num} style={{display:"grid",gridTemplateColumns:"80px 1fr 2fr",borderBottom:"1px solid #E0DDD8",alignItems:"center"}}>
                <div style={{padding:"24px 0",borderRight:"1px solid #E0DDD8",textAlign:"center",fontSize:11,fontWeight:700,fontFamily:T.mono,color:"#6B7280",letterSpacing:2}}>{num}</div>
                <div style={{padding:"24px 32px",borderRight:"1px solid #E0DDD8",fontSize:22,fontWeight:700,letterSpacing:-0.5}}>{title}</div>
                <div style={{padding:"24px 32px",fontSize:13,color:"#6B7280",lineHeight:1.7}}>{desc}</div>
              </div>
            ))}
          </>
        )}
        {activeTab==='behaviors'&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}>
              <div style={{padding:"20px 32px 16px 0",borderRight:"1px solid #E0DDD8",fontSize:10,fontWeight:700,fontFamily:T.mono,color:"#16a34a",letterSpacing:3}}>✅ WE DO THIS</div>
              <div style={{padding:"20px 0 16px 32px",fontSize:10,fontWeight:700,fontFamily:T.mono,color:"#FF3300",letterSpacing:3}}>✗ NOT THIS</div>
            </div>
            {[["Start each day with a clear, specific goal — not just a task list","Clock in with a vague 'working on things today'"],["End each day with a real recap: numbers, progress, blockers","Send the same update copy-pasted from yesterday"],["Spot a recurring problem? Bring 3 solutions + your recommendation","Drop the problem on someone else's lap without thinking it through"],["Ask for help after you've already tried something","Ask immediately before attempting to figure it out yourself"],["Flag risks early, before they become crises","Stay quiet and hope it resolves itself"]].map(([doIt,dontIt],i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #E0DDD8"}}>
                <div style={{padding:"22px 32px 22px 0",borderRight:"1px solid #E0DDD8",display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:20,height:20,borderRadius:0,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,fontSize:11,fontWeight:900,color:"#fff"}}>✓</div>
                  <p style={{fontSize:14,fontWeight:600,lineHeight:1.5}}>{doIt}</p>
                </div>
                <div style={{padding:"22px 0 22px 32px",display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:20,height:20,borderRadius:0,background:"#F0EFEB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,fontSize:11,fontWeight:900,color:"#6B7280"}}>✗</div>
                  <p style={{fontSize:14,fontWeight:400,lineHeight:1.5,color:"#6B7280",textDecoration:"line-through",textDecorationColor:"#E0DDD8"}}>{dontIt}</p>
                </div>
              </div>
            ))}
          </>
        )}
        {activeTab==='standard'&&(
          <>
            <div style={{padding:"40px 0 32px",borderBottom:"1px solid #E0DDD8"}}>
              <div style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:700,lineHeight:0.95,letterSpacing:-1,textTransform:"uppercase",maxWidth:500}}>THE PROBLEM-SOLVING STANDARD</div>
              <p style={{fontSize:13,color:"#6B7280",marginTop:16,maxWidth:480,lineHeight:1.7}}>Every problem brought to the team must follow this format. No exceptions.</p>
            </div>
            {[["01","DIAGNOSE","Name the Problem Clearly","What exactly is happening? When did it start? What's the business impact? Be specific — vague problems get vague solutions."],["02","THINK","Propose 3 Solutions","Think broadly. There's never just one way. List at least 3 options with honest pros and cons. If you can only think of one, you haven't thought hard enough."],["03","DECIDE","Give Your Recommendation","Pick one. Tell us why. Be willing to defend it — and be open to being wrong. We side with the recommendation 99% of the time."]].map(([num,tag,name,desc])=>(
              <div key={num} style={{display:"grid",gridTemplateColumns:"80px 160px 1fr",borderBottom:"1px solid #E0DDD8",alignItems:"stretch"}}>
                <div style={{borderRight:"1px solid #E0DDD8",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 0",fontSize:28,fontWeight:700,color:"#FF3300"}}>{num}</div>
                <div style={{borderRight:"1px solid #E0DDD8",padding:"32px 20px",display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
                  <span style={{fontSize:9,fontWeight:700,fontFamily:T.mono,color:"#FF3300",letterSpacing:3}}>{tag}</span>
                  <span style={{fontSize:15,fontWeight:700,lineHeight:1.3}}>{name}</span>
                </div>
                <div style={{padding:32,display:"flex",alignItems:"center",fontSize:13,color:"#6B7280",lineHeight:1.8}}>{desc}</div>
              </div>
            ))}
            <div style={{background:"#0A0A0A",padding:"28px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:24}}>
              <p style={{fontSize:13,color:"#fff",fontFamily:T.mono,maxWidth:420,lineHeight:1.7}}>"If you come with just a problem and no solutions, you're not ready for the conversation yet."</p>
              <span style={{fontSize:10,color:"#FF3300",fontFamily:T.mono,letterSpacing:3,flexShrink:0}}>THE STANDARD //</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RFP ENGINE ───────────────────────────────────────────────────────────────
const PROPOSAL_TEMPLATES={Government:"formal, compliance-focused, emphasize track record, certifications, reporting. Price HIGH — government budgets are large.",Corporate:"ROI-driven, scalable, data-backed, executive-friendly. Price competitively high.",Nonprofit:"mission-aligned, cost-efficient, impact-focused, community-driven",Other:"flexible, value-driven, relationship-focused"};

const urgencyTag=(deadline)=>{
  if(!deadline) return null;
  const d=new Date(deadline),now=new Date(),diff=Math.ceil((d-now)/86400000);
  if(isNaN(diff)) return null;
  if(diff<0) return {label:"EXPIRED",color:T.gray};
  if(diff<=7) return {label:`${diff}d left`,color:T.red};
  if(diff<=21) return {label:`${diff}d left`,color:T.yellow};
  return {label:`${diff}d left`,color:T.green};
};

function RFPEngine() {
  const [keywords,setKeywords]=useState("");const [rfps,setRfps]=useState([]);const [selected,setSelected]=useState(null);const [proposal,setProposal]=useState(null);const [loading,setLoading]=useState({search:false,proposal:false});const [error,setError]=useState(null);const [view,setView]=useState("search");const [tracker,setTracker]=useState([]);const [expandedScore,setExpandedScore]=useState(null);const [editNote,setEditNote]=useState({});const [editRev,setEditRev]=useState({});const [viewingProposal,setViewingProposal]=useState(null);const [hideExpired,setHideExpired]=useState(true);const [sortByDeadline,setSortByDeadline]=useState(true);const [editingProposal,setEditingProposal]=useState(false);const [editedProposalText,setEditedProposalText]=useState("");
  useEffect(()=>{storage.get("rfp-tracker").then(s=>{if(s) setTracker(JSON.parse(s.value));});},[]);
  const setLoad=(k,v)=>setLoading(p=>({...p,[k]:v}));
  const persist=async(list)=>{setTracker(list);await storage.set("rfp-tracker",JSON.stringify(list));};
  const saveToTracker=(rfp,pt)=>{const e={id:Date.now(),title:rfp.title,organization:rfp.organization,type:rfp.type||"Other",budget:rfp.budget,deadline:rfp.deadline||"",services:rfp.services_needed||[],score:rfp.relevance_score,proposal:pt,status:"draft",revenue:"",notes:"",source_url:rfp.source_url||"",created_at:new Date().toISOString()};persist([e,...tracker]);};
  const updateStatus=(id,status)=>persist(tracker.map(t=>t.id===id?{...t,status}:t));
  const updateField=(id,field,val)=>persist(tracker.map(t=>t.id===id?{...t,[field]:val}:t));
  const del=(id)=>persist(tracker.filter(t=>t.id!==id));

  const search=async()=>{
    setLoad("search",true);setError(null);setRfps([]);setSelected(null);setProposal(null);
    const prompt=`RFP research specialist for BuildWithLeverage (growth agency: outbound, paid media, influencer, email marketing, design, web). Find RFPs for: ${keywords}. Today is ${new Date().toISOString().split("T")[0]}. Return ONLY valid JSON: {"rfps":[{"id":"1","title":"...","organization":"...","type":"Government|Corporate|Nonprofit|Other","budget":"...","deadline":"YYYY-MM-DD or empty string if unknown","description":"2-3 sentences","relevance_score":85,"score_breakdown":{"strengths":["s1","s2"],"gaps":["g1"],"overall":"1 sentence"},"why_bwl_can_win":"...","services_needed":["Outbound","Paid Media"],"source_url":"direct URL to RFP page or empty string","source":"organization or platform name"}]}`;
    try {
      const data=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:4000,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:prompt}]});
      if(data.error) throw new Error(data.error.message);
      const raw=data.content?.find(b=>b.type==="text")?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      setRfps(JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1)).rfps||[]);
    } catch(e){setError(e.message);}
    setLoad("search",false);
  };

  const genProposal=async(rfp,customText)=>{
    setSelected(rfp);setProposal(null);setLoad("proposal",true);setEditingProposal(false);setError(null);
    try {
      const metaPrompt=`You are a senior proposal writer for BuildWithLeverage (LEVERAGE.). RFP: ${rfp.title} | Org: ${rfp.organization} | Type: ${rfp.type} | Budget: ${rfp.budget} | Services: ${(rfp.services_needed||[]).join(", ")} ${customText?"Extra context: "+customText:""} Return ONLY valid compact JSON (no newlines inside string values): {"subject_line":"A NEW [X] FOR [ORG]","why_bwl":["reason with real stat"],"relevant_results":["result with numbers"],"investment":"price range","timeline":"timeline","requirements_checklist":[{"requirement":"req","addressed":true,"how":"how"}]}`;
      const d1=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:metaPrompt}]});
      if(d1.error) throw new Error(d1.error.message);
      const t1=(d1.content?.find(b=>b.type==="text")?.text||"").replace(/```json|```/g,"").trim();
      const meta=JSON.parse(t1.slice(t1.indexOf("{"),t1.lastIndexOf("}")+1));
      const textPrompt=`Senior proposal writer for LEVERAGE. (BuildWithLeverage). Stats: $125M revenue generated, 11X ROAS, 20+ companies, 20% profit share on closed deals. RFP: ${rfp.title} | Org: ${rfp.organization} | Type: ${rfp.type} | Budget: ${rfp.budget} | Services: ${(rfp.services_needed||[]).join(", ")} ${customText?"Context: "+customText:""}\n\nWrite the full proposal. Format:\n- Personal opening paragraph\n- 01 // THE OPPORTUNITY\n- 02 // WHAT WE BUILD\n- 03 // THE PILOT\n- 04 // THE MATH (pipe table: Conservative/Moderate/Aggressive scenarios)\n- 05 // INVESTMENT (pipe table: ITEM | COST | NOTES, include 20% profit share)\n- 06 // NEXT STEPS\n- Use // KEY INSIGHT before standout points\n- Price HIGH for ${rfp.type}\n- End: David Perlov // FOUNDER // LEVERAGE. // david@buildwithleverage.com // (201) 290-1536 // buildwithleverage.com\n\nPlain text only. No JSON. No markdown.`;
      const d2=await claudeFetch({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:[{role:"user",content:textPrompt}]});
      if(d2.error) throw new Error(d2.error.message);
      const proposalText=d2.content?.find(b=>b.type==="text")?.text||"";
      if(!proposalText) throw new Error("Empty proposal response");
      const full={...meta,full_proposal_text:proposalText};
      setProposal(full);setEditedProposalText(proposalText);
    } catch(e){setError(e.message);}
    setLoad("proposal",false);
  };

  const rerunProposal=()=>genProposal(selected,editedProposalText);
  const sc=s=>s>=80?T.green:s>=60?T.yellow:T.red;
  const ss=s=>({draft:{color:T.gray,label:"DRAFT"},submitted:{color:T.yellow,label:"SUBMITTED"},won:{color:T.green,label:"WON"},lost:{color:T.red,label:"LOST"}}[s]||{color:T.gray,label:s});
  const won=tracker.filter(t=>t.status==="won");
  const submitted=tracker.filter(t=>["submitted","won","lost"].includes(t.status));
  const winRate=submitted.length?Math.round((won.length/submitted.length)*100):0;
  const totalRev=won.filter(t=>t.revenue).reduce((a,t)=>a+parseFloat(t.revenue.replace(/[^0-9.]/g,""))||0,0);
  const pipelineRev=tracker.filter(t=>t.status==="submitted"&&t.revenue).reduce((a,t)=>a+parseFloat(t.revenue.replace(/[^0-9.]/g,""))||0,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:8}}>
        <Pill label="🔍 FIND RFPs" active={view==="search"} onClick={()=>setView("search")} />
        <Pill label={`📊 PIPELINE (${tracker.length})`} active={view==="tracker"} onClick={()=>setView("tracker")} />
      </div>

      {view==="search"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card>
            <SectionHeader label="Search RFPs" />
            <div style={{padding:16,display:"flex",gap:10}}>
              <Input value={keywords} onChange={setKeywords} placeholder="e.g. marketing services, digital advertising…" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&keywords.trim()&&search()} />
              <button onClick={search} disabled={!keywords.trim()||loading.search}
                style={{background:keywords.trim()?T.black:"#E5E0D8",color:keywords.trim()?"#fff":T.gray,border:`2px solid ${keywords.trim()?T.black:"#E5E0D8"}`,borderRadius:0,padding:"10px 20px",fontSize:12,fontWeight:700,cursor:keywords.trim()?"pointer":"not-allowed",whiteSpace:"nowrap",fontFamily:T.mono,letterSpacing:1}}>
                {loading.search?"SEARCHING…":"SEARCH"}
              </button>
            </div>
            {rfps.length>0&&!proposal&&(
              <div style={{padding:"0 16px 14px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:T.gray,fontWeight:700,fontFamily:T.mono,letterSpacing:1}}>FILTER:</span>
                <Pill label={hideExpired?"✓ Hiding Expired":"Show Expired"} active={hideExpired} color={T.red} onClick={()=>setHideExpired(!hideExpired)} />
                <Pill label={sortByDeadline?"✓ Nearest First":"Sort by Deadline"} active={sortByDeadline} color={T.orange} onClick={()=>setSortByDeadline(!sortByDeadline)} />
                <span style={{fontSize:10,color:T.grayLight,marginLeft:"auto",fontFamily:T.mono}}>
                  {(()=>{let f=[...rfps];if(hideExpired) f=f.filter(r=>{const d=urgencyTag(r.deadline);return !d||d.label!=="EXPIRED";});return f.length;})()}/{rfps.length} shown
                </span>
              </div>
            )}
          </Card>
          <Err msg={error} />
          {rfps.length>0&&!proposal&&(()=>{
            let filtered=[...rfps];
            if(hideExpired) filtered=filtered.filter(r=>{const d=urgencyTag(r.deadline);return !d||d.label!=="EXPIRED";});
            if(sortByDeadline) filtered.sort((a,b)=>{if(!a.deadline) return 1;if(!b.deadline) return -1;return new Date(a.deadline)-new Date(b.deadline);});
            return (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtered.map((rfp,i)=>{
                  const urg=urgencyTag(rfp.deadline),isExp=expandedScore===rfp.id;
                  return (
                    <Card key={i} style={{padding:18,borderTop:selected?.id===rfp.id?`4px solid ${T.orange}`:`2px solid ${T.black}`}} hover>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{rfp.title}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:12,color:T.gray}}>{rfp.organization}</span>
                            <Badge label={rfp.type} color={T.gray} />
                            {urg&&<Badge label={urg.label} color={urg.color} />}
                            {rfp.budget&&<Badge label={rfp.budget} color={T.green} />}
                          </div>
                        </div>
                        <div style={{textAlign:"center",marginLeft:14}}>
                          <div style={{fontSize:28,fontWeight:900,color:sc(rfp.relevance_score),fontFamily:T.font,lineHeight:1}}>{rfp.relevance_score}</div>
                          <button onClick={()=>setExpandedScore(isExp?null:rfp.id)} style={{fontSize:10,color:T.orange,fontWeight:700,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:T.mono,letterSpacing:1}}>{isExp?"HIDE":"WHY?"}</button>
                        </div>
                      </div>
                      {isExp&&rfp.score_breakdown&&(
                        <div style={{background:T.bg,border:`2px solid ${T.black}`,padding:14,marginBottom:10}}>
                          <CardLabel>Score Breakdown</CardLabel>
                          <div style={{fontSize:12,color:T.darkGray,margin:"8px 0"}}>{rfp.score_breakdown.overall}</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            <div><div style={{fontSize:10,color:T.green,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>STRENGTHS</div>{rfp.score_breakdown.strengths?.map((s,j)=><div key={j} style={{fontSize:11,marginBottom:2,color:T.darkGray}}>+ {s}</div>)}</div>
                            <div><div style={{fontSize:10,color:T.red,fontWeight:700,marginBottom:4,fontFamily:T.mono}}>GAPS</div>{rfp.score_breakdown.gaps?.map((g,j)=><div key={j} style={{fontSize:11,marginBottom:2,color:T.darkGray}}>− {g}</div>)}</div>
                          </div>
                        </div>
                      )}
                      <p style={{margin:"0 0 10px",fontSize:13,color:T.darkGray,lineHeight:1.6}}>{rfp.description}</p>
                      {rfp.services_needed?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{rfp.services_needed.map((s,j)=><Badge key={j} label={s} color={T.orange} />)}</div>}
                      <div style={{fontSize:12,color:T.green,marginBottom:10}}>✓ {rfp.why_bwl_can_win}</div>
                      {rfp.source_url&&<a href={rfp.source_url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:T.orange,marginBottom:12,fontWeight:600,fontFamily:T.mono}}>🔗 View Original RFP — {rfp.source} ↗</a>}
                      <button onClick={()=>genProposal(rfp)}
                        style={{width:"100%",padding:"10px 0",borderRadius:0,background:loading.proposal&&selected?.id===rfp.id?"#E5E0D8":T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                        {loading.proposal&&selected?.id===rfp.id?"GENERATING…":"GENERATE PROPOSAL"}
                      </button>
                    </Card>
                  );
                })}
              </div>
            );
          })()}

          {proposal&&selected&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <CardLabel>Branded Proposal</CardLabel>
                  <div style={{fontSize:11,color:T.grayLight,marginTop:2}}>Template: <strong>{selected.type}</strong> · LEVERAGE. format</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {selected.source_url&&<a href={selected.source_url} target="_blank" rel="noreferrer" style={{padding:"6px 14px",borderRadius:0,fontSize:10,fontWeight:700,background:T.orangeSoft,color:T.orange,border:`2px solid ${T.orange}`,fontFamily:T.mono,letterSpacing:1}}>VIEW RFP ↗</a>}
                  <Pill label="← BACK" onClick={()=>{setProposal(null);setSelected(null);setEditingProposal(false);}} />
                </div>
              </div>
              <BrandedProposal proposal={{...proposal,full_proposal_text:editedProposalText}} rfp={selected} />
              <Card style={{padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <CardLabel color={T.orange}>Edit Proposal Text</CardLabel>
                  <button onClick={()=>setEditingProposal(!editingProposal)}
                    style={{background:editingProposal?T.orange:T.bg,color:editingProposal?"#fff":T.gray,border:`2px solid ${editingProposal?T.orange:T.black}`,borderRadius:0,padding:"5px 14px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                    {editingProposal?"✓ DONE EDITING":"✏️ EDIT"}
                  </button>
                </div>
                {editingProposal&&(
                  <textarea value={editedProposalText} onChange={e=>setEditedProposalText(e.target.value)}
                    style={{width:"100%",minHeight:400,background:T.bg,border:`2px solid ${T.orange}`,borderRadius:0,color:T.black,fontSize:12,padding:14,outline:"none",fontFamily:T.mono,lineHeight:1.8,resize:"vertical"}} />
                )}
              </Card>
              <div style={{display:"flex",gap:10}}>
                <button onClick={rerunProposal} disabled={loading.proposal}
                  style={{flex:1,padding:12,borderRadius:0,background:loading.proposal?"#E5E0D8":T.darkGray,color:"#fff",border:`2px solid ${T.black}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                  {loading.proposal?"REGENERATING…":"🔄 REGENERATE"}
                </button>
                <button onClick={()=>navigator.clipboard.writeText(editedProposalText)}
                  style={{flex:1,padding:12,borderRadius:0,background:T.black,color:"#fff",border:`2px solid ${T.black}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>COPY</button>
                <button onClick={()=>{saveToTracker(selected,editedProposalText);setView("tracker");setProposal(null);setSelected(null);}}
                  style={{flex:1,padding:12,borderRadius:0,background:T.green,color:"#fff",border:`2px solid ${T.green}`,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SAVE TO PIPELINE</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view==="tracker"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {viewingProposal&&(
            <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:500,overflowY:"auto",padding:"40px 20px"}}>
              <div style={{maxWidth:860,margin:"0 auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:T.font}}>{viewingProposal.title}</div>
                  <div style={{display:"flex",gap:8}}>
                    {viewingProposal.source_url&&<a href={viewingProposal.source_url} target="_blank" rel="noreferrer" style={{background:T.orange,color:"#fff",borderRadius:0,padding:"8px 18px",fontSize:11,fontWeight:700,fontFamily:T.mono,textDecoration:"none",letterSpacing:1}}>🔗 VIEW RFP</a>}
                    <button onClick={()=>navigator.clipboard.writeText(viewingProposal.proposal)} style={{background:"#333",color:"#fff",border:"none",borderRadius:0,padding:"8px 18px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>COPY TEXT</button>
                    <button onClick={()=>setViewingProposal(null)} style={{background:T.red,color:"#fff",border:"none",borderRadius:0,padding:"8px 18px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>✕ CLOSE</button>
                  </div>
                </div>
                <BrandedProposal proposal={{full_proposal_text:viewingProposal.proposal,subject_line:viewingProposal.title,requirements_checklist:[]}} rfp={{organization:viewingProposal.organization}} />
              </div>
            </div>
          )}

          <Card style={{background:T.black,padding:20}}>
            <CardLabel color={T.orange}>Win Rate Dashboard</CardLabel>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:14}}>
              {[["Total",tracker.length,T.orange],["Pending",tracker.filter(t=>t.status==="submitted").length,T.yellow],["Won",won.length,T.green],["Lost",tracker.filter(t=>t.status==="lost").length,T.red],["Win Rate",`${winRate}%`,winRate>=50?T.green:winRate>=30?T.yellow:T.red]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center",background:"#ffffff0d",border:"1px solid #333",padding:"12px 6px"}}>
                  <div style={{fontSize:22,fontWeight:900,color:c,fontFamily:T.font}}>{v}</div>
                  <div style={{fontSize:9,color:"#999",fontWeight:700,marginTop:2,fontFamily:T.mono,letterSpacing:1}}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {(totalRev>0||pipelineRev>0)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
                {totalRev>0&&<div style={{background:"#10b98118",border:`1px solid ${T.green}44`,padding:"10px 14px"}}><div style={{fontSize:9,color:T.green,fontWeight:900,fontFamily:T.mono,letterSpacing:1}}>REVENUE WON</div><div style={{fontSize:20,fontWeight:800,color:T.green,fontFamily:T.font}}>${totalRev.toLocaleString()}</div></div>}
                {pipelineRev>0&&<div style={{background:"#f59e0b18",border:`1px solid ${T.yellow}44`,padding:"10px 14px"}}><div style={{fontSize:9,color:T.yellow,fontWeight:900,fontFamily:T.mono,letterSpacing:1}}>PIPELINE VALUE</div><div style={{fontSize:20,fontWeight:800,color:T.yellow,fontFamily:T.font}}>${pipelineRev.toLocaleString()}</div></div>}
              </div>
            )}
          </Card>

          {tracker.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No proposals saved yet</div></Card>:
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {tracker.map(t=>{
                const urg=urgencyTag(t.deadline);
                return (
                  <Card key={t.id} style={{padding:18}} hover>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:15}}>{t.title}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginTop:5}}>
                          <span style={{fontSize:11,color:T.gray}}>{t.organization}</span>
                          {t.type&&<Badge label={t.type} color={T.gray} />}
                          {urg&&<Badge label={urg.label} color={urg.color} />}
                          {t.score&&<Badge label={`SCORE: ${t.score}`} color={sc(t.score)} />}
                        </div>
                        {t.services?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{t.services.map((s,j)=><Badge key={j} label={s} color={T.orange} />)}</div>}
                      </div>
                      <Badge label={ss(t.status).label} color={ss(t.status).color} />
                    </div>
                    {t.source_url&&<a href={t.source_url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:T.orange,marginBottom:10,fontWeight:600,fontFamily:T.mono}}>🔗 View Original RFP ↗</a>}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:T.bg,border:`2px solid ${T.black}`,padding:"8px 12px"}}>
                      <span style={{fontSize:10,color:T.gray,fontWeight:700,whiteSpace:"nowrap",fontFamily:T.mono,letterSpacing:1}}>EST. REVENUE</span>
                      {editRev[t.id]?(
                        <Input value={t.revenue||""} onChange={v=>updateField(t.id,"revenue",v)} placeholder="e.g. $5,000" style={{flex:1}} />
                      ):(
                        <span onClick={()=>setEditRev(p=>({...p,[t.id]:true}))} style={{flex:1,fontSize:12,color:t.revenue?T.black:T.grayLight,cursor:"pointer"}}>{t.revenue||"Click to add…"}</span>
                      )}
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>NOTES</div>
                      {editNote[t.id]?(
                        <textarea autoFocus value={t.notes||""} onChange={e=>updateField(t.id,"notes",e.target.value)} onBlur={()=>setEditNote(p=>({...p,[t.id]:false}))}
                          style={{width:"100%",minHeight:60,background:T.bg,border:`2px solid ${T.orange}`,borderRadius:0,color:T.black,fontSize:12,padding:"8px 10px",outline:"none",fontFamily:T.body,resize:"vertical"}} />
                      ):(
                        <div onClick={()=>setEditNote(p=>({...p,[t.id]:true}))} style={{background:T.bg,border:`2px solid ${T.black}`,padding:"8px 10px",fontSize:12,color:t.notes?T.black:T.grayLight,cursor:"pointer",minHeight:32,lineHeight:1.5}}>{t.notes||"Click to add notes…"}</div>
                      )}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button onClick={()=>setViewingProposal(t)} style={{background:T.black,color:"#fff",border:`2px solid ${T.black}`,borderRadius:0,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>👁 VIEW</button>
                      {t.status==="draft"&&<button onClick={()=>updateStatus(t.id,"submitted")} style={{background:T.bg,color:T.yellow,border:`2px solid ${T.yellow}`,borderRadius:0,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>SUBMITTED</button>}
                      {t.status==="submitted"&&<><button onClick={()=>updateStatus(t.id,"won")} style={{background:T.bg,color:T.green,border:`2px solid ${T.green}`,borderRadius:0,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>WON</button><button onClick={()=>updateStatus(t.id,"lost")} style={{background:T.bg,color:T.red,border:`2px solid ${T.red}`,borderRadius:0,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>LOST</button></>}
                      <button onClick={()=>navigator.clipboard.writeText(t.proposal)} style={{background:T.bg,color:T.orange,border:`2px solid ${T.orange}`,borderRadius:0,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>COPY</button>
                      <button onClick={()=>del(t.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,borderRadius:0,padding:"6px 12px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button>
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
  const [updates,setUpdates]=useState("");const [slack,setSlack]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Generate weekly status report for Kristine Mirabueno (CoS/EA) at BuildWithLeverage to send to David (CEO). Updates: ${updates}. Slack/Notes: ${slack||"none"}. Return ONLY valid JSON: {"executive_summary":"TL;DR 2-3 sentences","wins":["w1"],"in_progress":[{"item":"...","status":"...","owner":"..."}],"blockers":["b1"],"next_week":["p1"],"david_needs_to_know":["item"],"full_report":"complete formatted report"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Your Updates This Week" value={updates} onChange={setUpdates} placeholder={`Type your updates for ${weekLabel()}…`} /><Textarea label="Slack / Notes (Optional)" value={slack} onChange={setSlack} placeholder="Paste relevant Slack messages…" minHeight={80} /><Btn onClick={gen} disabled={!updates.trim()} loading={loading} label={`Generate Weekly Report — ${weekLabel()}`} icon="📄" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:20}}><CardLabel color={T.orange}>TL;DR FOR DAVID</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:14,lineHeight:1.7}}>{result.executive_summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Wins" items={result.wins} color={T.green} /><Bullets label="Blockers" items={result.blockers?.length?result.blockers:["None"]} color={T.red} /></div><Bullets label="Next Week" items={result.next_week} color={T.purple} /><Bullets label="David Needs to Know" items={result.david_needs_to_know?.length?result.david_needs_to_know:["Nothing urgent"]} color={T.orange} /></>}</div>);
}

function ExecComms() {
  const TYPES=[{key:"announcement",label:"ANNOUNCEMENT"},{key:"followup",label:"FOLLOW-UP"},{key:"recap",label:"MEETING RECAP"},{key:"slack",label:"SLACK MESSAGE"}];
  const [type,setType]=useState("announcement");const [context,setContext]=useState("");const [tone,setTone]=useState("professional");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`CoS at BuildWithLeverage drafting a ${type}. Tone: ${tone}. Context: ${context}. Return ONLY valid JSON: {"subject":"subject or header","draft":"complete message","alt_version":"alternative version","tips":["tip 1"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{TYPES.map(t=><button key={t.key} onClick={()=>{setType(t.key);setResult(null);}} style={{padding:"12px 14px",borderRadius:0,fontSize:11,fontWeight:700,background:type===t.key?T.black:T.surface,color:type===t.key?T.orange:T.gray,border:`2px solid ${T.black}`,cursor:"pointer",textAlign:"left",fontFamily:T.mono,letterSpacing:1}}>{t.label}</button>)}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:10,color:T.gray,fontWeight:700,fontFamily:T.mono,letterSpacing:1}}>TONE</span>{["professional","friendly","direct","urgent"].map(t=><Pill key={t} label={t.toUpperCase()} active={tone===t} color={T.orange} onClick={()=>setTone(t)} />)}</div><Textarea label="Context" value={context} onChange={setContext} placeholder="What do you need to communicate?" /><Btn onClick={gen} disabled={!context.trim()} loading={loading} label="Draft Comms" icon="✏️" /><Err msg={error} />{result&&<>{result.subject&&<Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject</CardLabel><div style={{fontSize:15,fontWeight:700,color:"#fff",marginTop:6}}>{result.subject}</div></Card>}<div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Main Draft</CardLabel><CopyBtn text={result.draft} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.draft}</div></div><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel color={T.gray}>Alternative Version</CardLabel><CopyBtn text={result.alt_version} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",color:T.darkGray}}>{result.alt_version}</div></div><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function DailyBriefing() {
  const [input,setInput]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`You are AI Chief of Staff for David Perlov, CEO of BuildWithLeverage. Generate a concise daily briefing based on: ${input}. Return ONLY valid JSON: {"summary":"2-3 sentence TL;DR","urgent_items":["item1"],"fyi_items":["item1"],"decisions_needed":["decision1"],"full_briefing":"complete formatted briefing"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Updates, Reports, Slack Messages" value={input} onChange={setInput} placeholder="Paste anything that needs to be briefed on today…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="Generate Daily Briefing" icon="☀️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>TL;DR</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:14,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Urgent" items={result.urgent_items} color={T.red} /><Bullets label="Decisions Needed" items={result.decisions_needed} color={T.purple} /></div><Bullets label="FYI" items={result.fyi_items} color={T.yellow} /></>}</div>);
}

function TeamPerformance() {
  const [input,setInput]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`You are an AI advisor for David Perlov, CEO of BuildWithLeverage. Analyze team performance based on: ${input}. Team: ${TEAM_OPS.join(", ")}. Return ONLY valid JSON: {"overall_health":"green|yellow|red","summary":"2-3 sentence overview","top_performers":["name: reason"],"needs_attention":["name: reason"],"team_insights":["insight1"],"recommended_actions":["action1"],"david_focus":"what David should personally focus on this week"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  const hColor=h=>({green:T.green,yellow:T.yellow,red:T.red}[h]||T.gray);
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Team Updates, Reports, or Notes" value={input} onChange={setInput} placeholder="Paste any team updates, SOD reports, task completions…" /><Btn onClick={gen} disabled={!input.trim()} loading={loading} label="Analyze Team Performance" icon="📊" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardLabel color={T.orange}>Team Health</CardLabel><Badge label={result.overall_health==="green"?"HEALTHY":result.overall_health==="yellow"?"WATCH":"CRITICAL"} color={hColor(result.overall_health)} /></div><p style={{margin:0,color:"#fff",fontSize:13,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Top Performers" items={result.top_performers} color={T.green} /><Bullets label="Needs Attention" items={result.needs_attention} color={T.red} /></div><Bullets label="Team Insights" items={result.team_insights} color={T.purple} /><Bullets label="Recommended Actions" items={result.recommended_actions} color={T.yellow} /><Card style={{padding:16,border:`2px solid ${T.orange}`,background:T.orangeSoft}}><CardLabel color={T.orange}>David's Focus This Week</CardLabel><p style={{margin:"8px 0 0",fontSize:13,color:T.black,lineHeight:1.6}}>{result.david_focus}</p></Card></>}</div>);
}

function StrategicDecision() {
  const [situation,setSituation]=useState("");const [options,setOptions]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Strategic advisor for David Perlov, CEO of BuildWithLeverage. Situation: ${situation}. Options: ${options||"not specified"}. Return ONLY valid JSON: {"recommendation":"recommended path in 2-3 sentences","confidence":"high|medium|low","pros_cons":[{"option":"name","pros":["p1"],"cons":["c1"]}],"risks":"key risk","next_steps":["step1"],"decision_log":"1 paragraph decision log"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  const confColor=c=>({high:T.green,medium:T.yellow,low:T.red}[c]||T.gray);
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Situation / Decision" value={situation} onChange={setSituation} placeholder="Describe the strategic decision or situation…" /><Textarea label="Options Being Considered (Optional)" value={options} onChange={setOptions} placeholder="List the options…" minHeight={80} /><Btn onClick={gen} disabled={!situation.trim()} loading={loading} label="Analyze Decision" icon="🧠" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><CardLabel color={T.orange}>Recommendation</CardLabel>{result.confidence&&<Badge label={`${result.confidence} confidence`} color={confColor(result.confidence)} />}</div><p style={{margin:0,color:"#fff",fontSize:14,lineHeight:1.7}}>{result.recommendation}</p></Card>{result.pros_cons?.map((o,i)=>(<Card key={i} style={{padding:16}}><div style={{fontWeight:700,fontSize:14,marginBottom:10}}>{o.option}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Pros" items={o.pros} color={T.green} /><Bullets label="Cons" items={o.cons} color={T.red} /></div></Card>))}<Bullets label="Next Steps" items={result.next_steps} color={T.purple} /></>}</div>);
}

// ─── OUTBOUND ─────────────────────────────────────────────────────────────────
function SequenceBuilder() {
  const [icp,setIcp]=useState("");const [goal,setGoal]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Outbound marketing specialist at BuildWithLeverage. Build 3-email cold sequence. ICP: ${icp}. Goal: ${goal}. Return ONLY valid JSON: {"sequence_name":"name","emails":[{"step":1,"subject":"s","body":"full email","send_day":"Day 1","goal":"g"},{"step":2,"subject":"s","body":"full email","send_day":"Day 3","goal":"g"},{"step":3,"subject":"s","body":"full email","send_day":"Day 7","goal":"g"}],"tips":["t1"]}`;try{const r=await callClaude(prompt,3000);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Target Audience / ICP" value={icp} onChange={setIcp} placeholder="Who are you targeting?" minHeight={80} /><Textarea label="Campaign Goal" value={goal} onChange={setGoal} placeholder="e.g. Book discovery call…" minHeight={70} /><Btn onClick={gen} disabled={!icp.trim()||!goal.trim()} loading={loading} label="Build Email Sequence" icon="✉️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Sequence</CardLabel><div style={{fontSize:16,fontWeight:800,color:"#fff",marginTop:6}}>{result.sequence_name}</div></Card>{result.emails?.map((e,i)=>(<Card key={i} style={{padding:18}}><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><Badge label={`EMAIL ${e.step}`} color={T.black} bg={T.black} /><span style={{fontSize:10,color:T.gray,fontFamily:T.mono}}>{e.send_day}</span><span style={{fontSize:10,color:T.purple,marginLeft:"auto",fontFamily:T.mono}}>{e.goal}</span></div><div style={{fontSize:12,fontWeight:600,marginBottom:8,color:T.darkGray,fontFamily:T.mono}}>Subject: {e.subject}</div><div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",background:T.bg,border:`2px solid ${T.black}`,padding:14}}>{e.body}</div></Card>))}<Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function LeadResearch() {
  const [target,setTarget]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Lead research specialist for BuildWithLeverage. Research: ${target}. Return ONLY valid JSON: {"company_summary":"2-3 sentences","pain_points":["p1"],"why_bwl_fits":"reason","recommended_angle":"best angle","talking_points":["t1"],"estimated_fit_score":85,"research_summary":"complete research summary"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Company / Lead to Research" value={target} onChange={setTarget} placeholder="Company name, website, or any lead details…" minHeight={90} /><Btn onClick={gen} disabled={!target.trim()} loading={loading} label="Research Lead" icon="🔍" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><CardLabel color={T.orange}>Overview</CardLabel><p style={{margin:"10px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.company_summary}</p></div><div style={{textAlign:"center",marginLeft:20}}><div style={{fontSize:34,fontWeight:900,color:result.estimated_fit_score>=80?T.green:result.estimated_fit_score>=60?T.yellow:T.red,fontFamily:T.font,lineHeight:1}}>{result.estimated_fit_score}</div><div style={{fontSize:9,color:T.gray,fontWeight:700,fontFamily:T.mono,letterSpacing:1}}>FIT SCORE</div></div></div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Pain Points" items={result.pain_points} color={T.red} /><Bullets label="Talking Points" items={result.talking_points} color={T.purple} /></div><Card style={{padding:16}}><CardLabel color={T.green}>Why BWL Fits</CardLabel><p style={{margin:"8px 0 12px",fontSize:13,lineHeight:1.6}}>{result.why_bwl_fits}</p><CardLabel color={T.orange}>Recommended Angle</CardLabel><p style={{margin:"8px 0 0",fontSize:13,lineHeight:1.6}}>{result.recommended_angle}</p></Card></>}</div>);
}

function ColdEmailWriter() {
  const [lead,setLead]=useState("");const [offer,setOffer]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Top SDR at BuildWithLeverage. Write cold email. Lead: ${lead}. Offer: ${offer||"BWL growth services"}. Return ONLY valid JSON: {"subject_line":"s","email_body":"complete cold email under 150 words","alt_subject":"alt","follow_up":"2-sentence day-3 follow-up","tips":["t1"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Lead Info" value={lead} onChange={setLead} placeholder="Company, contact, role, pain points…" minHeight={90} /><Textarea label="Offer / Angle (Optional)" value={offer} onChange={setOffer} placeholder="What are you pitching?" minHeight={70} /><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="Write Cold Email" icon="✉️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject Lines</CardLabel><div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:8}}>{result.subject_line}</div><div style={{fontSize:13,color:"#777",marginTop:6}}>Alt: {result.alt_subject}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Main Draft</CardLabel><CopyBtn text={result.email_body} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.email_body}</div></div><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel color={T.gray}>Follow-up (Day 3)</CardLabel><CopyBtn text={result.follow_up} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",color:T.darkGray}}>{result.follow_up}</div></div><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function CallScript() {
  const [lead,setLead]=useState("");const [goal,setGoal]=useState("book a discovery call");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Top SDR at BuildWithLeverage. Build cold call script. Lead: ${lead}. Goal: ${goal}. Return ONLY valid JSON: {"opener":"1-2 sentence opener","value_prop":"2-3 sentence value prop","discovery_questions":["q1","q2","q3"],"objection_handling":[{"objection":"o","response":"r"}],"cta":"closing CTA","full_script":"complete word-for-word script"}`;try{const r=await callClaude(prompt,2500);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Lead / Company Info" value={lead} onChange={setLead} placeholder="Who are you calling?" minHeight={90} /><Card><SectionHeader label="Call Goal" /><input value={goal} onChange={e=>setGoal(e.target.value)} style={{width:"100%",background:"transparent",border:"none",color:T.black,fontSize:13,padding:"12px 18px",outline:"none",fontFamily:T.body,display:"block"}} /></Card><Btn onClick={gen} disabled={!lead.trim()} loading={loading} label="Generate Call Script" icon="📞" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Opener</CardLabel><p style={{margin:"8px 0 14px",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.opener}</p><CardLabel color={T.orange}>Value Prop</CardLabel><p style={{margin:"8px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.value_prop}</p></Card><Bullets label="Discovery Questions" items={result.discovery_questions} color={T.purple} /><Card style={{padding:16}}><CardLabel color={T.yellow}>Objection Handling</CardLabel><div style={{marginTop:10}}>{result.objection_handling?.map((o,i)=><div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<result.objection_handling.length-1?`1px solid ${T.border}`:"none"}}><div style={{fontSize:12,fontWeight:700,color:T.red,marginBottom:4}}>"{o.objection}"</div><div style={{fontSize:12,lineHeight:1.5,color:T.darkGray}}>→ {o.response}</div></div>)}</div></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Full Script</CardLabel><CopyBtn text={result.full_script} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.full_script}</div></div></>}</div>);
}

function AfterCallAutomation() {
  const [callNotes,setCallNotes]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`SDR at BuildWithLeverage. Generate after-call automations: ${callNotes}. Return ONLY valid JSON: {"call_summary":"2-3 sentence summary","outcome":"connected|no_answer|left_voicemail|not_interested|interested|meeting_booked","crm_notes":"complete CRM note","follow_up_email":{"subject":"s","body":"complete follow-up email"},"next_action":"recommended next action","slack_update":"1-2 sentence Slack update"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  const outColor=o=>({connected:T.green,interested:T.green,meeting_booked:T.green,no_answer:T.yellow,left_voicemail:T.yellow,not_interested:T.red}[o]||T.gray);
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Call Notes" value={callNotes} onChange={setCallNotes} placeholder="What happened on the call? Messy notes are fine." /><Btn onClick={gen} disabled={!callNotes.trim()} loading={loading} label="Generate After-Call Pack" icon="🗒️" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardLabel color={T.orange}>Call Summary</CardLabel>{result.outcome&&<Badge label={result.outcome.replace("_"," ")} color={outColor(result.outcome)} />}</div><p style={{margin:0,color:"#fff",fontSize:13,lineHeight:1.7}}>{result.call_summary}</p></Card><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>CRM Notes</CardLabel><CopyBtn text={result.crm_notes} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.crm_notes}</div></div>{result.follow_up_email&&<Card style={{padding:18}}><CardLabel color={T.orange}>Follow-up Email</CardLabel><div style={{background:T.black,padding:"10px 14px",margin:"10px 0"}}><div style={{fontSize:9,color:T.gray,fontWeight:700,marginBottom:3,fontFamily:T.mono,letterSpacing:1}}>SUBJECT</div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{result.follow_up_email.subject}</div></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",background:T.bg,border:`2px solid ${T.black}`,padding:14}}>{result.follow_up_email.body}</div><div style={{marginTop:10}}><CopyBtn text={result.follow_up_email.body} /></div></Card>}<Card style={{padding:16,border:`2px solid ${T.orange}`,background:T.orangeSoft}}><CardLabel color={T.orange}>Next Action</CardLabel><p style={{margin:"8px 0 0",fontSize:13,color:T.black,lineHeight:1.6}}>{result.next_action}</p></Card></>}</div>);
}

// ─── INFLUENCER ───────────────────────────────────────────────────────────────
function InfluencerOutreach() {
  const [influencer,setInfluencer]=useState("");const [campaign,setCampaign]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Influencer outreach specialist at BuildWithLeverage. Influencer: ${influencer}. Campaign: ${campaign}. Return ONLY valid JSON: {"subject":"DM/email subject","outreach_message":"complete personalized outreach","follow_up":"follow-up for day 3","collaboration_brief":"brief collab overview","tips":["t1"]}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Influencer Info" value={influencer} onChange={setInfluencer} placeholder="Name, niche, platform, followers…" minHeight={80} /><Textarea label="Campaign / Brand" value={campaign} onChange={setCampaign} placeholder="What brand or campaign are you pitching?" minHeight={80} /><Btn onClick={gen} disabled={!influencer.trim()||!campaign.trim()} loading={loading} label="Generate Outreach" icon="📲" /><Err msg={error} />{result&&<>{result.subject&&<Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Subject</CardLabel><div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:6}}>{result.subject}</div></Card>}<div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Outreach Message</CardLabel><CopyBtn text={result.outreach_message} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.outreach_message}</div></div><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel color={T.gray}>Follow-up (Day 3)</CardLabel><CopyBtn text={result.follow_up} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",color:T.darkGray}}>{result.follow_up}</div></div><Bullets label="Tips" items={result.tips} color={T.orange} /></>}</div>);
}

function CampaignBrief() {
  const [details,setDetails]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Campaign manager at BuildWithLeverage. Build influencer campaign brief: ${details}. Return ONLY valid JSON: {"campaign_name":"n","objective":"o","target_audience":"a","key_message":"m","deliverables":["d1"],"timeline":"t","kpis":["k1"],"dos":["do1"],"donts":["dont1"],"full_brief":"complete formatted brief"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Campaign Details" value={details} onChange={setDetails} placeholder="Brand, product, goal, audience, budget…" /><Btn onClick={gen} disabled={!details.trim()} loading={loading} label="Build Campaign Brief" icon="📋" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Campaign</CardLabel><div style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:T.font,margin:"6px 0 10px"}}>{result.campaign_name}</div><div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{result.objective}</div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="KPIs" items={result.kpis} color={T.green} /><Bullets label="Do's" items={result.dos} color={T.green} /><Bullets label="Don'ts" items={result.donts} color={T.red} /></div><div style={{background:T.bg,border:`2px solid ${T.black}`,padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><CardLabel>Full Brief</CardLabel><CopyBtn text={result.full_brief} /></div><div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result.full_brief}</div></div></>}</div>);
}

function InfluencerTracker() {
  const [influencers,setInfluencers]=useState([]);
  const [form,setForm]=useState({name:"",handle:"",platform:"Instagram",niche:"",followers:"",status:"under_nego",rate:"",notes:"",email:"",contact:""});
  const [showForm,setShowForm]=useState(false);const [importing,setImporting]=useState(false);const [importResult,setImportResult]=useState(null);const [filter,setFilter]=useState("all");
  useEffect(()=>{storage.get("influencer-tracker").then(s=>{if(s) setInfluencers(JSON.parse(s.value));});},[]);
  const save=async(list)=>{setInfluencers(list);await storage.set("influencer-tracker",JSON.stringify(list));};
  const add=()=>{save([{...form,id:Date.now(),created_at:new Date().toISOString()},...influencers]);setForm({name:"",handle:"",platform:"Instagram",niche:"",followers:"",status:"under_nego",rate:"",notes:"",email:"",contact:""});setShowForm(false);};
  const del=(id)=>save(influencers.filter(i=>i.id!==id));
  const updateStatus=(id,status)=>save(influencers.map(i=>i.id===id?{...i,status}:i));
  const handleCSV=async(e)=>{
    const file=e.target.files[0];if(!file) return;setImporting(true);setImportResult(null);
    const text=await file.text();const lines=text.split("\n").filter(l=>l.trim());const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
    const rows=lines.slice(1).map(line=>{const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));return headers.reduce((obj,h,i)=>({...obj,[h]:vals[i]||""}),{});});
    const fieldMap={name:["name","fullname"],handle:["handle","username","ig","tiktok","account"],platform:["platform","channel"],niche:["niche","category","genre"],followers:["followers","followercount","subs"],rate:["rate","fee","price","cost"],status:["status"],notes:["notes","remarks","comment"],email:["email","emailaddress"],contact:["contact","phone","mobile","number"]};
    const findField=(row,keys)=>{for(const k of keys){const match=Object.keys(row).find(h=>h.includes(k));if(match&&row[match]) return row[match];}return "";};
    const imported=rows.filter(r=>findField(r,fieldMap.name)).map(r=>({id:Date.now()+Math.random(),name:findField(r,fieldMap.name),handle:findField(r,fieldMap.handle),platform:findField(r,fieldMap.platform)||"Instagram",niche:findField(r,fieldMap.niche),followers:findField(r,fieldMap.followers),rate:findField(r,fieldMap.rate),status:findField(r,fieldMap.status)||"under_nego",notes:findField(r,fieldMap.notes),email:findField(r,fieldMap.email),contact:findField(r,fieldMap.contact),created_at:new Date().toISOString()}));
    save([...imported,...influencers]);setImportResult({count:imported.length,skipped:rows.length-imported.length});setImporting(false);e.target.value="";
  };
  const statuses={active:{label:"ACTIVE",color:T.green},paid:{label:"PAID",color:T.purple},under_nego:{label:"NEGOTIATING",color:T.yellow},completed:{label:"COMPLETED",color:T.gray},declined:{label:"DECLINED",color:T.red}};
  const filtered=filter==="all"?influencers:influencers.filter(i=>i.status===filter);
  const counts=Object.keys(statuses).reduce((a,k)=>({...a,[k]:influencers.filter(i=>i.status===k).length}),{});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["all","ALL",T.black],...Object.entries(statuses).map(([k,v])=>[k,v.label,v.color])].map(([k,l,c])=>(
          <Pill key={k} label={`${l} (${k==="all"?influencers.length:counts[k]})`} active={filter===k} color={c} onClick={()=>setFilter(k)} />
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <label style={{padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,background:T.purple,color:"#fff",cursor:"pointer",fontFamily:T.mono,letterSpacing:1,border:`2px solid ${T.purple}`}}>
            {importing?"IMPORTING…":"IMPORT CSV"}
            <input type="file" accept=".csv" onChange={handleCSV} style={{display:"none"}} disabled={importing} />
          </label>
          <button onClick={()=>setShowForm(!showForm)} style={{padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>+ ADD</button>
        </div>
      </div>
      {importResult&&<div style={{background:"#F0FDF4",border:`2px solid ${T.green}`,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:T.green,fontWeight:700}}>Imported {importResult.count} influencers{importResult.skipped>0?` (${importResult.skipped} skipped)`:""}</span><button onClick={()=>setImportResult(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.green}}>×</button></div>}
      {showForm&&(
        <Card>
          <SectionHeader label="Add Influencer" />
          <div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["name","NAME *"],["handle","HANDLE"],["niche","NICHE"],["followers","FOLLOWERS"],["rate","RATE"],["email","EMAIL"],["contact","CONTACT #"]].map(([k,l])=>(
              <div key={k}><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>{l}</div><Input value={form[k]} onChange={v=>setForm(p=>({...p,[k]:v}))} /></div>
            ))}
            <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>PLATFORM</div><select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{["Instagram","TikTok","YouTube","Twitter/X","Facebook","LinkedIn"].map(p=><option key={p}>{p}</option>)}</select></div>
            <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div style={{padding:"0 16px 16px"}}><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Notes…" style={{width:"100%",minHeight:60,background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.body,resize:"vertical"}} /></div>
          <div style={{padding:"0 16px 16px",display:"flex",gap:8}}><Btn onClick={add} disabled={!form.name.trim()} label="ADD INFLUENCER" /><button onClick={()=>setShowForm(false)} style={{padding:"11px 20px",borderRadius:0,background:T.surface,color:T.gray,border:`2px solid ${T.black}`,fontSize:12,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button></div>
        </Card>
      )}
      {filtered.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>👥</div><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No influencers yet — import CSV or add manually</div></Card>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(inf=>(
            <Card key={inf.id} style={{padding:16}} hover>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{inf.name}</div>
                  <div style={{fontSize:12,color:T.gray,marginTop:3}}>@{inf.handle} · {inf.platform}{inf.followers?` · ${inf.followers}`:""}</div>
                  {inf.niche&&<div style={{fontSize:11,color:T.grayLight,marginTop:2}}>Niche: {inf.niche}</div>}
                  {(inf.email||inf.contact)&&<div style={{fontSize:11,color:T.grayLight,marginTop:2}}>{inf.email}{inf.email&&inf.contact?" · ":""}{inf.contact}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}><Badge label={statuses[inf.status]?.label} color={statuses[inf.status]?.color} />{inf.rate&&<span style={{fontSize:11,color:T.gray}}>{inf.rate}</span>}</div>
              </div>
              {inf.notes&&<div style={{fontSize:12,color:T.darkGray,background:T.bg,border:`2px solid ${T.black}`,padding:"8px 12px",marginBottom:10}}>{inf.notes}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {Object.entries(statuses).filter(([k])=>k!==inf.status).map(([k,v])=>(
                  <button key={k} onClick={()=>updateStatus(inf.id,k)} style={{background:T.bg,color:v.color,border:`2px solid ${v.color}`,borderRadius:0,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>→ {v.label}</button>
                ))}
                <button onClick={()=>del(inf.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,borderRadius:0,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

function ContentTracker() {
  const [posts,setPosts]=useState([]);
  const [form,setForm]=useState({influencer:"",platform:"Instagram",content_type:"Post",caption:"",post_date:"",status:"planned",link:""});
  const [showForm,setShowForm]=useState(false);const [filter,setFilter]=useState("all");
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
        {[["all","ALL"],...Object.entries(statuses).map(([k,v])=>[k,v.label])].map(([k,l])=>(
          <Pill key={k} label={`${l} (${k==="all"?posts.length:posts.filter(p=>p.status===k).length})`} active={filter===k} color={k==="all"?T.black:statuses[k]?.color} onClick={()=>setFilter(k)} />
        ))}
        <button onClick={()=>setShowForm(!showForm)} style={{marginLeft:"auto",padding:"5px 14px",borderRadius:0,fontSize:10,fontWeight:700,background:T.orange,color:"#fff",border:`2px solid ${T.orange}`,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>+ ADD CONTENT</button>
      </div>
      {showForm&&(
        <Card>
          <SectionHeader label="Add Content" />
          <div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["influencer","INFLUENCER *"],["link","POST LINK"]].map(([k,l])=>(
              <div key={k}><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>{l}</div><Input value={form[k]} onChange={v=>setForm(p=>({...p,[k]:v}))} /></div>
            ))}
            {[["platform",["Instagram","TikTok","YouTube","Twitter/X","Facebook"]],["content_type",["Post","Reel","Story","Video","TikTok","Tweet"]]].map(([k,opts])=>(
              <div key={k}><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>{k==="platform"?"PLATFORM":"TYPE"}</div><select value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
            ))}
            <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>POST DATE</div><input type="date" value={form.post_date} onChange={e=>setForm(p=>({...p,post_date:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.body}} /></div>
            <div><div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>STATUS</div><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none"}}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div style={{padding:"0 16px 16px"}}><textarea value={form.caption} onChange={e=>setForm(p=>({...p,caption:e.target.value}))} placeholder="Caption / notes…" style={{width:"100%",minHeight:70,background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.body,resize:"vertical"}} /></div>
          <div style={{padding:"0 16px 16px",display:"flex",gap:8}}><Btn onClick={add} disabled={!form.influencer.trim()} label="ADD CONTENT" /><button onClick={()=>setShowForm(false)} style={{padding:"11px 20px",borderRadius:0,background:T.surface,color:T.gray,border:`2px solid ${T.black}`,fontSize:12,cursor:"pointer",fontFamily:T.mono}}>CANCEL</button></div>
        </Card>
      )}
      {filtered.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>📅</div><div style={{fontSize:14,fontWeight:600,color:T.gray}}>No content tracked yet</div></Card>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(post=>(
            <Card key={post.id} style={{padding:16}} hover>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{post.influencer}</div>
                  <div style={{fontSize:12,color:T.gray,marginTop:3}}>{post.platform} · {post.content_type}{post.post_date?` · ${new Date(post.post_date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`:""}</div>
                  {post.link&&<a href={post.link} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.orange,marginTop:2,display:"block",fontFamily:T.mono}}>VIEW POST ↗</a>}
                </div>
                <Badge label={statuses[post.status]?.label} color={statuses[post.status]?.color} />
              </div>
              {post.caption&&<div style={{fontSize:12,color:T.darkGray,background:T.bg,border:`2px solid ${T.black}`,padding:"8px 12px",marginBottom:10,lineHeight:1.5}}>{post.caption}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {Object.entries(statuses).filter(([k])=>k!==post.status).map(([k,v])=>(
                  <button key={k} onClick={()=>updateStatus(post.id,k)} style={{background:T.bg,color:v.color,border:`2px solid ${v.color}`,borderRadius:0,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>→ {v.label}</button>
                ))}
                <button onClick={()=>del(post.id)} style={{marginLeft:"auto",background:T.bg,color:T.gray,border:`2px solid ${T.black}`,borderRadius:0,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:T.mono}}>DELETE</button>
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
  const [request,setRequest]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Creative director at BuildWithLeverage. Build design brief: ${request}. Return ONLY valid JSON: {"project_title":"t","objective":"o","deliverables":["d1"],"dimensions":"dim","brand_guidelines":["g1"],"mood":["v1"],"references":"inspiration","deadline_suggestion":"turnaround","full_brief":"complete formatted design brief"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Design Request" value={request} onChange={setRequest} placeholder="What needs to be designed?" /><Btn onClick={gen} disabled={!request.trim()} loading={loading} label="Generate Design Brief" icon="🎨" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:18}}><CardLabel color={T.orange}>Project</CardLabel><div style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:T.font,margin:"6px 0 10px"}}>{result.project_title}</div><div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{result.objective}</div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Deliverables" items={result.deliverables} color={T.purple} /><Bullets label="Mood / Vibe" items={result.mood} color="#a855f7" /></div><Bullets label="Brand Guidelines" items={result.brand_guidelines} color={T.orange} /></>}</div>);
}

function FeedbackSummary() {
  const [feedback,setFeedback]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState(null);
  const gen=async()=>{setLoading(true);setResult(null);setError(null);const prompt=`Project manager at BuildWithLeverage. Summarize design feedback: ${feedback}. Return ONLY valid JSON: {"summary":"1-2 sentence overview","required_changes":["c1"],"nice_to_have":["n1"],"keep_as_is":["k1"],"tone":"positive|mixed|critical","designer_message":"complete actionable message to designer"}`;try{const r=await callClaude(prompt);setResult(r);}catch(e){setError(e.message);}setLoading(false);};
  return (<div style={{display:"flex",flexDirection:"column",gap:14}}><Textarea label="Paste Feedback" value={feedback} onChange={setFeedback} placeholder="Paste raw feedback — messy is fine…" /><Btn onClick={gen} disabled={!feedback.trim()} loading={loading} label="Summarize Feedback" icon="🖊" /><Err msg={error} />{result&&<><Card style={{background:T.black,padding:16}}><CardLabel color={T.orange}>Overview</CardLabel><p style={{margin:"8px 0 0",color:"#fff",fontSize:13,lineHeight:1.7}}>{result.summary}</p></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Bullets label="Required Changes" items={result.required_changes} color={T.red} /><Bullets label="Nice to Have" items={result.nice_to_have} color={T.yellow} /></div><Bullets label="Keep As Is" items={result.keep_as_is} color={T.green} /></>}</div>);
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({slackToken,setSlackToken,slackIds,setSlackIds,onChangePassword}) {
  const [token,setToken]=useState(slackToken||"");const [ids,setIds]=useState(slackIds||DEFAULT_SLACK_IDS);const [saved,setSaved]=useState(false);const [newPw,setNewPw]=useState("");const [confirmPw,setConfirmPw]=useState("");const [pwMsg,setPwMsg]=useState(null);
  const save=async()=>{setSlackToken(token);setSlackIds(ids);await storage.set("slack-token",token);await storage.set("slack-ids",JSON.stringify(ids));setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const changePw=async()=>{
    if(!newPw||newPw.length<6){setPwMsg({type:"error",text:"Password must be at least 6 characters"});return;}
    if(newPw!==confirmPw){setPwMsg({type:"error",text:"Passwords do not match"});return;}
    await storage.set("app-password",newPw);onChangePassword(newPw);setNewPw("");setConfirmPw("");
    setPwMsg({type:"success",text:"Password updated successfully"});setTimeout(()=>setPwMsg(null),3000);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionHeader label="Slack Bot Token" />
        <div style={{padding:16}}>
          <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="xoxb-…"
            style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}} />
        </div>
      </Card>
      <Card>
        <SectionHeader label="Slack User IDs" />
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
          {Object.entries(ids).map(([name,id])=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:12}}>
              <Avatar name={name} size={28} />
              <div style={{width:130,fontSize:12,fontWeight:600,flexShrink:0,color:T.darkGray}}>{name.split(" ")[0]}</div>
              <input value={id} onChange={e=>setIds(p=>({...p,[name]:e.target.value}))} placeholder="U0XXXXXXXXX"
                style={{flex:1,background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:12,padding:"8px 12px",outline:"none",fontFamily:T.mono}} />
            </div>
          ))}
        </div>
      </Card>
      <Btn onClick={save} label={saved?"✓ SAVED":"SAVE SETTINGS"} color={saved?T.green:T.black} />
      <Card>
        <SectionHeader label="🔐 Change Password" />
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>NEW PASSWORD</div>
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 6 characters"
              style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}} />
          </div>
          <div>
            <div style={{fontSize:10,color:T.gray,fontWeight:700,marginBottom:4,fontFamily:T.mono,letterSpacing:1}}>CONFIRM PASSWORD</div>
            <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat password"
              style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,borderRadius:0,color:T.black,fontSize:13,padding:"10px 14px",outline:"none",fontFamily:T.mono}}
              onKeyDown={e=>e.key==="Enter"&&changePw()} />
          </div>
          {pwMsg&&<div style={{fontSize:12,color:pwMsg.type==="success"?T.green:T.red,fontFamily:T.mono,fontWeight:600,letterSpacing:1}}>{pwMsg.type==="success"?"✓":"✗"} {pwMsg.text}</div>}
          <button onClick={changePw} disabled={!newPw||!confirmPw}
            style={{padding:"11px 20px",borderRadius:0,background:newPw&&confirmPw?T.black:"#E5E0D8",color:newPw&&confirmPw?"#fff":T.gray,border:`2px solid ${newPw&&confirmPw?T.black:"#E5E0D8"}`,fontSize:12,fontWeight:700,cursor:newPw&&confirmPw?"pointer":"not-allowed",fontFamily:T.mono,letterSpacing:1}}>
            UPDATE PASSWORD
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV=[
  {key:"dashboard",label:"Dashboard"},
  {key:"ops-pulse",label:"Ops Pulse"},
  {key:"rfp",label:"RFP Engine"},
  {key:"cos",label:"CoS Tools",children:[{key:"weekly-report",label:"Weekly Report"},{key:"exec-comms",label:"Exec Comms"},{key:"daily-briefing",label:"Daily Briefing"},{key:"team-performance",label:"Team Performance"},{key:"strategic-decision",label:"Strategic Decision"}]},
  {key:"outbound",label:"Outbound",children:[{key:"sequence-builder",label:"Sequence Builder"},{key:"lead-research",label:"Lead Research"},{key:"cold-email",label:"Cold Email"},{key:"call-script",label:"Call Script"},{key:"after-call",label:"After Call"}]},
  {key:"influencer",label:"Influencer",children:[{key:"influencer-outreach",label:"Outreach"},{key:"campaign-brief",label:"Campaign Brief"},{key:"influencer-tracker",label:"Tracker"},{key:"content-tracker",label:"Content Tracker"}]},
  {key:"design",label:"Design",children:[{key:"design-brief",label:"Design Brief"},{key:"feedback-summary",label:"Feedback Summary"}]},
  {key:"culture",label:"Culture"},
  {key:"settings",label:"Settings"},
];

const PAGE_ICONS={dashboard:"⚡","ops-pulse":"📋",rfp:"📊","weekly-report":"📄","exec-comms":"✏️","daily-briefing":"☀️","team-performance":"👥","strategic-decision":"🧠","sequence-builder":"✉️","lead-research":"🔍","cold-email":"📧","call-script":"📞","after-call":"🗒️","influencer-outreach":"📲","campaign-brief":"📋","influencer-tracker":"👥","content-tracker":"📅","design-brief":"🎨","feedback-summary":"🖊",settings:"⚙️",culture:"🏛️"};

function TopNav({page,navigate,isMobile,onLock}) {
  const [openGroup,setOpenGroup]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const closeTimer=useRef(null);
  const openMenu=(key)=>{clearTimeout(closeTimer.current);setOpenGroup(key);};
  const closeMenu=()=>{closeTimer.current=setTimeout(()=>setOpenGroup(null),120);};
  return (
    <header style={{background:T.black,height:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:200,borderBottom:`3px solid ${T.orange}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",letterSpacing:3,fontFamily:T.font,cursor:"pointer"}} onClick={()=>navigate("dashboard")}>
          LEVERAGE<span style={{color:T.orange}}>.</span>
        </div>
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
              <div key={n.key} style={{position:"relative",display:"flex",alignItems:"stretch"}}
                onMouseEnter={()=>n.children&&openMenu(n.key)}
                onMouseLeave={()=>n.children&&closeMenu()}>
                <button onClick={()=>!n.children&&navigate(n.key)}
                  style={{height:"100%",padding:"0 18px",background:isActive?T.orange:"transparent",color:isActive?"#fff":"#aaa",border:"none",borderBottom:isActive?`3px solid ${T.orange}`:"3px solid transparent",fontSize:11,fontWeight:700,cursor:n.children?"default":"pointer",letterSpacing:2,fontFamily:T.mono,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>{if(!isActive){e.currentTarget.style.color="#fff";e.currentTarget.style.background="#ffffff14";}}}
                  onMouseLeave={e=>{if(!isActive){e.currentTarget.style.color="#aaa";e.currentTarget.style.background="transparent";}}}>
                  {n.label.toUpperCase()}{n.children&&<span style={{fontSize:8,opacity:0.7}}>▾</span>}
                </button>
                {n.children&&openGroup===n.key&&(
                  <div style={{position:"absolute",top:"100%",left:0,background:T.black,border:`1px solid #2a2a2a`,borderTop:`3px solid ${T.orange}`,minWidth:200,boxShadow:"0 12px 40px rgba(0,0,0,0.4)",zIndex:300,padding:"6px 0"}}
                    onMouseEnter={()=>clearTimeout(closeTimer.current)} onMouseLeave={closeMenu}>
                    {n.children.map(c=>(
                      <button key={c.key} onClick={()=>{navigate(c.key);setOpenGroup(null);}}
                        style={{display:"flex",alignItems:"center",width:"100%",padding:"10px 18px",background:page===c.key?"#ffffff12":"transparent",color:page===c.key?T.orange:"#ccc",border:"none",borderLeft:page===c.key?`3px solid ${T.orange}`:"3px solid transparent",fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"left",letterSpacing:1,fontFamily:T.mono,transition:"all 0.1s"}}
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
          <button onClick={onLock} title="Lock"
            style={{height:"100%",padding:"0 14px",background:"transparent",color:"#555",border:"none",fontSize:16,cursor:"pointer",transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="#555"}>
            🔒
          </button>
        </nav>
      )}
      {isMobile&&menuOpen&&(
        <div style={{position:"fixed",top:58,left:0,right:0,bottom:0,background:T.black,zIndex:199,overflowY:"auto",padding:16}}>
          {NAV.map(n=>n.children?(
            <div key={n.key} style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#555",fontWeight:700,letterSpacing:3,padding:"6px 10px 4px",fontFamily:T.mono}}>{n.label.toUpperCase()}</div>
              {n.children.map(c=>(
                <button key={c.key} onClick={()=>{navigate(c.key);setMenuOpen(false);}}
                  style={{display:"block",width:"100%",padding:"10px 16px",background:page===c.key?T.orange:"transparent",color:"#fff",border:"none",borderRadius:0,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",marginBottom:2,fontFamily:T.mono,letterSpacing:1}}>
                  {c.label.toUpperCase()}
                </button>
              ))}
            </div>
          ):(
            <button key={n.key} onClick={()=>{navigate(n.key);setMenuOpen(false);}}
              style={{display:"block",width:"100%",padding:"10px 16px",background:page===n.key?T.orange:"transparent",color:"#fff",border:"none",borderRadius:0,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",marginBottom:2,fontFamily:T.mono,letterSpacing:1}}>
              {n.label.toUpperCase()}
            </button>
          ))}
          <button onClick={()=>{onLock();setMenuOpen(false);}}
            style={{display:"block",width:"100%",padding:"10px 16px",background:"transparent",color:"#888",border:"none",fontSize:12,cursor:"pointer",textAlign:"left",marginBottom:2,fontFamily:T.mono,letterSpacing:1}}>
            🔒 LOCK
          </button>
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

export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [currentPassword,setCurrentPassword]=useState(CORRECT_PASSWORD);
  const [page,setPage]=useState("dashboard");
  const [slackToken,setSlackToken]=useState("");
  const [slackIds,setSlackIds]=useState(DEFAULT_SLACK_IDS);
  const isMobile=useIsMobile();

  useEffect(()=>{
    storage.get("app-password").then(r=>{if(r?.value) setCurrentPassword(r.value);});
    Promise.all([storage.get("slack-token"),storage.get("slack-ids")]).then(([t,ids])=>{if(t) setSlackToken(t.value);if(ids) setSlackIds(JSON.parse(ids.value));});
  },[]);

  const handleUnlock=()=>setUnlocked(true);
  const handleLock=()=>setUnlocked(false);

  const PasswordGateWithDynamic=()=>{
    const [pw,setPw]=useState("");const [error,setError]=useState(false);const [shaking,setShaking]=useState(false);
    const attempt=()=>{if(pw===currentPassword){handleUnlock();}else{setError(true);setShaking(true);setPw("");setTimeout(()=>setShaking(false),500);setTimeout(()=>setError(false),2000);}};
    return (
      <div style={{minHeight:"100vh",background:T.black,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:400,textAlign:"center"}}>
          <div style={{marginBottom:40}}>
            <div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:4,fontFamily:T.font,lineHeight:1}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
            <div style={{fontSize:10,color:"#444",fontFamily:T.mono,marginTop:8,letterSpacing:3}}>OPERATIONS HUB</div>
          </div>
          <div style={{fontSize:40,marginBottom:24}}>🔐</div>
          <div style={{background:"#111",border:`2px solid ${error?T.red:"#222"}`,borderRadius:0,padding:"32px 28px",animation:shaking?"shake 0.4s ease":"none",transition:"border-color 0.2s"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:T.mono,marginBottom:6,letterSpacing:2}}>RESTRICTED ACCESS</div>
            <div style={{fontSize:12,color:"#555",fontFamily:T.mono,marginBottom:24,letterSpacing:1}}>Enter password to continue</div>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw&&attempt()} placeholder="Password" autoFocus
              style={{width:"100%",background:"#1a1a1a",border:`2px solid ${error?T.red:"#333"}`,borderRadius:0,color:"#fff",fontSize:15,padding:"12px 16px",outline:"none",fontFamily:T.mono,letterSpacing:3,textAlign:"center",marginBottom:16,transition:"border-color 0.2s"}} />
            {error&&<div style={{fontSize:12,color:T.red,fontFamily:T.mono,marginBottom:12,letterSpacing:1}}>✗ INCORRECT PASSWORD</div>}
            <button onClick={attempt} disabled={!pw}
              style={{width:"100%",padding:"12px",borderRadius:0,background:pw?T.orange:"#222",color:pw?"#fff":"#444",border:`2px solid ${pw?T.orange:"#333"}`,fontSize:12,fontWeight:700,cursor:pw?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.mono,transition:"all 0.15s"}}>
              UNLOCK →
            </button>
          </div>
          <div style={{fontSize:10,color:"#333",fontFamily:T.mono,marginTop:20,letterSpacing:2}}>BUILDWITHLEVERAGE.COM</div>
        </div>
      </div>
    );
  };

  if(!unlocked) return (<><GlobalStyle /><PasswordGateWithDynamic /></>);

  const navigate=(key)=>{setPage(key);window.scrollTo({top:0,behavior:"smooth"});};

  const renderPage=()=>{
    switch(page){
      case "dashboard": return <Dashboard navigate={navigate} />;
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
      case "culture": return <CultureDashboard />;
      case "settings": return <Settings slackToken={slackToken} setSlackToken={setSlackToken} slackIds={slackIds} setSlackIds={setSlackIds} onChangePassword={setCurrentPassword} />;
      default: return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div style={{minHeight:"100vh",background:T.bg}}>
        <TopNav page={page} navigate={navigate} isMobile={isMobile} onLock={handleLock} />
        <PageWrapper page={page}>{renderPage()}</PageWrapper>
      </div>
    </>
  );
}
