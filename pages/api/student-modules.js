// pages/api/student-modules.js
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end();
  }
  try {
    const rows = await prisma.curriculumSyllabus.findMany({
      where: { status: "published" },
      orderBy: { curriculumId: "asc" },
      select: {
        curriculumId: true,
        title: true,
        level: true,
        updatedAt: true,
        moduleActivities: {
          orderBy: { sequenceNo: "asc" },
          select: { activityId: true, title: true, activityType: true, expectedGesture: true, sequenceNo: true },
        },
      },
    });
    return res.status(200).json(
      rows.map((c) => ({
        id: c.curriculumId,
        title: c.title,
        level: c.level,
        lessons: c.moduleActivities.length,
        activities: c.moduleActivities,
        updatedAt: c.updatedAt,
      }))
    );
  } catch (err) {
    console.error("api/student-modules:", err);
    return res.status(500).json({ error: "Server error" });
  }
}