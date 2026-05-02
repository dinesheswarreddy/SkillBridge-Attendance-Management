require("dotenv").config();
const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/users");
const batchRoutes = require("./routes/batches");
const sessionRoutes = require("./routes/sessions");
const attendanceRoutes = require("./routes/attendance");
const institutionRoutes = require("./routes/institutions");

const app = express();

// CORS - allow requests from frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Raw body for Clerk webhooks (must be before express.json())
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }));

// JSON body parser for all other routes
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use("/api", userRoutes);
app.use("/api", batchRoutes);
app.use("/api", sessionRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", institutionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SkillBridge API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
