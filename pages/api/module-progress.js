// pages/api/module-progress.js
import { prisma } from "../../lib/prisma";

function proficiencyFor(rate) {
  if (rate >= 80) return "Advanced";
  if (rate >= 40) return "Intermediate";
  return "Beginner";
}

// Accuracy of ONE sign = 1 correct out of (1 + wrong attempts before it).
//   0 wrong → 100%, 1 wrong → 50%, 2 wrong → 33% ...
// Never returns 0, because 0 is used to mean "no accuracy data" (old records).
function accuracyFor(wrongAttempts) {
  const wrong = Math.max(0, Math.floor(Number(wrongAttempts) || 0));
  return Math.max(1, Math.round(100 / (1 + wrong)));
}

// Recompute a learner's completion % for one module from the activities they finished,
// save it in performance_progress, and notify the faculty when the module is completed.
async function recompute(learner, curriculum) {
  const cid = curriculum.curriculumId;

  const total = await prisma.moduleActivity.count({ where: { curriculumId: cid } });
  const sessions = total
    ? await prisma.practiceSession.findMany({
        where: { learnerId: learner.id, status: "completed", activity: { curriculumId: cid } },
        select: { activityId: true },
      })
    : [];
  const done = new Set(sessions.map((s) => s.activityId)).size;
  const rate = total ? Math.round((done / total) * 100) : 0;

  const last = await prisma.performanceProgress.findFirst({
    where: { learnerId: learner.id, curriculumId: cid },
    orderBy: { dateRecorded: "desc" },
  });
  const wasComplete = !!last && last.completionRate >= 100;

  const data = {
    completionRate: rate,
    proficiencyLevel: proficiencyFor(rate),
    dateRecorded: new Date(),
  };

  if (last) {
    if (last.completionRate !== rate) {
      await prisma.performanceProgress.update({ where: { progressId: last.progressId }, data });
    }
  } else {
    await prisma.performanceProgress.create({
      data: { learnerId: learner.id, curriculumId: cid, ...data },
    });
  }

  if (rate >= 100 && !wasComplete) {
    await prisma.notification.create({
      data: {
        recipient: curriculum.facultyId,
        notifType: "module_completed",
        message: `${learner.name} completed the module "${curriculum.title}".`,
      },
    });
  }

  return rate;
}

// Retake: delete the student's completed activities for the module (back to 0%)
// and notify the faculty.
async function handleRetake(learner, retakeModuleId) {
  const cid = Number(retakeModuleId);
  if (!cid) return { status: 400, body: { error: "Invalid module id" } };

  const curriculum = await prisma.curriculumSyllabus.findUnique({ where: { curriculumId: cid } });
  if (!curriculum) return { status: 404, body: { error: "Module not found" } };

  // 1) reset the student's practice sessions (this also resets their accuracy for the module)
  await prisma.practiceSession.deleteMany({
    where: { learnerId: learner.id, activity: { curriculumId: cid } },
  });

  // 2) recompute → 0% in performance_progress
  const progress = await recompute(learner, curriculum);

  // 3) notify the faculty
  await prisma.notification.create({
    data: {
      recipient: curriculum.facultyId,
      notifType: "module_retake",
      message: `${learner.name} retook the module "${curriculum.title}".`,
    },
  });

  return { status: 200, body: { ok: true, retake: true, progress: { [cid]: progress } } };
}

export default async function handler(req, res) {
  try {
    // ── GET ?uid=...  → activity ids this student has already completed
    if (req.method === "GET") {
      const uid = String(req.query.uid || "");
      if (!uid) return res.status(400).json({ error: "uid is required" });

      const learner = await prisma.user.findUnique({ where: { uid } });
      if (!learner) return res.status(200).json({ completedActivityIds: [] });

      const sessions = await prisma.practiceSession.findMany({
        where: { learnerId: learner.id, status: "completed" },
        select: { activityId: true },
      });
      return res.status(200).json({
        completedActivityIds: [...new Set(sessions.map((s) => s.activityId))],
      });
    }

    // ── POST
    if (req.method === "POST") {
      const { uid, activityId, activityIds, retakeModuleId, wrongAttempts } = req.body || {};
      if (!uid) return res.status(400).json({ error: "uid is required" });

      const learner = await prisma.user.findUnique({ where: { uid } });
      if (!learner) return res.status(404).json({ error: "User not found" });

      // ── { uid, retakeModuleId } → reset module + notify faculty
      if (retakeModuleId) {
        const r = await handleRetake(learner, retakeModuleId);
        return res.status(r.status).json(r.body);
      }

      // ── { uid, activityId | activityIds, wrongAttempts? } → record completed activities
      const ids = [...new Set((Array.isArray(activityIds) ? activityIds : [activityId]).map(Number).filter(Boolean))];
      if (!ids.length) return res.status(400).json({ error: "activityId is required" });

      const activities = await prisma.moduleActivity.findMany({
        where: { activityId: { in: ids } },
        select: { activityId: true, curriculumId: true },
      });
      if (!activities.length) return res.status(404).json({ error: "Activity not found" });

      const already = await prisma.practiceSession.findMany({
        where: { learnerId: learner.id, status: "completed", activityId: { in: activities.map((a) => a.activityId) } },
        select: { activityId: true },
      });
      const alreadyIds = new Set(already.map((s) => s.activityId));

      // Accuracy is only known for a single live attempt (wrongAttempts is sent).
      // Bulk saves of old progress have no data, so they stay at 0 = "no accuracy data".
      const accuracy = wrongAttempts !== undefined && !Array.isArray(activityIds)
        ? accuracyFor(wrongAttempts)
        : 0;

      const toCreate = activities
        .filter((a) => !alreadyIds.has(a.activityId))
        .map((a) => ({ learnerId: learner.id, activityId: a.activityId, status: "completed", gestureAccuracy: accuracy }));

      if (toCreate.length) {
        await prisma.practiceSession.createMany({ data: toCreate });
      }

      const progress = {};
      const curriculumIds = [...new Set(activities.map((a) => a.curriculumId))];
      for (const cid of curriculumIds) {
        const curriculum = await prisma.curriculumSyllabus.findUnique({ where: { curriculumId: cid } });
        if (curriculum) progress[cid] = await recompute(learner, curriculum);
      }

      return res.status(200).json({ ok: true, progress });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end();
  } catch (err) {
    console.error("api/module-progress:", err);
    return res.status(500).json({ error: "Server error" });
  }
}