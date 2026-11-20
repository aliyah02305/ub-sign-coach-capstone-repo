// pages/api/notifications.js
import { prisma } from "../../lib/prisma";
import { requireFaculty, ago } from "../../lib/dashboardHelpers";

export default async function handler(req, res) {
  try {
    const me = await requireFaculty(req, res);
    if (!me) return;

    if (req.method === "GET") {
      const rows = await prisma.notification.findMany({
        where: { recipient: me.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.status(200).json(
        rows.map((n) => ({
          id: n.notificationId,
          type: ["warning", "info", "success"].includes(n.notifType) ? n.notifType : "info",
          msg: n.message,
          time: ago(n.createdAt),
          read: n.isRead,
        }))
      );
    }

    if (req.method === "PATCH") {
      const { id, all } = req.body || {};
      const where = all ? { recipient: me.id, isRead: false } : { recipient: me.id, notificationId: Number(id) };
      await prisma.notification.updateMany({ where, data: { isRead: true } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).end();
  } catch (err) {
    console.error("api/notifications:", err);
    return res.status(500).json({ error: "Server error" });
  }
}