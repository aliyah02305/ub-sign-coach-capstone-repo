import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../components/AuthContext";
import { auth } from "../../lib/firebase";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  sidebarBg:     "#6B1A28",
  sidebarBorder: "rgba(210, 180, 13, 0.91)",

  bg:            "#FBF8F3",
  surface:       "#FFFFFF",
  cream:         "#FFFFFF",
  border:        "rgba(107, 26, 40, 0.10)",

  // Gold Accents
  amber800:      "#9f7b17",
  amber700:      "#9a740d",
  amber600:      "#9d7507",
  amber100:      "#FDF6E2",
  amber50:       "#FFFDF5",

  // Secondary Accents
  blue700:       "#6B1A28",
  blue500:       "#ad820c",
  blue100:       "#FDF6E2",

  // Typography
  text:          "#2A080C",
  textSub:       "#4A121B",
  textMuted:     "#8C6D73",

  // Status Colors
  success:       "#10B981",
  warning:       "#b3870d",
  danger:        "#9E1B22",

  // Layout & Styling
  radius:        "15px",
  radiusSm:      "8px",
  radiusLg:      "14px",
  shadow:        "0 1px 4px rgba(107, 26, 40, 0.08)",
  shadowMd:      "0 4px 14px rgba(107, 26, 40, 0.12)",

  // Banner
  bannerBg:      "#FDF4E1",
  bannerBorder:  "#E5C16C",

  gold:          "#C9933A",
  gold2:         "#E8B86D",
  goldGrad:      "linear-gradient(135deg,#E8B86D,#C9933A)",
  moss2:         "#1E7A57",
  mossGrad:      "linear-gradient(90deg,#2E9B73,#1E7A57)",
  clay:          "#9E1B22",
  clay2:         "#C4505A",
  sage:          "#6B1A28",
  sage2:         "#A83245",
  bark:          "#2A080C",
  muted:         "#8C6D73",
  sand:          "#F3ECE0",
  border2:       "rgba(107,26,40,0.18)",
  bannerAccent:  "#9d7507",
  activeNavGrad: "rgba(201,147,58,0.18)",
  fontDisplay:   "'DM Serif Display', Georgia, serif",
  fontBody:      "'DM Sans', system-ui, sans-serif",
};

// ─── STUDENT DATA (real students from the database) ─────────────────────────
const AV_COLORS = [
  { bg:"#EDE9FE", color:"#5B21B6" },
  { bg:"#DBEAFE", color:"#1D4ED8" },
  { bg:"#DCFCE7", color:"#166534" },
  { bg:"#FCE7F3", color:"#9D174D" },
];

function timeAgo(d) {
  if (!d) return "Never";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 2) return "Online now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// "5m ago" / "2h ago" / "1d ago" / "Online now"  ->  timestamp (ms)
function agoToMs(s) {
  if (typeof s !== "string") return 0;
  if (/online now/i.test(s)) return Date.now();
  const m = s.match(/(\d+)\s*(m|h|d)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const mult = { m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  return Date.now() - n * mult;
}

function toStudentRow(u, i) {
  const c = AV_COLORS[i % AV_COLORS.length];
  const name = u.name || "Unnamed";
  const role = String(u.role || "student").toLowerCase();
  const lvNum = String(u.level || "").match(/\d/)?.[0];
  const signsDone = Array.isArray(u.completedSigns) ? u.completedSigns.length : null;

  const progress = typeof u.progress === "number"
    ? u.progress
    : Math.min(100, Math.round(((signsDone ?? 0) / 26) * 100));

  const lastSeenDate = u.lastSeen && !isNaN(new Date(u.lastSeen)) ? new Date(u.lastSeen) : null;
  const lastSeenRaw  = lastSeenDate ? lastSeenDate.getTime() : agoToMs(u.lastSeen);
  const lastSeen     = lastSeenDate ? timeAgo(u.lastSeen) : (typeof u.lastSeen === "string" && u.lastSeen ? u.lastSeen : "Never");

  const mins = lastSeenRaw ? (Date.now() - lastSeenRaw) / 60000 : Infinity;
  const status = typeof u.status === "string"
    ? (u.status.toLowerCase() === "inactive" ? "Inactive" : "Active")
    : (mins < 7 * 1440 ? "Active" : "Inactive");

  const created = u.createdAt && !isNaN(new Date(u.createdAt)) ? new Date(u.createdAt) : null;

  return {
    id: u.uid ?? u.id ?? `s${i}`,
    role,
    initials: u.avatar && u.avatar.length <= 2
      ? u.avatar
      : name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    name,
    email: u.email || "",
    level: lvNum ? `FSL ${lvNum}` : "FSL 1",
    progress,
    accuracy: u.accuracy ?? 0,
    status,
    joined: created
      ? created.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
      : (u.joined || "—"),
    lastSeen,
    lastSeenRaw,
    avBg: c.bg, avColor: c.color,
  };
}

function useStudents(uid) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/students?uid=${encodeURIComponent(uid)}`);
        if (!res.ok) throw new Error(`/api/students returned ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.students || []);
        if (alive) { setStudents(list.map(toStudentRow)); setError(""); }
      } catch (e) {
        console.error("Failed to load students", e);
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(t); window.removeEventListener("focus", load); };
  }, [uid]);

  return { students, loading, error };
}

function useAllUsers(uid) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/all-users?uid=${encodeURIComponent(uid)}`);
        if (!res.ok) throw new Error(`/api/all-users returned ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.users || []);
        if (alive) { setUsers(list.map(toStudentRow)); setError(""); }
      } catch (e) {
        console.error("Failed to load users", e);
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(t); window.removeEventListener("focus", load); };
  }, [uid]);

  return { users, loading, error };
}

