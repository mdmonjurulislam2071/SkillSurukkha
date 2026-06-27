const express = require("express");
const fs = require("fs/promises");
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

async function freelancerHasSkill(freelancerId, skillName) {
  const [rows] = await pool.query(`SELECT skills FROM profiles WHERE user_id = ?`, [freelancerId]);
  const skills = typeof rows[0]?.skills === "string" ? JSON.parse(rows[0].skills) : rows[0]?.skills || [];
  return skills.some((skill) => String(skill).trim().toLowerCase() === skillName.trim().toLowerCase());
}

async function freelancerSkillSet(freelancerId) {
  const [rows] = await pool.query(`SELECT skills FROM profiles WHERE user_id = ?`, [freelancerId]);
  const skills = typeof rows[0]?.skills === "string" ? JSON.parse(rows[0].skills) : rows[0]?.skills || [];
  return new Set((Array.isArray(skills) ? skills : []).map((skill) => String(skill).trim().toLowerCase()).filter(Boolean));
}

const questionBank = {
  frontend: [
    "Explain how you make a React component reusable and easy to maintain.",
    "How would you manage form state and validation in a React application?",
    "Explain how localStorage works and when you should or should not use it.",
    "How do you make a page responsive for mobile and desktop users?",
    "What is the difference between props, state and derived data in React?",
    "How do you debug a UI bug where a button click does not update the screen?",
  ],
  backend: [
    "Explain how you design a secure REST API endpoint.",
    "How do authentication and authorization differ in a backend system?",
    "How would you validate request data before saving it to a database?",
    "Explain how you handle errors in an Express or Node.js API.",
    "How do you prevent duplicate records and race-condition bugs?",
    "What steps would you take to debug a slow database query?",
  ],
  python: [
    "Explain how you structure a Python project so the code is easy to maintain.",
    "How do you handle errors and exceptions in a Python program?",
    "Explain how you read, validate and process data from a file or API in Python.",
    "How do you use virtual environments and dependencies in a Python project?",
    "What is the difference between a list, tuple, set and dictionary in Python?",
    "How would you debug a Python script that works locally but fails in production?",
  ],
  design: [
    "Explain how you choose layout, spacing and hierarchy for a screen.",
    "How do you decide colors and typography for a brand or product UI?",
    "How would you improve a confusing form or checkout flow?",
    "What makes a design accessible for different users?",
    "Explain how you turn user requirements into wireframes.",
    "How do you prepare a design handoff for developers?",
  ],
  general: [
    "Explain one real problem you solved using this skill.",
    "What are the most common mistakes beginners make in this skill?",
    "How do you check that your work is correct before delivery?",
    "Explain your workflow from requirement to final output.",
    "What tools do you use for this skill and why?",
    "How would you handle client feedback or a revision request?",
  ],
};

function categoryForSkill(skillName) {
  const normalized = skillName.toLowerCase();
  if (/(python|django|flask|fastapi|pandas|numpy|data science|machine learning|automation|script)/.test(normalized)) return "python";
  if (/(react|javascript|frontend|html|css|next|web)/.test(normalized)) return "frontend";
  if (/(node|express|backend|api|mysql|database|php|laravel)/.test(normalized)) return "backend";
  if (/(ui|ux|figma|design|graphic|logo|brand|illustrator|photoshop)/.test(normalized)) return "design";
  return "general";
}

function randomQuestionsForSkill(skillName) {
  const category = categoryForSkill(skillName);
  const pool = [...new Set([...questionBank[category], ...questionBank.general])];
  return pool
    .map((question) => ({ question, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, 3)
    .map((item, index) => ({ id: index + 1, question: item.question }));
}

function badgeName(skillName, score) {
  if (Number(score) >= 85) return `${skillName} Elite Expert`;
  if (Number(score) >= 70) return `${skillName} Verified Pro`;
  return `${skillName} Rising Talent`;
}

function badgeTier(score) {
  if (Number(score) >= 85) return "Elite Expert";
  if (Number(score) >= 70) return "Verified Pro";
  return "Rising Talent";
}

router.get("/mine", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const [verifications] = await pool.query(`SELECT * FROM skill_verifications WHERE freelancer_id = ? ORDER BY created_at DESC`, [req.user.id]);
    const currentSkills = await freelancerSkillSet(req.user.id);
    res.json({ verifications: verifications.filter((item) => currentSkills.has(String(item.skill_name || "").trim().toLowerCase())) });
  } catch (error) { next(error); }
});

router.get("/questions", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const skillName = String(req.query.skillName || "").trim();
    if (!skillName) return res.status(400).json({ message: "Skill name is required." });
    if (!await freelancerHasSkill(req.user.id, skillName)) return res.status(400).json({ message: "Add this skill to your profile before requesting verification questions." });
    const questions = randomQuestionsForSkill(skillName);
    res.json({
      skillName,
      questions,
      taskDescription: JSON.stringify({
        type: "skill_viva_questions",
        skillName,
        instructions: "Answer all three questions in one video. Speak clearly and explain your reasoning with examples.",
        questions,
      }),
    });
  } catch (error) { next(error); }
});

