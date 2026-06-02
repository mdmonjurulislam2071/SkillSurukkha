const express = require("express");
const path = require("path");
const multer = require("multer");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const notify = require("../services/notifications");
const { analyzeVerification, getPipelineHealth } = require("../services/skillAnalysis");
const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads/skills"),
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.SKILL_VIDEO_MAX_MB || 150) * 1024 * 1024 },
  fileFilter: (_, file, done) => ["video/mp4", "video/quicktime", "video/webm"].includes(file.mimetype) ? done(null, true) : done(new Error("Only MP4, MOV and WEBM skill videos are allowed.")),
});

router.get("/mine", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const [verifications] = await pool.query(`SELECT * FROM skill_verifications WHERE freelancer_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json({ verifications });
  } catch (error) { next(error); }
});

router.post("/", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const { skillName, taskDescription, videoUrl } = req.body;
    if (!skillName?.trim() || !taskDescription?.trim() || !videoUrl?.trim()) return res.status(400).json({ message: "Skill name, task description and video URL are required." });
    const [result] = await pool.query(`INSERT INTO skill_verifications (freelancer_id, skill_name, task_description, video_url) VALUES (?, ?, ?, ?)`, [req.user.id, skillName.trim(), taskDescription.trim(), videoUrl.trim()]);
    res.status(201).json({ message: "Skill verification submitted for AI review.", verificationId: result.insertId });
  } catch (error) { next(error); }
});

router.post("/upload", authenticate, allowRoles("freelancer"), upload.single("video"), async (req, res, next) => {
  try {
    if (!req.file || !req.body.skillName?.trim() || !req.body.taskDescription?.trim()) return res.status(400).json({ message: "Skill name, task description and video are required." });
    const videoUrl = `/uploads/skills/${req.file.filename}`;
    const [result] = await pool.query(
      `INSERT INTO skill_verifications (freelancer_id, skill_name, task_description, video_url, video_path) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, req.body.skillName.trim(), req.body.taskDescription.trim(), videoUrl, req.file.path]
    );
    analyzeVerification(result.insertId).catch((error) => console.error(`Skill analysis ${result.insertId} failed:`, error.message));
    res.status(202).json({ message: "Video uploaded. Hosted AI analysis has started.", verificationId: result.insertId, status: "pending" });
  } catch (error) { next(error); }
});

router.get("/pipeline-health", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    res.json(await getPipelineHealth());
  } catch (error) { next(error); }
});

router.post("/:id/analyze", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id FROM skill_verifications WHERE id = ? AND video_path IS NOT NULL`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Uploaded verification video not found." });
    analyzeVerification(req.params.id).catch((error) => console.error(`Skill analysis ${req.params.id} failed:`, error.message));
    res.status(202).json({ message: "Hosted AI analysis restarted." });
  } catch (error) { next(error); }
});

router.get("/badges/:freelancerId", async (req, res, next) => {
  try {
    const [badges] = await pool.query(`SELECT id, skill_name, ai_score, badge_reference, reviewed_at FROM skill_verifications WHERE freelancer_id = ? AND status = 'verified' ORDER BY reviewed_at DESC`, [req.params.freelancerId]);
    res.json({ badges });
  } catch (error) { next(error); }
});

router.patch("/:id/review", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const score = Number(req.body.aiScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ message: "AI score must be between 0 and 100." });
    const status = score >= 80 ? "verified" : "rejected";
    const badgeReference = status === "verified" ? req.body.badgeReference?.trim() || `SKILLSHUROKKHA-${req.params.id}-${Date.now()}` : null;
    const [result] = await pool.query(`UPDATE skill_verifications SET ai_score = ?, status = ?, badge_reference = ?, reviewed_at = NOW() WHERE id = ? AND status IN ('pending','review_ready')`, [score, status, badgeReference, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pending verification not found." });
    const [rows] = await pool.query(`SELECT freelancer_id, skill_name FROM skill_verifications WHERE id = ?`, [req.params.id]);
    await notify(pool, rows[0].freelancer_id, "skill_reviewed", status === "verified" ? "Skill verified" : "Skill review completed", `${rows[0].skill_name} received an AI score of ${score}.`, { verificationId: Number(req.params.id) });
    res.json({ message: status === "verified" ? "Verified badge issued." : "Skill verification rejected.", status, badgeReference });
  } catch (error) { next(error); }
});

module.exports = router;
