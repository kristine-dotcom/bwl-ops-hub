// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
const SITE_PASSWORD = "leverage2026"; // ← palitan ng gusto mong password

function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const tryUnlock = () => {
    if (input === SITE_PASSWORD) {
      sessionStorage.setItem("bwl-auth", "1");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%,60%{transform:translateX(-8px)}
          40%,80%{transform:translateX(8px)}
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>
      <div style={{ minHeight: "100vh", background: T.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className={shake ? "shake" : ""} style={{ background: T.surface, border: `2px solid ${error ? T.red : T.orange}`, borderRadius: 16, padding: "48px 40px", maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.black, letterSpacing: 4, fontFamily: T.font, marginBottom: 4 }}>
            LEVERAGE<span style={{ color: T.orange }}>.</span>
          </div>
          <div style={{ fontSize: 10, color: T.grayLight, fontFamily: T.mono, letterSpacing: 3, marginBottom: 32 }}>OPS HUB</div>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && tryUnlock()}
            placeholder="Enter password"
            autoFocus
            style={{ width: "100%", background: T.bg, border: `1.5px solid ${error ? T.red : T.border}`, borderRadius: 8, color: T.black, fontSize: 14, padding: "12px 16px", outline: "none", fontFamily: T.body, textAlign: "center", marginBottom: 12 }}
          />
          {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 12, fontFamily: T.mono }}>Incorrect password</div>}
          <button
            onClick={tryUnlock}
            style={{ width: "100%", padding: "12px 0", borderRadius: 8, background: T.black, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, letterSpacing: 1 }}>
            ENTER
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MAIN APP EXPORT (replace the existing export default App) ────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [slackToken, setSlackToken] = useState("");
  const [slackIds, setSlackIds] = useState(DEFAULT_SLACK_IDS);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("bwl-auth") === "1");
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([storage.get("slack-token"), storage.get("slack-ids")]).then(([t, ids]) => {
      if (t) setSlackToken(t.value);
      if (ids) setSlackIds(JSON.parse(ids.value));
    });
  }, []);

  const navigate = (key) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;

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
        <PageWrapper page={page}>{renderPage()}</PageWrapper>
      </div>
    </>
  );
}