router.post("/", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const { skillName, taskDescription, videoUrl } = req.body;
    if (!skillName?.trim() || !taskDescription?.trim() || !videoUrl?.trim()) return res.status(400).json({ message: "Skill name, task description and video URL are required." });
    if (!await freelancerHasSkill(req.user.id, skillName)) return res.status(400).json({ message: "Add this skill to your profile before requesting verification." });
    const [result] = await pool.query(`INSERT INTO skill_verifications (freelancer_id, skill_name, task_description, video_url) VALUES (?, ?, ?, ?)`, [req.user.id, skillName.trim(), taskDescription.trim(), videoUrl.trim()]);
    await notify.role(
      pool,
      "admin",
      "skill_review_requested",
      "Skill verification needs review",
      `${skillName.trim()} was submitted for administrator review.`,
      { verificationId: result.insertId, route: "dashboard" }
    );
    res.status(201).json({ message: "Skill verification submitted for AI review.", verificationId: result.insertId });
  } catch (error) { next(error); }
});

router.post("/upload", authenticate, allowRoles("freelancer"), upload.single("video"), async (req, res, next) => {
  try {
    if (!req.file || !req.body.skillName?.trim() || !req.body.taskDescription?.trim()) {
      if (req.file) await fs.rm(req.file.path, { force: true });
      return res.status(400).json({ message: "Skill name, task description and video are required." });
    }
    if (!await freelancerHasSkill(req.user.id, req.body.skillName)) {
      await fs.rm(req.file.path, { force: true });
      return res.status(400).json({ message: "Add this skill to your profile before requesting verification." });
    }
    const parsedTask = (() => {
      try { return JSON.parse(req.body.taskDescription); } catch { return null; }
    })();
    if (!parsedTask || parsedTask.type !== "skill_viva_questions" || !Array.isArray(parsedTask.questions) || parsedTask.questions.length !== 3) {
      await fs.rm(req.file.path, { force: true });
      return res.status(400).json({ message: "Generate three verification questions before uploading the video." });
    }
    const videoUrl = `/uploads/skills/${req.file.filename}`;
    const [result] = await pool.query(
      `INSERT INTO skill_verifications (freelancer_id, skill_name, task_description, video_url, video_path) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, req.body.skillName.trim(), req.body.taskDescription.trim(), videoUrl, req.file.path]
    );
    await notify.role(
      pool,
      "admin",
      "skill_analysis_started",
      "Skill verification uploaded",
      `${req.body.skillName.trim()} was uploaded and AI analysis has started.`,
      { verificationId: result.insertId, route: "dashboard" }
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

router.post("/:id/retry", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM skill_verifications WHERE id = ? AND freelancer_id = ? AND video_path IS NOT NULL AND status = 'failed'`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Failed verification video not found." });
    analyzeVerification(req.params.id).catch((error) => console.error(`Skill analysis ${req.params.id} failed:`, error.message));
    res.status(202).json({ message: "Hosted AI analysis restarted.", status: "processing" });
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
    const currentSkills = await freelancerSkillSet(req.params.freelancerId);
    res.json({ badges: badges.filter((badge) => currentSkills.has(String(badge.skill_name || "").trim().toLowerCase())).map((badge) => ({ ...badge, badge_tier: badgeTier(badge.ai_score), badge_label: badge.badge_reference || badgeName(badge.skill_name, badge.ai_score) })) });
  } catch (error) { next(error); }
});

router.patch("/:id/review", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const score = Number(req.body.aiScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ message: "AI score must be between 0 and 100." });
    const status = score >= Number(process.env.SKILL_ACTIVATION_SCORE || 50) ? "verified" : "rejected";
    const [rows] = await pool.query(`SELECT freelancer_id, skill_name FROM skill_verifications WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Pending verification not found." });
    const badgeReference = status === "verified" ? req.body.badgeReference?.trim() || badgeName(rows[0].skill_name, score) : null;
    const [result] = await pool.query(`UPDATE skill_verifications SET ai_score = ?, status = ?, badge_reference = ?, reviewed_at = NOW() WHERE id = ? AND status IN ('pending','review_ready')`, [score, status, badgeReference, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pending verification not found." });
    await notify(pool, rows[0].freelancer_id, "skill_reviewed", status === "verified" ? "Skill verified" : "Skill review completed", `${rows[0].skill_name} received an AI score of ${score}.`, { verificationId: Number(req.params.id) });
    res.json({ message: status === "verified" ? "Verified badge issued." : "Skill verification rejected.", status, badgeReference });
  } catch (error) { next(error); }
});

module.exports = router;
