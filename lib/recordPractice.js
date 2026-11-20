// lib/recordPractice.js
// Call this from pages/api/progress.js every time a student finishes a sign.
// It fills practice_sessions, performance_progress and (when a module is done) notification,
// which is what the faculty dashboard reads.
import { prisma } from "./prisma";

export async function recordPractice({ uid, letter, accuracy = 100, completedCount }) {
  const learner = await prisma.user.findUnique({ where: { uid } });
  if (!learner) return;

  const curriculum = await prisma.curriculumSyllabus.findFirst({
    where: { title: "Alphabet" },
    include: { moduleActivities: true },
  });
  if (!curriculum) return; // run prisma/seed-modules.js first

  const activity = curriculum.moduleActivities.find((a) => a.expectedGesture === letter);
  if (activity) {
    await prisma.practiceSession.create({
      data: { learnerId: learner.id, activityId: activity.activityId, gestureAccuracy: accuracy, status: "passed" },
    });
  }

  const total = curriculum.moduleActivities.length || 26;
  const done = completedCount ?? (Array.isArray(learner.completedSigns) ? learner.completedSigns.length : 0);
  const rate = Math.min(100, Math.round((done / total) * 100));

  const avg = await prisma.practiceSession.aggregate({
    where: { learnerId: learner.id, activity: { curriculumId: curriculum.curriculumId } },
    _avg: { gestureAccuracy: true },
  });
  const proficiencyLevel = rate >= 80 ? "Advanced" : rate >= 40 ? "Intermediate" : "Beginner";
  const data = {
    completionRate: rate,
    gestureAccuracy: avg._avg.gestureAccuracy ?? accuracy,
    proficiencyLevel,
    dateRecorded: new Date(),
  };

  const last = await prisma.performanceProgress.findFirst({
    where: { learnerId: learner.id, curriculumId: curriculum.curriculumId },
    orderBy: { dateRecorded: "desc" },
  });
  if (last) {
    await prisma.performanceProgress.update({ where: { progressId: last.progressId }, data });
  } else {
    await prisma.performanceProgress.create({
      data: { learnerId: learner.id, curriculumId: curriculum.curriculumId, ...data },
    });
  }

  // tell the faculty when a student finishes the whole module
  if (rate >= 100 && (!last || last.completionRate < 100)) {
    await prisma.notification.create({
      data: {
        recipient: curriculum.facultyId,
        notifType: "success",
        message: `${learner.name} completed the ${curriculum.title} module`,
      },
    });
  }
}