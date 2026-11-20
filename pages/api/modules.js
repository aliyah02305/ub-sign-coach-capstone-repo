// pages/api/modules.js
import { prisma } from "../../lib/prisma";
import { requireFaculty, latestRates } from "../../lib/dashboardHelpers";

const LEVELS = ["FSL 1", "FSL 2"];
const STATUSES = ["draft", "published"];

// Clean the activities sent by the faculty page.
// Each activity = one sign the student must perform to finish the module.
function cleanActivities(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const a of list) {
    const gesture = String(a?.expectedGesture ?? "").trim().toUpperCase().slice(0, 20);
    if (!gesture) continue;
    out.push({
      activityId: a?.activityId ? Number(a.activityId) : null,
      title: String(a?.title || `Sign ${gesture}`).trim().slice(0, 150),
      activityType: String(a?.activityType || "gesture").trim().slice(0, 50),
      expectedGesture: gesture,
    });
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const me = await requireFaculty(req, res);
    if (!me) return;

    if (req.method === "GET") {
      const rows = await prisma.curriculumSyllabus.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          moduleActivities: {
            orderBy: { sequenceNo: "asc" },
            select: { activityId: true, title: true, activityType: true, expectedGesture: true, sequenceNo: true },
          },
          performanceProgress: {
            orderBy: { dateRecorded: "desc" },
            select: { learnerId: true, completionRate: true },
          },
        },
      });

      return res.status(200).json(
        rows.map((c) => {
          const rates = latestRates(c.performanceProgress);
          return {
            id: c.curriculumId,
            title: c.title,
            description: c.description,
            level: c.level,
            status: c.status,
            lessons: c.moduleActivities.length,
            activities: c.moduleActivities,
            enrolled: rates.length,
            completion:
            c.moduleActivities.length > 0 && rates.length
            ? Math.min(100, Math.round(rates.reduce((a, b) => a + b, 0) / rates.length))
            : 0,
            updatedAt: c.updatedAt,
          };
        })
      );
    }

    if (req.method === "POST") {
      const { title, description, level = "FSL 1", status = "draft" } = req.body || {};
      if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
      if (!LEVELS.includes(level)) return res.status(400).json({ error: "Invalid level" });
      if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

      const acts = cleanActivities(req.body?.activities) || [];
      if (status === "published" && acts.length === 0) {
        return res.status(400).json({ error: "Add at least one activity before publishing" });
      }

      const created = await prisma.curriculumSyllabus.create({
        data: {
          facultyId: me.id,
          title: title.trim(),
          description: description || null,
          level,
          status,
          moduleActivities: {
            create: acts.map((a, i) => ({
              title: a.title,
              activityType: a.activityType,
              expectedGesture: a.expectedGesture,
              sequenceNo: i + 1,
            })),
          },
        },
        include: { moduleActivities: true },
      });
      return res.status(201).json(created);
    }

    if (req.method === "PATCH") {
      const { id, title, description, level, status } = req.body || {};
      if (!id) return res.status(400).json({ error: "id is required" });
      if (level && !LEVELS.includes(level)) return res.status(400).json({ error: "Invalid level" });
      if (status && !STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

      const cid = Number(id);
      const acts = cleanActivities(req.body?.activities);

      if (status === "published") {
        const count = acts ? acts.length : await prisma.moduleActivity.count({ where: { curriculumId: cid } });
        if (count === 0) return res.status(400).json({ error: "Add at least one activity before publishing" });
      }

      const data = {};
      if (title !== undefined) data.title = String(title).trim();
      if (description !== undefined) data.description = description || null;
      if (level) data.level = level;
      if (status) data.status = status;

      const updated = await prisma.curriculumSyllabus.update({ where: { curriculumId: cid }, data });

      // Sync activities: keep (and update) the ones that still exist, create new ones,
      // delete the ones the faculty removed.
      if (acts) {
        const existing = await prisma.moduleActivity.findMany({
          where: { curriculumId: cid },
          select: { activityId: true },
        });
        const existingIds = existing.map((e) => e.activityId);
        const keepIds = acts.filter((a) => a.activityId && existingIds.includes(a.activityId)).map((a) => a.activityId);
        const removeIds = existingIds.filter((x) => !keepIds.includes(x));

        if (removeIds.length) {
          await prisma.moduleActivity.deleteMany({ where: { activityId: { in: removeIds } } });
        }

        for (let i = 0; i < acts.length; i++) {
          const a = acts[i];
          const fields = {
            title: a.title,
            activityType: a.activityType,
            expectedGesture: a.expectedGesture,
            sequenceNo: i + 1,
          };
          if (a.activityId && existingIds.includes(a.activityId)) {
            await prisma.moduleActivity.update({ where: { activityId: a.activityId }, data: fields });
          } else {
            await prisma.moduleActivity.create({ data: { curriculumId: cid, ...fields } });
          }
        }
      }

      return res.status(200).json(updated);
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    return res.status(405).end();
  } catch (err) {
    console.error("api/modules:", err);
    return res.status(500).json({ error: "Server error" });
  }
}