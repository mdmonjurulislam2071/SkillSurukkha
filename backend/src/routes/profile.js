const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, done) => imageTypes.includes(file.mimetype) ? done(null, true) : done(new Error("Only JPG, PNG and WEBP profile pictures are allowed.")),
});
const nidUpload = multer({
  storage: multer.diskStorage({
    destination: async (_, __, done) => {
      try {
        const directory = path.join(__dirname, "../../uploads/nid");
        await fs.mkdir(directory, { recursive: true });
        done(null, directory);
      } catch (error) { done(error); }
    },
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.NID_IMAGE_MAX_MB || 8) * 1024 * 1024 },
  fileFilter: (_, file, done) => imageTypes.includes(file.mimetype) ? done(null, true) : done(Object.assign(new Error("Only JPG, PNG and WEBP NID images are allowed."), { status: 400 })),
});
const jsonFields = ["languages", "skills", "experience", "education", "portfolio", "social_links"];
const editableFields = ["headline", "bio", "country", "city", ...jsonFields, "hourly_rate", "availability", "company_name", "company_website"];
const parseProfile = (profile) => {
  for (const field of jsonFields) if (typeof profile[field] === "string") profile[field] = JSON.parse(profile[field]);
  return profile;
};
const normalizeSkill = (value) => String(value || "").trim().toLowerCase();
const normalizeSkillList = (value) => {
  if (Array.isArray(value)) return value.map(normalizeSkill).filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") return value.split(",").map(normalizeSkill).filter(Boolean);
  return [];
};

async function latestNidVerification(userId) {
  const [rows] = await pool.query(
    `SELECT id, nid_number, front_image_url, back_image_url, status, rejection_reason, reviewed_at, created_at, updated_at
     FROM nid_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT u.id, u.name, u.email, u.mobile, u.role, p.* FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.user.id]);
    res.json({ profile: parseProfile(rows[0]), nidVerification: await latestNidVerification(req.user.id) });
  } catch (error) { next(error); }
});

router.get("/nid-verification", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    res.json({ verification: await latestNidVerification(req.user.id) });
  } catch (error) { next(error); }
});

router.post("/nid-verification", authenticate, allowRoles("freelancer", "client"), nidUpload.fields([{ name: "frontImage", maxCount: 1 }, { name: "backImage", maxCount: 1 }]), async (req, res, next) => {
  try {
    const nidNumber = String(req.body.nidNumber || "").trim();
    const frontImage = req.files?.frontImage?.[0];
    const backImage = req.files?.backImage?.[0];
    if (!/^[0-9]{10,17}$/.test(nidNumber)) return res.status(400).json({ message: "Enter a valid 10 to 17 digit National ID number." });
    if (!frontImage || !backImage) return res.status(400).json({ message: "Upload both front and back side NID images." });
    const [existing] = await pool.query(`SELECT id, status FROM nid_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.user.id]);
    if (existing[0]?.status === "pending") return res.status(409).json({ message: "Your NID verification is already processing." });
    if (existing[0]?.status === "verified") return res.status(409).json({ message: "Your NID is already verified." });
    const [result] = await pool.query(
      `INSERT INTO nid_verifications (user_id, nid_number, front_image_url, back_image_url)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, nidNumber, `/uploads/nid/${frontImage.filename}`, `/uploads/nid/${backImage.filename}`]
    );
    const verification = await latestNidVerification(req.user.id);
    res.status(201).json({ message: "NID submitted successfully. Your NID verification is now processing.", verification: { ...verification, id: result.insertId } });
  } catch (error) { next(error); }
});

router.put("/me", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const updates = [];
    const values = [];
    if (req.body.name) await pool.query(`UPDATE users SET name = ? WHERE id = ?`, [req.body.name.trim(), req.user.id]);
    let removedVerified = [];
    if (req.user.role === "freelancer" && req.body.skills !== undefined) {
      const nextSkills = new Set(normalizeSkillList(req.body.skills));
      const [verifiedRows] = await pool.query(`SELECT DISTINCT skill_name FROM skill_verifications WHERE freelancer_id = ? AND status = 'verified'`, [req.user.id]);
      removedVerified = verifiedRows.map((row) => row.skill_name).filter((skill) => !nextSkills.has(normalizeSkill(skill)));
    }
    for (const field of editableFields) {
      if (req.body[field] === undefined) continue;
      updates.push(`${field} = ?`);
      values.push(jsonFields.includes(field) ? JSON.stringify(req.body[field]) : req.body[field] || null);
    }
    if (updates.length) {
      values.push(req.user.id);
      await pool.query(`UPDATE profiles SET ${updates.join(", ")} WHERE user_id = ?`, values);
    }
    if (removedVerified.length) {
      await pool.query(
        `UPDATE skill_verifications
         SET status = 'rejected', badge_reference = NULL
         WHERE freelancer_id = ? AND status = 'verified' AND LOWER(TRIM(skill_name)) IN (?)`,
        [req.user.id, removedVerified.map(normalizeSkill)]
      );
    }
    res.json({
      message: removedVerified.length
        ? `Profile updated successfully. Verification was removed for renamed or deleted skills: ${removedVerified.join(", ")}.`
        : "Profile updated successfully.",
      invalidatedVerifiedSkills: removedVerified,
    });
  } catch (error) { next(error); }
});

router.post("/me/avatar", authenticate, allowRoles("freelancer", "client"), upload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a JPG, PNG or WEBP image up to 5MB." });
    const avatarUrl = `/uploads/${req.file.filename}`;
    await pool.query(`UPDATE profiles SET avatar_url = ? WHERE user_id = ?`, [avatarUrl, req.user.id]);
    res.json({ message: "Profile picture updated.", avatarUrl });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT u.id, u.name, u.role, p.avatar_url, p.headline, p.bio, p.country, p.city, p.languages, p.skills, p.experience, p.education, p.portfolio, p.social_links, p.hourly_rate, p.availability, p.company_name, p.company_website FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ? AND u.status = 'active'`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Profile not found." });
    res.json({ profile: parseProfile(rows[0]) });
  } catch (error) { next(error); }
});

module.exports = router;
