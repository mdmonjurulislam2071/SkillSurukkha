require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const initDb = require("./config/initDb");
const pool = require("./config/db");
const { syncOverdueProjects } = require("./services/deadlines");
const configureRealtime = require("./services/realtime");

const app = express();
const server = http.createServer(app);
const frontendOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = { origin: frontendOrigins, credentials: true };
const io = new Server(server, { cors: corsOptions });
configureRealtime(io);
app.set("io", io);
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads/submissions", (_, res) => res.status(404).json({ message: "Project deliverables require authenticated download access." }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), require("./routes/auth"));
app.use("/api/profiles", require("./routes/profile"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/skills", require("./routes/skills"));
app.use("/api/payments", require("./routes/payments"));
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.use((error, _, res, __) => {
  console.error(error);
  if (error.status) return res.status(error.status).json({ message: error.message });
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This record already exists." });
  if (error.code === "LIMIT_FILE_SIZE") {
    const limits = {
      projectArchive: Number(process.env.PROJECT_ARCHIVE_MAX_MB || 1024),
      coverLetterFile: Number(process.env.PROPOSAL_DOCUMENT_MAX_MB || 5),
      attachment: Number(process.env.MESSAGE_ATTACHMENT_MAX_MB || 15),
      video: Number(process.env.SKILL_VIDEO_MAX_MB || 150),
    };
    const maxMb = limits[error.field];
    return res.status(400).json({ message: maxMb ? `Uploaded file exceeds the configured ${maxMb} MB size limit.` : "Uploaded file exceeds the configured size limit." });
  }
  if (error.message === "Only MP4, MOV and WEBM skill videos are allowed.") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: "Something went wrong on the server." });
});

const port = Number(process.env.PORT || 5000);
initDb()
  .then(() => {
    const syncDeadlines = () => syncOverdueProjects(pool).catch((error) => console.error("Deadline sync failed:", error.message));
    syncDeadlines();
    const deadlineTimer = setInterval(syncDeadlines, Number(process.env.DEADLINE_SYNC_INTERVAL_MS || 60000));
    deadlineTimer.unref();
    server.listen(port, () => console.log(`SkillShurokkha API running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  });
