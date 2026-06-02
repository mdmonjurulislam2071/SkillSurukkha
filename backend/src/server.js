require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const initDb = require("./config/initDb");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), require("./routes/auth"));
app.use("/api/profiles", require("./routes/profile"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/skills", require("./routes/skills"));
app.use("/api/payments", require("./routes/payments"));
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.use((error, _, res, __) => {
  console.error(error);
  if (error.status) return res.status(error.status).json({ message: error.message });
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This record already exists." });
  if (error.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "Uploaded file exceeds the configured size limit." });
  res.status(500).json({ message: "Something went wrong on the server." });
});

const port = Number(process.env.PORT || 5000);
initDb()
  .then(() => app.listen(port, () => console.log(`SkillShurokkha API running on http://localhost:${port}`)))
  .catch((error) => {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  });
