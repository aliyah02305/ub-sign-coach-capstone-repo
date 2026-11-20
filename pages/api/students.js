// pages/api/students.js
import { requireFaculty, getStudentStats } from "../../lib/dashboardHelpers";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }
    const me = await requireFaculty(req, res);
    if (!me) return;
    return res.status(200).json(await getStudentStats());
  } catch (err) {
    console.error("api/students:", err);
    return res.status(500).json({ error: "Server error" });
  }
}