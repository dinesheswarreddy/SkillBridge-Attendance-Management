const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/institutions - Create institution (for seeding / admin setup)
router.post(
  "/institutions",
  requireAuth,
  requireRole("PROGRAMME_MANAGER"),
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Institution name required" });

      const institution = await prisma.institution.create({ data: { name } });
      res.status(201).json(institution);
    } catch (error) {
      res.status(500).json({ error: "Failed to create institution" });
    }
  }
);

// GET /api/institutions - List all institutions
router.get(
  "/institutions",
  requireAuth,
  requireRole("INSTITUTION", "PROGRAMME_MANAGER", "MONITORING_OFFICER"),
  async (req, res) => {
    try {
      const institutions = await prisma.institution.findMany({
        include: {
          _count: { select: { batches: true, admins: true } },
        },
      });
      res.json(institutions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch institutions" });
    }
  }
);

// POST /api/institutions/:id/assign-user - Assign institution admin or trainer to institution
router.post(
  "/institutions/:id/assign-user",
  requireAuth,
  requireRole("PROGRAMME_MANAGER"),
  async (req, res) => {
    try {
      const { userId } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { institutionId: req.params.id },
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign user to institution" });
    }
  }
);

// GET /api/institutions/:id/summary - Attendance summary across all batches (PM/MO/Institution)
router.get(
  "/institutions/:id/summary",
  requireAuth,
  requireRole("INSTITUTION", "PROGRAMME_MANAGER", "MONITORING_OFFICER"),
  async (req, res) => {
    try {
      const institution = await prisma.institution.findUnique({
        where: { id: req.params.id },
        include: {
          batches: {
            include: {
              sessions: {
                include: { attendance: true },
              },
              students: true,
              trainers: { include: { trainer: { select: { id: true, name: true } } } },
            },
          },
        },
      });

      if (!institution) return res.status(404).json({ error: "Institution not found" });

      // Institution admin can only see their own institution
      if (
        req.user.role === "INSTITUTION" &&
        req.user.institutionId !== institution.id
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      const batchSummaries = institution.batches.map((batch) => {
        const totalSessions = batch.sessions.length;
        const totalStudents = batch.students.length;

        const totalPossible = totalSessions * totalStudents;
        const totalPresent = batch.sessions.reduce((sum, session) => {
          return (
            sum +
            session.attendance.filter((a) => a.status !== "ABSENT").length
          );
        }, 0);

        return {
          batchId: batch.id,
          batchName: batch.name,
          totalSessions,
          totalStudents,
          trainers: batch.trainers.map((bt) => bt.trainer.name),
          attendanceRate:
            totalPossible > 0
              ? Math.round((totalPresent / totalPossible) * 100)
              : 0,
        };
      });

      const overallRate =
        batchSummaries.length > 0
          ? Math.round(
              batchSummaries.reduce((sum, b) => sum + b.attendanceRate, 0) /
                batchSummaries.length
            )
          : 0;

      res.json({
        institutionId: institution.id,
        institutionName: institution.name,
        totalBatches: institution.batches.length,
        overallAttendanceRate: overallRate,
        batches: batchSummaries,
      });
    } catch (error) {
      console.error("Institution summary error:", error);
      res.status(500).json({ error: "Failed to fetch institution summary" });
    }
  }
);

// GET /api/programme/summary - Programme-wide summary (PM and MO)
router.get(
  "/programme/summary",
  requireAuth,
  requireRole("PROGRAMME_MANAGER", "MONITORING_OFFICER"),
  async (req, res) => {
    try {
      const institutions = await prisma.institution.findMany({
        include: {
          batches: {
            include: {
              sessions: {
                include: { attendance: true },
              },
              students: true,
            },
          },
        },
      });

      const institutionSummaries = institutions.map((institution) => {
        let totalPossible = 0;
        let totalPresent = 0;
        let totalStudents = new Set();
        let totalSessions = 0;

        institution.batches.forEach((batch) => {
          batch.students.forEach((s) => totalStudents.add(s.studentId));
          totalSessions += batch.sessions.length;

          batch.sessions.forEach((session) => {
            totalPossible += batch.students.length;
            totalPresent += session.attendance.filter(
              (a) => a.status !== "ABSENT"
            ).length;
          });
        });

        return {
          institutionId: institution.id,
          institutionName: institution.name,
          totalBatches: institution.batches.length,
          totalStudents: totalStudents.size,
          totalSessions,
          attendanceRate:
            totalPossible > 0
              ? Math.round((totalPresent / totalPossible) * 100)
              : 0,
        };
      });

      const totalStudentsAll = new Set(
        institutions.flatMap((i) =>
          i.batches.flatMap((b) => b.students.map((s) => s.studentId))
        )
      ).size;

      const overallRate =
        institutionSummaries.length > 0
          ? Math.round(
              institutionSummaries.reduce((sum, i) => sum + i.attendanceRate, 0) /
                institutionSummaries.length
            )
          : 0;

      res.json({
        totalInstitutions: institutions.length,
        totalStudents: totalStudentsAll,
        overallAttendanceRate: overallRate,
        institutions: institutionSummaries,
      });
    } catch (error) {
      console.error("Programme summary error:", error);
      res.status(500).json({ error: "Failed to fetch programme summary" });
    }
  }
);

module.exports = router;
