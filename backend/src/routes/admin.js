const express = require("express");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const router = express.Router();

router.get("/users", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [users] = await pool.query(`SELECT id, name, email, mobile, role, status, created_at FROM users ORDER BY created_at DESC`);
    res.json({ users });
  } catch (error) { next(error); }
});

router.patch("/users/:id/status", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    if (!["active", "suspended"].includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
    await pool.query(`UPDATE users SET status = ? WHERE id = ? AND role <> 'admin'`, [req.body.status, req.params.id]);
    res.json({ message: "User status updated." });
  } catch (error) { next(error); }
});

router.get("/overview", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [[users]] = await pool.query(`SELECT COUNT(*) AS total FROM users`);
    const [[projects]] = await pool.query(`SELECT COUNT(*) AS total FROM projects`);
    const [[escrows]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS funded FROM escrows WHERE status = 'funded'`);
    const [[pendingSkills]] = await pool.query(`SELECT COUNT(*) AS total FROM skill_verifications WHERE status = 'pending'`);
    res.json({ users: users.total, projects: projects.total, fundedEscrow: escrows.funded, pendingSkillReviews: pendingSkills.total });
  } catch (error) { next(error); }
});

router.get("/skill-verifications", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [verifications] = await pool.query(`SELECT s.*, u.name AS freelancer_name FROM skill_verifications s JOIN users u ON u.id = s.freelancer_id ORDER BY s.created_at DESC`);
    res.json({ verifications });
  } catch (error) { next(error); }
});

module.exports = router;
