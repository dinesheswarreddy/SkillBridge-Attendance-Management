const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/sessions - Create a session (Trainer only)
router.post(
  "/sessions",
  requireAuth,
  requireRole("TRAINER"),
  async (req, res) => {
    try {
      const { batchId, title, date, startTime, endTime } = req.body;

      if (!batchId || !title || !date || !startTime || !endTime) {
        return res.status(400).json({ error: "All fields are required: batchId, title, date, startTime, endTime" });
      }

      // Verify trainer belongs to this batch
      const batchTrainer = await prisma.batchTrainer.findUnique({
        where: {
          batchId_trainerId: { batchId, trainerId: req.user.id },
        },
      });

      if (!batchTrainer) {
        return res.status(403).json({ error: "You are not a trainer for this batch" });
      }

      const session = await prisma.session.create({
        data: {
          batchId,
          trainerId: req.user.id,
          title,
          date: new Date(date),
          startTime,
          endTime,
        },
        include: {
          batch: true,
          trainer: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(session);
    } catch (error) {
      console.error("Create session error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  }
);

// GET /api/sessions - List sessions visible to current user
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const { role, id } = req.user;
    let sessions;

    if (role === "TRAINER") {
      sessions = await prisma.session.findMany({
        where: { trainerId: id },
        include: {
          batch: { include: { institution: true } },
          trainer: { select: { id: true, name: true } },
          _count: { select: { attendance: true } },
        },
        orderBy: { date: "desc" },
      });
    } else if (role === "STUDENT") {
      // Student sees sessions for batches they're enrolled in
      const studentBatches = await prisma.batchStudent.findMany({
        where: { studentId: id },
        select: { batchId: true },
      });
      const batchIds = studentBatches.map((b) => b.batchId);

      sessions = await prisma.session.findMany({
        where: { batchId: { in: batchIds } },
        include: {
          batch: true,
          trainer: { select: { id: true, name: true } },
          attendance: { where: { studentId: id } },
        },
        orderBy: { date: "desc" },
      });
    } else {
      // Institution / PM / MO see all
      sessions = await prisma.session.findMany({
        include: {
          batch: { include: { institution: true } },
          trainer: { select: { id: true, name: true } },
          _count: { select: { attendance: true } },
        },
        orderBy: { date: "desc" },
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/sessions/:id - Get single session
router.get("/sessions/:id", requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { include: { institution: true } },
        trainer: { select: { id: true, name: true } },
        attendance: { include: { student: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!session) return res.status(404).json({ error: "Session not found" });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// GET /api/sessions/:id/attendance - Full attendance for a session (Trainer+)
router.get(
  "/sessions/:id/attendance",
  requireAuth,
  requireRole("TRAINER", "INSTITUTION", "PROGRAMME_MANAGER", "MONITORING_OFFICER"),
  async (req, res) => {
    try {
      const session = await prisma.session.findUnique({
        where: { id: req.params.id },
        include: {
          batch: {
            include: {
              students: {
                include: {
                  student: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          attendance: {
            include: {
              student: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!session) return res.status(404).json({ error: "Session not found" });

      // Trainer can only view their own sessions
      if (req.user.role === "TRAINER" && session.trainerId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Build full attendance list (enrolled students + their status)
      const attendanceMap = new Map(session.attendance.map((a) => [a.studentId, a]));

      const fullAttendance = session.batch.students.map(({ student }) => ({
        studentId: student.id,
        name: student.name,
        email: student.email,
        status: attendanceMap.get(student.id)?.status || "ABSENT",
        markedAt: attendanceMap.get(student.id)?.markedAt || null,
      }));

      const presentCount = fullAttendance.filter((a) => a.status !== "ABSENT").length;

      res.json({
        sessionId: session.id,
        title: session.title,
        date: session.date,
        batchName: session.batch.name,
        totalStudents: fullAttendance.length,
        presentCount,
        attendanceRate:
          fullAttendance.length > 0
            ? Math.round((presentCount / fullAttendance.length) * 100)
            : 0,
        attendance: fullAttendance,
      });
    } catch (error) {
      console.error("Session attendance error:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);

module.exports = router;
