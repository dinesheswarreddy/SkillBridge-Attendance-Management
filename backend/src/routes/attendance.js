const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/attendance/mark - Student marks their own attendance
router.post(
  "/attendance/mark",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const { sessionId, status } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const validStatuses = ["PRESENT", "LATE"];
      const attendanceStatus = validStatuses.includes(status) ? status : "PRESENT";

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { batch: { include: { students: true } } },
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify student is enrolled in this session's batch
      const isEnrolled = session.batch.students.some(
        (bs) => bs.studentId === req.user.id
      );

      if (!isEnrolled) {
        return res.status(403).json({ error: "You are not enrolled in this session's batch" });
      }

      // Check if session date is today or in the past (can't mark future sessions)
      const sessionDate = new Date(session.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (sessionDate > today) {
        return res.status(400).json({ error: "Cannot mark attendance for a future session" });
      }

      // Upsert attendance record (student can update from LATE to PRESENT etc.)
      const attendance = await prisma.attendance.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: req.user.id },
        },
        create: {
          sessionId,
          studentId: req.user.id,
          status: attendanceStatus,
        },
        update: {
          status: attendanceStatus,
          markedAt: new Date(),
        },
      });

      res.status(201).json(attendance);
    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({ error: "Failed to mark attendance" });
    }
  }
);

// GET /api/attendance/my - Student views their own attendance history
router.get("/attendance/my", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: { studentId: req.user.id },
      include: {
        session: {
          include: {
            batch: true,
            trainer: { select: { name: true } },
          },
        },
      },
      orderBy: { markedAt: "desc" },
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

module.exports = router;
