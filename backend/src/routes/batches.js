const express = require("express");
const { nanoid } = require("nanoid");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/batches - Create a new batch (Trainer or Institution)
router.post(
  "/batches",
  requireAuth,
  requireRole("TRAINER", "INSTITUTION"),
  async (req, res) => {
    try {
      const { name, institutionId } = req.body;

      if (!name) return res.status(400).json({ error: "Batch name is required" });

      let resolvedInstitutionId = institutionId;

      // Institution admin creates batch under their institution
      if (req.user.role === "INSTITUTION") {
        resolvedInstitutionId = req.user.institutionId;
        if (!resolvedInstitutionId) {
          return res
            .status(400)
            .json({ error: "Institution admin is not linked to any institution" });
        }
      }

      if (!resolvedInstitutionId) {
        return res.status(400).json({ error: "institutionId is required" });
      }

      const batch = await prisma.batch.create({
        data: {
          name,
          institutionId: resolvedInstitutionId,
          // Auto-add trainer to batch if created by trainer
          ...(req.user.role === "TRAINER" && {
            trainers: { create: { trainerId: req.user.id } },
          }),
        },
        include: { institution: true, trainers: { include: { trainer: true } } },
      });

      res.status(201).json(batch);
    } catch (error) {
      console.error("Create batch error:", error);
      res.status(500).json({ error: "Failed to create batch" });
    }
  }
);

// GET /api/batches - List batches visible to current user
router.get("/batches", requireAuth, async (req, res) => {
  try {
    let batches;
    const { role, id, institutionId } = req.user;

    if (role === "TRAINER") {
      batches = await prisma.batch.findMany({
        where: { trainers: { some: { trainerId: id } } },
        include: {
          institution: true,
          trainers: { include: { trainer: { select: { id: true, name: true } } } },
          _count: { select: { students: true, sessions: true } },
        },
      });
    } else if (role === "INSTITUTION") {
      batches = await prisma.batch.findMany({
        where: { institutionId: institutionId },
        include: {
          institution: true,
          trainers: { include: { trainer: { select: { id: true, name: true } } } },
          _count: { select: { students: true, sessions: true } },
        },
      });
    } else if (role === "STUDENT") {
      batches = await prisma.batch.findMany({
        where: { students: { some: { studentId: id } } },
        include: {
          institution: true,
          _count: { select: { students: true, sessions: true } },
        },
      });
    } else {
      // Programme Manager and Monitoring Officer see all
      batches = await prisma.batch.findMany({
        include: {
          institution: true,
          trainers: { include: { trainer: { select: { id: true, name: true } } } },
          _count: { select: { students: true, sessions: true } },
        },
      });
    }

    res.json(batches);
  } catch (error) {
    console.error("List batches error:", error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

// POST /api/batches/:id/invite - Generate invite link (Trainer)
router.post(
  "/batches/:id/invite",
  requireAuth,
  requireRole("TRAINER", "INSTITUTION"),
  async (req, res) => {
    try {
      const batch = await prisma.batch.findUnique({
        where: { id: req.params.id },
        include: { trainers: true },
      });

      if (!batch) return res.status(404).json({ error: "Batch not found" });

      // Trainer must be assigned to the batch
      if (
        req.user.role === "TRAINER" &&
        !batch.trainers.some((bt) => bt.trainerId === req.user.id)
      ) {
        return res.status(403).json({ error: "You are not a trainer for this batch" });
      }

      // Generate a unique invite code
      const inviteCode = nanoid(10);

      const updated = await prisma.batch.update({
        where: { id: req.params.id },
        data: { inviteCode },
      });

      const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const inviteLink = `${baseUrl}/join/${inviteCode}`;

      res.json({
        inviteCode,
        inviteLink,
        batchId: batch.id,
        batchName: batch.name,
      });
    } catch (error) {
      console.error("Generate invite error:", error);
      res.status(500).json({ error: "Failed to generate invite link" });
    }
  }
);

// POST /api/batches/:id/join - Student joins via invite link
router.post(
  "/batches/:id/join",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const { inviteCode } = req.body;

      const batch = await prisma.batch.findFirst({
        where: { id: req.params.id, inviteCode },
      });

      if (!batch) {
        return res.status(404).json({ error: "Invalid batch or invite code" });
      }

      // Check if student already in batch
      const existing = await prisma.batchStudent.findUnique({
        where: {
          batchId_studentId: { batchId: batch.id, studentId: req.user.id },
        },
      });

      if (existing) {
        return res.status(409).json({ error: "You are already in this batch" });
      }

      await prisma.batchStudent.create({
        data: { batchId: batch.id, studentId: req.user.id },
      });

      res.status(201).json({ message: "Successfully joined batch", batch });
    } catch (error) {
      console.error("Join batch error:", error);
      res.status(500).json({ error: "Failed to join batch" });
    }
  }
);

// GET /api/batches/join/:inviteCode - Look up batch by invite code (for join page)
router.get("/batches/join/:inviteCode", requireAuth, async (req, res) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { inviteCode: req.params.inviteCode },
      include: { institution: true, _count: { select: { students: true } } },
    });

    if (!batch) return res.status(404).json({ error: "Invalid invite link" });

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: "Failed to look up batch" });
  }
});

// GET /api/batches/:id/summary - Attendance summary for a batch (Institution+)
router.get(
  "/batches/:id/summary",
  requireAuth,
  requireRole("INSTITUTION", "PROGRAMME_MANAGER", "MONITORING_OFFICER"),
  async (req, res) => {
    try {
      const batch = await prisma.batch.findUnique({
        where: { id: req.params.id },
        include: {
          institution: true,
          sessions: {
            include: {
              attendance: true,
              _count: { select: { attendance: true } },
            },
          },
          students: { include: { student: { select: { id: true, name: true, email: true } } } },
        },
      });

      if (!batch) return res.status(404).json({ error: "Batch not found" });

      // Institution role can only see their own batches
      if (
        req.user.role === "INSTITUTION" &&
        batch.institutionId !== req.user.institutionId
      ) {
        return res.status(403).json({ error: "Access denied to this batch" });
      }

      const totalSessions = batch.sessions.length;
      const studentSummaries = batch.students.map(({ student }) => {
        const attended = batch.sessions.reduce((count, session) => {
          const record = session.attendance.find((a) => a.studentId === student.id);
          return count + (record && record.status !== "ABSENT" ? 1 : 0);
        }, 0);

        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
          attended,
          totalSessions,
          attendanceRate:
            totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
        };
      });

      const overallRate =
        studentSummaries.length > 0
          ? Math.round(
              studentSummaries.reduce((sum, s) => sum + s.attendanceRate, 0) /
                studentSummaries.length
            )
          : 0;

      res.json({
        batchId: batch.id,
        batchName: batch.name,
        institution: batch.institution.name,
        totalSessions,
        totalStudents: batch.students.length,
        overallAttendanceRate: overallRate,
        students: studentSummaries,
      });
    } catch (error) {
      console.error("Batch summary error:", error);
      res.status(500).json({ error: "Failed to fetch batch summary" });
    }
  }
);

module.exports = router;
