import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../components/AuthContext";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
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

// ─── DATA ─────────────────────────────────────────────────────────────────────
const STUDENTS = [
  { id:1, initials:"A", name:"Aliyah",  email:"2302731@ub.edu.ph", level:"FSL 1", progress:0, accuracy:0, streak:0, score:0, status:"Active",   joined:"May 1, 2026",  lastSeen:"Today",     avBg:"#EDE9FE", avColor:"#5B21B6" },
  { id:2, initials:"L", name:"Lance",   email:"2301252@ub.edu.ph", level:"FSL 1", progress:0, accuracy:0, streak:0, score:0, status:"Active",   joined:"May 1, 2026",  lastSeen:"2h ago",    avBg:"#DBEAFE", avColor:"#1D4ED8" },
  { id:3, initials:"Z", name:"Zachary", email:"2301194@ub.edu.ph", level:"FSL 1", progress:0, accuracy:0, streak:0, score:0, status:"Active",   joined:"Apr 15, 2026", lastSeen:"Yesterday", avBg:"#DCFCE7", avColor:"#166534" },
];

const MODULES = [
  { id:1, name:"Alphabet & Numbers",       level:"FSL 1", lessons:26, enrolled:89, completion:28, updated:"May 27, 2026", status:"Active",  desc:"Learn the FSL alphabet A-Z and numbers 1-100.", stripe:T.goldGrad,   levelColor:T.gold  },
  { id:2, name:"Greetings & Introduction", level:"FSL 1", lessons:18, enrolled:89, completion:0,  updated:"Jun 4, 2026",  status:"Locked", desc:"Common greetings, introductions, and social phrases.", stripe:"linear-gradient(90deg,#4A90D9,#7BB3E8)", levelColor:"#4A90D9" },
  { id:3, name:"Numbers & Counting",       level:"FSL 1", lessons:20, enrolled:89, completion:0,  updated:"Jun 8, 2026",  status:"Locked", desc:"Advanced number usage and counting techniques.", stripe:T.goldGrad,   levelColor:T.gold  },
  { id:4, name:"Colors & Shapes",          level:"FSL 2", lessons:16, enrolled:35, completion:0,  updated:"Jun 10, 2026", status:"Locked", desc:"Colors, shapes, and descriptive vocabulary.", stripe:T.mossGrad,   levelColor:T.moss2 },
  { id:5, name:"Family & Relationships",   level:"FSL 2", lessons:22, enrolled:35, completion:0,  updated:"Jun 12, 2026", status:"Locked", desc:"Family members, relationships, and social bonds.", stripe:"linear-gradient(90deg,#C4714A,#E8B0C0)", levelColor:T.clay  },
];

const SESSIONS = [
  { id:1, student:"Aliyah",  sId:1, module:"Alphabet & Numbers", date:"May 20, 2026", duration:"0 min", accuracy:0, signs:0, status:"Completed" },
  { id:2, student:"Lance",   sId:2, module:"Alphabet & Numbers", date:"May 20, 2026", duration:"0 min", accuracy:0, signs:0, status:"Completed" },
  { id:3, student:"Zachary", sId:3, module:"Alphabet & Numbers", date:"May 19, 2026", duration:"0 min", accuracy:0, signs:0, status:"Completed" },
];

const ACHIEVEMENTS_DATA = [
  { icon:"🏅", name:"First Sign",         desc:"Completed first sign recognition",  earned:89, total:124, iconBg:"#EDE9FE", barColor:"#7C3AED" },
  { icon:"🔥", name:"7-Day Streak",       desc:"Practiced 7 days in a row",          earned:34, total:124, iconBg:"#FEF3C7", barColor:T.gold    },
  { icon:"🌟", name:"Perfect Score",      desc:"100% accuracy in a session",         earned:12, total:124, iconBg:"#DCFCE7", barColor:T.moss2   },
  { icon:"📚", name:"Module Master",      desc:"Completed an entire module",         earned:8,  total:124, iconBg:"#DBEAFE", barColor:"#2563EB" },
  { icon:"🎯", name:"Accuracy Pro",       desc:"Maintained 90%+ for 5 sessions",    earned:5,  total:124, iconBg:"#FCE7F3", barColor:"#DB2777" },
  { icon:"🤟", name:"Consistent Learner", desc:"Logged in for 14 consecutive days",  earned:20, total:124, iconBg:"#D1FAE5", barColor:T.moss2   },
];

const REMINDERS_DATA = [
  { id:1, type:"warning", title:"Practice session due for 12 students",  sub:"Send reminder now",          time:"Today",     read:false },
  { id:2, type:"info",    title:"Module 2 quiz unlocks tomorrow",         sub:"Notify enrolled students",   time:"Today",     read:false },
  { id:3, type:"info",    title:"New FSL lesson added to Module 3",       sub:"Announce to FSL 1 students", time:"Yesterday", read:false },
  { id:4, type:"success", title:"Sofia Reyes completed FSL 2 Module 1",  sub:"Award completion badge",      time:"2d ago",    read:true  },
  { id:5, type:"warning", title:"Angelo Lim inactive for 5 days",        sub:"Check in with student",      time:"3d ago",    read:true  },
];

const REPORTS_DATA = {
  weekly:   [42, 55, 38, 67, 72, 81, 65],
  accuracy: [58, 62, 65, 71, 74, 78, 82],
  labels:   ["Week 1","Week 2","Week 3","Week 4","Week 5","Week 6","Week 7"],
  days:     ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
};

const ACTIVITY = [
  { dot:T.moss2,   text:"Rose Enova started Alphabet & Numbers",    time:"Today, 11:02 AM"     },
  { dot:T.gold,    text:"Sofia Reyes earned Module 2 Badge 🏅",      time:"Today, 9:45 AM"      },
  { dot:"#4A90D9", text:"New lesson added to FSL Level 1, Module 3", time:"Yesterday, 4:10 PM"  },
  { dot:T.clay,    text:"Angelo Lim missed 3 practice sessions",     time:"Yesterday, 12:00 PM" },
];

const DEFAULT_PROGRAM = {
  batchName:"Batch 2026", program:"UB CCELL FSL Program", timezone:"Asia/Manila",
  alertThreshold:3, emailNotifs:true, weeklyReport:true, allowSelfEnroll:true,
};

