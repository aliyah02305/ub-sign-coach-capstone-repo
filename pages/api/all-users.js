// pages/api/users.js — listahan ng LAHAT ng user (admin, faculty, student). Admin lang.
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const uid = String(req.query.uid || "");
  if (!uid) return res.status(401).json({ error: "UID is required." });

  try {
    const me = await prisma.user.findUnique({ where: { uid } });
    if (!me || String(me.role).toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admins only." });
    }

    const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

    const users = rows.map((u) => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      level: u.level,
      avatar: u.avatar,
      completedSigns: u.completedSigns,
      lastSeen: u.lastSeen,
      createdAt: u.createdAt,
    }));

    return res.status(200).json(users);
  } catch (err) {
    console.error("❌ GET /api/users failed:", err);
    return res.status(500).json({ error: "Error fetching users." });
  }
}