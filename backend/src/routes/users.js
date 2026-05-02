const express = require("express");
const { Webhook } = require("svix");
const prisma = require("../lib/prisma");
const { requireAuth, requireAuthOrNew, requireRole } = require("../middleware/auth");
const router = express.Router();

// Clerk Webhook - syncs user creation/updates to our DB
router.post(
  "/webhooks/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    let event;
    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      event = wh.verify(req.body, headers);
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      return res.status(400).json({ error: "Webhook verification failed" });
    }

    const { type, data } = event;

    if (type === "user.created" || type === "user.updated") {
      const { id, email_addresses, first_name, last_name, public_metadata } = data;
      const email = email_addresses[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ") || email;
      const role = public_metadata?.role;

      if (!role) {
        return res.status(200).json({ message: "User has no role yet, skipping." });
      }

      await prisma.user.upsert({
        where: { clerkUserId: id },
        create: { clerkUserId: id, name, email, role },
        update: { name, email, role },
      });
    }

    if (type === "user.deleted") {
      await prisma.user
        .delete({ where: { clerkUserId: data.id } })
        .catch(() => {});
    }

    res.status(200).json({ message: "Webhook processed" });
  }
);

// POST /api/users/sync
// Called by the frontend after Clerk sign-up to create the user record in our DB.
// Uses requireAuthOrNew so the route is reachable even when the user doesn't
// exist in our DB yet (which is exactly the case on first sign-up).
router.post("/users/sync", requireAuthOrNew, async (req, res) => {
  try {
    const { role, name, email } = req.body;

    const validRoles = [
      "STUDENT",
      "TRAINER",
      "INSTITUTION",
      "PROGRAMME_MANAGER",
      "MONITORING_OFFICER",
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role: "${role}". Must be one of: ${validRoles.join(", ")}` });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.upsert({
      where: { clerkUserId: req.clerkUserId },
      create: {
        clerkUserId: req.clerkUserId,
        name: name || email,
        email,
        role,
      },
      update: {
        name: name || email,
        role,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/users - List users, optionally filtered by role (PM only)
router.get("/users", requireAuth, requireRole("PROGRAMME_MANAGER", "INSTITUTION"), async (req, res) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, institutionId: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/me - Get current user profile
router.get("/users/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
