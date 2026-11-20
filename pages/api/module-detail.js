import { prisma } from "../../lib/prisma";

// GET /api/module-detail?uid=<admin or faculty uid>&id=<curriculumId>
// Ibinabalik ang activities at ang mga naka-enroll na students ng isang module.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { uid, id } = req.query;
  if (!uid || !id) return res.status(400).json({ error: "uid and id are required." });

  try {
    const requester = await prisma.user.findUnique({ where: { uid: String(uid) } });
    const role = String(requester?.role || "").toLowerCase();
    if (!requester || !["admin", "faculty"].includes(role)) {
      return res.status(403).json({ error: "Not allowed." });
    }

    const curriculum = await prisma.curriculumSyllabus.findUnique({
      where: { curriculumId: Number(id) },
      include: {
        moduleActivities: {
          orderBy: { sequenceNo: "asc" },
          include: { practiceSessions: { select: { learnerId: true } } },
        },
        performanceProgress: {
          orderBy: { dateRecorded: "desc" },
          include: { learner: true },
        },
      },
    });

    if (!curriculum) return res.status(404).json({ error: "Module not found." });

    const activities = curriculum.moduleActivities.map((a) => ({
      id: a.activityId,
      sequenceNo: a.sequenceNo,
      title: a.title,
      activityType: a.activityType,
      expectedGesture: a.expectedGesture,
      attempts: a.practiceSessions.length,
    }));

    // isang row kada learner (pinakabago ang kinukuha)
    const seen = new Set();
    const students = [];
    for (const p of curriculum.performanceProgress) {
      if (seen.has(p.learnerId)) continue;
      seen.add(p.learnerId);
      students.push({
        id: p.learner.uid,
        name: p.learner.name,
        email: p.learner.email,
        avatar: p.learner.avatar,
        gestureAccuracy: Math.round(p.gestureAccuracy || 0),
        completionRate: Math.round(p.completionRate || 0),
        proficiencyLevel: p.proficiencyLevel,
        lastRecorded: p.dateRecorded,
      });
    }

    return res.status(200).json({
      id: curriculum.curriculumId,
      title: curriculum.title,
      level: curriculum.level,
      description: curriculum.description,
      status: curriculum.status,
      activities,
      students,
    });
  } catch (err) {
    console.error("❌ module-detail error:", err);
    return res.status(500).json({ error: "Failed to load module details." });
  }
}