function useAdminData(uid) {
  const [state, setState] = useState({ modules: [], alerts: [], analytics: null, loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const load = async () => {
      try {
        const q = `?uid=${encodeURIComponent(uid)}`;
        const get = (n) => fetch(`/api/${n}${q}`).then(r => {
          if (!r.ok) throw new Error(`${n} (${r.status})`);
          return r.json();
        });
        const [modules, alerts, analytics] = await Promise.all([
          get("modules"), get("notifications"), get("analytics"),
        ]);
        if (alive) setState({ modules, alerts, analytics, loading: false, error: null });
      } catch (e) {
        console.error("Admin data failed", e);
        if (alive) setState(s => ({ ...s, loading: false, error: e.message }));
      }
    };
    load();
    const t = setInterval(load, 10000);
    window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(t); window.removeEventListener("focus", load); };
  }, [uid]);

  const setAlerts = (fn) => setState(s => ({ ...s, alerts: fn(s.alerts) }));
  return { ...state, setAlerts };
}

const toModuleCard = (m) => ({
  id: m.id,
  name: m.title,
  level: m.level,
  lessons: m.lessons ?? (m.activities?.length || 0),
  enrolled: m.enrolled ?? 0,
  completion: m.completion ?? 0,
  desc: m.description || "",
  updated: m.updatedAt
    ? new Date(m.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—",
  status: m.status === "published" ? "Active" : "Locked",
  stripe: m.level === "FSL 1"
    ? "linear-gradient(90deg,#E8B86D,#C9933A)"
    : "linear-gradient(90deg,#A83245,#6B1A28)",
  levelColor: m.level === "FSL 1" ? T.gold : T.blue700,
});

function downloadCSV(filename, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const studentCSVRows = (students) => [
  ["Name", "Email", "Level", "Progress %", "Status", "Joined", "Last Seen"],
  ...students.map(s => [s.name, s.email, s.level, s.progress, s.status, s.joined, s.lastSeen]),
];

const ACHIEVEMENTS_DATA = [
  { icon:"🏅", name:"First Sign",         desc:"Completed first sign recognition",  earned:0, total:0, iconBg:"#EDE9FE", barColor:"#7C3AED" },
  { icon:"🔥", name:"7-Day Streak",       desc:"Practiced 7 days in a row",          earned:0, total:0, iconBg:"#FEF3C7", barColor:T.gold    },
  { icon:"🌟", name:"Perfect Score",      desc:"100% accuracy in a session",         earned:0, total:0, iconBg:"#DCFCE7", barColor:T.moss2   },
  { icon:"📚", name:"Module Master",      desc:"Completed an entire module",         earned:0, total:0, iconBg:"#DBEAFE", barColor:"#2563EB" },
  { icon:"🎯", name:"Accuracy Pro",       desc:"Maintained 90%+ for 5 sessions",    earned:0, total:0, iconBg:"#FCE7F3", barColor:"#DB2777" },
  { icon:"🤟", name:"Consistent Learner", desc:"Logged in for 14 consecutive days",  earned:0, total:0, iconBg:"#D1FAE5", barColor:T.moss2   },
];

const DEFAULT_PROGRAM = {
  batchName:"Batch 2026", program:"UB CCELL FSL Program", timezone:"Asia/Manila",
  alertThreshold:3, emailNotifs:true, weeklyReport:true, allowSelfEnroll:true,
};

const navItems = [
  { id:"dashboard",    icon:"🏛️", label:"Dashboard",    section:"Main"     },
  { id:"students",     icon:"👥", label:"Students",     section:"Main",    badge:"0" },
  { id:"modules",      icon:"📚", label:"Modules",      section:"Main"     },
  { id:"sessions",     icon:"▶️",  label:"Sessions",     section:"Main"     },
  { id:"analytics",    icon:"📈", label:"Analytics",    section:"Insights" },
  { id:"achievements", icon:"🏅", label:"Achievements", section:"Insights" },
  { id:"reports",      icon:"📋", label:"Reports",      section:"Insights" },
  { id:"issues",       icon:"🚩", label:"Issue Reports", section:"System"   },
  { id:"reminders",    icon:"🔔", label:"Reminders",    section:"System"   },
  { id:"settings",     icon:"⚙️",  label:"Settings",     section:"System"   },
];

const PAGE_TITLES = {
  dashboard:"Dashboard Overview", students:"Students", modules:"FSL Modules",
  sessions:"Practice Sessions",   analytics:"Analytics", achievements:"Achievements",
  reports:"Reports", issues:"Issue Reports", reminders:"Reminders & Alerts", settings:"Settings",
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
      <td style={{ padding: "10px 10px", fontSize: 11, color: T.muted }}>{s.email}</td>
      <td style={{ padding: "10px 10px" }}><Pill label={s.level} variant={s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
      <td style={{ padding: "10px 10px" }}>
        <ProgressBar pct={s.progress} width="72px" />
        <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.progress}%</div>
      </td>
      <td style={{ padding: "10px 10px", fontSize: 11, color: T.muted }}>{s.lastSeen}</td>
      <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Active" ? "active" : "inactive"} /></td>
    </tr>
  );
}

function ModuleCard({ m, onClick }) {
  return (
    <div className="sc-module-card" onClick={onClick} style={{
      border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
      overflow: "hidden", background: T.surface, transition: "all 0.18s", cursor: "pointer",
    }}>
      <div style={{ height: 3, background: m.stripe }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: m.levelColor, marginBottom: 8 }}>{m.level}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.bark, marginBottom: 4, lineHeight: 1.3 }}>{m.name}</div>
        <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4, marginBottom: 10 }}>{m.desc || "No description."}</div>
        <div style={{ display: "flex", gap: 10, fontSize: 10, color: T.muted, marginBottom: 10 }}>
          <span>📖 {m.lessons} activities</span>
          <span>👥 {m.enrolled} enrolled</span>
        </div>
        {m.status === "Active"
          ? <span style={{ fontSize: 10, background: "#EAF3DE", color: "#1E5C42", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>✓ Published</span>
          : <span style={{ fontSize: 10, background: "#FFF3E0", color: "#8A5C1A", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>📝 Draft</span>
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
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px", fontSize: 10, color: T.muted }}>
        Updated {m.updated}
      </div>
    </div>
  );
}

function BarChart({ data = [], labels = [], maxH = 100 }) {
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: maxH }}>
      {data.length === 0 && <span style={{ fontSize: 12, color: T.muted }}>No data yet.</span>}
      {data.map((v, i) => {
        const isTop = v === max && v > 0;
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
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{r.sub ? `${r.sub} · ` : ""}{r.time}</div>
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
function PageDashboard({ setActivePage, user, students = [], loading, analytics, modules = [], alerts = [], users = [], usersLoading }) {
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Admin";
  const avgProgress = students.length ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length) : 0;
  const withBadges  = students.filter(s => s.score > 0).length;
  const top = students.slice().sort((a, b) => b.score - a.score).slice(0, 3);

  // All Users: kapag hindi pa gumagana ang /api/all-users, students muna ang ipakita
  const allUsers     = users.length ? users : students;
  const facultyCount = allUsers.filter(u => u.role === "faculty").length;
  const roleVariant  = { student: "success", faculty: "info", admin: "warning" };

  const moduleCards   = modules.map(toModuleCard);
  const activeModules = modules.filter(m => m.status === "published").length;
  const unreadAlerts  = alerts.filter(a => !a.read);
  const weekly        = analytics?.weekly ?? { counts: [], labels: [] };

  const activity = students
    .filter(s => s.lastSeenRaw)
    .slice()
    .sort((a, b) => b.lastSeenRaw - a.lastSeenRaw)
    .slice(0, 5)
    .map((s, i) => ({
      dot: AV_COLORS[i % AV_COLORS.length].color,
      text: `${s.name} — ${s.score} sign${s.score === 1 ? "" : "s"} completed`,
      time: s.lastSeen,
    }));

  const linkBtn = { fontSize: 14, color: T.moss2, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: T.fontBody };

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        greeting={new Date().toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        title={`Welcome, Admin ${firstName}!`}
        sub={`${students.length} student${students.length === 1 ? "" : "s"} and ${facultyCount} faculty in Batch 2026.`}
        actions={[<BtnGhost key="b" onClick={() => setActivePage("reports")}>View Reports</BtnGhost>]}
        stats={[{ num:students.length, label:"Students" }, { num:facultyCount, label:"Faculty" }, { num:`${avgProgress}%`, label:"Avg Progress" }]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="👥" value={allUsers.length} label="Total Users" trend={`${students.length} students · ${facultyCount} faculty`} trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📈" value={`${avgProgress}%`} label="Avg Progress" trend="across all students" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="📚" value={activeModules} label="Published Modules" trend={`${modules.length} total modules`} trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="🎯" value={analytics?.sessionsThisMonth ?? 0} label="Practice Sessions" trend="this month" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <Card title="👥 All Users" titleTag="Live" action={<span style={{ fontSize: 12, color: T.muted }}>{allUsers.length} total</span>} noPad>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="sc-card-table">
              <TableHead cols={["User","Role","Level","Progress","Status"]} />
              <tbody>
                {(loading || usersLoading) && allUsers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>Loading users…</td></tr>
                )}
                {!(loading || usersLoading) && allUsers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No users yet.</td></tr>
                )}
                {allUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.bg}`, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9F6F0"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Av initials={u.initials} bg={u.avBg} color={u.avColor} />
                        <div>
                          <div style={{ fontWeight: 700, color: T.bark, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <Pill label={u.role.charAt(0).toUpperCase() + u.role.slice(1)} variant={roleVariant[u.role] || "inactive"} />
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {u.role === "student" ? <Pill label={u.level} variant={u.level === "FSL 1" ? "fsl1" : "fsl2"} /> : <span style={{ color: T.muted }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {u.role === "student"
                        ? <><ProgressBar pct={u.progress} width="72px" /><div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{u.progress}%</div></>
                        : <span style={{ color: T.muted }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 10px" }}><Pill label={u.status} variant={u.status === "Active" ? "active" : "inactive"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="⚡ Activity Feed" titleTag="Live">
            {activity.length === 0
              ? <div style={{ fontSize: 12, color: T.muted }}>No activity yet.</div>
              : <ActivityFeed items={activity} />}
          </Card>
          <Card title="🔔 Reminders" action={<button onClick={() => setActivePage("reminders")} style={linkBtn}>View all →</button>}>
            {unreadAlerts.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No new alerts.</div>}
            {unreadAlerts.slice(0, 3).map(r => (
              <div key={r.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.bg}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.type === "warning" ? T.gold : r.type === "success" ? T.moss2 : "#4A90D9", flexShrink: 0, marginTop: 4 }} />
                <div><div style={{ fontSize: 13, color: T.bark, lineHeight: 1.5 }}>{r.msg}</div><div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{r.time}</div></div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <Card title="📚 Module Overview" action={<button onClick={() => setActivePage("modules")} style={linkBtn}>View all →</button>} noPad>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "14px 18px" }}>
            {moduleCards.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No modules yet.</div>}
            {moduleCards.slice(0, 3).map(m => <ModuleCard key={m.id} m={m} />)}
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="📊 Weekly Engagement" titleTag="Active students">
            <BarChart data={weekly.counts} labels={weekly.labels} maxH={110} />
          </Card>
          <Card title="🏆 Top Performers" action={<button onClick={() => setActivePage("analytics")} style={linkBtn}>Full rankings →</button>}>
            {top.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No students yet.</div>}
            {top.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < top.length - 1 ? `1px solid ${T.bg}` : "none" }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 17, width: 22, textAlign: "center", color: i === 0 ? T.gold : i === 1 ? "#8A9BA8" : "#A0714A" }}>#{i + 1}</span>
                <Av initials={s.initials} bg={s.avBg} color={s.avColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.bark }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{s.lastSeen}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{s.progress}% done</div>
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
function PageStudents({ students = [], loading }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = students.filter(s => {
    const mf = filter === "all" || s.status.toLowerCase() === filter;
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const activeCount   = students.filter(s => s.status === "Active").length;
  const inactiveCount = students.filter(s => s.status === "Inactive").length;
  const avgProgress   = students.length
    ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)
    : 0;

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Manage Learners"
        sub={`${students.length} student${students.length === 1 ? "" : "s"} enrolled in Batch 2026`}
        actions={[<BtnGhost key="b" onClick={() => downloadCSV("students.csv", studentCSVRows(students))}>Export List</BtnGhost>]}
        stats={[{ num:activeCount, label:"Active" }, { num:0, label:"At Risk" }, { num:inactiveCount, label:"Inactive" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="👥" value={students.length} label="Total Students" trend="enrolled in batch"  trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value={activeCount}     label="Active"         trend="active in last 7 days" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⚠️" value={0}               label="At Risk"        trend="missed 3+ days" trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="📈" value={`${avgProgress}%`} label="Avg Progress" trend="across all students" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="All Students" titleTag="Live"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["all","active","inactive"].map(f => <FilterBtn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />)}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…"
              style={{ padding: "5px 12px", border: `1.5px solid ${T.border}`, borderRadius: 99, fontSize: 15, color: T.bark, background: T.bg, fontFamily: T.fontBody, outline: "none" }} />
          </div>
        } noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <TableHead cols={["Student","Email","Level","Progress","Last Seen","Status"]} />
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>Loading students…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No students yet.</td></tr>
            )}
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

// ─── MODULE DETAIL MODAL (activities + enrolled students) ────────────────────
function ModuleDetailModal({ module: m, adminUid, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setData(null);
    fetch(`/api/module-detail?uid=${encodeURIComponent(adminUid)}&id=${encodeURIComponent(m.id)}`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setError("Could not load module details."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [m.id, adminUid]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const activities = data?.activities || [];
  const students = data?.students || [];
  const th = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, fontWeight: 700, padding: "8px 10px", borderBottom: `1px solid ${T.border}`, textAlign: "left" };
  const td = { padding: "9px 10px", fontSize: 12, color: T.bark, borderBottom: `1px solid ${T.bg}` };
  const sectionTitle = { fontSize: 13, fontWeight: 700, color: T.bark, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 };
  const count = { fontSize: 10, background: T.sand, border: `1px solid ${T.border}`, color: T.muted, padding: "2px 8px", borderRadius: 99, fontWeight: 700 };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(42,8,12,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.surface, borderRadius: T.radius, width: "100%", maxWidth: 820, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ height: 4, background: m.stripe }} />
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: m.levelColor, marginBottom: 6 }}>{m.level}</div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 22, color: T.bark, lineHeight: 1.2 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{m.desc || "No description."}</div>
            <div style={{ marginTop: 10 }}>
              <Pill label={m.status === "Active" ? "✓ Published" : "📝 Draft"} variant={m.status === "Active" ? "success" : "warning"} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: T.muted, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "18px 22px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {loading && <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: 20 }}>Loading details…</div>}
          {error && <div style={{ fontSize: 12, color: T.danger, textAlign: "center", padding: 20 }}>⚠️ {error}</div>}

          {data && (
            <>
              <div>
                <div style={sectionTitle}>📖 Activities <span style={count}>{activities.length}</span></div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["#", "Activity", "Type", "Gesture", "Attempts"].map(c => <th key={c} style={th}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {activities.length === 0 && (
                        <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: T.muted }}>No activities yet.</td></tr>
                      )}
                      {activities.map(a => (
                        <tr key={a.id}>
                          <td style={{ ...td, color: T.muted, width: 40 }}>{a.sequenceNo}</td>
                          <td style={{ ...td, fontWeight: 600 }}>{a.title}</td>
                          <td style={td}>{a.activityType}</td>
                          <td style={td}><Pill label={a.expectedGesture} variant="info" /></td>
                          <td style={td}>{a.attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={sectionTitle}>👥 Enrolled Students <span style={count}>{students.length}</span></div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Student", "Proficiency", "Completion", "Accuracy"].map(c => <th key={c} style={th}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {students.length === 0 && (
                        <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: T.muted }}>No students enrolled yet.</td></tr>
                      )}
                      {students.map((s, i) => {
                        const c = AV_COLORS[i % AV_COLORS.length];
                        const initials = s.avatar && s.avatar.length <= 2
                          ? s.avatar
                          : (s.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                        return (
                          <tr key={s.id}>
                            <td style={td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Av initials={initials} bg={c.bg} color={c.color} size={28} />
                                <div>
                                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                                  <div style={{ fontSize: 10, color: T.muted }}>{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={td}>{s.proficiencyLevel}</td>
                            <td style={td}>
                              <ProgressBar pct={s.completionRate} width="80px" />
                              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.completionRate}%</div>
                            </td>
                            <td style={{ ...td, fontWeight: 700, color: AccuracyColor(s.gestureAccuracy) }}>{s.gestureAccuracy}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: MODULES (galing sa database — parehong data ng faculty) ───────────
function PageModules({ modules = [], loading, adminUid }) {
  const [filter, setFilter] = useState("all");
  const [selectedModule, setSelectedModule] = useState(null);
  const MODS = modules.map(toModuleCard);
  const filtered = filter === "all" ? MODS : MODS.filter(m => m.level === filter || m.status.toLowerCase() === filter);

  const activeCount  = MODS.filter(m => m.status === "Active").length;
  const draftCount   = MODS.length - activeCount;
  const totalLessons = MODS.reduce((a, m) => a + m.lessons, 0);
  const levelCount   = new Set(MODS.map(m => m.level)).size;

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="FSL Curriculum"
        sub={`${MODS.length} module${MODS.length === 1 ? "" : "s"} across ${levelCount} level${levelCount === 1 ? "" : "s"} — ${totalLessons} total activities`}
        stats={[{ num:activeCount, label:"Published" }, { num:draftCount, label:"Draft" }, { num:totalLessons, label:"Activities" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="📚" value={MODS.length}  label="Total Modules"    trend={`${levelCount} levels`} trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value={activeCount}  label="Published"        trend="visible to students"    trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="📝" value={draftCount}   label="Draft"            trend="not yet published"      trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="📖" value={totalLessons} label="Total Activities" trend="across all modules"     trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="FSL Modules" titleTag="Live"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {["all","FSL 1","FSL 2","active","locked"].map(f => (
              <FilterBtn key={f} label={f === "all" ? "All" : f === "active" ? "Published" : f === "locked" ? "Draft" : f} active={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        }>
        {loading && MODS.length === 0 && <p style={{ color: T.muted, fontSize: 12 }}>Loading modules…</p>}
        {!loading && filtered.length === 0 && <p style={{ color: T.muted, fontSize: 12 }}>No modules found.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
          {filtered.map(m => <ModuleCard key={m.id} m={m} onClick={() => setSelectedModule(m)} />)}
        </div>
      </Card>
      {selectedModule && (
        <ModuleDetailModal module={selectedModule} adminUid={adminUid} onClose={() => setSelectedModule(null)} />
      )}
    </div>
  );
}

// ─── PAGE: SESSIONS ───────────────────────────────────────────────────────────
function PageSessions() {
  const [filter, setFilter] = useState("all");
  const sessions = []; // TODO: load real practice sessions (practice_sessions table) via a new /api endpoint
  const filtered = filter === "all" ? sessions : sessions.filter(s => s.status.toLowerCase() === filter);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Practice Sessions"
        sub="No sessions recorded yet"
        stats={[{ num:0, label:"Total" }, { num:0, label:"Completed" }, { num:"0m", label:"Avg Duration" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="▶️" value="0"   label="Total Sessions" trend="no data yet" trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value="0"   label="Completed"      trend="no data yet" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⏱️" value="0"   label="Avg Duration"   trend="no data yet" trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="🎯" value="0%"  label="Avg Accuracy"   trend="no data yet" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
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
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No sessions recorded yet.</td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.bg}` }}>
                <td style={{ padding: "10px 10px", fontWeight: 700, color: T.bark }}>{s.student}</td>
                <td style={{ padding: "10px 10px", color: T.muted }}>{s.module}</td>
                <td style={{ padding: "10px 10px", color: T.muted }}>{s.date}</td>
                <td style={{ padding: "10px 10px" }}>{s.duration}</td>
                <td style={{ padding: "10px 10px" }}>{s.signs} signs</td>
                <td style={{ padding: "10px 10px", fontWeight: 700, color: AccuracyColor(s.accuracy) }}>{s.accuracy}%</td>
                <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Completed" ? "completed" : "incomplete"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── PAGE: ANALYTICS ─────────────────────────────────────────────────────────
function PageAnalytics({ students = [], analytics }) {
  const weekly  = analytics?.weekly ?? { counts: [], labels: [] };
  const modComp = analytics?.moduleCompletion ?? [];
  const levels  = analytics?.levelBreakdown ?? [];
  const activeStudents = students.filter(s => s.status === "Active").length;

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Performance Insights"
        sub="Batch 2026 learning trends & metrics"
        stats={[
          { num: analytics?.sessionsThisMonth ?? 0, label: "Sessions" },
          { num: `${analytics?.completionRate ?? 0}%`, label: "Completion" },
          { num: activeStudents, label: "Active" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🎯" value={analytics?.sessionsThisMonth ?? 0} label="Practice Sessions" trend="this month" trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="✅" value={`${analytics?.avgAccuracy ?? 0}%`} label="Avg Accuracy" trend="this month" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="📚" value={`${analytics?.completionRate ?? 0}%`} label="Completion Rate" trend="all students" trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="👥" value={activeStudents} label="Active Students" trend="last 7 days" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Weekly Active Students" titleTag="Live">
          <BarChart data={weekly.counts} labels={weekly.labels} maxH={130} />
        </Card>
        <Card title="Level Breakdown">
          <div style={{ display: "flex", gap: 24, justifyContent: "center", padding: "10px 0" }}>
            {levels.length === 0 && <span style={{ fontSize: 12, color: T.muted }}>No data yet.</span>}
            {levels.map((l, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff",
                  background: i === 0 ? T.goldGrad : "linear-gradient(145deg,#A83245,#6B1A28)" }}>{l.count}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{l.level}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Module Completion">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {modComp.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No modules yet.</div>}
            {modComp.map((m, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: T.bark, fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontWeight: 700, color: T.moss2 }}>{m.pct}%</span>
                </div>
                <ProgressBar pct={m.pct} height={6} color={T.goldGrad} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Top Performers">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {students.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No students yet.</div>}
            {students.slice().sort((a, b) => b.score - a.score).slice(0, 8).map((s, i, arr) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.bg}` : "none" }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 16, width: 22, textAlign: "center", color: i === 0 ? T.gold : i === 1 ? "#8A9BA8" : "#A0714A" }}>#{i + 1}</span>
                <Av initials={s.initials} bg={s.avBg} color={s.avColor} size={28} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.bark }}>{s.name}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: T.muted }}>{s.progress}% done</div>
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
function PageAchievements({ students = [] }) {
  const total     = students.length;
  const firstSign = students.filter(s => s.score > 0).length;
  const finished  = students.filter(s => s.progress >= 100).length;
  const badges = ACHIEVEMENTS_DATA.map(a =>
    a.name === "First Sign"    ? { ...a, earned: firstSign, total } :
    a.name === "Module Master" ? { ...a, earned: finished,  total } :
                                 { ...a, earned: 0,         total }
  );
  const issued = firstSign + finished;
  const awards = students.filter(s => s.score > 0);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Badges & Recognition"
        sub={`${issued} badge${issued === 1 ? "" : "s"} awarded across ${total} student${total === 1 ? "" : "s"}`}
        stats={[{ num: issued, label: "Issued" }, { num: firstSign, label: "First Sign" }, { num: finished, label: "Completed" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🏅" value={issued}    label="Total Badges Issued" trend="all students"    trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📚" value={firstSign} label="First Sign"          trend="started signing" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="🌟" value={finished}  label="Fully Completed"     trend="100% progress"   trendUp accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="👥" value={total}     label="Students"            trend="enrolled"        trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="Achievement Badges">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
          {badges.map(a => (
            <div key={a.name} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.bark }}>{a.name}</div>
                <div style={{ fontSize: 10, color: T.muted, margin: "2px 0 8px", lineHeight: 1.3 }}>{a.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: T.muted }}>Earned by</span>
                  <span style={{ fontWeight: 700, color: a.barColor }}>{a.earned}/{a.total} students</span>
                </div>
                <ProgressBar pct={a.total ? Math.round((a.earned / a.total) * 100) : 0} color={a.barColor} height={5} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Recent Badge Awards" noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <TableHead cols={["Student","Badge","Last Active","Level"]} />
          <tbody>
            {awards.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No badges awarded yet.</td></tr>
            )}
            {awards.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.bg}` }}>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Av initials={s.initials} bg={s.avBg} color={s.avColor} size={28} />
                    <span style={{ fontWeight: 700, color: T.bark }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 10px" }}>{s.progress >= 100 ? "📚 Module Master" : "🏅 First Sign"}</td>
                <td style={{ padding: "10px 10px", color: T.muted }}>{s.lastSeen}</td>
                <td style={{ padding: "10px 10px" }}><Pill label={s.level} variant={s.level === "FSL 1" ? "fsl1" : "fsl2"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── PAGE: REMINDERS (galing sa notification table) ──────────────────────────
function PageReminders({ alerts: dbAlerts = [], adminUid, setAlerts }) {
  const [filter, setFilter] = useState("all");

  const alerts = dbAlerts.map(a => ({ id: a.id, type: a.type, title: a.msg, sub: "", time: a.time, read: a.read }));

  const patch = (body) =>
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: adminUid, ...body }),
    }).catch(() => {});

  const markRead = (id) => { setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a)); patch({ id }); };
  const markAll  = ()   => { setAlerts(p => p.map(a => ({ ...a, read: true }))); patch({ all: true }); };

  const unread   = alerts.filter(a => !a.read).length;
  const filtered = filter === "all" ? alerts : filter === "unread" ? alerts.filter(a => !a.read) : alerts.filter(a => a.type === filter);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Alerts & Notifications"
        sub={`${unread} unread alert${unread === 1 ? "" : "s"} need your attention`}
        actions={[<BtnPrimary key="a" onClick={markAll}>Mark all read</BtnPrimary>]}
        stats={[{ num: alerts.length, label: "Total" }, { num: unread, label: "Unread" }, { num: alerts.filter(a => a.type === "warning").length, label: "Warnings" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🔔" value={alerts.length} label="Total Alerts" trend="all time" trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📬" value={unread} label="Unread" trend="need attention" trendUp={false} accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="⚠️" value={alerts.filter(a => a.type === "warning").length} label="Warnings" trend="at-risk students" trendUp={false} accentColor={`linear-gradient(135deg,${T.clay},${T.clay2})`} iconBg="#FDF0EA" />
        <StatCard icon="✅" value={alerts.filter(a => a.read).length} label="Resolved" trend="marked read" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <Card title="Alerts & Notifications" titleTag="Live"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {["all","unread","warning","info","success"].map(f => <FilterBtn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
        }>
        {filtered.length === 0 && <p style={{ color: T.muted, fontSize: 12 }}>No alerts.</p>}
        {filtered.map(a => <ReminderItem key={a.id} r={a} onRead={markRead} />)}
      </Card>
    </div>
  );
}

// ─── PAGE: REPORTS ────────────────────────────────────────────────────────────
function PageReports({ students = [], analytics }) {
  const weekly  = analytics?.weekly ?? { counts: [], labels: [] };
  const modComp = analytics?.moduleCompletion ?? [];
  const avgProgress = students.length
    ? Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)
    : 0;
  const best = students.slice().sort((a, b) => b.score - a.score)[0];

  const exportProgress = () => downloadCSV("student-progress.csv", studentCSVRows(students));
  const exportModules  = () => downloadCSV("module-completion.csv", [
    ["Module", "Completion %"],
    ...modComp.map(m => [m.label, m.pct]),
  ]);
  const exportBadges   = () => downloadCSV("achievement-summary.csv", [
    ["Name", "Badge", "Last Active"],
    ...students.filter(s => s.score > 0).map(s => [s.name, s.progress >= 100 ? "Module Master" : "First Sign", s.lastSeen]),
  ]);

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Export & Analytics"
        sub="Generate reports for Batch 2026"
        actions={[<BtnPrimary key="a" onClick={exportProgress}>Export All</BtnPrimary>]}
        stats={[{ num: students.length, label: "Students" }, { num: `${avgProgress}%`, label: "Avg Progress" }, { num: analytics?.sessionsThisMonth ?? 0, label: "Sessions" }]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="👥" value={students.length} label="Students Tracked" trend="full batch" trendUp accentColor={T.goldGrad} iconBg="#FFF3E0" />
        <StatCard icon="📈" value={`${avgProgress}%`} label="Avg Progress" trend="across all students" trendUp accentColor={T.mossGrad} iconBg="#E8F2EF" />
        <StatCard icon="🎯" value={`${analytics?.completionRate ?? 0}%`} label="Completion Rate" trend="all students" trendUp accentColor={`linear-gradient(135deg,${T.sage},${T.sage2})`} iconBg="#EAF4F2" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card title="Weekly Engagement" titleTag="Live">
          <BarChart data={weekly.counts} labels={weekly.labels} maxH={130} />
        </Card>
        <Card title="Module Completion">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {modComp.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No modules yet.</div>}
            {modComp.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: T.muted, width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
                <div style={{ flex: 1 }}><ProgressBar pct={m.pct} height={8} /></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.moss2, width: 36, textAlign: "right" }}>{m.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Student Performance Summary" titleTag="Live" noPad>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <TableHead cols={["Student","Level","Progress","Last Seen","Status"]} />
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>No students yet.</td></tr>
            )}
            {students.map(s => (
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
                <td style={{ padding: "10px 10px", color: T.muted }}>{s.lastSeen}</td>
                <td style={{ padding: "10px 10px" }}><Pill label={s.status} variant={s.status === "Active" ? "active" : "inactive"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Export Reports">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[
            { icon:"📊", label:"Student Progress Report",  sub:"CSV", onClick: exportProgress },
            { icon:"📈", label:"Module Completion Report", sub:"CSV", onClick: exportModules  },
            { icon:"🏅", label:"Achievement Summary",       sub:"CSV", onClick: exportBadges   },
          ].map(r => (
            <div key={r.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.bark, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>{r.sub}</div>
              <BtnPrimary onClick={r.onClick} style={{ width: "100%" }}>Download</BtnPrimary>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── ISSUE REPORTS (sent by students & faculty) ──────────────────────────────
function useIssueReports(adminUid) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!adminUid) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/reports?uid=${encodeURIComponent(adminUid)}`);
        if (!res.ok) throw new Error(`Reports API returned ${res.status}`);
        const data = await res.json();
        if (alive) { setReports(data); setError(""); }
      } catch (e) {
        console.error("Failed to load reports", e);
        if (alive) setError("Could not load reports.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [adminUid]);

  return { reports, setReports, loading, error };
}

function fmtReportDate(d) {
  return new Date(d).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function PageIssueReports({ adminUid, reports, setReports, loading, error }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter]     = useState("all");
  const [selectedId, setSelectedId]     = useState(null);
  const [busy, setBusy]                 = useState(false);
  const [actionError, setActionError]   = useState("");

  const openCount     = reports.filter(r => r.status === "open").length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;
  const facultyCount  = reports.filter(r => r.role === "faculty").length;

  const filtered = reports.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (roleFilter === "all" || r.role === roleFilter)
  );
  const selected = reports.find(r => r.id === selectedId) || null;

  const chip = (active) => ({
    padding: "5px 14px", borderRadius: 99,
    border: `1.5px solid ${active ? T.amber600 : T.border}`,
    background: active ? T.amber600 : "transparent",
    color: active ? "#fff" : T.textMuted,
    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  });

  const setStatus = async (r, status) => {
    setBusy(true); setActionError("");
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: adminUid, id: r.id, status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setReports(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      setActionError("Could not update the report.");
    } finally {
      setBusy(false);
    }
  };

  const removeReport = async (r) => {
    if (!window.confirm("Delete this report permanently?")) return;
    setBusy(true); setActionError("");
    try {
      const res = await fetch(`/api/reports?uid=${encodeURIComponent(adminUid)}&id=${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setReports(prev => prev.filter(x => x.id !== r.id));
      setSelectedId(null);
    } catch {
      setActionError("Could not delete the report.");
    } finally {
      setBusy(false);
    }
  };

  const td = { padding: "10px 10px", verticalAlign: "top" };

  return (
    <div className="sc-page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Banner
        title="Issue Reports"
        sub="Problems and feedback sent by students and faculty"
        stats={[
          { num: reports.length, label: "Total" },
          { num: openCount,      label: "Open" },
          { num: resolvedCount,  label: "Resolved" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon="🚩" value={reports.length} label="Total Reports"  trend="all time"        trendUp accentColor={T.amber600} iconBg="#FFF3E0" />
        <StatCard icon="📬" value={openCount}      label="Open"           trend="need attention"  trendUp={false} accentColor={T.danger}   iconBg="#FDF0EA" />
        <StatCard icon="✅" value={resolvedCount}  label="Resolved"       trend="marked resolved" trendUp accentColor={T.success}  iconBg="#E8F2EF" />
        <StatCard icon="🎓" value={facultyCount}   label="From Faculty"   trend="faculty reports" trendUp accentColor={T.blue500}  iconBg="#EAF4F2" />
      </div>

      <Card
        title="Submitted Reports"
        titleTag="Live"
        noPad
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", "open", "resolved"].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={chip(statusFilter === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span style={{ width: 1, background: T.border }} />
            {["all", "student", "faculty"].map(f => (
              <button key={f} onClick={() => setRoleFilter(f)} style={chip(roleFilter === f)}>
                {f === "all" ? "Everyone" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <TableHead cols={["Date", "From", "Role", "Category", "Message", "Status"]} />
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.textMuted, fontSize: 12 }}>Loading reports…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.danger, fontSize: 12 }}>⚠️ {error}</td></tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.textMuted, fontSize: 12 }}>No reports found.</td></tr>
            )}
            {filtered.map(r => (
              <tr
                key={r.id}
                onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                style={{
                  borderBottom: `1px solid ${T.bg}`, cursor: "pointer",
                  background: selectedId === r.id ? "#F9F6F0" : "transparent",
                }}
                onMouseEnter={e => { if (selectedId !== r.id) e.currentTarget.style.background = "#F9F6F0"; }}
                onMouseLeave={e => { if (selectedId !== r.id) e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ ...td, color: T.textMuted, fontSize: 11, whiteSpace: "nowrap" }}>{fmtReportDate(r.createdAt)}</td>
                <td style={td}>
                  <div style={{ fontWeight: 700, color: T.text }}>{r.name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{r.email || "—"}</div>
                </td>
                <td style={td}><Pill label={r.role === "faculty" ? "Faculty" : "Student"} variant={r.role === "faculty" ? "info" : "fsl1"} /></td>
                <td style={{ ...td, color: T.textSub }}>{r.category}</td>
                <td style={{ ...td, color: T.textSub, maxWidth: 280 }}>
                  {r.message.length > 80 ? r.message.slice(0, 80) + "…" : r.message}
                </td>
                <td style={td}><Pill label={r.status === "resolved" ? "Resolved" : "Open"} variant={r.status === "resolved" ? "success" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{selected.category}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {selected.name || "Unknown"} ({selected.role}) · {selected.email || "no email"} · {fmtReportDate(selected.createdAt)}
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted }}>×</button>
          </div>

          <div style={{
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
            padding: "12px 14px", fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {selected.message}
          </div>

          {actionError && <p style={{ fontSize: 12, color: T.danger, margin: "10px 0 0" }}>⚠️ {actionError}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button
              disabled={busy}
              onClick={() => removeReport(selected)}
              style={{ background: "transparent", color: T.danger, border: `1.5px solid ${T.danger}`, borderRadius: T.radiusSm, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}
            >
              Delete
            </button>
            {selected.status === "open" ? (
              <BtnPrimary onClick={() => !busy && setStatus(selected, "resolved")}>✓ Mark as Resolved</BtnPrimary>
            ) : (
              <BtnPrimary onClick={() => !busy && setStatus(selected, "open")}>↺ Reopen</BtnPrimary>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── PAGE: SETTINGS ───────────────────────────────────────────────────────────
function PageSettings({ user, onProfileUpdate }) {
  const { changePassword } = useAuth();
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
  const [pwLoading, setPwLoading] = useState(false);
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

  // Totoong Firebase password change (may re-authentication)
  const handlePasswordSave = async () => {
    if (pwLoading) return;
    setPasswordMsg(""); setPasswordSuccess(false);
    if (!passwordForm.current) { setPasswordMsg("Enter your current password."); return; }
    if (passwordForm.newPass.length < 6) { setPasswordMsg("New password must be at least 6 characters."); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordMsg("Passwords do not match."); return; }
    if (passwordForm.newPass === passwordForm.current) { setPasswordMsg("New password must be different from the current one."); return; }

    setPwLoading(true);
    const result = await changePassword(passwordForm.current, passwordForm.newPass);
    setPwLoading(false);

    if (result.success) {
      setPasswordSuccess(true); setPasswordMsg("Password changed successfully!");
      setPasswordForm({ current:"", newPass:"", confirm:"" });
      setTimeout(() => { setPasswordMsg(""); setPasswordSuccess(false); }, 3000);
    } else {
      setPasswordMsg(result.error);
    }
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
              <BtnPrimary onClick={handlePasswordSave} style={{ opacity: pwLoading ? 0.6 : 1 }}>
                {pwLoading ? "Updating…" : "Change Password"}
              </BtnPrimary>
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

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const adminUid = user?.uid || auth?.currentUser?.uid;
  const { students: studentRows, loading, error: studentsError } = useStudents(adminUid);
  const { users, loading: usersLoading } = useAllUsers(adminUid);

  // Students page = students lang. Kunin ang bilang ng signs mula sa /api/all-users kung 0 ang galing sa /api/students.
  const scoreByEmail = Object.fromEntries(users.map(u => [u.email, u.score]));
  const students = studentRows
    .filter(s => s.role === "student")
    .map(s => ({ ...s, score: s.score > 0 ? s.score : (scoreByEmail[s.email] || 0) }));
  const issues = useIssueReports(adminUid);
  const adminData = useAdminData(adminUid);
  const openReports  = issues.reports.filter(r => r.status === "open").length;
  const unreadAlerts = adminData.alerts.filter(a => !a.read).length;

  const handleProfileUpdate = ({ name, avatar }) => {
    if (name)              setProfileName(name);
    if (avatar !== undefined) setProfileAvatar(avatar);
  };

  // ROUTE GUARD: admin lang ang puwede dito
  useEffect(() => {
    if (!user) { router.push("/"); return; }
    if (role === "student") { router.push("/dashboard/student"); return; }
    if (role === "faculty") { router.push("/dashboard/faculty"); return; }
    if (role !== "admin")   { router.push("/"); return; }
  }, [user]);

  if (!user || !isAdmin) return null;

  const sidebarInitials = profileName
    ? profileName.trim().split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : (user.avatar || "AD");

  const navSections = ["Main","Insights","System"];

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <PageDashboard setActivePage={setActivePage} user={{ ...user, name: profileName }} students={students} loading={loading} analytics={adminData.analytics} modules={adminData.modules} alerts={adminData.alerts} users={users} usersLoading={usersLoading} />;
      case "students":     return <PageStudents students={students} loading={loading} />;
      case "modules":      return <PageModules modules={adminData.modules} loading={adminData.loading} adminUid={adminUid} />;
      case "sessions":     return <PageSessions />;
      case "analytics":    return <PageAnalytics students={students} analytics={adminData.analytics} />;
      case "achievements": return <PageAchievements students={students} />;
      case "reminders":    return <PageReminders alerts={adminData.alerts} adminUid={adminUid} setAlerts={adminData.setAlerts} />;
      case "reports":      return <PageReports students={students} analytics={adminData.analytics} />;
      case "settings":     return <PageSettings user={{ ...user, name:profileName, avatar:profileAvatar }} onProfileUpdate={handleProfileUpdate} />;
      case "issues":       return <PageIssueReports adminUid={adminUid} reports={issues.reports} setReports={issues.setReports} loading={issues.loading} error={issues.error} />;
      default:             return <PageDashboard setActivePage={setActivePage} user={{ ...user, name: profileName }} students={students} loading={loading} analytics={adminData.analytics} modules={adminData.modules} alerts={adminData.alerts} users={users} usersLoading={usersLoading} />;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:T.fontBody, overflow:"hidden" }}>

      {/* ── SIDEBAR — hover to expand ── */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        style={{
          width: sidebarExpanded ? 250 : 110,
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          background: T.sidebarBg,
          display: "flex", flexDirection: "column", flexShrink: 0,
          position: "relative", overflow: "hidden",
        }}
      >

        <div style={{
          padding: sidebarExpanded ? "20px 18px 16px" : "20px 13px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          transition: "padding 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap: sidebarExpanded ? 11 : 0 }}>
            <img src="/ubbg.png" alt="SC" style={{ width:90, height:90, borderRadius:10, objectFit:"cover", flexShrink:0, boxShadow: "none", background: "transparent" }} />
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
                <NavButton
                  key={item.id}
                  item={
                    item.id === "students"    ? { ...item, badge: String(students.length) }
                    : item.id === "issues"    ? { ...item, badge: openReports > 0 ? String(openReports) : undefined }
                    : item.id === "reminders" ? { ...item, badge: unreadAlerts > 0 ? String(unreadAlerts) : undefined }
                    : item
                  }
                  isActive={activePage === item.id}
                  onClick={() => setActivePage(item.id)}
                  expanded={sidebarExpanded}
                />
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
        <div style={{ padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:T.cream, borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, zIndex:50 }}>
          <div>
            <div style={{ fontFamily:T.fontDisplay, fontSize:20, color:T.bark, lineHeight:1 }}>{PAGE_TITLES[activePage]}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>UB CCELL FSL Program — Batch 2026</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div onClick={() => setActivePage("reminders")} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", fontSize:14, color:T.muted }}>
              🔔
              {unreadAlerts > 0 && (
                <div style={{ position:"absolute", top:6, right:6, width:6, height:6, background:T.clay, borderRadius:"50%", border:`1.5px solid ${T.cream}` }} />
              )}
            </div>
            <div onClick={() => setActivePage("settings")} title="Profile & Settings" style={{ width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, background:T.cream, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:T.muted }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
            </div>
          </div>
        </div>
        <div style={{ padding:"22px 24px", flex:1 }}>
          {studentsError && (
            <div style={{ background:"rgba(158,27,34,0.08)", border:`1px solid ${T.danger}`, color:T.danger, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13 }}>
              ⚠️ Could not load students ({studentsError}).
            </div>
          )}
          {renderPage()}
        </div>
      </main>
    </div>
  );
}