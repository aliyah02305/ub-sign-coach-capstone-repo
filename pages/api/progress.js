import { prisma } from "../../lib/prisma"; // same import style as users.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { uid, completed } = req.body || {};
  if (!uid) return res.status(400).json({ error: "uid required" });

  const data = { lastSeen: new Date() };
  if (Array.isArray(completed)) data.completedSigns = completed;

  try {
    await prisma.user.update({ where: { uid }, data });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Progress save error:", err);
    return res.status(500).json({ error: "Could not save progress" });
  }
}