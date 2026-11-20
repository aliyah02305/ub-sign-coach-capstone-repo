import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useAuth } from "../../components/AuthContext";
import { auth } from "../../lib/firebase";
import CameraView from "../../components/CameraView";
import SignGuide from "../../components/SignGuide";
import { detectCurrentSign, detectStaticSign, detectSign, SUPPORTED_SIGNS, pushToTrail, detectJMotion, detectZMotion } from "../../lib/handLogic";
import ReportModal from "../../components/ReportModal";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const LEVELS = ["FSL 1", "FSL 2"];

// Icons for modules that come from the database (matched by title)
const MODULE_ICONS = {
  "Alphabet":                  "🔤",
  "Greetings & Introductions": "👋",
  "Numbers & Counting":        "🔢",
  "Colors & Shapes":           "🎨",
  "Family & Relationships":    "👨‍👩‍👧",
};

const levelMeta = {
  "FSL 1": {
    shortLabel: "FSL LEVEL 1: FOUNDATION",
    label:      "FSL Level 1",
    desc:       "Foundational signs — alphabet, greetings, and everyday counting",
    accent:     "#c17f3a",
    pillBg:     "#fef3e2", pillColor: "#9a5e1a",
  },
  "FSL 2": {
    shortLabel: "FSL LEVEL 2: INTERMEDIATE",
    label:      "FSL Level 2",
    desc:       "Intermediate vocabulary — colors, shapes, and family signs",
    accent:     "#5b89d4",
    pillBg:     "#e8f0fe", pillColor: "#1a4db5",
  },
};

const recentActivity = [
  { label: 'Completed "Hello" sign',                  time: "2 hours ago", icon: "✅", color: "#10b981" },
  { label: 'Practiced "Good morning" — 92% accuracy', time: "3 hours ago", icon: "🎯", color: "#c17f3a" },
  { label: "Earned badge: Consistent Learner",        time: "Yesterday",   icon: "🏅", color: "#c17f3a" },
  { label: "Watched intro to Greetings module",       time: "2 days ago",  icon: "▶️", color: "#5b89d4" },
];

const reminders = [
  { text: "Practice session due today",        urgency: "high" },
  { text: "Module 2 quiz unlocks tomorrow",    urgency: "med"  },
  { text: "New FSL lesson edited to Module 3", urgency: "low"  },
];

// Badges are calculated from the student's real progress (no hard-coded list).
function buildBadges(modules, accuracy) {
  const isDone  = (title) => { const m = modules.find(x => x.title === title); return !!m && m.status === "complete"; };
  const alphabet = isDone("Alphabet");
  const numbers  = isDone("Numbers & Counting");
  const allDone  = modules.length > 0 && modules.every(m => m.status === "complete");
  const pro      = alphabet && numbers && allDone;
  return [
    { id:"alphabet",   icon:"🔤", label:"Alphabet Master",    earned: alphabet, hint:"Complete the Alphabet module" },
    { id:"numbers",    icon:"🔢", label:"Numbers Master",     earned: numbers,  hint:"Complete Numbers & Counting" },
    { id:"consistent", icon:"🏅", label:"Consistent Learner", earned: allDone,  hint:"Complete all modules" },
    { id:"accuracy",   icon:"🎯", label:"Accuracy Pro",       earned: pro,      hint:"Earn the 3 badges first",
      extra: accuracy.total ? `${accuracy.pct}% accuracy` : "No accuracy data yet" },
  ];
}

const navItems = [
  { id: "dashboard",    icon: "🏠", label: "Dashboard"        },
  { id: "modules",      icon: "📚", label: "My Modules"       },
  { id: "practice",     icon: "🎥", label: "Practice Session" },
  { id: "progress",     icon: "📊", label: "Progress Report"  },
  { id: "achievements", icon: "🏅", label: "Achievements"     },
  { id: "settings",     icon: "⚙️", label: "Settings"         },
];

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const T = {
  sidebarBg:     "#6B1A28",
  sidebarBorder: "rgba(210, 180, 13, 0.91)",

  bg:            "#FBF8F3",
  surface:       "#FFFFFF",
  border:        "rgba(107, 26, 40, 0.10)",

  amber800:      "#9f7b17",
  amber700:      "#9a740d",
  amber600:      "#9d7507",
  amber100:      "#FDF6E2",
  amber50:       "#FFFDF5",

  blue700:       "#6B1A28",
  blue500:       "#ad820c",
  blue100:       "#FDF6E2",

  text:          "#2A080C",
  textSub:       "#4A121B",
  textMuted:     "#8C6D73",

  success:       "#10B981",
  warning:       "#b3870d",
  danger:        "#9E1B22",

  radius:        "15px",
  radiusSm:      "8px",
  radiusLg:      "14px",
  shadow:        "0 1px 4px rgba(107, 26, 40, 0.08)",
  shadowMd:      "0 4px 14px rgba(107, 26, 40, 0.12)",

  bannerBg:      "#FDF4E1",
  bannerBorder:  "#E5C16C",
};

/* collapsed / expanded widths */
const SIDEBAR_COLLAPSED = 62;
const SIDEBAR_EXPANDED  = 240;

