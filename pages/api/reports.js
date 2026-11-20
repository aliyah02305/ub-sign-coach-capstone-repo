import { prisma } from "../../lib/prisma";

async function isAdmin(uid) {
  if (!uid) return false;
  const u = await prisma.user.findUnique({ where: { uid: String(uid) } });
  return !!u && u.role === "admin";
}

export default async function handler(req, res) {
  try {
    // ── Student / Faculty: send a report ──
    if (req.method === "POST") {
      const { uid, name, email, role, category, message } = req.body || {};

      if (!uid || !category || !message || !message.trim()) {
        return res.status(400).json({ error: "Please fill in all required fields." });
      }

      const report = await prisma.report.create({
        data: {
          uid,
          name: name || null,
          email: email || null,
          role: role === "faculty" ? "faculty" : "student",
          category,
          message: message.trim().slice(0, 2000),
        },
      });
      return res.status(201).json(report);
    }

    // ── Admin: list reports ──
    if (req.method === "GET") {
      if (!(await isAdmin(req.query.uid))) {
        return res.status(403).json({ error: "Admins only." });
      }
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(reports);
    }

    // ── Admin: change status ──
    if (req.method === "PATCH") {
      const { uid, id, status } = req.body || {};
      if (!(await isAdmin(uid))) {
        return res.status(403).json({ error: "Admins only." });
      }
      if (!["open", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status." });
      }
      const updated = await prisma.report.update({
        where: { id: Number(id) },
        data: { status },
      });
      return res.status(200).json(updated);
    }

    // ── Admin: delete ──
    if (req.method === "DELETE") {
      const { uid, id } = req.query;
      if (!(await isAdmin(uid))) {
        return res.status(403).json({ error: "Admins only." });
      }
      await prisma.report.delete({ where: { id: Number(id) } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Report error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}