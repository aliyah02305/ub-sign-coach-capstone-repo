import { prisma } from "../../lib/prisma"; // same import style as users.js
import { recordPractice } from "../../lib/recordPractice";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { uid, completed, accuracy } = req.body || {};
  if (!uid) return res.status(400).json({ error: "uid required" });

  const data = { lastSeen: new Date() };
  if (Array.isArray(completed)) data.completedSigns = completed;

  try {
    // what was saved before, so we know which letters are NEW this time
    const before = await prisma.user.findUnique({ where: { uid }, select: { completedSigns: true } });

    await prisma.user.update({ where: { uid }, data });

    // log every newly completed letter for the faculty dashboard
    // (practice_sessions, performance_progress, notification). A failure here never breaks the save.
    if (Array.isArray(completed)) {
      const old = Array.isArray(before?.completedSigns) ? before.completedSigns : [];
      const fresh = completed.filter((letter) => !old.includes(letter));
      const acc = Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy)) : 100;

      for (const letter of fresh) {
        try {
          await recordPractice({ uid, letter, accuracy: acc, completedCount: completed.length });
        } catch (e) {
          console.error("recordPractice error:", e);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Progress save error:", err);
    return res.status(500).json({ error: "Could not save progress" });
  }
}