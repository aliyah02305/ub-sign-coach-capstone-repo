// pages/api/analytics.js
import { prisma } from "../../lib/prisma";
import { requireFaculty, getStudentStats, latestRates, dayKey } from "../../lib/dashboardHelpers";

const PH_OFFSET = 8 * 60 * 60 * 1000;
const W_COMPLETION = 0.5;
const W_ACCURACY = 0.5;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }
    const me = await requireFaculty(req, res);
    if (!me) return;

    const students = await getStudentStats();

    // active students per day, last 7 days
    const keys = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const t = Date.now() - i * 86400000;
      keys.push(dayKey(t));
      labels.push(new Date(t + PH_OFFSET).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }));
    }
    const weekStart = new Date(Date.now() - 7 * 86400000);
    const weekSessions = await prisma.practiceSession.findMany({
      where: { sessionDate: { gte: weekStart } },
      select: { learnerId: true, sessionDate: true },
    });
    const perDay = keys.map(() => new Set());
    for (const s of weekSessions) {
      const i = keys.indexOf(dayKey(s.sessionDate));
      if (i >= 0) perDay[i].add(s.learnerId);
    }

    // this month
    const ph = new Date(Date.now() + PH_OFFSET);
    const monthStart = new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), 1) - PH_OFFSET);
    const [monthCount, monthAcc] = await Promise.all([
      prisma.practiceSession.count({ where: { sessionDate: { gte: monthStart } } }),
      prisma.practiceSession.aggregate({
        where: { sessionDate: { gte: monthStart }, gestureAccuracy: { gt: 0 } },
        _avg: { gestureAccuracy: true },
      }),
    ]);

    // completion per module
    const curricula = await prisma.curriculumSyllabus.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        performanceProgress: { orderBy: { dateRecorded: "desc" }, select: { learnerId: true, completionRate: true } },
      },
    });
    const moduleCompletion = curricula.map((c) => {
      const r = latestRates(c.performanceProgress);
      return { label: c.title, pct: r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0 };
    });

    const completionRate = students.length
      ? Math.round(students.reduce((a, s) => a + s.completion, 0) / students.length)
      : 0;

    // ranking: 50% completion + 50% accuracy
    // completion = average progress over all published modules (s.completion)
    // accuracy = avg of non-zero gestureAccuracy (s.accuracy)
    const ranked = students
      .map((s) => {
        const completion = s.completion;
        const accuracy = s.accuracy;
        const score = Math.round(W_COMPLETION * completion + W_ACCURACY * accuracy);
        return { id: s.id, name: s.name, completion, accuracy, score };
      })
      .sort((a, b) =>
        b.score - a.score ||
        b.completion - a.completion ||
        b.accuracy - a.accuracy ||
        String(a.name).localeCompare(String(b.name))
      )
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return res.status(200).json({
      weekly: { labels, counts: perDay.map((s) => s.size) },
      moduleCompletion,
      levelBreakdown: ["FSL 1", "FSL 2"].map((level) => ({ level, count: students.filter((s) => s.level === level).length })),
      topStudents: ranked, // lahat ng students, hindi na top 5
      sessionsThisMonth: monthCount,
      avgAccuracy: Math.round(monthAcc._avg.gestureAccuracy || 0),
      completionRate,
    });
  } catch (err) {
    console.error("api/analytics:", err);
    return res.status(500).json({ error: "Server error" });
  }
}