/* ─────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────── */
function Bar({ pct, locked, accent }) {
  return (
    <div style={{ height: 6, background: "#ede8df", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 99,
        background: locked ? "#d4bfa0" : (accent || T.amber600),
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function Card({ title, badge, children, style }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusLg,
      padding: "18px 20px",
      boxShadow: T.shadow,
      ...style,
    }}>
      {title && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
          <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>{title}</h3>
          {badge != null && (
            <span style={{ fontSize:13, fontWeight:600, padding:"2px 10px", borderRadius:99, background:T.amber100, color:T.amber700 }}>{badge}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function StatCard({ icon, value, label, sub }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusLg,
      padding: "18px 22px",
      display:"flex", gap: 14, alignItems:"center",
      boxShadow: T.shadow,
    }}>
      <span style={{ fontSize: 22, background: T.amber100, padding: 10, borderRadius: 10, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ margin:0, fontSize:24, fontWeight:700, color:T.text, lineHeight:1.1 }}>{value}</p>
        <p style={{ margin:"3px 0 0", fontSize:12, fontWeight:500, color:T.textMuted }}>{label}</p>
        {sub && <p style={{ margin:"1px 0 0", fontSize:10, color:T.textMuted }}>{sub}</p>}
      </div>
    </div>
  );
}

function Banner({ eyebrow, title, sub, cta, onCta }) {
  return (
    <div style={{
      background: T.bannerBg,
      border: `1px solid ${T.bannerBorder}`,
      borderLeft: `4px solid ${T.amber600}`,
      borderRadius: T.radiusLg,
      padding: "22px 28px",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      position:"relative", overflow:"hidden",
      boxShadow: "0 2px 10px rgba(26,18,8,0.07)",
    }}>
      <div>
        {eyebrow && (
          <p style={{ margin:"0 0 4px", fontSize:14, color: T.amber700, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase" }}>
            {eyebrow}
          </p>
        )}
        <h2 style={{ margin:"0 0 4px", fontSize:21, fontWeight:700, color: T.amber800 }}>{title}</h2>
        {sub && <p style={{ margin:0, color: T.textMuted, fontSize:13 }}>{sub}</p>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {cta && (
          <button onClick={onCta} style={{
            background: T.amber600, color:"#fff", border:"none", borderRadius:9,
            padding:"9px 18px", fontWeight:700, fontSize:14, cursor:"pointer",
            fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
            boxShadow:"0 2px 8px rgba(193,127,58,0.30)",
          }}>{cta}</button>
        )}
        <span style={{ fontSize:48, userSelect:"none" }}></span>
      </div>
    </div>
  );
}

/* ── Module Card ── */
function ModuleCard({ mod, extra, onContinue, onRetake, practicing, allowEnd = true, hideContinue = false, hideProgress = false }) {
  const [hov, setHov] = useState(false);
  const isLocked   = mod.status === "locked";
  const lm         = levelMeta[mod.level] || levelMeta["FSL 1"];

  const statusCfg = {
    complete: { bg:"#d1fae5", color:"#065f46", label:"Complete"    },
    active:   { bg: T.amber100, color: T.amber700, label:"In Progress" },
    locked:   { bg:"#f3ede4", color: T.textMuted,  label:"Locked"      },
  }[mod.status] || { bg:"#f3ede4", color: T.textMuted, label:"Locked" };

  return (
    <div
      onMouseEnter={() => !isLocked && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isLocked ? "#faf7f2" : T.surface,
        border: `1px solid ${hov ? T.amber600 : T.border}`,
        borderRadius: T.radius,
        padding: "13px",
        opacity: isLocked ? 0.6 : 1,
        cursor: isLocked ? "default" : "pointer",
        boxShadow: hov ? T.shadowMd : T.shadow,
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all 0.15s ease",
        display:"flex", flexDirection:"column",
      }}
    >
      <div style={{ display:"flex", alignItems:"flex-start", gap:9, marginBottom:9 }}>
        <div style={{
          width:34, height:34, borderRadius:8, flexShrink:0,
          background: isLocked ? "#ede8df" : T.amber50,
          border:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:17,
        }}>
          {isLocked ? "🔒" : mod.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:700, padding:"2px 6px", borderRadius:4, background:lm.pillBg, color:lm.pillColor }}>{mod.level}</span>
            {!hideProgress && (
              <span style={{ fontSize:13, fontWeight:600, padding:"2px 6px", borderRadius:99, background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.label}</span>
            )}
          </div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color: isLocked ? T.textMuted : T.text, lineHeight:1.3 }}>{mod.title}</p>
          <p style={{ margin:"2px 0 0", fontSize:13, color:T.textMuted }}>{hideProgress ? `${mod.total} lessons` : `${mod.done}/${mod.total} lessons`} · {mod.updated}</p>
        </div>
      </div>

      {!hideProgress && (
      <div style={{ marginBottom: !isLocked ? 8 : 0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:12, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.04em" }}>Completion</span>
          <span style={{ fontSize:12, fontWeight:700, color: isLocked ? T.textMuted : lm.accent }}>{mod.progress}%</span>
        </div>
        <Bar pct={mod.progress} locked={isLocked} accent={lm.accent} />
      </div>
      )}

      {!isLocked && extra}

      {/* hint (view-only pages): saan magpa-practice */}
      {!isLocked && hideContinue && !hideProgress && mod.status === "active" && (
        <p style={{ margin:"4px 0 0", textAlign:"right", fontSize:12, fontWeight:600, color:T.amber700 }}>
          ● In progress — continue in Practice Session
        </p>
      )}

      {!isLocked && !hideContinue && (
        <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", marginTop:4 }}>
          {!allowEnd && practicing ? (
            <span style={{ fontSize:13, fontWeight:700, color:T.amber700 }}>● Activity in progress…</span>
          ) : !allowEnd && mod.status === "complete" ? (
            <span style={{ fontSize:13, fontWeight:700, color:T.success }}>✓ Completed</span>
          ) : onRetake && mod.status === "complete" && !practicing ? (
            <button
              onClick={() => onRetake(mod)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"5px 12px", borderRadius:7, border:`1.5px solid ${T.amber600}`, cursor:"pointer",
                fontSize:13, fontWeight:700, fontFamily:"inherit",
                background:"transparent", color:T.amber700,
              }}>
              ↻ Retake
            </button>
          ) : (
            <button
              onClick={() => onContinue?.(mod)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer",
                fontSize:13, fontWeight:700, fontFamily:"inherit",
                background: practicing || hov ? T.amber600 : T.amber100,
                color: practicing || hov ? "#fff" : T.amber700,
                transition:"all 0.15s ease",
              }}>
              <span style={{ fontSize:11 }}>{practicing ? "■" : "▶"}</span> {practicing ? "End Practice" : "Continue"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Level Section ── */
function LevelSection({ level, mods, collapsible, columns = 3, renderExtra, onContinue, onRetake, practicingId, allowEnd = true, hideContinue = false, hideProgress = false }) {
  const [open, setOpen] = useState(true);
  const lm     = levelMeta[level];
  const done   = mods.filter(m => m.status === "complete").length;
  const total  = mods.length;
  const active = mods.filter(m => m.status === "active").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"5px 0", borderBottom:`1px solid ${T.border}`, marginBottom:2,
        cursor: collapsible ? "pointer" : "default",
      }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <h3 style={{ margin:0, fontSize:11, fontWeight:700, color: T.amber800, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {lm.shortLabel}
        </h3>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, background:"#f3ede4", color:T.textMuted, fontWeight:600 }}>
            {done}/{total} modules
          </span>
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, background: active > 0 ? T.amber100 : "#f3ede4", color: active > 0 ? T.amber700 : T.textMuted, fontWeight:600 }}>
            {active > 0 ? `${active} active` : "0% progress"}
          </span>
          {collapsible && (
            <span style={{ fontSize:13, color:T.textMuted, display:"inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>›</span>
          )}
        </div>
      </div>

      {open && (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${columns}, 1fr)`, gap:9 }}>
          {mods.map(mod => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              extra={renderExtra?.(mod)}
              onContinue={onContinue}
              onRetake={onRetake}
              practicing={practicingId === mod.id}
              allowEnd={allowEnd}
              hideContinue={hideContinue}
              hideProgress={hideProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar nav button — adapts to expanded/collapsed ── */
function NavButton({ item, isActive, onClick, expanded }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={!expanded ? item.label : undefined}
      style={{
        display:"flex",
        alignItems:"center",
        gap: expanded ? 10 : 0,
        width:"100%",
        padding: expanded ? "10px 13px" : "10px 0",
        justifyContent: expanded ? "flex-start" : "center",
        borderRadius:9,
        border:"none",
        cursor:"pointer",
        textAlign:"left",
        fontSize:13,
        fontWeight: isActive ? 600 : 500,
        fontFamily:"inherit",
        background: isActive ? T.amber600 : hov ? "rgba(255,255,255,0.06)" : "transparent",
        color: isActive ? "#fff" : hov ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
        transition:"all 0.15s ease",
        boxShadow: isActive ? "0 3px 10px rgba(93, 11, 11, 0.6)" : "none",
        overflow:"hidden",
        whiteSpace:"nowrap",
        position:"relative",
      }}
    >
      <span style={{ fontSize:16, width:22, textAlign:"center", flexShrink:0 }}>{item.icon}</span>
      <span style={{
        opacity: expanded ? 1 : 0,
        maxWidth: expanded ? 200 : 0,
        overflow:"hidden",
        transition:"opacity 0.2s ease, max-width 0.25s ease",
        display:"block",
        whiteSpace:"nowrap",
      }}>
        {item.label}
      </span>
    </button>
  );
}

function BadgeCard({ icon, label, sub, extra, locked }) {
  return (
    <div style={{
      background: T.surface,
      border:`1px ${locked ? "dashed" : "solid"} ${T.border}`,
      borderRadius: T.radius, padding:"14px 12px", textAlign:"center",
      minWidth:110, opacity: locked ? 0.6 : 1,
      boxShadow: T.shadow,
      transition:"all 0.2s",
    }}>
      <span style={{ fontSize:28, filter: locked ? "grayscale(1)" : "none" }}>{icon}</span>
      <p style={{ margin:"6px 0 2px", fontSize:11, fontWeight:700, color: locked ? T.textMuted : T.text }}>{label}</p>
      {extra && <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:T.amber700 }}>{extra}</p>}
      <p style={{ margin:0, fontSize:10, color:T.textMuted }}>{locked ? `🔒 ${sub}` : sub}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: DASHBOARD
───────────────────────────────────────────── */
function PageDashboard({ user, totalProgress, setActivePage, modules, badgesEarned = 0, accuracyPct = 0 }) {
  const fullName =
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    "";

  const firstName = fullName.trim().split(/\s+/)[0] || "Learner";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner
        eyebrow="UB-CELL FSL Program — Batch 2026"
        title={`Welcome, ${firstName}!`}
        sub="Continue your FSL learning journey"
        cta="▶ Start Practice"
        onCta={() => setActivePage("practice")}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"⏱️",  value:"0h", label:"This Week",     sub:"Goal: 3h / week" },
          { icon:"🎯", value:`${accuracyPct}%`, label:"Avg Accuracy", sub:"All sessions" },
          { icon:"🏅", value:String(badgesEarned), label:"Badges Earned", sub:"" },
        ].map((s,i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg,
          padding: "18px 20px",
          boxShadow: T.shadow,
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>My Modules</h3>
            <span style={{ fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:99, background:T.amber100, color:T.amber700 }}>{totalProgress}% overall</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {LEVELS.map(lvl => {
              const mods = modules.filter(m => m.level === lvl);
              if (!mods.length) return null;
              return <LevelSection key={lvl} level={lvl} mods={mods} collapsible hideContinue />;
            })}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card title="Overall Progress">
            <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
              <div style={{ position:"relative", width:120, height:120 }}>
                <svg viewBox="0 0 120 120" style={{ width:120, height:120 }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#ede8df" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={T.amber600} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - totalProgress / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 60 60)"
                    style={{ transition:"stroke-dashoffset 1s ease" }} />
                </svg>
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:22, fontWeight:700, color:T.text }}>{totalProgress}%</span>
                  <span style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.04em" }}>Complete</span>
                </div>
              </div>
            </div>
            <p style={{ margin:"0 0 12px", textAlign:"center", fontSize:12, color:T.textMuted }}>
              {modules.filter(m => m.status === "complete").length} of {modules.length} modules finished
            </p>
            {LEVELS.map(lvl => {
              const mods = modules.filter(m => m.level === lvl);
              const lm   = levelMeta[lvl];
              return (
                <div key={lvl} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:lm.pillBg, color:lm.pillColor }}>{lvl}</span>
                    <span style={{ fontSize:10, color:T.textMuted }}>{mods.filter(m => m.status === "complete").length}/{mods.length}</span>
                  </div>
                  {mods.map(mod => (
                    <div key={mod.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, background: mod.status === "locked" ? "#ede8df" : T.amber50, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9 }}>
                        {mod.status === "locked" ? "🔒" : mod.icon}
                      </div>
                      <div style={{ flex:1 }}><Bar pct={mod.progress} locked={mod.status === "locked"} accent={lm.accent} /></div>
                      <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, width:28, textAlign:"right", flexShrink:0 }}>{mod.progress}%</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>

          <Card title="Reminders" badge={reminders.length}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {reminders.map((r,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                  background: r.urgency === "high" ? "#fff8ee" : r.urgency === "med" ? "#faf5ed" : "#f9f7f3",
                  borderLeft:`3px solid ${r.urgency === "high" ? T.amber600 : r.urgency === "med" ? T.amber700 : "#d4bfa0"}`,
                  borderRadius:"0 8px 8px 0", fontSize:12, color:T.textSub, fontWeight:500,
                }}>
                  {r.urgency === "high" ? "⚠️" : r.urgency === "med" ? "📌" : "💡"} {r.text}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Activity">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {recentActivity.map((a,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:26, height:26, borderRadius:7, background:`${a.color}18`, border:`1px solid ${a.color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{a.icon}</div>
                  <div>
                    <p style={{ margin:0, fontSize:12, color:T.textSub, fontWeight:500, lineHeight:1.4 }}>{a.label}</p>
                    <p style={{ margin:0, fontSize:10, color:T.textMuted }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CAMERA PREVIEW (plain camera, no detection)
───────────────────────────────────────────── */
function CameraPreview() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [on, setOn]       = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setOn(true);
    } catch (e) {
      setError("Camera blocked or unavailable. Check your browser permissions.");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOn(false);
  };

  // release the camera when leaving the page
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return (
    <div style={{ position:"relative", flex:1, minHeight:240, borderRadius:12, overflow:"hidden", background:"#241a0e" }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width:"100%", height:"100%", objectFit:"cover",
          transform:"scaleX(-1)",
          display: on ? "block" : "none",
        }}
      />

      {!on && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, textAlign:"center", padding:20 }}>
          <div style={{ fontSize:40 }}>🎥</div>
          <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#fff" }}>Camera Preview</p>
          <p style={{ margin:0, fontSize:13, color:"#e8c88a" }}>Your camera feed will appear here during a live session</p>
          <button onClick={start} style={{
            marginTop:6, padding:"10px 20px", borderRadius:9, border:"none", cursor:"pointer",
            background:T.amber600, color:"#fff", fontWeight:700, fontSize:14, fontFamily:"inherit",
          }}>Allow Camera Access</button>
          {error && <p style={{ margin:0, fontSize:12, color:"#ff9d9d" }}>{error}</p>}
        </div>
      )}

      {on && (
        <button onClick={stop} style={{
          position:"absolute", top:10, right:10, padding:"6px 12px", borderRadius:8, border:"none",
          cursor:"pointer", background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:12, fontWeight:600, fontFamily:"inherit",
        }}>Stop Camera</button>
      )}
    </div>
  );
}

/* ── Sign picture helpers (images live in /public/signs) ── */
const signFile  = (act) => String(act.expectedGesture || "").trim().toUpperCase().replace(/\s+/g, "_");
const signLabel = (act) => {
  const g = String(act.expectedGesture || "");
  return g.length > 1 ? (act.title || g) : g;
};
const signSrc   = (act) => `/signs/${signFile(act)}-sign.PNG`;

/* ── One thumbnail card (click → open viewer) ── */
function SignThumb({ act, onOpen }) {
  const [failed, setFailed] = useState(false);
  const [hov, setHov]       = useState(false);
  const label = signLabel(act);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={`View ${label} sign`}
      style={{
        position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:6,
        padding:8, borderRadius:12, background:"#fff", fontFamily:"inherit",
        border:`1.5px solid ${hov ? T.amber600 : T.border}`,
        boxShadow: hov ? T.shadowMd : "none",
        transform: hov ? "translateY(-2px)" : "none",
        transition:"all 0.15s ease", cursor:"zoom-in",
      }}
    >
      <div style={{
        width:"100%", aspectRatio:"1 / 1", borderRadius:8, overflow:"hidden",
        background:"#fff", border:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {failed ? (
          <span style={{ fontSize:22, fontWeight:700, color:T.textMuted }}>{label}</span>
        ) : (
          <img
            src={signSrc(act)}
            alt={`${label} sign`}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width:"100%", height:"100%", objectFit:"contain" }}
          />
        )}
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:T.textSub, textAlign:"center", lineHeight:1.2 }}>{label}</span>
      <span style={{
        position:"absolute", top:10, right:10, width:22, height:22, borderRadius:"50%",
        background:"rgba(107,26,40,0.85)", color:"#fff", fontSize:11,
        display:"flex", alignItems:"center", justifyContent:"center",
        opacity: hov ? 1 : 0, transition:"opacity 0.15s",
      }}>🔍</span>
    </button>
  );
}

/* ── Grid of signs + popup viewer with zoom ── */
function SignGallery({ mod }) {
  const acts = mod.activities || [];
  const [idx, setIdx]   = useState(null);   // null = closed
  const [zoom, setZoom] = useState(1);
  const [bad, setBad]   = useState({});     // images that failed to load (by activityId)
  const open = idx !== null;

  const go     = (d) => { setZoom(1); setIdx(i => (i + d + acts.length) % acts.length); };
  const close  = () => { setIdx(null); setZoom(1); };
  const zoomBy = (d) => setZoom(z => Math.min(4, Math.max(1, +(z + d).toFixed(2))));

  // keyboard: ← → navigate, Esc close, + / - zoom
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape")      close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft")  go(-1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.5);
      else if (e.key === "-")      zoomBy(-0.5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, acts.length]);

  const cur = open ? acts[idx] : null;

  const ctrlBtn = {
    width:36, height:36, borderRadius:9, border:"none", cursor:"pointer",
    background:"rgba(255,255,255,0.12)", color:"#fff", fontSize:18, fontWeight:700, fontFamily:"inherit",
  };
  const navBtn = {
    width:44, height:44, borderRadius:"50%", border:"none", cursor:"pointer", flexShrink:0,
    background:"rgba(255,255,255,0.14)", color:"#fff", fontSize:22, fontFamily:"inherit",
  };

  const viewer = cur && (
    <div
      onClick={close}
      style={{
        position:"fixed", inset:0, zIndex:1000, background:"rgba(26,6,10,0.88)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:"min(920px, 100%)", maxHeight:"100%", display:"flex", flexDirection:"column", gap:12,
          background:"#241014", borderRadius:16, padding:16, boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, color:"#fff" }}>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:700 }}>{signLabel(cur)}</p>
            <p style={{ margin:0, fontSize:12, color:"#e8c88a" }}>{mod.title} · {idx + 1} of {acts.length}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button style={ctrlBtn} onClick={() => zoomBy(-0.5)} title="Zoom out (-)">−</button>
            <span style={{ minWidth:44, textAlign:"center", fontSize:13, fontWeight:700 }}>{Math.round(zoom * 100)}%</span>
            <button style={ctrlBtn} onClick={() => zoomBy(0.5)} title="Zoom in (+)">+</button>
            <button style={{ ...ctrlBtn, fontSize:12 }} onClick={() => setZoom(1)} title="Reset zoom">1:1</button>
            <button style={{ ...ctrlBtn, marginLeft:6 }} onClick={close} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* image area */}
        <div style={{ display:"flex", alignItems:"center", gap:10, minHeight:0 }}>
          <button style={navBtn} onClick={() => go(-1)} title="Previous (←)">‹</button>

          <div style={{
            flex:1, height:"min(60vh, 560px)", overflow:"auto", borderRadius:12,
            background:"#fff", display:"flex",
          }}>
            {bad[cur.activityId] ? (
              <span style={{ margin:"auto", fontSize:48, fontWeight:700, color:T.textMuted }}>{signLabel(cur)}</span>
            ) : (
              <img
                key={cur.activityId}
                src={signSrc(cur)}
                alt={`${signLabel(cur)} sign`}
                onError={() => setBad(b => ({ ...b, [cur.activityId]: true }))}
                onClick={() => setZoom(z => (z > 1 ? 1 : 2.5))}
                style={{
                  margin:"auto", display:"block",
                  height: `${zoom * 100}%`, width:"auto", maxWidth: zoom === 1 ? "100%" : "none",
                  objectFit:"contain", cursor: zoom > 1 ? "zoom-out" : "zoom-in",
                  transition:"height 0.2s ease",
                }}
              />
            )}
          </div>

          <button style={navBtn} onClick={() => go(1)} title="Next (→)">›</button>
        </div>

        {/* thumbnail strip */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {acts.map((a, i) => (
            <button
              key={a.activityId}
              onClick={() => { setZoom(1); setIdx(i); }}
              title={signLabel(a)}
              style={{
                flexShrink:0, width:56, height:56, padding:2, borderRadius:8, cursor:"pointer",
                background:"#fff", border:`2px solid ${i === idx ? T.amber600 : "transparent"}`,
                opacity: i === idx ? 1 : 0.6, transition:"all 0.15s",
              }}
            >
              <img
                src={signSrc(a)}
                alt={signLabel(a)}
                style={{ width:"100%", height:"100%", objectFit:"contain" }}
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
              />
            </button>
          ))}
        </div>

        <p style={{ margin:0, textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.45)" }}>
          Click the picture to zoom · ← → to switch · Esc to close
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ margin:"4px 0 10px", paddingTop:10, borderTop:`1px solid ${T.border}` }}>
      <h4 style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>
        Signs to Practice
      </h4>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:10 }}>
        {acts.map((a, i) => <SignThumb key={a.activityId} act={a} onOpen={() => { setZoom(1); setIdx(i); }} />)}
      </div>
      {/* portal → avoids the card's hover transform breaking position:fixed */}
      {viewer && createPortal(viewer, document.body)}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: MY MODULES  (view only — walang camera, walang Continue)
   - Progress at status ay galing lang sa Practice Session
   - Complete / 100% lang kapag natapos na ang practice
