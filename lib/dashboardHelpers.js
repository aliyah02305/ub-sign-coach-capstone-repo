// lib/dashboardHelpers.js
// Shared helpers for the faculty dashboard API routes.
import { prisma } from "./prisma";

const PH_OFFSET = 8 * 60 * 60 * 1000; // Philippines = UTC+8, no daylight saving

// "2026-11-03" in Philippine time
export const dayKey = (d) => new Date(new Date(d).getTime() + PH_OFFSET).toISOString().slice(0, 10);

export const ago = (d) => {
  if (!d) return "Never";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

// "FSL Level 1 Student" -> "FSL 1"
export const levelLabel = (level) => (/2/.test(level || "") ? "FSL 2" : "FSL 1");

// rows must be ordered by dateRecorded DESC. Returns the newest completionRate of each learner.
export const latestRates = (rows) => {
  const seen = new Map();
  for (const p of rows) if (!seen.has(p.learnerId)) seen.set(p.learnerId, p.completionRate);
  return [...seen.values()];
};

// Only faculty/admin accounts may call the dashboard APIs.
// NOTE: uid comes from the browser. For production, verify the Firebase ID token with firebase-admin.
export async function requireFaculty(req, res) {
  const uid = req.query.uid || (req.body && req.body.uid);
  if (!uid) { res.status(401).json({ error: "uid is required" }); return null; }
  const me = await prisma.user.findUnique({ where: { uid: String(uid) } });
  if (!me || !["faculty", "admin"].includes(me.role)) {
    res.status(403).json({ error: "Faculty only" });
    return null;
  }
  return me;
}

const TOTAL_SIGNS = 26;

// One row per student with progress, streak, score, accuracy, status.
export async function getStudentStats() {
  const students = await prisma.user.findMany({ where: { role: "student" }, orderBy: { createdAt: "asc" } });
  if (!students.length) return [];

  const ids = students.map((s) => s.id);
  const since = new Date(Date.now() - 60 * 86400000);

  const [sessions, progress, curricula] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { learnerId: { in: ids }, sessionDate: { gte: since } },
      select: { learnerId: true, sessionDate: true, gestureAccuracy: true },
    }),
    prisma.performanceProgress.findMany({
      where: { learnerId: { in: ids } },
      orderBy: { dateRecorded: "desc" },
      select: { learnerId: true, curriculumId: true, completionRate: true },
    }),
    prisma.curriculumSyllabus.findMany({
      include: {
        performanceProgress: { orderBy: { dateRecorded: "desc" }, select: { learnerId: true, completionRate: true } },
      },
    }),
  ]);

  // Only published modules count toward completion (drafts are ignored).
  const isPublished = (c) => (c.status ? String(c.status).toLowerCase() === "published" : true);
  // For each published module: Map<learnerId, newest completionRate>
  const rateByModule = curricula.filter(isPublished).map((c) => {
    const m = new Map();
    for (const p of c.performanceProgress) if (!m.has(p.learnerId)) m.set(p.learnerId, p.completionRate);
    return m;
  });

  return students.map((s) => {
    const mine = sessions.filter((x) => x.learnerId === s.id);

    // progress = signs completed on the student dashboard (completedSigns) out of 26
    const signs = Array.isArray(s.completedSigns) ? s.completedSigns.length : 0;
    const pct = Math.min(100, Math.round((signs / TOTAL_SIGNS) * 100));

    // completion = average progress over ALL published modules (a module the student
    // has not started counts as 0), so 100% only when every module is finished
    const rates = rateByModule.map((m) => Math.min(100, Math.max(0, m.get(s.id) || 0)));
    const completion = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

    // old average (kept as-is in case other pages still use it)
    const score = mine.length ? Math.round(mine.reduce((a, x) => a + x.gestureAccuracy, 0) / mine.length) : 0;

    // accuracy = average of sessions that actually have accuracy data (0 means "no data")
    const scored = mine.filter((x) => x.gestureAccuracy > 0);
    const accuracy = scored.length
      ? Math.round(scored.reduce((a, x) => a + x.gestureAccuracy, 0) / scored.length)
      : 0;

    const days = new Set(mine.map((x) => dayKey(x.sessionDate)));
    let streak = 0;
    let cursor = Date.now();
    if (!days.has(dayKey(cursor))) cursor -= 86400000;
    while (days.has(dayKey(cursor))) { streak++; cursor -= 86400000; }

    const latestSession = mine.reduce((m, x) => (!m || x.sessionDate > m ? x.sessionDate : m), null);
    const last = s.lastSeen || latestSession || null;
    const daysAgo = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
    const status = daysAgo <= 3 ? "active" : daysAgo <= 7 ? "at-risk" : "inactive";

    // modules finished = curricula whose newest completion rate is 100
    const seen = new Map();
    for (const p of progress) if (p.learnerId === s.id && !seen.has(p.curriculumId)) seen.set(p.curriculumId, p.completionRate);
    const modules = [...seen.values()].filter((r) => r >= 100).length;

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      level: levelLabel(s.level),
      progress: pct,
      completion,
      streak,
      score,
      accuracy,
      modules,
      status,
      lastSeen: ago(last),
      joined: fmtDate(s.createdAt),
    };
  });
}