const navItems = [
  { id:"dashboard",    icon:"🏛️", label:"Dashboard",    section:"Main"     },
  { id:"students",     icon:"👥", label:"Students",     section:"Main",    badge:"124" },
  { id:"modules",      icon:"📚", label:"Modules",      section:"Main"     },
  { id:"sessions",     icon:"▶️",  label:"Sessions",     section:"Main"     },
  { id:"analytics",    icon:"📈", label:"Analytics",    section:"Insights" },
  { id:"achievements", icon:"🏅", label:"Achievements", section:"Insights" },
  { id:"reports",      icon:"📋", label:"Reports",      section:"Insights" },
  { id:"reminders",    icon:"🔔", label:"Reminders",    section:"System",  badge:"3"  },
  { id:"settings",     icon:"⚙️",  label:"Settings",     section:"System"   },
];

const PAGE_TITLES = {
  dashboard:"Dashboard Overview", students:"Students", modules:"FSL Modules",
  sessions:"Practice Sessions",   analytics:"Analytics", achievements:"Achievements",
  reports:"Reports", reminders:"Reminders & Alerts", settings:"Settings",
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const LS = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', system-ui, sans-serif; background: #F7F4EE; color: #1A1410; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #F7F4EE; }
  ::-webkit-scrollbar-thumb { background: #D4C9BC; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #8A7E74; }
  @keyframes scFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sc-page-content > * { animation: scFadeUp 0.3s ease both; }
  .sc-page-content > *:nth-child(1) { animation-delay: 0.04s }
  .sc-page-content > *:nth-child(2) { animation-delay: 0.08s }
  .sc-page-content > *:nth-child(3) { animation-delay: 0.13s }
  .sc-page-content > *:nth-child(4) { animation-delay: 0.18s }
  .sc-page-content > *:nth-child(5) { animation-delay: 0.23s }
  .sc-module-card:hover { box-shadow: 0 6px 20px rgba(44,24,16,0.13); transform: translateY(-2px); }
  .sc-stat-card:hover   { box-shadow: 0 6px 20px rgba(44,24,16,0.13); transform: translateY(-2px); }
  .sc-card-table tr:hover td { background: #F9F6F0; }
  input:focus, select:focus { border-color: #C9933A !important; outline: none; }
`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById("sc-global-styles")) return;
    const el = document.createElement("style");
    el.id = "sc-global-styles";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);
}

function Av({ initials, bg, color, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: bg, color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function Pill({ label, variant }) {
  const map = {
    active:    { bg:"#E8F2EF", color:"#1E5C42" },
    inactive:  { bg:"#F0ECE6", color:"#7A6E64" },
    locked:    { bg:"#FFF3E0", color:"#8A5C1A" },
    completed: { bg:"#E8F2EF", color:"#1E5C42" },
    incomplete:{ bg:"#FCEBEB", color:"#A32D2D" },
    fsl1:      { bg:"#FDF0EA", color:"#8A3A1A" },
    fsl2:      { bg:"#E8F2EF", color:"#1E4A3A" },
    warning:   { bg:"#FFF3E0", color:"#8A5C1A" },
    info:      { bg:"#EFF6FF", color:"#185FA5" },
    success:   { bg:"#E8F2EF", color:"#1E5C42" },
  };
  const s = map[variant] || map.inactive;
  return (
    <span style={{
      background: s.bg, color: s.color,
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
    }}>{label}</span>
  );
}

function ProgressBar({ pct, color, height = 4, width = "100%" }) {
  const barColor = color || T.mossGrad;
  return (
    <div style={{ height, background: T.border, borderRadius: 99, overflow: "hidden", width }}>
      <div style={{
        height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`,
        background: barColor, borderRadius: 99, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

function StatCard({ icon, value, label, trend, trendUp, iconBg, accentColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="sc-stat-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
        padding: "16px 18px", position: "relative", overflow: "hidden",
        transition: "all 0.2s", cursor: "default",
        boxShadow: hov ? T.shadowMd : T.shadow,
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor || T.goldGrad }} />
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: iconBg || "#FFF3E0",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 12,
      }}>{icon}</div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 26, color: T.bark, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
      <div style={{ fontSize: 10, marginTop: 8, color: trendUp ? T.success : T.danger, display: "flex", alignItems: "center", gap: 3 }}>
        {trendUp ? "↑" : "↓"} {trend}
      </div>
    </div>
  );
}

