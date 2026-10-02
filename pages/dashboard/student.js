import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../components/AuthContext";
import CameraView from "../../components/CameraView";
import { detectCurrentSign, SUPPORTED_SIGNS, pushToTrail, detectJMotion, detectZMotion } from "../../lib/handLogic";


/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const modules = [
  { id: 1, title: "Alphabet",                  icon: "🔤", progress: 0, total: 26, done: 0, status: "active",  level: "FSL 1", updated: "May 27, 2026"  },
  { id: 2, title: "Greetings & Introductions", icon: "👋", progress: 0, total: 18, done: 0, status: "locked",  level: "FSL 1", updated: "June 4, 2026"  },
  { id: 3, title: "Numbers & Counting",        icon: "🔢", progress: 0, total: 20, done: 0, status: "locked",  level: "FSL 1", updated: "June 8, 2026"  },
  { id: 4, title: "Colors & Shapes",           icon: "🎨", progress: 0, total: 16, done: 0, status: "locked",  level: "FSL 2", updated: "June 10, 2026" },
  { id: 5, title: "Family & Relationships",    icon: "👨‍👩‍👧", progress: 0, total: 22, done: 0, status: "locked",  level: "FSL 2", updated: "June 12, 2026" },
];

const LEVELS = ["FSL 1", "FSL 2"];

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

const earnedBadges = [
  { icon: "🏅", label: "Consistent Learner", date: "Yesterday" },
  { icon: "🔤", label: "Alphabet Master",    date: "Last week" },
];
const lockedBadges = [
  { icon: "🔥", label: "7-Day Streak"  },
  { icon: "🌟", label: "Perfect Score" },
  { icon: "📚", label: "Module Master" },
  { icon: "🎯", label: "Accuracy Pro"  },
];

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
  // Sidebar & Primary Branding (Deep Maroon)
  sidebarBg:     "#6B1A28", // Deep UB Maroon
  sidebarBorder: "rgba(141, 121, 11, 0.54)", // Gold tint border

  // Main Backgrounds & Surfaces
  bg:            "#FBF8F3", // Clean Warm Cream
  surface:       "#FFFFFF", // Pure White surface
  border:        "rgba(107, 26, 40, 0.10)", // Soft maroon border accent

  // Gold Accents (Replacing amber)
  amber800:      "#9f7b17", // Dark Metallic Gold
  amber700:      "#9a740d", // Medium Gold
  amber600:      "#9d7507", // Vibrant Gold
  amber100:      "#FDF6E2", // Soft Gold Tint
  amber50:       "#FFFDF5", // Lightest Gold Glow

  // Secondary Accents (Replaced Blue with Gold & Maroon Tones)
  blue700:       "#6B1A28", // Primary Maroon (Replaces Blue Primary)
  blue500:       "#ad820c", // Highlight Gold (Replaces Blue Secondary)
  blue100:       "#FDF6E2", // Soft Gold Tint (Replaces Light Blue)

  // Typography (Dark Warm Tones)
  text:          "#2A080C", // Deep Maroon-Black
  textSub:       "#4A121B", // Dark Maroon Text
  textMuted:     "#8C6D73", // Muted Maroon Gray

  // Status Colors
  success:       "#10B981", // Emerald Green
  warning:       "#b3870d", // Gold Warning
  danger:        "#9E1B22", // Strong Maroon Red

  // Layout & Styling
  radius:        "15px",
  radiusSm:      "8px",
  radiusLg:      "14px",
  shadow:        "0 1px 4px rgba(107, 26, 40, 0.08)",
  shadowMd:      "0 4px 14px rgba(107, 26, 40, 0.12)",

  // Banner / Announcement Strip (Gold Accent)
  bannerBg:      "#FDF4E1", // Soft Gold Banner Background
  bannerBorder:  "#E5C16C", // Soft Gold Border
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
function ModuleCard({ mod }) {
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
            <span style={{ fontSize:13, fontWeight:600, padding:"2px 6px", borderRadius:99, background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.label}</span>
          </div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color: isLocked ? T.textMuted : T.text, lineHeight:1.3 }}>{mod.title}</p>
          <p style={{ margin:"2px 0 0", fontSize:13, color:T.textMuted }}>0/{mod.total} lessons · {mod.updated}</p>
        </div>
      </div>

      <div style={{ marginBottom: !isLocked ? 8 : 0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:12, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.04em" }}>Completion</span>
          <span style={{ fontSize:12, fontWeight:700, color: isLocked ? T.textMuted : lm.accent }}>{mod.progress}%</span>
        </div>
        <Bar pct={mod.progress} locked={isLocked} accent={lm.accent} />
      </div>

      {!isLocked && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
          <button style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer",
            fontSize:13, fontWeight:700, fontFamily:"inherit",
            background: hov ? T.amber600 : T.amber100,
            color: hov ? "#fff" : T.amber700,
            transition:"all 0.15s ease",
          }}>
            <span style={{ fontSize:11 }}>▶</span> Continue
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Level Section ── */
function LevelSection({ level, mods, collapsible }) {
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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:9 }}>
          {mods.map(mod => <ModuleCard key={mod.id} mod={mod} />)}
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

