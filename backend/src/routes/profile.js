const express = require("express");
const path = require("path");
const multer = require("multer");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, done) => ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ? done(null, true) : done(new Error("Only JPG, PNG and WEBP profile pictures are allowed.")),
});
const jsonFields = ["languages", "skills", "experience", "education", "portfolio", "social_links"];
const editableFields = ["headline", "bio", "country", "city", ...jsonFields, "hourly_rate", "availability", "company_name", "company_website"];
const parseProfile = (profile) => {
  for (const field of jsonFields) if (typeof profile[field] === "string") profile[field] = JSON.parse(profile[field]);
  return profile;
};

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT u.id, u.name, u.email, u.mobile, u.role, p.* FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.user.id]);
    res.json({ profile: parseProfile(rows[0]) });
  } catch (error) { next(error); }
});

router.put("/me", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const updates = [];
    const values = [];
    if (req.body.name) await pool.query(`UPDATE users SET name = ? WHERE id = ?`, [req.body.name.trim(), req.user.id]);
    for (const field of editableFields) {
      if (req.body[field] === undefined) continue;
      updates.push(`${field} = ?`);
      values.push(jsonFields.includes(field) ? JSON.stringify(req.body[field]) : req.body[field] || null);
    }
    if (updates.length) {
      values.push(req.user.id);
      await pool.query(`UPDATE profiles SET ${updates.join(", ")} WHERE user_id = ?`, values);
    }
    res.json({ message: "Profile updated successfully." });
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