function Card({ title, titleTag, action, children, style, noPad }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", boxShadow: T.shadow, ...style }}>
      {title && (
        <div style={{ padding: "13px 18px 11px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.bark }}>{title}</span>
            {titleTag && (
              <span style={{ fontSize: 9, background: T.sand, border: `1px solid ${T.border}`, color: T.muted, padding: "2px 8px", borderRadius: 99, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{titleTag}</span>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={noPad ? undefined : { padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

// ─── UPDATED BANNER — faculty-style light parchment ──────────────────────────
function Banner({ greeting, title, sub, actions, stats }) {
  return (
    <div style={{
      background: T.bannerBg,
      border: `1px solid ${T.bannerBorder}`,
      borderLeft: `4px solid ${T.bannerAccent}`,
      borderRadius: T.radius,
      padding: "22px 26px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(26,18,8,0.07)",
    }}>
      {/* subtle warm glow top-right */}
      <div style={{
        position: "absolute", right: -20, top: -20, width: 180, height: 180,
        background: "radial-gradient(circle, rgba(201,147,58,0.10), transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative" }}>
        {greeting && (
          <div style={{
            fontSize: 10, color: T.warning, textTransform: "uppercase",
            letterSpacing: "0.12em", marginBottom: 6, fontWeight: 700,
          }}>{greeting}</div>
        )}
        <div style={{
          fontFamily: T.fontDisplay, fontSize: 22, color: T.bark,
          lineHeight: 1.2, marginBottom: 8,
        }}>{title}</div>
        {sub && (
          <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>
        )}
        {actions && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>{actions}</div>
        )}
      </div>

      {stats && (
        <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
          {stats.map(({ num, label }) => (
            <div key={label} style={{
              textAlign: "center",
              background: "rgba(193,127,58,0.10)",
              border: `1px solid ${T.bannerBorder}`,
              borderRadius: 10,
              padding: "12px 18px",
            }}>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 24, color: T.bark }}>{num}</div>
              <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BtnPrimary({ children, onClick, style }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.gold2 : T.gold, color: T.bark, border: "none",
        borderRadius: T.radiusSm, padding: "8px 18px",
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        fontFamily: T.fontBody, letterSpacing: "0.01em",
        transition: "all 0.15s", transform: hov ? "translateY(-1px)" : "none",
        ...style,
      }}>{children}</button>
  );
}

function BtnGhost({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(193,127,58,0.12)", color: T.bark,
      border: `1px solid ${T.bannerBorder}`,
      borderRadius: T.radiusSm, padding: "8px 18px",
      fontSize: 12, fontWeight: 500, cursor: "pointer",
      fontFamily: T.fontBody, transition: "background 0.15s",
    }}>{children}</button>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 99,
      border: `1.5px solid ${active ? T.gold : T.border}`,
      background: active ? T.gold : "transparent",
      color: active ? T.bark : T.muted,
      fontSize: 11, fontWeight: 600, cursor: "pointer",
      fontFamily: T.fontBody, transition: "all 0.15s",
    }}>{label}</button>
  );
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr>
        {cols.map(c => (
          <th key={c} style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
            color: T.muted, fontWeight: 700, padding: "8px 10px",
            borderBottom: `1px solid ${T.border}`, textAlign: "left",
          }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function AccuracyColor(acc) {
  if (acc >= 80) return T.moss2;
  if (acc >= 60) return T.gold;
  return T.muted;
}

function StudentRow({ s, onClick, selected }) {
  return (
    <tr onClick={onClick} className="sc-card-table" style={{
      borderBottom: `1px solid ${T.bg}`, cursor: "pointer",
      background: selected ? "#F9F6F0" : "transparent", transition: "background 0.15s",
    }}>
      <td style={{ padding: "10px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Av initials={s.initials} bg={s.avBg} color={s.avColor} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.bark }}>{s.name}</div>
            <div style={{ fontSize: 10, color: T.muted }}>Batch 2026</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 10px" }}><Pill label={s.level} variant={s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
      <td style={{ padding: "10px 10px" }}>
        <ProgressBar pct={s.progress} width="72px" />
        <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.progress}%</div>
      </td>
      <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.accuracy) }}>{s.accuracy}%</td>
      <td style={{ padding: "10px 10px", fontSize: 12, color: T.bark }}>🔥 {s.streak}d</td>
      <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.score) }}>{s.score}</td>
      <td style={{ padding: "10px 10px", fontSize: 11, color: T.muted }}>{s.lastSeen}</td>
      <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Active" ? "active" : "inactive"} /></td>
    </tr>
  );
}

function ModuleCard({ m }) {
  return (
    <div className="sc-module-card" style={{
      border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
      overflow: "hidden", background: T.surface, transition: "all 0.18s", cursor: "pointer",
    }}>
      <div style={{ height: 3, background: m.stripe }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: m.levelColor, marginBottom: 8 }}>{m.level}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.bark, marginBottom: 4, lineHeight: 1.3 }}>{m.name}</div>
        <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4, marginBottom: 10 }}>{m.desc}</div>
        <div style={{ display: "flex", gap: 10, fontSize: 10, color: T.muted, marginBottom: 10 }}>
          <span>📖 {m.lessons} lessons</span>
          <span>👥 {m.enrolled} enrolled</span>
        </div>
        {m.status === "Active"
          ? <span style={{ fontSize: 10, background: "#EAF3DE", color: "#1E5C42", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>✓ Active</span>
          : <span style={{ fontSize: 10, background: "#FFF3E0", color: "#8A5C1A", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>🔒 Locked</span>
        }
        {m.completion > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
              <span style={{ color: T.muted }}>Completion</span>
              <span style={{ fontWeight: 700, color: T.moss2 }}>{m.completion}%</span>
            </div>
            <ProgressBar pct={m.completion} height={5} />
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px", display: "flex", gap: 8 }}>
        <button style={{ flex: 1, padding: "6px 0", background: T.bark, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody }}>View</button>
        <button style={{ flex: 1, padding: "6px 0", background: T.bg, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.fontBody }}>Edit</button>
      </div>
    </div>
  );
}

function BarChart({ data, labels, maxH = 100 }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: maxH }}>
      {data.map((v, i) => {
        const isTop = v === max;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: isTop ? T.gold : T.moss2 }}>{v}</span>
            <div style={{
              width: "100%", borderRadius: "4px 4px 0 0", minHeight: 4,
              background: isTop ? T.goldGrad : T.mossGrad,
              height: `${(v / max) * (maxH - 30)}px`,
            }} />
            <span style={{ fontSize: 9, color: T.muted }}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityFeed({ items }) {
  return (
    <div>
      {items.map(({ dot, text, time }, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.bg}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4 }} />
          <div>
            <div style={{ fontSize: 12, color: T.bark, lineHeight: 1.5 }}>{text}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReminderItem({ r, onRead }) {
  const typeMap = {
    warning: { bg: "#FFFBEB", border: T.gold,   icon: "⚠️" },
    info:    { bg: "#EFF6FF", border: "#4A90D9", icon: "ℹ️" },
    success: { bg: "#F0FDF4", border: T.moss2,   icon: "✅" },
  };
  const s = typeMap[r.type] || typeMap.info;
  return (
    <div style={{
      background: r.read ? T.surface : s.bg,
      borderRadius: T.radiusSm, borderLeft: `3px solid ${s.border}`,
      padding: "11px 14px", display: "flex", alignItems: "center", gap: 14,
      opacity: r.read ? 0.7 : 1, marginBottom: 8, transition: "opacity 0.2s",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: r.read ? 500 : 700, color: T.bark }}>{r.title}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{r.sub} · {r.time}</div>
      </div>
      {!r.read
        ? <button onClick={() => onRead(r.id)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", color: T.muted, fontFamily: T.fontBody }}>Mark read</button>
        : <span style={{ fontSize: 10, color: T.muted }}>Read</span>
      }
    </div>
  );
}

function NavButton({ item, isActive, onClick, expanded }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={!expanded ? item.label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: expanded ? 10 : 0,
        width: expanded ? "calc(100% - 16px)" : 40,
        margin: expanded ? "0 8px" : "0 auto",
        padding: "9px 10px",
        borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
        fontSize: 13, fontWeight: isActive ? 700 : 400, fontFamily: T.fontBody,
        background: isActive ? T.activeNavGrad : hov ? "rgba(255,255,255,0.06)" : "transparent",
        color: isActive ? T.gold2 : hov ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
        transition: "all 0.18s", position: "relative", overflow: "hidden",
        justifyContent: expanded ? "flex-start" : "center",
      }}
    >
      {isActive && expanded && (
        <div style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 3, height: "60%", background: T.gold, borderRadius: "0 3px 3px 0",
        }} />
      )}
      <span style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
        background: isActive ? "rgba(201,147,58,0.2)" : hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
        transition: "background 0.18s",
      }}>{item.icon}</span>
      {expanded && (
        <>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{item.label}</span>
          {item.badge && !isActive && (
            <span style={{ background: T.gold, color: T.bark, fontSize: 9, padding: "2px 6px", borderRadius: 99, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.badge}</span>
          )}
        </>
      )}
    </button>
  );
}

// ─── PAGE: DASHBOARD ──────────────────────────────────────────────────────────
function PageDashboard({ setActivePage, user }) {
  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        greeting={new Date().toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        title={`Welcome, Admin ${user?.name || ""}!`}
        sub="Batch 2026 is 67% through their FSL journey."
        actions={[<BtnGhost key="b" onClick={() => setActivePage("reports")}>View Reports</BtnGhost>]}
        stats={[{ num:"3", label:"Students" }, { num:"10%", label:"Avg Progress" }, { num:"3", label:"Badges" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="👥" value="3"   label="Total Students"   trend="+8 this batch"    trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📈" value="0%"  label="Avg Accuracy"     trend="+4% this week"    trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="📚" value="0"   label="Active Modules"   trend="2 FSL 1, 3 FSL 2" trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="⏱️" value="0"   label="Avg Weekly Study" trend="-0.3h vs goal"    trendUp={false} accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <Card title="👥 Recent Students" titleTag="Live" action={<button onClick={() => setActivePage("students")} style={{ fontSize: 14, color: T.moss2, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: T.fontBody }}>View all →</button>} noPad>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="sc-card-table">
            <TableHead cols={["Student","Level","Progress","Accuracy","Status"]} />
            <tbody>
              {STUDENTS.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.bg}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9F6F0"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Av initials={s.initials} bg={s.avBg} color={s.avColor} />
                      <div><div style={{ fontWeight: 700, color: T.bark }}>{s.name}</div><div style={{ fontSize: 14, color: T.muted }}>Batch 2026</div></div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px" }}><Pill label={s.level} variant={s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
                  <td style={{ padding: "10px 10px" }}><ProgressBar pct={s.progress} width="72px" /><div style={{ fontSize: 14, color: T.muted, marginTop: 3 }}>{s.progress}%</div></td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.accuracy) }}>{s.accuracy}%</td>
                  <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Active" ? "active" : "inactive"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="⚡ Activity Feed" action={<button style={{ fontSize: 14, color: T.moss2, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: T.fontBody }}>Clear</button>}>
            <ActivityFeed items={ACTIVITY} />
          </Card>
          <Card title="🔔 Reminders" action={<button style={{ fontSize: 14, color: T.moss2, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: T.fontBody }}>Mark all read</button>}>
            {REMINDERS_DATA.filter(r => !r.read).slice(0, 3).map(r => (
              <div key={r.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.bg}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.type === "warning" ? T.gold : r.type === "success" ? T.moss2 : "#4A90D9", flexShrink: 0, marginTop: 4 }} />
                <div><div style={{ fontSize: 13, color: T.bark, lineHeight: 1.5 }}>{r.title}</div><div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{r.sub}</div></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <Card title="📚 Module Overview" action={<BtnPrimary style={{ fontSize: 13, padding: "5px 12px" }}>+ Add Module</BtnPrimary>} noPad>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "14px 18px" }}>
            {MODULES.slice(0, 3).map(m => <ModuleCard key={m.id} m={m} />)}
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="📊 Weekly Engagement" titleTag="This week">
            <BarChart data={REPORTS_DATA.weekly} labels={REPORTS_DATA.days} maxH={110} />
          </Card>
          <Card title="🏆 Top Performers" action={<button style={{ fontSize: 14, color: T.moss2, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: T.fontBody }}>Full rankings →</button>}>
            {STUDENTS.slice().sort((a, b) => b.score - a.score).slice(0, 3).map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 2 ? `1px solid ${T.bg}` : "none" }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 17, width: 22, textAlign: "center", color: i === 0 ? T.gold : i === 1 ? "#8A9BA8" : "#A0714A" }}>#{i + 1}</span>
                <Av initials={s.initials} bg={s.avBg} color={s.avColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.bark }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: T.muted }}>🔥 {s.streak}d streak</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.moss2 }}>{s.score}</div>
                  <div style={{ fontSize: 13, color: T.muted }}>{s.accuracy}% acc</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: STUDENTS ───────────────────────────────────────────────────────────
