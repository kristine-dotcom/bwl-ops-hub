import { useState, useEffect, useRef } from "react";

// ─── ENVIRONMENT VARIABLES ────────────────────────────────────────────────────
const SLACK_BOT_TOKEN = import.meta.env.VITE_SLACK_BOT_TOKEN;
const SLACK_CHANNEL = import.meta.env.VITE_SLACK_CHANNEL || "#attendance-admin";

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

// ✅ FLEXI TIME MEMBERS (no time restrictions)
const FLEXI_TIME_MEMBERS = ["Suki Santos", "Kristine Miel Zulaybar"];

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
const sendToSlack = async (message) => {
  if (!SLACK_BOT_TOKEN) {
    console.log("❌ No bot token configured");
    return;
  }
  
  console.log("🔵 Sending to:", SLACK_CHANNEL);
  console.log("📝 Message:", message);
  
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: message
      })
    });
    
    const data = await response.json();
    console.log("✅ Slack response:", data);
    
    if (!data.ok) {
      console.error("❌ Slack error:", data.error);
    }
  } catch (error) {
    console.error("❌ Slack error:", error);
  }
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Badge = ({label,color=T.orange,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",background:bg||"transparent",color,border:`1.5px solid ${color}`,borderRadius:0,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1.5,fontFamily:T.mono,textTransform:"uppercase"}}>{label}</span>
);

const Card = ({children,style={},hover=false}) => {
  const [isHov,setIsHov]=useState(false);
  return <div onMouseEnter={()=>hover&&setIsHov(true)} onMouseLeave={()=>hover&&setIsHov(false)} style={{background:T.surface,border:`2px solid ${T.black}`,borderRadius:0,borderTop:hover&&isHov?`4px solid ${T.orange}`:`2px solid ${T.black}`,transition:"border-top 0.15s",overflow:"hidden",...style}}>{children}</div>;
};

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

// ─── TEAM DATA ────────────────────────────────────────────────────────────────
const TEAM_OPS=["Suki Santos","Kristine Mirabueno","Kristine Miel Zulaybar","Caleb Bentil","David Perlov","Cyril Butanas","Darlene Mae Malolos"];
const ADMIN_USERS = ["Kristine Mirabueno", "David Perlov"];
const isAdmin = (name) => ADMIN_USERS.includes(name);

const KPI_DATA = {
  "Caleb Bentil": {
    color:"#6366f1",emoji:"📞",role:"Outbound Specialist",
    categories:[
      {name:"Activity",metrics:[{name:"Calls Dialed",target:"80/day",stretch:"100+/day",notes:"Total dials incl. voicemails"}]},
    ],
    eod:["Calls dialed: __","Live connects: __","Meetings booked: __","Tomorrow's goal: __"]
  },
  "Darlene Mae Malolos": {
    color:"#ec4899",emoji:"🎨",role:"Graphic Designer",
    categories:[
      {name:"Output",metrics:[{name:"Designs Delivered",target:"Per week",stretch:"Ahead of schedule",notes:"Completed designs"}]},
    ],
    eod:["Assets completed: __","In progress: __","Tomorrow's goal: __"]
  },
  "Cyril Butanas": {
    color:"#10b981",emoji:"🌟",role:"Influencer Specialist",
    categories:[
      {name:"Outreach",metrics:[{name:"Outreach Sent",target:"30/week",stretch:"50+/week",notes:"Messages sent"}]},
    ],
    eod:["Outreach sent: __","Responses: __","Tomorrow's goal: __"]
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
      <div style={{background:"#fff8f0",border:`2px solid ${T.orange}`,padding:"12px 16px",fontSize:12,color:T.darkGray,lineHeight:1.6}}>
        📋 <strong>Submit your Start of Day report first.</strong> Your SOD will be visible to Kristine and David.
      </div>

      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>TODAY'S TASKS *</div>
          <button onClick={addTask} style={{background:"transparent",border:`1px solid #444`,color:"#aaa",padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>+ ADD</button>
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {tasks.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,paddingTop:12,minWidth:18}}>{i+1}.</div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                <input value={t.task} onChange={e=>updateTask(i,"task",e.target.value)} placeholder={`Task ${i+1}…`}
                  style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:T.body,color:T.black}} />
                <div style={{display:"flex",gap:8}}>
                  <select value={t.priority} onChange={e=>updateTask(i,"priority",e.target.value)}
                    style={{flex:1,background:T.bg,border:`2px solid ${priorityColor(t.priority)}`,padding:"6px 10px",fontSize:12,fontWeight:700,color:priorityColor(t.priority),outline:"none",fontFamily:T.mono}}>
                    {PRIORITY_OPTIONS.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                  <select value={t.eta} onChange={e=>updateTask(i,"eta",e.target.value)}
                    style={{flex:1,background:T.bg,border:`2px solid ${T.black}`,padding:"6px 10px",fontSize:12,color:T.black,outline:"none",fontFamily:T.mono}}>
                    {TIME_OPTIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {tasks.length>1&&<button onClick={()=>removeTask(i)} style={{background:"none",border:"none",color:T.grayLight,fontSize:16,cursor:"pointer",paddingTop:8}}>✕</button>}
            </div>
          ))}
        </div>
      </div>

      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}><div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>METRICS</div></div>
        <textarea value={metrics} onChange={e=>setMetrics(e.target.value)} placeholder="Today's metrics target…"
          style={{width:"100%",minHeight:70,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>

      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}><div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>BLOCKERS</div></div>
        <textarea value={blockers} onChange={e=>setBlockers(e.target.value)} placeholder="Any blockers? (optional)"
          style={{width:"100%",minHeight:60,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.body,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{width:"100%",padding:"14px",background:canSubmit?T.orange:"#E5E0D8",color:canSubmit?"#fff":T.gray,border:"none",fontSize:13,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font}}>
        {canSubmit?"✅  SUBMIT SOD & UNLOCK LOG IN":"ADD AT LEAST ONE TASK"}
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
  
  useEffect(()=>{
    if(kpiData){
      const allMetrics=kpiData.categories.flatMap(cat=>
        cat.metrics.map(m=>({name:m.name,value:"",target:m.target,notes:m.notes}))
      );
      setMetrics(allMetrics);
    }
  },[member]);

  const updateMetric=(i,val)=>setMetrics(prev=>prev.map((m,idx)=>idx===i?{...m,value:val}:m));
  const canSubmit=eodReport.trim();

  const handleSubmit=async()=>{
    if(!canSubmit) return;
    setSubmitting(true);
    const eod={
      member,date:todayStr(),
      submittedAt:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}),
      eodReport:eodReport.trim(),
      metrics:metrics.filter(m=>m.value.trim()),
    };
    
    // Save to storage
    const key=`eod-${todayStr()}`;
    const existing=await storage.get(key);
    const allEods=existing?JSON.parse(existing.value):{};
    allEods[member]=eod;
    await storage.set(key,JSON.stringify(allEods));
    
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
      <div style={{background:"#fff0f0",border:`2px solid ${T.red}`,padding:"12px 16px",fontSize:12,color:T.darkGray,lineHeight:1.6}}>
        📊 <strong>Submit your End of Day report.</strong> Your EOD will be visible to Kristine and David.
      </div>

      <div style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
        <div style={{background:T.black,padding:"10px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>END OF DAY REPORT *</div>
        </div>
        <textarea value={eodReport} onChange={e=>setEodReport(e.target.value)} 
          placeholder={kpiData?.eod?.join("\n") || "Describe accomplishments and tomorrow's plan…"}
          style={{width:"100%",minHeight:140,background:"transparent",border:"none",padding:14,fontSize:13,outline:"none",fontFamily:T.mono,lineHeight:1.7,resize:"vertical",color:T.black,display:"block"}} />
      </div>

      {kpiData && kpiData.categories.map((cat,ci)=>(
        <div key={ci} style={{background:T.surface,border:`2px solid ${T.black}`,overflow:"hidden"}}>
          <div style={{background:T.black,padding:"10px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>{cat.name.toUpperCase()}</div>
          </div>
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
            {cat.metrics.map((metric,mi)=>{
              const idx=metrics.findIndex(m=>m.name===metric.name);
              if(idx===-1) return null;
              return (
                <div key={mi}>
                  <div style={{fontSize:12,fontWeight:600,color:T.black,marginBottom:4}}>{metric.name}</div>
                  <div style={{fontSize:10,color:T.grayLight,marginBottom:4,fontFamily:T.mono}}>Target: {metric.target}</div>
                  <input value={metrics[idx].value} onChange={e=>updateMetric(idx,e.target.value)} 
                    placeholder={`Enter ${metric.name.toLowerCase()}…`}
                    style={{width:"100%",background:T.bg,border:`2px solid ${T.black}`,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:T.body,color:T.black}} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{width:"100%",padding:"14px",background:canSubmit?T.red:"#E5E0D8",color:canSubmit?"#fff":T.gray,border:"none",fontSize:13,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",letterSpacing:2,fontFamily:T.font}}>
        {canSubmit?"✅  SUBMIT EOD & UNLOCK LOG OUT":"COMPLETE EOD REPORT"}
      </button>
    </div>
  );
}

// ─── MAIN ATTENDANCE TRACKER ──────────────────────────────────────────────────
function AttendanceTracker({currentMember}) {
  const [logs,setLogs]=useState([]);
  const [sodSubmitted,setSodSubmitted]=useState(false);
  const [eodSubmitted,setEodSubmitted]=useState(false);
  const [showSOD,setShowSOD]=useState(false);
  const [showEOD,setShowEOD]=useState(false);
  const [loading,setLoading]=useState(true);

  // Load logs on mount
  useEffect(()=>{
    const loadData=async()=>{
      const key=`logs-${todayStr()}`;
      const data=await storage.get(key);
      if(data?.value) setLogs(JSON.parse(data.value));
      
      // Check SOD status
      const sodKey=`sod-${todayStr()}`;
      const sodData=await storage.get(sodKey);
      if(sodData?.value){
        const allSods=JSON.parse(sodData.value);
        if(allSods[currentMember]) setSodSubmitted(true);
      }
      
      // Check EOD status
      const eodKey=`eod-${todayStr()}`;
      const eodData=await storage.get(eodKey);
      if(eodData?.value){
        const allEods=JSON.parse(eodData.value);
        if(allEods[currentMember]) setEodSubmitted(true);
      }
      
      setLoading(false);
    };
    loadData();
  },[currentMember]);

  // Request notification permission
  useEffect(()=>{
    requestNotificationPermission();
  },[]);

  const saveLogs=async(newLogs)=>{
    setLogs(newLogs);
    await storage.set(`logs-${todayStr()}`,JSON.stringify(newLogs));
  };

  const getStatus=(member)=>{
    const memberLogs=logs.filter(l=>l.member===member&&l.date===todayStr());
    if(memberLogs.length===0) return "out";
    const lastLog=memberLogs[memberLogs.length-1];
    return lastLog.type;
  };

  const isLate=(member)=>{
    // ✅ FLEXI TIME: Skip late checking for flexi members
    if(FLEXI_TIME_MEMBERS.includes(member)) return false;
    
    const d=todayStr();
    const firstIn=logs.find(l=>l.member===member&&l.date===d&&l.type==="in");
    if(!firstIn) return false;
    const [h,m]=firstIn.time.split(":").map(Number);
    const [sh,sm]=SHIFT_START.split(":").map(Number);
    return h>sh||(h===sh&&m>sm);
  };

  const handleLogin=async()=>{
    const now=new Date();
    const time=now.toTimeString().slice(0,5);
    const newLog={member:currentMember,date:todayStr(),time,type:"in"};
    const newLogs=[...logs,newLog];
    await saveLogs(newLogs);
    
    // Send Slack notification
    const lateTag=isLate(currentMember)?" ⚠️ LATE":"";
    await sendToSlack(`✅ ${currentMember} logged in at ${time}${lateTag}`);
    
    showNotification("Logged In","You're now clocked in for the day!","✅");
  };

  const handleLogout=async()=>{
    const now=new Date();
    const time=now.toTimeString().slice(0,5);
    const newLog={member:currentMember,date:todayStr(),time,type:"out"};
    const newLogs=[...logs,newLog];
    await saveLogs(newLogs);
    
    // Send Slack notification
    await sendToSlack(`🔴 ${currentMember} logged out at ${time}`);
    
    showNotification("Logged Out","See you tomorrow!","🔴");
  };

  const handleSODSubmit=async(sod)=>{
    setSodSubmitted(true);
    setShowSOD(false);
    
    // Send Slack notification
    const tasksList=sod.tasks.map(t=>`• ${t.task} [${t.priority}] - ETA: ${t.eta}`).join("\n");
    await sendToSlack(`📋 *${currentMember}* submitted SOD:\n\n${tasksList}\n\nMetrics: ${sod.metrics||"N/A"}\nBlockers: ${sod.blockers||"None"}`);
    
    showNotification("SOD Submitted","Your Start of Day is now visible to leadership","✅");
  };

  const handleEODSubmit=async(eod)=>{
    setEodSubmitted(true);
    setShowEOD(false);
    
    // Send Slack notification
    await sendToSlack(`📊 *${currentMember}* submitted EOD:\n\n${eod.eodReport}`);
    
    showNotification("EOD Submitted","Your End of Day is now visible to leadership","✅");
  };

  if(loading) return <LoadingScreen />;

  const status=getStatus(currentMember);
  const late=isLate(currentMember);
  const isFlexi=FLEXI_TIME_MEMBERS.includes(currentMember);

  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"20px"}}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48,marginBottom:8}}>{status==="in"?"🟢":"🔴"}</div>
        <h1 style={{fontSize:24,fontWeight:700,fontFamily:T.font,marginBottom:4}}>
          {status==="in"?"YOU'RE CLOCKED IN":"YOU'RE CLOCKED OUT"}
        </h1>
        <div style={{fontSize:13,color:T.gray,fontFamily:T.mono}}>
          {currentMember} {isFlexi&&"· FLEXI TIME"}
        </div>
      </div>

      {/* Status Card */}
      <Card style={{marginBottom:20}}>
        <div style={{padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <Avatar name={currentMember} size={48} />
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700}}>{currentMember}</div>
              <div style={{fontSize:12,color:T.gray}}>{todayStr()}</div>
            </div>
            {late&&!isFlexi&&<Badge label="LATE" color={T.red} />}
            {isFlexi&&<Badge label="FLEXI" color={T.purple} />}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:T.bg,padding:12,border:`2px solid ${T.black}`}}>
              <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginBottom:4}}>SOD</div>
              <div style={{fontSize:14,fontWeight:700,color:sodSubmitted?T.green:T.orange}}>
                {sodSubmitted?"✅ DONE":"⏳ PENDING"}
              </div>
            </div>
            <div style={{background:T.bg,padding:12,border:`2px solid ${T.black}`}}>
              <div style={{fontSize:10,color:T.grayLight,fontFamily:T.mono,marginBottom:4}}>EOD</div>
              <div style={{fontSize:14,fontWeight:700,color:eodSubmitted?T.green:T.orange}}>
                {eodSubmitted?"✅ DONE":"⏳ PENDING"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {!sodSubmitted && (
          <button onClick={()=>setShowSOD(true)}
            style={{width:"100%",padding:"16px",background:T.orange,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
            📋 SUBMIT START OF DAY
          </button>
        )}

        {sodSubmitted && status==="out" && (
          <button onClick={handleLogin}
            style={{width:"100%",padding:"16px",background:T.green,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
            ✅ LOG IN
          </button>
        )}

        {status==="in" && !eodSubmitted && (
          <button onClick={()=>setShowEOD(true)}
            style={{width:"100%",padding:"16px",background:T.orange,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
            📊 SUBMIT END OF DAY
          </button>
        )}

        {status==="in" && eodSubmitted && (
          <button onClick={handleLogout}
            style={{width:"100%",padding:"16px",background:T.red,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:2,fontFamily:T.font}}>
            🔴 LOG OUT
          </button>
        )}
      </div>

      {/* SOD Modal */}
      {showSOD && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:1000}}>
          <div style={{background:T.bg,maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto",border:`3px solid ${T.black}`}}>
            <div style={{background:T.black,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>START OF DAY</div>
              <button onClick={()=>setShowSOD(false)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{padding:20}}>
              <SODForm member={currentMember} onSubmit={handleSODSubmit} />
            </div>
          </div>
        </div>
      )}

      {/* EOD Modal */}
      {showEOD && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:1000}}>
          <div style={{background:T.bg,maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto",border:`3px solid ${T.black}`}}>
            <div style={{background:T.black,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>END OF DAY</div>
              <button onClick={()=>setShowEOD(false)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{padding:20}}>
              <EODForm member={currentMember} onSubmit={handleEODSubmit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const [logs,setLogs]=useState([]);
  const [sods,setSods]=useState({});
  const [eods,setEods]=useState({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const loadData=async()=>{
      const logsData=await storage.get(`logs-${todayStr()}`);
      if(logsData?.value) setLogs(JSON.parse(logsData.value));

      const sodData=await storage.get(`sod-${todayStr()}`);
      if(sodData?.value) setSods(JSON.parse(sodData.value));

      const eodData=await storage.get(`eod-${todayStr()}`);
      if(eodData?.value) setEods(JSON.parse(eodData.value));

      setLoading(false);
    };
    loadData();
  },[]);

  const getStatus=(member)=>{
    const memberLogs=logs.filter(l=>l.member===member&&l.date===todayStr());
    if(memberLogs.length===0) return "out";
    return memberLogs[memberLogs.length-1].type;
  };

  const isLate=(member)=>{
    if(FLEXI_TIME_MEMBERS.includes(member)) return false;
    const firstIn=logs.find(l=>l.member===member&&l.date===todayStr()&&l.type==="in");
    if(!firstIn) return false;
    const [h,m]=firstIn.time.split(":").map(Number);
    const [sh,sm]=SHIFT_START.split(":").map(Number);
    return h>sh||(h===sh&&m>sm);
  };

  if(loading) return <LoadingScreen />;

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:"20px"}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:700,fontFamily:T.font,marginBottom:4}}>ADMIN DASHBOARD</h1>
        <div style={{fontSize:13,color:T.gray,fontFamily:T.mono}}>{todayStr()} · {weekLabel()}</div>
      </div>

      {/* Team Overview */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:24}}>
        {TEAM_OPS.map(member=>{
          const status=getStatus(member);
          const late=isLate(member);
          const hasSod=!!sods[member];
          const hasEod=!!eods[member];
          const isFlexi=FLEXI_TIME_MEMBERS.includes(member);
          
          return (
            <Card key={member} hover>
              <div style={{padding:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Avatar name={member} size={40} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{member}</div>
                    <div style={{fontSize:11,color:T.gray,fontFamily:T.mono}}>
                      {status==="in"?"🟢 IN":"🔴 OUT"}
                      {late&&!isFlexi&&" · LATE"}
                      {isFlexi&&" · FLEXI"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,textAlign:"center",padding:"6px",background:hasSod?T.green+"20":T.bg,border:`1px solid ${hasSod?T.green:T.border}`}}>
                    <div style={{fontSize:9,color:T.grayLight,fontFamily:T.mono}}>SOD</div>
                    <div style={{fontSize:16}}>{hasSod?"✅":"⏳"}</div>
                  </div>
                  <div style={{flex:1,textAlign:"center",padding:"6px",background:hasEod?T.green+"20":T.bg,border:`1px solid ${hasEod?T.green:T.border}`}}>
                    <div style={{fontSize:9,color:T.grayLight,fontFamily:T.mono}}>EOD</div>
                    <div style={{fontSize:16}}>{hasEod?"✅":"⏳"}</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* SOD Reports */}
      {Object.keys(sods).length>0 && (
        <Card style={{marginBottom:24}}>
          <div style={{background:T.black,padding:"12px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>START OF DAY REPORTS</div>
          </div>
          <div style={{padding:16}}>
            {Object.entries(sods).map(([member,sod])=>(
              <div key={member} style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Avatar name={member} size={32} />
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{member}</div>
                    <div style={{fontSize:11,color:T.gray}}>{sod.submittedAt}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {sod.tasks.map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 12px",background:T.bg,border:`2px solid ${T.black}`}}>
                      <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono}}>{i+1}.</div>
                      <div style={{flex:1,fontSize:13}}>{t.task}</div>
                      <Badge label={t.priority} color={priorityColor(t.priority)} />
                      <div style={{fontSize:11,color:T.gray,fontFamily:T.mono}}>{t.eta}</div>
                    </div>
                  ))}
                </div>
                {sod.metrics&&<div style={{marginTop:8,fontSize:12,color:T.darkGray}}><strong>Metrics:</strong> {sod.metrics}</div>}
                {sod.blockers&&<div style={{marginTop:4,fontSize:12,color:T.red}}><strong>Blockers:</strong> {sod.blockers}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EOD Reports */}
      {Object.keys(eods).length>0 && (
        <Card>
          <div style={{background:T.black,padding:"12px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>END OF DAY REPORTS</div>
          </div>
          <div style={{padding:16}}>
            {Object.entries(eods).map(([member,eod])=>(
              <div key={member} style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Avatar name={member} size={32} />
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{member}</div>
                    <div style={{fontSize:11,color:T.gray}}>{eod.submittedAt}</div>
                  </div>
                </div>
                <div style={{background:T.bg,padding:12,border:`2px solid ${T.black}`,fontFamily:T.mono,fontSize:12,whiteSpace:"pre-wrap",lineHeight:1.7}}>
                  {eod.eodReport}
                </div>
                {eod.metrics.length>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.grayLight,fontFamily:T.mono,marginBottom:6}}>METRICS</div>
                    {eod.metrics.map((m,i)=>(
                      <div key={i} style={{fontSize:12,marginBottom:4}}>
                        <strong>{m.name}:</strong> {m.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage() {
  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:"20px"}}>
      <h1 style={{fontSize:28,fontWeight:700,fontFamily:T.font,marginBottom:24}}>SETTINGS</h1>
      
      <Card style={{marginBottom:20}}>
        <div style={{background:T.black,padding:"12px 16px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>SLACK CONFIGURATION</div>
        </div>
        <div style={{padding:20}}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Bot Token Status</div>
            <div style={{padding:12,background:SLACK_BOT_TOKEN?T.green+"20":T.red+"20",border:`2px solid ${SLACK_BOT_TOKEN?T.green:T.red}`}}>
              <div style={{fontSize:14,fontWeight:700,color:SLACK_BOT_TOKEN?T.green:T.red}}>
                {SLACK_BOT_TOKEN?"✅ CONFIGURED":"❌ NOT CONFIGURED"}
              </div>
              <div style={{fontSize:11,color:T.gray,marginTop:4}}>
                Channel: {SLACK_CHANNEL}
              </div>
            </div>
          </div>
          <div style={{fontSize:12,color:T.gray,lineHeight:1.6}}>
            Slack bot token is configured via environment variables. Check your <code style={{background:T.bg,padding:"2px 6px",fontFamily:T.mono}}>.env</code> file or Vercel settings.
          </div>
        </div>
      </Card>

      <Card>
        <div style={{background:T.black,padding:"12px 16px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.orange,fontFamily:T.mono,letterSpacing:2}}>WORK HOURS</div>
        </div>
        <div style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginBottom:6}}>SHIFT START</div>
              <div style={{fontSize:20,fontWeight:700,fontFamily:T.mono}}>{SHIFT_START}</div>
            </div>
            <div>
              <div style={{fontSize:11,color:T.grayLight,fontFamily:T.mono,marginBottom:6}}>SHIFT END</div>
              <div style={{fontSize:20,fontWeight:700,fontFamily:T.mono}}>{SHIFT_END}</div>
            </div>
          </div>
          <div style={{marginTop:16,padding:12,background:T.purple+"20",border:`2px solid ${T.purple}`}}>
            <div style={{fontSize:11,fontWeight:700,color:T.purple,fontFamily:T.mono,marginBottom:4}}>FLEXI TIME MEMBERS</div>
            <div style={{fontSize:12,color:T.darkGray}}>
              {FLEXI_TIME_MEMBERS.join(", ")}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [pw,setPw]=useState("");
  const [error,setError]=useState(false);
  const [shaking,setShaking]=useState(false);
  const [currentMember,setCurrentMember]=useState("");
  const [page,setPage]=useState("tracker");

  const attempt=()=>{
    // Check if admin password
    if(pw===ADMIN_PASSWORD){
      setUnlocked(true);
      setCurrentMember("ADMIN");
      setPage("admin");
      return;
    }
    
    // Check if member password
    if(pw===CORRECT_PASSWORD){
      setUnlocked(true);
      // Show member selection
      return;
    }
    
    setError(true);
    setShaking(true);
    setPw("");
    setTimeout(()=>setShaking(false),500);
    setTimeout(()=>setError(false),2000);
  };

  // Member Selection Screen
  if(unlocked && !currentMember){
    return (
      <>
        <GlobalStyle />
        <div style={{minHeight:"100vh",background:T.bg,padding:40}}>
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:36,fontWeight:700,color:T.black,letterSpacing:4,fontFamily:T.font,lineHeight:1}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
              <div style={{fontSize:12,color:T.gray,fontFamily:T.mono,marginTop:8,letterSpacing:2}}>SELECT YOUR NAME</div>
            </div>
            
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
              {TEAM_OPS.map(member=>(
                <button key={member} onClick={()=>setCurrentMember(member)}
                  style={{padding:"20px",background:T.surface,border:`2px solid ${T.black}`,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.orange}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.black}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <Avatar name={member} size={40} />
                    <div>
                      <div style={{fontSize:14,fontWeight:700}}>{member}</div>
                      <div style={{fontSize:11,color:T.gray,fontFamily:T.mono}}>
                        {FLEXI_TIME_MEMBERS.includes(member)?"FLEXI TIME":"9 AM - 5 PM"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main App (after member selected)
  if(unlocked && currentMember){
    return (
      <>
        <GlobalStyle />
        <div style={{minHeight:"100vh",background:T.bg}}>
          {/* Header */}
          <div style={{background:T.black,borderBottom:`3px solid ${T.orange}`,padding:"16px 20px"}}>
            <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#fff",letterSpacing:3,fontFamily:T.font}}>LEVERAGE<span style={{color:T.orange}}>.</span></div>
                <div style={{fontSize:10,color:"#666",fontFamily:T.mono,letterSpacing:2}}>OPERATIONS HUB</div>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                {currentMember==="ADMIN"?(
                  <>
                    <button onClick={()=>setPage("admin")}
                      style={{padding:"8px 16px",background:page==="admin"?T.orange:"transparent",color:page==="admin"?"#fff":"#aaa",border:`2px solid ${page==="admin"?T.orange:"#444"}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                      DASHBOARD
                    </button>
                    <button onClick={()=>setPage("settings")}
                      style={{padding:"8px 16px",background:page==="settings"?T.orange:"transparent",color:page==="settings"?"#fff":"#aaa",border:`2px solid ${page==="settings"?T.orange:"#444"}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                      SETTINGS
                    </button>
                  </>
                ):(
                  <div style={{color:"#aaa",fontSize:12,fontFamily:T.mono}}>{currentMember}</div>
                )}
                <button onClick={()=>{setUnlocked(false);setCurrentMember("");setPw("");}}
                  style={{padding:"8px 16px",background:"transparent",color:T.red,border:`2px solid ${T.red}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.mono,letterSpacing:1}}>
                  LOGOUT
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{padding:"20px 0"}}>
            {currentMember==="ADMIN"?(
              page==="admin"?<AdminDashboard />:<SettingsPage />
            ):(
              <AttendanceTracker currentMember={currentMember} />
            )}
          </div>
        </div>
      </>
    );
  }

  // Login Screen
  return (
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
          <div style={{fontSize:10,color:"#333",fontFamily:T.mono,marginTop:20,letterSpacing:2}}>
            Team: leverage2025 · Admin: admin2025
          </div>
        </div>
      </div>
    </>
  );
}
