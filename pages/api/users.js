import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  // 1. POST Request: Pag-create ng new user profile
  if (req.method === "POST") {
    const { uid, name, email, role, level, avatar } = req.body;

    // Validation: Siguraduhing kumpleto ang required fields
    if (!uid || !email || !name) {
      return res.status(400).json({ error: "Missing required fields (uid, email, name)." });
    }

    try {
      const user = await prisma.user.create({
        data: {
          uid,
          name,
          email,
          role: role || "Student", // Default value kung walang ipinasa
          level: level || null,
          avatar: avatar || null,
        },
      });

      return res.status(200).json(user);
    } catch (err) {
      console.error("❌ Prisma Database Error:", err);

      // Unique Constraint Violation Error Code sa Prisma (halimbawa: duplicated email/uid)
      if (err.code === "P2002") {
        return res.status(400).json({
          error: "An account with this email or UID already exists in the database.",
        });
      }

      return res.status(500).json({
        error: "Failed to save profile.",
        details: err.message,
      });
    }
  }

  // 2. GET Request: Pagkuha ng user profile gamit ang UID
  if (req.method === "GET") {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { uid: String(uid) },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.status(200).json(user);
    } catch (err) {
      console.error("❌ Prisma Fetch Error:", err);
      return res.status(500).json({ error: "Error fetching user data." });
    }
  }

  // 3. Kapag hindi POST o GET ang HTTP Method
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}