function PageStudents() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = STUDENTS.filter(s => {
    const mf = filter === "all" || s.status.toLowerCase() === filter;
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Manage Learners"
        sub="124 students enrolled in Batch 2026"
        actions={[<BtnGhost key="b">Export List</BtnGhost>]}
        stats={[{ num:"3", label:"Active" }, { num:"0", label:"At Risk" }, { num:"0", label:"Inactive" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="👥" value="3"  label="Total Students" trend="+8 this batch"  trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value="0"  label="Active"         trend="+5 this week"   trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⚠️" value="0"  label="At Risk"        trend="missed 3+ days" trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="📈" value="0%" label="Avg Progress"   trend="+4% this week"  trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="All Students"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["all","active","inactive"].map(f => <FilterBtn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />)}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…"
              style={{ padding: "5px 12px", border: `1.5px solid ${T.border}`, borderRadius: 99, fontSize: 15, color: T.bark, background: T.bg, fontFamily: T.fontBody, outline: "none" }} />
          </div>
        } noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <TableHead cols={["Student","Email","Level","Progress","Streak","Score","Last Seen","Status"]} />
          <tbody>
            {filtered.map(s => (
              <StudentRow key={s.id} s={s} selected={selected?.id === s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)} />
            ))}
          </tbody>
        </table>
      </Card>
      {selected && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Av initials={selected.initials} bg={selected.avBg} color={selected.avColor} size={50} />
              <div>
                <div style={{ fontFamily: T.fontDisplay, fontSize: 18, color: T.bark }}>{selected.name}</div>
                <div style={{ fontSize: 14, color: T.muted }}>{selected.email}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.muted }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label:"Level",    value:selected.level        },
              { label:"Progress", value:selected.progress+"%" },
              { label:"Score",    value:selected.score+"/100" },
              { label:"Streak",   value:selected.streak+"d 🔥"},
              { label:"Status",   value:selected.status       },
              { label:"Joined",   value:selected.joined       },
              { label:"Last Seen",value:selected.lastSeen     },
              { label:"Accuracy", value:selected.accuracy+"%" },
            ].map(item => (
              <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: "10px 14px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: T.muted, fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.bark, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── PAGE: MODULES ────────────────────────────────────────────────────────────
function PageModules() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MODULES : MODULES.filter(m => m.level === filter || m.status.toLowerCase() === filter);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="FSL Curriculum"
        sub="5 modules across 2 levels — 102 total lessons"
        actions={[<BtnPrimary key="a">+ Add Module</BtnPrimary>, <BtnGhost key="b">Reorder</BtnGhost>]}
        stats={[{ num:"1", label:"Active" }, { num:"4", label:"Locked" }, { num:"102", label:"Lessons" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="📚" value="5"   label="Total Modules"  trend="2 levels"          trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value="1"   label="Active"         trend="Alphabet & Numbers" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="🔒" value="4"   label="Locked"         trend="pending unlock"     trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="📖" value="102" label="Total Lessons"  trend="across all modules" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="FSL Modules"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {["all","FSL 1","FSL 2","active","locked"].map(f => <FilterBtn key={f} label={f === "all" ? "All" : f} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
        }>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
          {filtered.map(m => <ModuleCard key={m.id} m={m} />)}
        </div>
      </Card>
    </div>
  );
}

// ─── PAGE: SESSIONS ───────────────────────────────────────────────────────────
function PageSessions() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? SESSIONS : SESSIONS.filter(s => s.status.toLowerCase() === filter);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Practice Sessions"
        sub="5 sessions this week — 4 completed"
        actions={[<BtnPrimary key="a">Export Sessions</BtnPrimary>]}
        stats={[{ num:"5", label:"Total" }, { num:"4", label:"Completed" }, { num:"41m", label:"Avg Duration" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="▶️" value="0"   label="Total Sessions" trend="this week"       trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value="0"   label="Completed"      trend="+2 vs last week" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⏱️" value="0"   label="Avg Duration"   trend="+5m improvement" trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="🎯" value="0%"  label="Avg Accuracy"   trend="+4% this week"   trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="Practice Sessions"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {["all","completed","incomplete"].map(f => <FilterBtn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
        } noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <TableHead cols={["Student","Module","Date","Duration","Signs","Accuracy","Status"]} />
          <tbody>
            {filtered.map(s => {
              const st = STUDENTS.find(x => x.id === s.sId);
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.bg}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9F6F0"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {st && <Av initials={st.initials} bg={st.avBg} color={st.avColor} size={28} />}
                      <span style={{ fontWeight: 700, color: T.bark }}>{s.student}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px", color: T.muted }}>{s.module}</td>
                  <td style={{ padding: "10px 10px", color: T.muted }}>{s.date}</td>
                  <td style={{ padding: "10px 10px" }}>{s.duration}</td>
                  <td style={{ padding: "10px 10px" }}>{s.signs} signs</td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.accuracy) }}>{s.accuracy}%</td>
                  <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Completed" ? "completed" : "incomplete"} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── PAGE: ANALYTICS ─────────────────────────────────────────────────────────
function PageAnalytics() {
  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Performance Insights"
        sub="Batch 2026 learning trends & metrics"
        stats={[{ num:"41m", label:"Avg Session" }, { num:"67%", label:"Completion" }, { num:"128h", label:"Total Hours" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="⏱️" value="0"   label="Avg Session"      trend="+5m this week"      trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="🎯" value="0%"  label="Completion Rate"   trend="+4% this month"     trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="📚" value="0"   label="Total Hours"       trend="batch total"        trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="🔥" value="0"   label="Avg Streak (days)" trend="+1.4 vs last batch" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Weekly Active Students">
          <BarChart data={REPORTS_DATA.weekly} labels={REPORTS_DATA.labels.map((_, i) => `W${i + 1}`)} maxH={130} />
        </Card>
        <Card title="Accuracy Trend (%)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REPORTS_DATA.labels.map((label, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: T.muted }}>{label}</span>
                  <span style={{ fontWeight: 700, color: T.moss2 }}>{REPORTS_DATA.accuracy[i]}%</span>
                </div>
                <ProgressBar pct={REPORTS_DATA.accuracy[i]} height={6} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Module Completion">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MODULES.map(m => (
              <div key={m.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: T.bark, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontWeight: 700, color: T.moss2 }}>{m.completion}%</span>
                </div>
                <ProgressBar pct={m.completion} height={6} color={m.level === "FSL 1" ? T.goldGrad : T.mossGrad} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Top Performers">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STUDENTS.slice().sort((a, b) => b.score - a.score).map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < STUDENTS.length - 1 ? `1px solid ${T.bg}` : "none" }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 16, width: 22, textAlign: "center", color: i === 0 ? T.gold : i === 1 ? "#8A9BA8" : "#A0714A" }}>#{i + 1}</span>
                <Av initials={s.initials} bg={s.avBg} color={s.avColor} size={28} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.bark }}>{s.name}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.moss2 }}>{s.score}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{s.accuracy}% acc</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── PAGE: ACHIEVEMENTS ───────────────────────────────────────────────────────
function PageAchievements() {
  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Badges & Recognition"
        sub="213 badges awarded across 124 students"
        actions={[<BtnPrimary key="a">+ Create Badge</BtnPrimary>]}
        stats={[{ num:"213", label:"Issued" }, { num:"12", label:"Perfect Scores" }, { num:"34", label:"7-Day Streaks" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🏅" value="213" label="Total Badges Issued" trend="+18 this week"   trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="🌟" value="12"  label="Perfect Scores"      trend="+3 this week"    trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="🔥" value="34"  label="7-Day Streaks"        trend="active students" trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="📚" value="8"   label="Module Completions"   trend="this month"      trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="Achievement Badges">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
          {ACHIEVEMENTS_DATA.map(a => (
            <div key={a.name} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.bark }}>{a.name}</div>
                <div style={{ fontSize: 10, color: T.muted, margin: "2px 0 8px", lineHeight: 1.3 }}>{a.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: T.muted }}>Earned by</span>
                  <span style={{ fontWeight: 700, color: a.barColor }}>{a.earned}/{a.total} students</span>
                </div>
                <ProgressBar pct={Math.round((a.earned / a.total) * 100)} color={a.barColor} height={5} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Recent Badge Awards" noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <TableHead cols={["Student","Badge","Date","Level"]} />
          <tbody>
            {[
              { s: STUDENTS[2], badge:"🏅 Consistent Learner", date:"Today"     },
              { s: STUDENTS[2], badge:"🌟 Perfect Score",       date:"Yesterday" },
              { s: STUDENTS[1], badge:"🔥 7-Day Streak",        date:"May 18"    },
              { s: STUDENTS[0], badge:"📚 First Sign",          date:"May 17"    },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.bg}`, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9F6F0"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Av initials={r.s.initials} bg={r.s.avBg} color={r.s.avColor} size={28} />
                    <span style={{ fontWeight: 700, color: T.bark }}>{r.s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 10px" }}>{r.badge}</td>
                <td style={{ padding: "10px 10px", color: T.muted }}>{r.date}</td>
                <td style={{ padding: "10px 10px" }}><Pill label={r.s.level} variant={r.s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── PAGE: REMINDERS ─────────────────────────────────────────────────────────
function PageReminders() {
  const [alerts, setAlerts] = useState(() => LS.get("sc_reminders", REMINDERS_DATA));
  const [filter, setFilter] = useState("all");

  useEffect(() => { LS.set("sc_reminders", alerts); }, [alerts]);

  const markRead = id => setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a));
  const markAll  = ()  => setAlerts(p => p.map(a => ({ ...a, read: true })));
  const unread   = alerts.filter(a => !a.read).length;
  const filtered = filter === "all" ? alerts : filter === "unread" ? alerts.filter(a => !a.read) : alerts.filter(a => a.type === filter);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Alerts & Notifications"
        sub={`${unread} unread alerts need your attention`}
        actions={[<BtnPrimary key="a" onClick={markAll}>Mark all read</BtnPrimary>]}
        stats={[{ num:alerts.length, label:"Total" }, { num:unread, label:"Unread" }, { num:alerts.filter(a=>a.type==="warning").length, label:"Warnings" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🔔" value={alerts.length} label="Total Alerts"   trend="this week"      trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📬" value={unread}         label="Unread"         trend="need attention" trendUp={false} accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⚠️" value={alerts.filter(a=>a.type==="warning").length} label="Warnings" trend="student at-risk" trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="✅" value={alerts.filter(a=>a.read).length} label="Resolved" trend="marked read" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="Alerts & Notifications"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {["all","unread","warning","info","success"].map(f => <FilterBtn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
        }>
        {filtered.map(a => <ReminderItem key={a.id} r={a} onRead={markRead} />)}
      </Card>
    </div>
  );
}

// ─── PAGE: REPORTS ────────────────────────────────────────────────────────────
function PageReports() {
  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Export & Analytics"
        sub="Generate reports for Batch 2026"
        actions={[<BtnPrimary key="a">Export All</BtnPrimary>, <BtnGhost key="b">Schedule Report</BtnGhost>]}
        stats={[{ num:"7", label:"Generated" }, { num:"82%", label:"Top Accuracy" }, { num:"128h", label:"Study Hours" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="📋" value="7"    label="Reports Generated" trend="this month"  trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📈" value="82%"  label="Highest Accuracy"  trend="Sofia Reyes" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="👥" value="124"  label="Students Tracked"  trend="full batch"  trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="⏱️" value="128h" label="Total Study Hours" trend="cumulative"  trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Weekly Engagement">
          <BarChart data={REPORTS_DATA.weekly} labels={REPORTS_DATA.labels.map((_, i) => `W${i + 1}`)} maxH={130} />
        </Card>
        <Card title="Accuracy Over Time">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REPORTS_DATA.labels.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: T.muted, width: 52, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1 }}><ProgressBar pct={REPORTS_DATA.accuracy[i]} height={8} /></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.moss2, width: 36, textAlign: "right" }}>{REPORTS_DATA.accuracy[i]}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Student Performance Summary" noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <TableHead cols={["Student","Level","Progress","Accuracy","Streak","Score","Status"]} />
          <tbody>
            {STUDENTS.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.bg}`, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9F6F0"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Av initials={s.initials} bg={s.avBg} color={s.avColor} size={28} />
                    <span style={{ fontWeight: 700, color: T.bark }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 10px" }}><Pill label={s.level} variant={s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
                <td style={{ padding: "10px 10px" }}><ProgressBar pct={s.progress} width="60px" /></td>
                <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.accuracy) }}>{s.accuracy}%</td>
                <td style={{ padding: "10px 10px" }}>🔥 {s.streak}d</td>
                <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.score) }}>{s.score}</td>
                <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Active" ? "active" : "inactive"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Export Reports">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[
            { icon:"📊", label:"Student Progress Report",  sub:"CSV / PDF" },
            { icon:"📈", label:"Module Completion Report", sub:"CSV / PDF" },
            { icon:"🏅", label:"Achievement Summary",       sub:"CSV / PDF" },
          ].map(r => (
            <div key={r.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.bark, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>{r.sub}</div>
              <BtnPrimary style={{ width: "100%" }}>Download</BtnPrimary>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── PAGE: SETTINGS ───────────────────────────────────────────────────────────
function PageSettings({ user, onProfileUpdate }) {
  const [form, setForm] = useState(() => LS.get("sc_program_settings", DEFAULT_PROGRAM));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(() => LS.get("sc_admin_avatar", null));
  const [nameForm, setNameForm] = useState(() => ({ name: LS.get("sc_admin_name", user?.name || "Admin") }));
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current:"", newPass:"", confirm:"" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPw, setShowPw] = useState({ current:false, newPass:false, confirm:false });

  const setField = key => e => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false); setSaveError("");
  };

  const handleSave = () => {
    if (LS.set("sc_program_settings", form)) { setSaved(true); setSaveError(""); setTimeout(() => setSaved(false), 3000); }
    else setSaveError("Failed to save.");
  };

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setProfileError("Image must be under 500 KB."); return; }
    const r = new FileReader();
    r.onload = ev => { setAvatarPreview(ev.target.result); setProfileError(""); };
    r.readAsDataURL(file);
  };

  const handleProfileSave = () => {
    if (!nameForm.name.trim()) { setProfileError("Display name cannot be empty."); return; }
    const ok1 = LS.set("sc_admin_name", nameForm.name.trim());
    const ok2 = avatarPreview ? LS.set("sc_admin_avatar", avatarPreview) : true;
    if (ok1 && ok2) {
      if (onProfileUpdate) onProfileUpdate({ name: nameForm.name.trim(), avatar: avatarPreview });
      setProfileSaved(true); setProfileError("");
      setTimeout(() => setProfileSaved(false), 3000);
    } else setProfileError("Failed to save profile.");
  };

  const handlePasswordSave = () => {
    setPasswordMsg(""); setPasswordSuccess(false);
    if (!passwordForm.current) { setPasswordMsg("Enter your current password."); return; }
    const stored = LS.get("sc_admin_password", null);
    if (stored && passwordForm.current !== stored) { setPasswordMsg("Current password is incorrect."); return; }
    if (passwordForm.newPass.length < 6) { setPasswordMsg("New password must be at least 6 characters."); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordMsg("Passwords do not match."); return; }
    if (LS.set("sc_admin_password", passwordForm.newPass)) {
      setPasswordSuccess(true); setPasswordMsg("Password changed successfully!");
      setPasswordForm({ current:"", newPass:"", confirm:"" });
      setTimeout(() => { setPasswordMsg(""); setPasswordSuccess(false); }, 3000);
    } else setPasswordMsg("Failed to save password.");
  };

  const pwStrength = (() => {
    const len = passwordForm.newPass.length;
    if (!len) return null;
    const score = len < 6 ? 0 : len < 10 ? 1 : 2;
    return { score, colors:[T.danger, T.warning, T.success], labels:["Weak","Fair","Strong"] };
  })();

  const inputSty = {
    width:"100%", padding:"8px 12px", border:`1.5px solid ${T.border}`,
    borderRadius:T.radiusSm, fontSize:13, color:T.bark, background:T.bg,
    fontFamily:T.fontBody, boxSizing:"border-box",
  };
  const labelSty = {
    display:"block", fontSize:10, fontWeight:700, color:T.muted,
    marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em",
  };

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Banner
        title="System Configuration"
        sub="Manage your Sign Coach admin preferences"
      />
      <Card title="👤 Admin Profile & Security">
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="av" style={{ width:70, height:70, borderRadius:16, objectFit:"cover", border:`3px solid ${T.gold}` }} />
                : <div style={{ width:70, height:70, borderRadius:16, background:T.goldGrad, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontFamily:T.fontDisplay }}>
                    {nameForm.name ? nameForm.name.slice(0,2).toUpperCase() : "AD"}
                  </div>
              }
              <label htmlFor="av-upload" style={{ position:"absolute", bottom:-4, right:-4, width:22, height:22, borderRadius:"50%", background:T.gold, border:`2px solid ${T.surface}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, color:T.bark }}>✎</label>
              <input id="av-upload" type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarChange} />
            </div>
            <label htmlFor="av-upload" style={{ fontSize:11, fontWeight:600, color:T.gold, cursor:"pointer" }}>Change photo</label>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:14 }}>
              <label style={labelSty}>Display Name</label>
              <input type="text" value={nameForm.name}
                onChange={e => { setNameForm({ name:e.target.value }); setProfileSaved(false); setProfileError(""); }}
                style={inputSty} />
            </div>
            {profileError && <p style={{ fontSize:12, color:T.danger, marginBottom:10 }}>⚠️ {profileError}</p>}
            <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:10 }}>
              {profileSaved && <span style={{ fontSize:12, color:T.success, fontWeight:600 }}>✅ Profile updated!</span>}
              <BtnPrimary onClick={handleProfileSave}>Save Profile</BtnPrimary>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.bark, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>🔒 Change Password</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:480 }}>
            {[
              { label:"Current Password",    key:"current" },
              { label:"New Password",         key:"newPass" },
              { label:"Confirm New Password", key:"confirm" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={labelSty}>{label}</label>
                <div style={{ position:"relative" }}>
                  <input type={showPw[key] ? "text" : "password"} value={passwordForm[key]}
                    placeholder="••••••••"
                    onChange={e => { setPasswordForm(f => ({ ...f, [key]:e.target.value })); setPasswordMsg(""); }}
                    style={{ ...inputSty, paddingRight:36 }} />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]:!p[key] }))}
                    style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:14, color:T.muted }}>
                    {showPw[key] ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            ))}
            {pwStrength && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:4, background:T.border, borderRadius:99, overflow:"hidden" }}>
                  <div style={{ width:`${[33,66,100][pwStrength.score]}%`, height:"100%", background:pwStrength.colors[pwStrength.score], borderRadius:99, transition:"width 0.3s" }} />
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:pwStrength.colors[pwStrength.score] }}>{pwStrength.labels[pwStrength.score]}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:10 }}>
              {passwordMsg && <span style={{ fontSize:12, fontWeight:600, color:passwordSuccess ? T.success : T.danger }}>{passwordSuccess ? "✅" : "⚠️"} {passwordMsg}</span>}
              <BtnPrimary onClick={handlePasswordSave}>Change Password</BtnPrimary>
            </div>
          </div>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="📋 Program Settings">
          {[{ label:"Batch Name", key:"batchName" }, { label:"Program Name", key:"program" }].map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <label style={labelSty}>{f.label}</label>
              <input type="text" value={form[f.key]} onChange={setField(f.key)} style={inputSty} />
            </div>
          ))}
          <div style={{ marginBottom:16 }}>
            <label style={labelSty}>Timezone</label>
            <select value={form.timezone} onChange={setField("timezone")} style={inputSty}>
              {["Asia/Manila","UTC","America/New_York","Asia/Singapore","Asia/Tokyo","Europe/London"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSty}>Alert Threshold (days inactive)</label>
            <input type="number" min={1} max={30} value={form.alertThreshold} onChange={setField("alertThreshold")} style={inputSty} />
          </div>
        </Card>
        <Card title="🔔 Notification Preferences">
          {[
            { label:"Email Notifications",   key:"emailNotifs",    desc:"Receive email alerts for student activity" },
            { label:"Weekly Reports",        key:"weeklyReport",   desc:"Send weekly summary reports to your email" },
            { label:"Allow Self-Enrollment", key:"allowSelfEnroll",desc:"Students can enroll themselves in modules" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
                <div>
                  <label style={labelSty}>{f.label}</label>
                  <p style={{ fontSize:11, color:T.muted, margin:0 }}>{f.desc}</p>
                </div>
                <div onClick={() => setField(f.key)({ target:{ type:"checkbox", checked:!form[f.key] } })}
                  style={{ position:"relative", width:44, height:24, borderRadius:12, flexShrink:0, cursor:"pointer", background:form[f.key] ? T.gold : "#D1D5DB", transition:"background 0.2s" }}>
                  <div style={{ position:"absolute", top:3, left:form[f.key] ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s" }} />
                </div>
              </div>
              <p style={{ fontSize:11, fontWeight:600, color:form[f.key] ? T.success : T.muted, margin:"6px 0 0" }}>{form[f.key] ? "Enabled" : "Disabled"}</p>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, alignItems:"center" }}>
        {saveError && <span style={{ fontSize:12, fontWeight:600, color:T.danger }}>⚠️ {saveError}</span>}
        {saved    && <span style={{ fontSize:12, fontWeight:600, color:T.success }}>✅ Settings saved!</span>}
        <button onClick={() => { setForm(DEFAULT_PROGRAM); setSaved(false); }}
          style={{ background:"transparent", color:T.muted, border:`1.5px solid ${T.border}`, borderRadius:T.radiusSm, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:T.fontBody }}>
          Reset Defaults
        </button>
        <BtnPrimary onClick={handleSave}>Save Changes</BtnPrimary>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function PageAdminDashboard() {
  useInjectStyles();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activePage,    setActivePage]    = useState("dashboard");
  const [profileName,   setProfileName]   = useState(() => LS.get("sc_admin_name",   user?.name  || "Admin"));
  const [profileAvatar, setProfileAvatar] = useState(() => LS.get("sc_admin_avatar", null));
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const handleProfileUpdate = ({ name, avatar }) => {
    if (name)              setProfileName(name);
    if (avatar !== undefined) setProfileAvatar(avatar);
  };

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (user.role === "student") { router.push("/dashboard/student"); return; }
    if (user.role === "faculty") { router.push("/dashboard/faculty"); return; }
  }, [user]);

  if (!user) return null;

  const sidebarInitials = profileName
    ? profileName.trim().split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : (user.avatar || "AD");

  const navSections = ["Main","Insights","System"];

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <PageDashboard setActivePage={setActivePage} user={{ ...user, name: profileName }} />;
      case "students":     return <PageStudents />;
      case "modules":      return <PageModules />;
      case "sessions":     return <PageSessions />;
      case "analytics":    return <PageAnalytics />;
      case "achievements": return <PageAchievements />;
      case "reminders":    return <PageReminders />;
      case "reports":      return <PageReports />;
      case "settings":     return <PageSettings user={{ ...user, name:profileName, avatar:profileAvatar }} onProfileUpdate={handleProfileUpdate} />;
      default:             return <PageDashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:T.fontBody, overflow:"hidden" }}>

      {/* ── SIDEBAR — hover to expand ── */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        style={{
          width: sidebarExpanded ? 230 : 64,
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          background: T.sidebarBg,
          display: "flex", flexDirection: "column", flexShrink: 0,
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.04, backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div style={{
          padding: sidebarExpanded ? "20px 18px 16px" : "20px 13px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          transition: "padding 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap: sidebarExpanded ? 11 : 0 }}>
            <img src="/ubbg.png" alt="SC" style={{ width:45, height:45, borderRadius:10, objectFit:"cover", flexShrink:0, boxShadow:`0 3px 12px rgba(201,147,58,0.4)` }} />
            <div style={{ overflow:"hidden", maxWidth: sidebarExpanded ? 160 : 0, opacity: sidebarExpanded ? 1 : 0, transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease", whiteSpace:"nowrap" }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#fff", letterSpacing:"-0.2px" }}>Sign Coach</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.12em" }}>Admin Portal</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"12px 0", overflowY:"auto", overflowX:"hidden" }}>
          {navSections.map(section => (
            <div key={section}>
              <div style={{
                fontSize:9, color:"rgba(255,255,255,0.28)", textTransform:"uppercase",
                letterSpacing:"0.15em", padding:"10px 18px 4px", fontWeight:600,
                overflow:"hidden", maxHeight: sidebarExpanded ? 32 : 0,
                opacity: sidebarExpanded ? 1 : 0,
                transition:"max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
                whiteSpace:"nowrap",
              }}>{section}</div>
              {navItems.filter(n => n.section === section).map(item => (
                <NavButton key={item.id} item={item} isActive={activePage === item.id} onClick={() => setActivePage(item.id)} expanded={sidebarExpanded} />
              ))}
            </div>
          ))}
        </nav>
        <div style={{
          margin:"0 8px 12px", borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:12,
          display:"flex", alignItems:"center", gap: sidebarExpanded ? 10 : 0,
          overflow:"hidden", justifyContent: sidebarExpanded ? "flex-start" : "center",
        }}>
          <div style={{ width:34, height:34, borderRadius:9, overflow:"hidden", flexShrink:0 }}>
            {profileAvatar
              ? <img src={profileAvatar} alt="av" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", background:T.goldGrad, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12 }}>{sidebarInitials}</div>
            }
          </div>
          <div style={{ flex:1, minWidth:0, overflow:"hidden", maxWidth: sidebarExpanded ? 120 : 0, opacity: sidebarExpanded ? 1 : 0, transition:"max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease", whiteSpace:"nowrap" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis" }}>{profileName}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Administrator</div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            title="Sign out"
            style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:15, padding:"4px", borderRadius:7, flexShrink:0, transition:"color 0.15s, opacity 0.2s, max-width 0.28s", overflow:"hidden", maxWidth: sidebarExpanded ? 32 : 0, opacity: sidebarExpanded ? 1 : 0, pointerEvents: sidebarExpanded ? "auto" : "none" }}
            onMouseEnter={e => e.currentTarget.style.color="#fff"}
            onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.3)"}
          >↪</button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", background:T.bg }}>
        <div style={{ padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:T.cream, borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, zIndex:10 }}>
          <div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:20, color:T.bark, lineHeight:1 }}>{PAGE_TITLES[activePage]}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>UB CCELL FSL Program — Batch 2026</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:T.bg, border:`1px solid ${T.border2}`, borderRadius:99, padding:"7px 14px", fontSize:12, color:T.muted, cursor:"text", minWidth:220 }}>🔍 Search students, modules…</div>
            <div style={{ width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", fontSize:14, color:T.muted }}>
              🔔<div style={{ position:"absolute", top:6, right:6, width:6, height:6, background:T.clay, borderRadius:"50%", border:`1.5px solid ${T.cream}` }} />
            </div>
            <div style={{ width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:T.muted }}>👤</div>
          </div>
        </div>
        <div style={{ padding:"22px 24px", flex:1 }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}