function BadgeCard({ icon, label, date, locked }) {
  return (
    <div style={{
      background: T.surface,
      border:`1px ${locked ? "dashed" : "solid"} ${T.border}`,
      borderRadius: T.radius, padding:"14px 12px", textAlign:"center",
      minWidth:90, opacity: locked ? 0.4 : 1,
      boxShadow: T.shadow,
      transition:"all 0.2s",
    }}>
      <span style={{ fontSize:28, filter: locked ? "grayscale(1)" : "none" }}>{icon}</span>
      <p style={{ margin:"6px 0 2px", fontSize:11, fontWeight:700, color: locked ? T.textMuted : T.text }}>{label}</p>
      <p style={{ margin:0, fontSize:10, color:T.textMuted }}>{locked ? "🔒 Locked" : date}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: DASHBOARD
───────────────────────────────────────────── */
function PageDashboard({ user, totalProgress, setActivePage }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner
        eyebrow="UB-CELI FSL Program — Batch 2026"
        title={`Welcome, ${user.name.split(" ")[0]}!`}
        sub="Continue your FSL learning journey"
        cta="▶ Start Practice"
        onCta={() => setActivePage("practice")}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"🔥",  value:"0",  label:"Day Streak",    sub:"Keep it going!"  },
          { icon:"⏱️",  value:"0h", label:"This Week",     sub:"Goal: 3h / week" },
          { icon:"🎯",  value:"0%", label:"Avg Accuracy",  sub:"Last 7 sessions" },
          { icon:"🏅",  value:"1",  label:"Badges Earned", sub:"" },
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
              return <LevelSection key={lvl} level={lvl} mods={mods} collapsible />;
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
   PAGE: MY MODULES
───────────────────────────────────────────── */
function PageModules({ totalProgress }) {
  const [activeLevel, setActiveLevel] = useState("all");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner eyebrow="FSL Curriculum" title="My Modules" sub={`${modules.length} modules across ${LEVELS.length} levels · ${totalProgress}% overall`} />
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${LEVELS.length}, 1fr)`, gap:12 }}>
        {LEVELS.map(lvl => {
          const mods       = modules.filter(m => m.level === lvl);
          const lm         = levelMeta[lvl];
          const done       = mods.filter(m => m.status === "complete").length;
          const active     = mods.filter(m => m.status === "active").length;
          const isSelected = activeLevel === lvl;
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
                <span style={{ fontSize:12, fontWeight:700, color:lm.accent }}>0%</span>
              </div>
              <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:T.text }}>{lm.label}</p>
              <p style={{ margin:"0 0 8px", fontSize:11, color:T.textMuted }}>{done}/{mods.length} complete · {active} active</p>
              <Bar pct={0} accent={lm.accent} />
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {LEVELS.filter(lvl => activeLevel === "all" || activeLevel === lvl).map(lvl => {
          const mods = modules.filter(m => m.level === lvl);
          if (!mods.length) return null;
          return (
            <div key={lvl} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusLg, padding:"16px 18px", boxShadow:T.shadow }}>
              <LevelSection level={lvl} mods={mods} collapsible />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: PRACTICE SESSION
───────────────────────────────────────────── */
function PagePractice() {
  const available = modules.filter(m => m.status !== "locked");
  const [landmarks, setLandmarks]     = useState(null);
  const [detectedSign, setDetectedSign] = useState(null);
  const [targetSign, setTargetSign]   = useState(SUPPORTED_SIGNS[0]);
  const [justCorrect, setJustCorrect] = useState(false);
  const lockRef = useRef(false);

  // Runs on every frame CameraView tracks a hand. Feeds the 21 landmarks
  // into handLogic.js's detectCurrentSign() and compares against the
  // sign the learner is currently practicing.
   const jTrailRef = useRef([]);
const zTrailRef = useRef([]);

const handleResults = (lm) => {
  setLandmarks(lm);
  const staticSign = detectCurrentSign(lm);

  // track pinky tip (for J) and index tip (for Z) over recent frames
  jTrailRef.current = pushToTrail(jTrailRef.current, { x: lm[20].x, y: lm[20].y });
  zTrailRef.current = pushToTrail(zTrailRef.current, { x: lm[8].x, y: lm[8].y });

  let sign = staticSign;
  if (staticSign === "I" && detectJMotion(jTrailRef.current)) {
    sign = "J";
  } else if (!sign && detectZMotion(zTrailRef.current)) {
    sign = "Z";
  }

  setDetectedSign(sign);

  if (sign && sign === targetSign && !lockRef.current) {
    lockRef.current = true;
    setJustCorrect(true);
    setTimeout(() => {
      setJustCorrect(false);
      setTargetSign(prev => {
        const idx = SUPPORTED_SIGNS.indexOf(prev);
        return SUPPORTED_SIGNS[(idx + 1) % SUPPORTED_SIGNS.length];
      });
      lockRef.current = false;
    }, 1200);
  }
};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Practice Session" sub="Choose a module and start signing" cta="▶ Start Now" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Available Modules" badge={available.length}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {LEVELS.map(lvl => {
              const mods = available.filter(m => m.level === lvl);
              if (!mods.length) return null;
              return <LevelSection key={lvl} level={lvl} mods={mods} />;
            })}
            {available.length === 0 && (
              <p style={{ margin:0, fontSize:13, color:T.textMuted, textAlign:"center", padding:"20px 0" }}>No modules available yet.</p>
            )}
          </div>

          <div style={{ marginTop:18, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
            <h3 style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>
              Practice Sign
            </h3>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {SUPPORTED_SIGNS.map(sign => (
                <button
                  key={sign}
                  onClick={() => setTargetSign(sign)}
                  style={{
                    padding:"6px 12px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer",
                    border: `1.5px solid ${sign === targetSign ? T.amber600 : T.border}`,
                    background: sign === targetSign ? T.amber100 : "transparent",
                    color: sign === targetSign ? T.amber700 : T.textMuted,
                    fontFamily:"inherit",
                  }}
                >{sign}</button>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ background:"#1c1409", borderRadius:T.radiusLg, padding:16, boxShadow:T.shadowMd, display:"flex", flexDirection:"column", gap:12, minHeight:280 }}>
          <CameraView onResults={handleResults} />

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#e8c88a" }}>
              {landmarks ? `✋ Hand detected — ${landmarks.length} landmarks tracked` : "Waiting for hand…"}
            </span>
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"6px 12px", borderRadius:8,
              background: justCorrect ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)",
              transition:"background 0.2s",
            }}>
              <span style={{ fontSize:11, color:"#e8c88a" }}>Target: <strong>{targetSign}</strong></span>
              <span style={{ fontSize:11, color:"#e8c88a" }}>Detected: <strong>{detectedSign || "—"}</strong></span>
              {justCorrect && <span style={{ fontSize:13 }}>✅</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   PAGE: PROGRESS REPORT
───────────────────────────────────────────── */
function PageProgress({ totalProgress }) {
  const totalDone = modules.reduce((a,m) => a + m.done, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Progress Report" sub="Your performance over time" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"📅", value:`${totalProgress}%`, label:"Overall",       sub:"All modules"  },
          { icon:"✅", value:totalDone,            label:"Signs Learned", sub:"Total signs"  },
          { icon:"🔥", value:"0",                  label:"Day Streak",    sub:"Keep it up!"  },
          { icon:"🎯", value:"0%",                 label:"Avg Accuracy",  sub:"Last session" },
        ].map((s,i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusLg, padding:"16px 18px", boxShadow:T.shadow }}>
        <div style={{ marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:12, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>Module Breakdown by Level</h3>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {LEVELS.map(lvl => {
            const mods = modules.filter(m => m.level === lvl);
            return <LevelSection key={lvl} level={lvl} mods={mods} collapsible />;
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: ACHIEVEMENTS
───────────────────────────────────────────── */
function PageAchievements() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Banner title="Achievements" sub="Badges and milestones you have earned" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Earned Badges" badge={earnedBadges.length}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {earnedBadges.map((b,i) => <BadgeCard key={i} {...b} />)}
          </div>
        </Card>
        <Card title="Locked Badges" badge={lockedBadges.length}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {lockedBadges.map((b,i) => <BadgeCard key={i} {...b} locked />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: SETTINGS
   CHANGES: added updateUser hook, avatarPreview
   initializes from user.avatarUrl, handleAvatarChange
   now also calls updateUser to persist the photo.
───────────────────────────────────────────── */
function PageSettings({ user }) {
  // ── CHANGE 1: pull updateUser from auth context ──
  const { updateUser } = useAuth();

  // ── CHANGE 2: initialize avatarPreview from saved avatarUrl ──
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || null);

  const [nameForm, setNameForm]           = useState({ name: user.name });
  const [profileSaved, setProfileSaved]   = useState(false);
  const [passwordForm, setPasswordForm]   = useState({ current:'', newPass:'', confirm:'' });
  const [passwordMsg, setPasswordMsg]     = useState('');
  const [showCurrent, setShowCurrent]     = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  // ── CHANGE 3: also call updateUser so photo persists ──
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

          {/* — Account Details section — */}
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

          {/* — Edit Profile section — */}
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

          {/* — Change Password section — */}
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

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role === 'faculty') { router.push('/dashboard/faculty'); return; }
    if (user.role === 'admin')   { router.push('/dashboard/admin');   return; }
  }, [user]);

  if (!user) return null;

  const totalProgress = Math.round(modules.reduce((a,m) => a + m.progress, 0) / modules.length);
  const sidebarW = sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <PageDashboard    user={user} totalProgress={totalProgress} setActivePage={setActivePage} />;
      case "modules":      return <PageModules      totalProgress={totalProgress} />;
      case "practice":     return <PagePractice />;
      case "progress":     return <PageProgress     totalProgress={totalProgress} />;
      case "achievements": return <PageAchievements />;
      case "settings":     return <PageSettings     user={user} />;
      default:             return <PageDashboard    user={user} totalProgress={totalProgress} setActivePage={setActivePage} />;
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
          width: sidebarW,
          minWidth: sidebarW,
          background: T.sidebarBg,
          borderRight: `1px solid ${T.sidebarBorder}`,
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
          borderBottom:`1px solid ${T.sidebarBorder}`,
          display:"flex", alignItems:"center",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          gap: sidebarOpen ? 9 : 0,
          transition:"padding 0.25s ease, justify-content 0.25s ease",
          overflow:"hidden",
        }}>
          <img
  src="/ubbg.png"
  alt="UB Logo"
  style={{ width:40, height:40  , borderRadius:9, objectFit:"cover", flexShrink:0 }}
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
          padding: sidebarOpen ? "12px 8px" : "12px 6px",
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
        </nav>

        {/* ── CHANGE 4: user footer now shows avatar photo if available ── */}
        <div style={{
          margin: sidebarOpen ? "0 8px" : "0 6px",
          borderTop:`1px solid ${T.sidebarBorder}`,
          paddingTop:12,
          display:"flex", alignItems:"center",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          gap: sidebarOpen ? 8 : 0,
          overflow:"hidden",
          transition:"margin 0.25s ease, justify-content 0.25s ease",
        }}>
          {/* avatar: show photo if saved, otherwise show initials */}
          {user.avatarUrl
            ? <img
                src={user.avatarUrl}
                alt="avatar"
                style={{ width:45, height:45, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}
              />
            : <div style={{
                width:40, height:45, borderRadius:"50%",
                background: T.amber600,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontWeight:700, fontSize:13, flexShrink:0,
              }}>{user.avatar}</div>
          }

          <div style={{
            opacity: sidebarOpen ? 1 : 0,
            maxWidth: sidebarOpen ? 200 : 0,
            overflow:"hidden",
            transition:"opacity 0.2s ease 0.05s, max-width 0.25s ease",
            flex:1, minWidth:0,
            whiteSpace:"nowrap",
          }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name}</p>
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
        {/* topbar */}
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
    </div>
  );
}