───────────────────────────────────────────── */
function PageModules({ totalProgress, modules, doneIds = [] }) {
  const [activeLevel, setActiveLevel] = useState("all");

  // read-only na gallery ng sign pictures (click para mag-popup / zoom)
  const activityList = (mod) =>
    !(mod.activities && mod.activities.length) ? null : <SignGallery mod={mod} />;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner eyebrow="FSL Curriculum" title="My Modules" sub={`${modules.length} modules across ${LEVELS.length} levels · ${totalProgress}% overall`} />

      {/* level summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${LEVELS.length}, 1fr)`, gap:12 }}>
        {LEVELS.map(lvl => {
          const mods       = modules.filter(m => m.level === lvl);
          const lm         = levelMeta[lvl];
          const done       = mods.filter(m => m.status === "complete").length;
          const active     = mods.filter(m => m.status === "active").length;
          const isSelected = activeLevel === lvl;
          const levelPct   = mods.length ? Math.round(mods.reduce((a, m) => a + m.progress, 0) / mods.length) : 0;
          return (
            <div key={lvl} onClick={() => setActiveLevel(isSelected ? "all" : lvl)} style={{
              background: T.surface, borderRadius: T.radius,
              border: `2px solid ${isSelected ? lm.accent : T.border}`,
              borderLeft: `4px solid ${lm.accent}`,
              padding:"14px 16px", cursor:"pointer",
              boxShadow: isSelected ? T.shadowMd : T.shadow,
              transition:"all 0.15s ease",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:lm.pillBg, color:lm.pillColor }}>{lvl}</span>
                <span style={{ fontSize:12, fontWeight:700, color:lm.accent }}>{levelPct}%</span>
              </div>
              <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:T.text }}>{lm.label}</p>
              <p style={{ margin:"0 0 8px", fontSize:11, color:T.textMuted }}>{done}/{mods.length} complete · {active} in progress</p>
              <Bar pct={levelPct} accent={lm.accent} />
            </div>
          );
        })}
      </div>

      {/* modules list (full width) */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusLg, padding:"16px 18px", boxShadow:T.shadow, display:"flex", flexDirection:"column", gap:20 }}>
        {LEVELS.filter(lvl => activeLevel === "all" || activeLevel === lvl).map(lvl => {
          const mods = modules.filter(m => m.level === lvl);
          if (!mods.length) return null;
          return (
            <LevelSection
              key={lvl}
              level={lvl}
              mods={mods}
              collapsible
              columns={2}
              renderExtra={activityList}
              hideContinue
              hideProgress
            />
          );
        })}
        {modules.length === 0 && (
          <p style={{ margin:0, fontSize:13, color:T.textMuted, textAlign:"center", padding:"20px 0" }}>No modules available yet.</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: PRACTICE SESSION
   - Continue → isang module lang ang makikita (katabi ng camera)
   - Kapag tapos na → "Completed" + balik sa list ng modules
   - Retake → i-reset ang module sa 0% at i-notify ang faculty
───────────────────────────────────────────── */
function PagePractice({ modules, doneIds = [], onActivityCompleted, onRetake, onWrongAttempt }) {
  const available = modules.filter(m => m.status !== "locked");

  const [practicingId, setPracticingId]   = useState(null);
  const [targetId, setTargetId]           = useState(null);
  const [landmarks, setLandmarks]         = useState(null);
  const [detectedSign, setDetectedSign]   = useState(null);
  const [feedback, setFeedback]           = useState(null);   // null | "correct" | "wrong"
  const [finishedTitle, setFinishedTitle] = useState(null);   // title ng module na katatapos lang
  const lockRef       = useRef(false);
  const wrongCountRef = useRef(0);
  const emptyCountRef = useRef(0);
  const jTrailRef     = useRef([]);
  const zTrailRef     = useRef([]);
  const handsRef      = useRef([]);
  const handleHands   = (all) => { handsRef.current = all || []; };

  const practicing    = practicingId !== null;
  const practicingMod = modules.find(m => m.id === practicingId);
  const acts          = practicingMod?.activities || [];
  const targetAct     = acts.find(a => a.activityId === targetId);
  const targetSign    = targetAct ? String(targetAct.expectedGesture).toUpperCase() : "";

  const resetFeedback = () => {
    setFeedback(null);
    wrongCountRef.current = 0;
    emptyCountRef.current = 0;
  };

  const startModule = (mod, firstAct) => {
    setFinishedTitle(null);
    setTargetId(firstAct.activityId);
    setDetectedSign(null);
    resetFeedback();
    lockRef.current = false;
    setPracticingId(mod.id);
  };

  const endPractice = () => {
    setPracticingId(null);
    setTargetId(null);
    setLandmarks(null);
    setDetectedSign(null);
    resetFeedback();
    lockRef.current = false;
  };

  // Continue / End Practice
  const handleContinue = (mod) => {
    if (practicingId === mod.id) return endPractice();
    const list  = mod.activities || [];
    const first = list.find(a => !doneIds.includes(a.activityId)) || list[0];
    if (!first) return;
    startModule(mod, first);
  };

  // Retake: i-reset ang progress ng module tapos simulan agad
  const handleRetake = (mod) => {
    if (!window.confirm(`Retake "${mod.title}"? Your progress for this module will be reset to 0%.`)) return;
    const first = (mod.activities || [])[0];
    if (!first) return;
    onRetake?.(mod);
    startModule(mod, first);
  };

  // Tumatakbo sa bawat frame na may nakitang kamay
  const handleResults = (lm) => {
    setLandmarks(lm);
    const staticSign = targetSign.length > 1 ? detectStaticSign(lm) : detectCurrentSign(lm);

    jTrailRef.current = pushToTrail(jTrailRef.current, { x: lm[20].x, y: lm[20].y });
    zTrailRef.current = pushToTrail(zTrailRef.current, { x: lm[8].x, y: lm[8].y });

    let sign = staticSign;
    if (targetSign.length > 1) {
      if (detectSign(lm, targetSign, handsRef.current)) sign = targetSign;
    } else if (staticSign === "I" && detectJMotion(jTrailRef.current)) {
      sign = "J";
    } else if (!sign && detectZMotion(zTrailRef.current)) {
      sign = "Z";
    }

    setDetectedSign(sign);

    if (lockRef.current || !targetAct) return;

    if (sign && sign === targetSign) {
      // ✅ TAMA
      lockRef.current = true;
      wrongCountRef.current = 0;
      emptyCountRef.current = 0;
      onActivityCompleted?.(targetAct);
      setFeedback("correct");

      const doneActId = targetAct.activityId;
      const doneAfter = [...doneIds, doneActId];
      const modTitle  = practicingMod?.title;

      setTimeout(() => {
        setFeedback(null);
        const idx     = acts.findIndex(a => a.activityId === doneActId);
        const ordered = [...acts.slice(idx + 1), ...acts.slice(0, idx + 1)];
        const next    = ordered.find(a => !doneAfter.includes(a.activityId));

        if (next) {
          setTargetId(next.activityId);
        } else {
          // tapos na lahat → balik sa list ng modules + completed message
          endPractice();
          setFinishedTitle(modTitle);
        }
        lockRef.current = false;
      }, 1500);
    } else if (sign) {
      // ❌ ibang sign ang hawak
      emptyCountRef.current = 0;
      wrongCountRef.current += 1;
      if (wrongCountRef.current >= 10) setFeedback("wrong");
      if (wrongCountRef.current === 10) onWrongAttempt?.(targetAct?.activityId);
    } else {
      // walang nakilalang sign
      emptyCountRef.current += 1;
      if (emptyCountRef.current >= 15) {
        wrongCountRef.current = 0;
        setFeedback(null);
      }
    }
  };

  const letterPicker = (mod) =>
    !(mod.activities && mod.activities.length) ? null : (
      <div style={{ margin:"4px 0 10px", paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        <h4 style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>
          Practice Sign
        </h4>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {mod.activities.map(a => {
            const active   = practicing && mod.id === practicingId;
            const isTarget = active && a.activityId === targetId;
            const isDone   = doneIds.includes(a.activityId);
            return (
              <button
                key={a.activityId}
                title={a.title}
                disabled={!active}
                onClick={() => { setTargetId(a.activityId); resetFeedback(); }}
                style={{
                  minWidth:36, padding:"6px 8px", borderRadius:8, fontSize:13, fontWeight:700,
                  cursor: active ? "pointer" : "default",
                  border:`1.5px solid ${isTarget ? T.amber600 : isDone ? T.success : T.border}`,
                  background: isTarget ? T.amber100 : isDone ? "#d1fae5" : "transparent",
                  color: isTarget ? T.amber700 : isDone ? "#065f46" : T.textMuted,
                  fontFamily:"inherit",
                }}
              >{a.expectedGesture.length > 1 ? (a.title || a.expectedGesture) : a.expectedGesture}</button>
            );
          })}
        </div>
      </div>
    );

  const feedbackStyle = {
    correct: { bg:"rgba(16,185,129,0.20)", border:"#10b981", color:"#6ee7b7", text:"✅ That's Correct, Next!" },
    wrong:   { bg:"rgba(239,68,68,0.20)",  border:"#ef4444", color:"#fca5a5", text:"❌ That's Wrong, Try Again" },
  }[feedback] || { bg:"rgba(255,255,255,0.06)", border:"transparent", color:"#e8c88a", text:`Show the sign for "${targetSign}"` };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Practice Session" sub="Choose a module and start signing" cta="" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>

        {/* LEFT: kapag practicing → 1 module lang; kung hindi → lahat ng available */}
        {practicing && practicingMod ? (
          <Card title={`Practicing: ${practicingMod.title}`}>
            <ModuleCard
              mod={practicingMod}
              extra={letterPicker(practicingMod)}
              onContinue={handleContinue}
              practicing
            />
          </Card>
        ) : (
          <Card title="Available Modules" badge={available.length}>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {LEVELS.map(lvl => {
                const mods = available.filter(m => m.level === lvl);
                if (!mods.length) return null;
                return (
                  <LevelSection
                    key={lvl}
                    level={lvl}
                    mods={mods}
                    columns={1}
                    renderExtra={letterPicker}
                    onContinue={handleContinue}
                    onRetake={handleRetake}
                    practicingId={practicingId}
                  />
                );
              })}
              {available.length === 0 && (
                <p style={{ margin:0, fontSize:13, color:T.textMuted, textAlign:"center", padding:"20px 0" }}>No modules available yet.</p>
              )}
            </div>
          </Card>
        )}

        {/* RIGHT: camera */}
        <div style={{
          position:"sticky", top:0, alignSelf:"start",
          background:"#1c1409", borderRadius:T.radiusLg, padding:16, boxShadow:T.shadowMd,
          display:"flex", flexDirection:"column", justifyContent:"center", gap:12,
          minHeight:"calc(100vh - 160px)",
        }}>
          {practicing ? (
            <>
              <div style={{ position:"relative" }}>
                <CameraView onResults={handleResults} onHands={handleHands} maxHands={2} />
                <SignGuide sign={targetSign} />
              </div>

              <div style={{
                textAlign:"center", padding:"10px 14px", borderRadius:10, fontSize:15, fontWeight:700,
                background: feedbackStyle.bg, border:`1.5px solid ${feedbackStyle.border}`,
                color: feedbackStyle.color, transition:"all 0.2s ease",
              }}>
                {feedbackStyle.text}
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#e8c88a" }}>
                  {landmarks ? `✋ Hand detected — ${landmarks.length} landmarks tracked` : "Waiting for hand…"}
                </span>
                <div style={{
                  display:"flex", alignItems:"center", gap:10, padding:"6px 12px", borderRadius:8,
                  background: feedback === "correct" ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)",
                  transition:"background 0.2s",
                }}>
                  <span style={{ fontSize:11, color:"#e8c88a" }}>Target: <strong>{targetSign}</strong></span>
                  <span style={{ fontSize:11, color:"#e8c88a" }}>Detected: <strong>{detectedSign || "—"}</strong></span>
                </div>
              </div>
            </>
          ) : (
            <>
              {finishedTitle && (
                <div style={{
                  textAlign:"center", padding:"10px 14px", borderRadius:10, fontSize:15, fontWeight:700,
                  background:"rgba(16,185,129,0.20)", border:"1.5px solid #10b981", color:"#6ee7b7",
                }}>
                  🎉 Completed! You finished "{finishedTitle}".
                </div>
              )}
              <CameraPreview />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: PROGRESS REPORT
───────────────────────────────────────────── */
function PageProgress({ totalProgress, modules, accuracyPct = 0 }) {
  const totalDone = modules.reduce((a,m) => a + m.done, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Progress Report" sub="Your performance over time" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"📅", value:`${totalProgress}%`, label:"Overall",       sub:"All modules"  },
          { icon:"✅", value:totalDone,            label:"Signs Learned", sub:"Total signs"  },
          { icon:"🎯", value:`${accuracyPct}%`, label:"Avg Accuracy", sub:"All sessions" },
        ].map((s,i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusLg, padding:"16px 18px", boxShadow:T.shadow }}>
        <div style={{ marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>Module Breakdown by Level</h3>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {LEVELS.map(lvl => {
            const mods = modules.filter(m => m.level === lvl);
            if (!mods.length) return null;
            return <LevelSection key={lvl} level={lvl} mods={mods} collapsible hideContinue />;
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: ACHIEVEMENTS
───────────────────────────────────────────── */
function PageAchievements({ badges = [] }) {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Achievements" sub="Badges and milestones you have earned" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
        <Card title="Earned Badges" badge={earned.length}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {earned.map(b => <BadgeCard key={b.id} icon={b.icon} label={b.label} extra={b.extra} sub="Earned" />)}
            {earned.length === 0 && <p style={{ margin:0, fontSize:13, color:T.textMuted }}>No badges earned yet. Complete a module to get started!</p>}
          </div>
        </Card>
        <Card title="Locked Badges" badge={locked.length}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {locked.map(b => <BadgeCard key={b.id} icon={b.icon} label={b.label} extra={b.extra} sub={b.hint} locked />)}
            {locked.length === 0 && <p style={{ margin:0, fontSize:13, color:T.textMuted }}>🎉 You unlocked every badge!</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: SETTINGS
───────────────────────────────────────────── */
function PageSettings({ user }) {
  const { updateUser } = useAuth();

  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || null);

  const [nameForm, setNameForm]           = useState({ name: user.name });
  const [profileSaved, setProfileSaved]   = useState(false);
  const [passwordForm, setPasswordForm]   = useState({ current:'', newPass:'', confirm:'' });
  const [passwordMsg, setPasswordMsg]     = useState('');
  const [showCurrent, setShowCurrent]     = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      updateUser({ avatarUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = () => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); };
  const handlePasswordSave = () => {
    if (!passwordForm.current)           return setPasswordMsg('Enter your current password.');
    if (passwordForm.newPass.length < 6) return setPasswordMsg('New password must be at least 6 characters.');
    if (passwordForm.newPass !== passwordForm.confirm) return setPasswordMsg('Passwords do not match.');
    setPasswordMsg('✅ Password changed successfully!');
    setPasswordForm({ current:'', newPass:'', confirm:'' });
    setTimeout(() => setPasswordMsg(''), 3000);
  };

  const inputStyle = {
    width:'100%', padding:'9px 12px',
    border:`1.5px solid ${T.border}`,
    borderRadius:T.radiusSm, fontSize:14, color:T.text,
    background: T.bg, outline:'none', boxSizing:'border-box', fontFamily:'inherit',
  };
  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={() => setShow(s => !s)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:T.textMuted, padding:0 }}>
      {show ? '🙈' : '👁️'}
    </button>
  );

  const saveBtnStyle = {
    background: `linear-gradient(135deg, ${T.amber600}, ${T.amber800})`,
    color:'#fff', border:'none', borderRadius:9,
    padding:'9px 20px', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Banner title="Settings" sub="Manage your account preferences" />
      <div style={{ display:'grid', gridTemplateColumns:'210px 1fr', gap:16, alignItems:'start' }}>

        {/* ── Avatar card ── */}
        <div style={{
          background: T.surface, border:`1px solid ${T.border}`,
          borderRadius: T.radiusLg, padding:"20px 16px",
          boxShadow: T.shadow, display:'flex', flexDirection:'column',
          alignItems:'center', gap:12, textAlign:'center',
        }}>
          <div style={{ position:'relative' }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" style={{ width:66, height:66, borderRadius:16, objectFit:'cover', border:`3px solid ${T.amber600}` }} />
              : <div style={{ width:66, height:66, borderRadius:16, background:`linear-gradient(135deg, ${T.amber600}, ${T.amber800})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>{user.avatar}</div>
            }
            <label htmlFor="avatar-upload" style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:'50%', background:T.amber600, border:`2px solid ${T.surface}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:13, color:'#fff' }}>✎</label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>{nameForm.name}</p>
            <p style={{ margin:'3px 0 0', fontSize:14, color:T.amber600 }}>{user.level}</p>
          </div>
          <label htmlFor="avatar-upload" style={{ fontSize:14, fontWeight:600, color:T.amber600, cursor:'pointer', textDecoration:'underline' }}>Change photo</label>
        </div>

        {/* ── Single merged card ── */}
        <div style={{
          background: T.surface, border:`1px solid ${T.border}`,
          borderRadius: T.radiusLg, boxShadow: T.shadow, overflow:'hidden',
        }}>

          <div style={{ padding:"18px 22px", borderBottom:`2px solid ${T.border}` }}>
            <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Account Details
            </h3>
            {[
              { key:'Full Name',     val: nameForm.name },
              { key:'Level',         val: user.level    },
              { key:'Role',          val: 'Student'     },
              { key:'Notifications', val: 'Enabled'     },
              { key:'Language',      val: 'Filipino/English' },
            ].map((r,i,arr) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i < arr.length-1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize:14, color:T.textMuted }}>{r.key}</span>
                <span style={{ fontSize:14, fontWeight:600, color:T.text }}>{r.val}</span>
              </div>
            ))}
          </div>

          <div style={{ padding:"18px 22px", borderBottom:`2px solid ${T.border}` }}>
            <h3 style={{ margin:"0 0 14px", fontSize:13, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              ✏️ Edit Profile
            </h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Display Name</label>
              <input type="text" value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10 }}>
              {profileSaved && <span style={{ fontSize:13, fontWeight:600, color:T.success }}>✅ Profile updated!</span>}
              <button onClick={handleProfileSave} style={saveBtnStyle}>Save Profile</button>
            </div>
          </div>

          <div style={{ padding:"18px 22px" }}>
            <h3 style={{ margin:"0 0 14px", fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              🔒 Change Password
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Current Password',    key:'current', show:showCurrent, setShow:setShowCurrent },
                { label:'New Password',         key:'newPass', show:showNew,     setShow:setShowNew     },
                { label:'Confirm New Password', key:'confirm', show:showConfirm, setShow:setShowConfirm },
              ].map(({ label, key, show, setShow }) => (
                <div key={key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
                  <div style={{ position:'relative' }}>
                    <input type={show ? 'text' : 'password'} value={passwordForm[key]} placeholder="••••••••"
                      onChange={e => { setPasswordForm(f => ({ ...f, [key]: e.target.value })); setPasswordMsg(''); }}
                      style={{ ...inputStyle, paddingRight:36 }} />
                    {eyeBtn(show, setShow)}
                  </div>
                </div>
              ))}
              {passwordForm.newPass.length > 0 && (() => {
                const l=passwordForm.newPass.length; const s=l<6?0:l<10?1:2;
                const colors=[T.danger,T.warning,T.success]; const labels=['Weak','Fair','Strong'];
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:4, background:"#ede8df", borderRadius:99, overflow:'hidden' }}>
                      <div style={{ width:`${[33,66,100][s]}%`, height:'100%', background:colors[s], borderRadius:99, transition:'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:colors[s], width:44 }}>{labels[s]}</span>
                  </div>
                );
              })()}
              <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10, marginTop:4 }}>
                {passwordMsg && <span style={{ fontSize:13, fontWeight:600, color: passwordMsg.startsWith('✅') ? T.success : T.danger }}>{passwordMsg}</span>}
                <button onClick={handlePasswordSave} style={saveBtnStyle}>Change Password</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activePage, setActivePage]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [completed, setCompleted] = useState([]);
  const storageKey = user ? `fsl-progress-${auth?.currentUser?.uid || user.id || user.email || "guest"}` : null;

  // ── accuracy: correct signs vs. wrong attempts (saved per user in the browser) ──
  const accKey = storageKey ? storageKey.replace("fsl-progress-", "fsl-accuracy-") : null;
  const [accStats, setAccStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    if (!accKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(accKey) || "null");
      if (saved) setAccStats({ correct: saved.correct || 0, wrong: saved.wrong || 0 });
    } catch (e) {}
  }, [accKey]);

  // wrong attempts per activity (sent to the database when that activity is completed)
  const wrongByActRef = useRef({});
  const bumpWrong = (actId) => {
    if (actId != null) wrongByActRef.current[actId] = (wrongByActRef.current[actId] || 0) + 1;
    bumpAccuracy("wrong");
  };

  const bumpAccuracy = (field) => {
    setAccStats((prev) => {
      const next = { ...prev, [field]: prev[field] + 1 };
      if (accKey) { try { localStorage.setItem(accKey, JSON.stringify(next)); } catch (e) {} }
      return next;
    });
  };

  // modules loaded from the database (published only)
  const [dbModules, setDbModules] = useState(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/student-modules")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((rows) => setDbModules(rows))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, []);

  // load saved progress
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompleted(JSON.parse(saved));
    } catch (e) {}
  }, [storageKey]);

  // called when a letter is signed correctly
  const handleSignCompleted = (sign) => {
    if (completed.includes(sign)) return;
    const next = [...completed, sign];
    setCompleted(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}

    const uid = auth?.currentUser?.uid;
    if (uid) {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, completed: next }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const ping = () => {
      const uid = auth?.currentUser?.uid;
      if (!uid) return;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      }).catch(() => {});
    };
    ping();
    const t = setInterval(ping, 60000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!storageKey) return;
    let local = [];
    try { local = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) {}
    const remote = Array.isArray(user?.completedSigns) ? user.completedSigns : [];
    setCompleted([...new Set([...local, ...remote])]);
  }, [storageKey]);

  // activities the student has finished, loaded from the database (practice_sessions)
  const [doneIds, setDoneIds]       = useState([]);
  const [doneLoaded, setDoneLoaded] = useState(false);

  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    fetch(`/api/module-progress?uid=${encodeURIComponent(uid)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setDoneIds(Array.isArray(d.completedActivityIds) ? d.completedActivityIds : []);
        setDoneLoaded(true);
      })
      .catch(() => {});
  }, [user]);

  // letters finished before activities existed → save them once as completed activities
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid || !doneLoaded || !dbModules || completed.length === 0) return;
    const alpha = dbModules.find((m) => m.title === "Alphabet");
    const pending = (alpha?.activities || [])
      .filter((a) => completed.includes(String(a.expectedGesture).toUpperCase()) && !doneIds.includes(a.activityId))
      .map((a) => a.activityId);
    if (!pending.length) return;
    setDoneIds((prev) => [...new Set([...prev, ...pending])]);
    fetch("/api/module-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, activityIds: pending }),
    }).catch(() => {});
  }, [doneLoaded, dbModules, completed, doneIds]);

  // called when the student performs an activity's sign correctly
  const handleActivityCompleted = (act) => {
    bumpAccuracy("correct");
    const wrongAttempts = wrongByActRef.current[act.activityId] || 0;
    delete wrongByActRef.current[act.activityId];
    setDoneIds((prev) => (prev.includes(act.activityId) ? prev : [...prev, act.activityId]));
    handleSignCompleted(String(act.expectedGesture).toUpperCase());
    const uid = auth?.currentUser?.uid;
    if (uid) {
      fetch("/api/module-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, activityId: act.activityId, wrongAttempts }),
      }).catch(() => {});
    }
  };

  if (!user) return null;

  // ── resolve the user's real name (profile → Firebase → email prefix) ──
  const fbUser = auth?.currentUser;

  const resolvedName =
    user.name ||
    user.fullName ||
    user.full_name ||
    user.displayName ||
    fbUser?.displayName ||
    "";

  const resolvedAvatar =
    user.avatar ||
    (resolvedName
      ? resolvedName.split(/\s+/).filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2)
      : "?");

  const displayUser = { ...user, name: resolvedName, avatar: resolvedAvatar };

  // ── Retake: i-reset ang progress ng module + i-notify ang faculty ──
  const handleRetake = (mod) => {
    const acts  = mod.activities || [];
    const ids   = acts.map(a => a.activityId);
    const signs = acts.map(a => String(a.expectedGesture).toUpperCase());

    // 1) bumalik sa 0% ang module
    setDoneIds(prev => prev.filter(id => !ids.includes(id)));

    // 2) alisin din sa `completed` (kung hindi, ibabalik ulit ng "legacy letters" effect)
    const next = completed.filter(s => !signs.includes(s));
    setCompleted(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}

    // 3) sync sa database + notif sa faculty
    const uid = auth?.currentUser?.uid;
    if (uid) {
      fetch("/api/module-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, retakeModuleId: mod.id }),
      }).catch(() => {});
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, completed: next }),
      }).catch(() => {});
    }
  };

  // ── Modules come from the database (published by faculty). A module is complete
  //    when every one of its activities is done; modules unlock one after another. ──
  const sortedDb = (dbModules || []).slice().sort(
    (a, b) => (LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)) || (a.id - b.id)
  );

  let prevDone = true;
  const liveModules = sortedDb.map((c) => {
    const acts     = c.activities || [];
    const total    = acts.length;
    const done     = acts.filter((a) => doneIds.includes(a.activityId)).length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const complete = total > 0 && done === total;
    const status   = total === 0 ? "locked" : complete ? "complete" : prevDone ? "active" : "locked";
    if (total > 0) prevDone = prevDone && complete;
    return {
      id: c.id,
      title: c.title,
      icon: MODULE_ICONS[c.title] || "📘",
      progress,
      total,
      done,
      status,
      level: c.level,
      activities: acts,
      updated: new Date(c.updatedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      }),
    };
  });

  const totalProgress = liveModules.length
    ? Math.round(liveModules.reduce((a, m) => a + m.progress, 0) / liveModules.length)
    : 0;

  const accTotal = accStats.correct + accStats.wrong;
  const accuracy = { total: accTotal, pct: accTotal ? Math.round((accStats.correct / accTotal) * 100) : 0 };
  const badges = buildBadges(liveModules, accuracy);
  const badgesEarned = badges.filter(b => b.earned).length;

  const sidebarW = sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <PageDashboard    user={displayUser} modules={liveModules} totalProgress={totalProgress} setActivePage={setActivePage} badgesEarned={badgesEarned} accuracyPct={accuracy.pct} />;
      case "modules":      return <PageModules      modules={liveModules} totalProgress={totalProgress} doneIds={doneIds} />;
      case "practice":     return <PagePractice     modules={liveModules} doneIds={doneIds} onActivityCompleted={handleActivityCompleted} onRetake={handleRetake} onWrongAttempt={bumpWrong} />;
      case "progress":     return <PageProgress     modules={liveModules} totalProgress={totalProgress} accuracyPct={accuracy.pct} />;
      case "achievements": return <PageAchievements badges={badges} />;
      case "settings":     return <PageSettings     user={displayUser} />;
      default:             return <PageDashboard    user={displayUser} modules={liveModules} totalProgress={totalProgress} setActivePage={setActivePage} badgesEarned={badgesEarned} accuracyPct={accuracy.pct} />;
    }
  };

  return (
    <div style={{
      display:"flex", height:"100vh",
      background: T.bg,
      fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
      overflow:"hidden",
    }}>

      {/* ── SIDEBAR — hover to expand ── */}
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        style={{
          width: 120,
          minWidth: sidebarW,
          background: T.sidebarBg,
          display:"flex",
          flexDirection:"column",
          padding:"0 0 17px",
          flexShrink: 0,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          position: "relative",
          zIndex: 100,
          boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.25)" : "none",
        }}
      >
        {/* brand */}
        <div style={{
          padding: sidebarOpen ? "18px 14px 14px" : "18px 0 14px",
          display:"flex", alignItems:"center",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          gap: sidebarOpen ? 9 : 0,
          transition:"padding 0.25s ease, justify-content 0.25s ease",
          overflow:"hidden",
        }}>
          <img
            src="/ubbg.png"
            alt="UB Logo"
            style={{ width:90, height:90, borderRadius:9, objectFit:"cover", flexShrink:0 }}
          />
          <div style={{
            opacity: sidebarOpen ? 1 : 0,
            maxWidth: sidebarOpen ? 200 : 0,
            overflow:"hidden",
            transition:"opacity 0.2s ease 0.05s, max-width 0.25s ease",
            whiteSpace:"nowrap",
          }}>
            <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#fff" }}>Sign Coach</p>
            <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Student Portal</p>
          </div>
        </div>

        {/* nav */}
        <nav style={{
          flex:1,
          padding: sidebarOpen ? "12px 14px" : "12px 6px",
          display:"flex", flexDirection:"column", gap:30,
          overflowY:"auto", overflowX:"hidden",
          transition:"padding 0.25s ease",
        }}>
          {navItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activePage === item.id}
              onClick={() => setActivePage(item.id)}
              expanded={sidebarOpen}
            />
          ))}
          <NavButton
            item={{ id: "report", icon: "🚩", label: "Report an Issue" }}
            isActive={false}
            onClick={() => setShowReport(true)}
            expanded={sidebarOpen}
          />
        </nav>

        {/* user footer */}
        <div style={{
          margin: sidebarOpen ? "0 8px" : "0 6px",
          paddingTop:12,
          display:"flex", alignItems:"center",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          gap: sidebarOpen ? 8 : 0,
          overflow:"hidden",
          transition:"margin 0.25s ease, justify-content 0.25s ease",
        }}>
          {displayUser.avatarUrl
            ? <img
                src={displayUser.avatarUrl}
                alt="avatar"
                style={{ width:45, height:45, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}
              />
            : <div style={{
                width:40, height:45, borderRadius:"50%",
                background: T.amber600,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontWeight:700, fontSize:13, flexShrink:0,
              }}>{displayUser.avatar}</div>
          }

          <div style={{
            opacity: sidebarOpen ? 1 : 0,
            maxWidth: sidebarOpen ? 200 : 0,
            overflow:"hidden",
            transition:"opacity 0.2s ease 0.05s, max-width 0.25s ease",
            flex:1, minWidth:0,
            whiteSpace:"nowrap",
          }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis" }}>{displayUser.name}</p>
            <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.35)" }}>FSL Student</p>
          </div>

          {sidebarOpen && (
            <button
              onClick={() => { logout(); router.push("/"); }}
              title="Sign out"
              style={{
                background:"transparent", border:"none",
                color:"rgba(255,255,255,0.35)", cursor:"pointer",
                fontSize:14, padding:"3px", borderRadius:6,
                display:"flex", alignItems:"center",
                transition:"color 0.15s", flexShrink:0,
              }}
              onMouseEnter={e => e.currentTarget.style.color="#ef4444"}
              onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >↪</button>
          )}
        </div>
      </aside>

      {/* ── TOPBAR + MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{
          padding:"14px 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background: T.surface,
          borderBottom:`1px solid ${T.border}`,
          flexShrink:0,
        }}>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.3px" }}>Student Overview</h1>
            <p style={{ margin:"3px 0 0", fontSize:12, color:T.textMuted }}>UB-CELI FSL Program — Batch 2026</p>
          </div>
        </div>

        <main style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>
          {renderPage()}
        </main>
      </div>

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        role="student"
        user={{
          uid:   auth?.currentUser?.uid,
          name:  displayUser.name,
          email: user.email || auth?.currentUser?.email,
        }}
      />
    </div>
  );
}