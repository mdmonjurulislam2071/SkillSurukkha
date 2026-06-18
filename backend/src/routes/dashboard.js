const express = require("express");
const pool = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { syncOverdueProjects } = require("../services/deadlines");
const router = express.Router();

const parseJson = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const profileCompletion = (profile = {}, role = "freelancer") => {
  const commonFields = ["headline", "bio", "country", "city"];
  const freelancerFields = ["skills", "hourly_rate", "availability"];
  const clientFields = ["company_name", "company_website"];
  const fields = role === "client" ? [...commonFields, ...clientFields] : [...commonFields, ...freelancerFields];
  const completed = fields.filter((field) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length > 0;
    if (field === "skills") return parseJson(value).length > 0;
    return value !== null && value !== undefined && String(value).trim() !== "";
  }).length;
  return Math.round((completed / fields.length) * 100);
};

router.get("/me", authenticate, async (req, res, next) => {
  try {
    await syncOverdueProjects(pool);
    const [[profile = {}]] = await pool.query(`SELECT * FROM profiles WHERE user_id = ?`, [req.user.id]);

    if (req.user.role === "freelancer") {
      const [[projectStats]] = await pool.query(
        `SELECT
           SUM(CASE WHEN a.status = 'hired' AND p.status IN ('hired','in_progress','submitted','revision_required','overdue') THEN 1 ELSE 0 END) AS active_projects,
           SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_projects
         FROM applications a
         JOIN projects p ON p.id = a.project_id
         WHERE a.freelancer_id = ?`,
        [req.user.id]
      );
      const [[paymentStats]] = await pool.query(
        `SELECT
           COALESCE(SUM(released_amount), 0) AS released_total,
           COALESCE(SUM(GREATEST(amount - released_amount - refunded_amount, 0)), 0) AS in_escrow
         FROM escrows
         WHERE freelancer_id = ?`,
        [req.user.id]
      );
      const [[withdrawalStats]] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS reserved
         FROM withdrawal_requests
         WHERE freelancer_id = ? AND status IN ('pending','processing','paid')`,
        [req.user.id]
      );
      const [[skillStats]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified_skills,
           AVG(CASE WHEN status = 'verified' THEN ai_score END) AS skill_score
         FROM skill_verifications
         WHERE freelancer_id = ?`,
        [req.user.id]
      );
      const [[reviewStats]] = await pool.query(
        `SELECT AVG(rating) AS profile_rating, COUNT(*) AS review_count
         FROM freelancer_reviews
         WHERE freelancer_id = ?`,
        [req.user.id]
      );
      const [[latestVerification = null]] = await pool.query(
        `SELECT id, skill_name, ai_score, status, analysis_error, created_at
         FROM skill_verifications
         WHERE freelancer_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [req.user.id]
      );
      const [projects] = await pool.query(
        `SELECT p.*, u.name AS client_name, a.status AS application_status
         FROM applications a
         JOIN projects p ON p.id = a.project_id
         JOIN users u ON u.id = p.client_id
         WHERE a.freelancer_id = ?
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 2`,
        [req.user.id]
      );

      return res.json({
        stats: {
          availableBalance: Math.max(0, Number(paymentStats.released_total || 0) - Number(withdrawalStats.reserved || 0)),
          activeProjects: Number(projectStats.active_projects || 0),
          profileRating: Number(reviewStats.profile_rating || 0),
          reviewCount: Number(reviewStats.review_count || 0),
          verifiedSkills: Number(skillStats.verified_skills || 0),
          skillScore: Number(skillStats.skill_score || 0),
          inEscrow: Number(paymentStats.in_escrow || 0),
          completedProjects: Number(projectStats.completed_projects || 0),
          profileCompletion: profileCompletion(profile, req.user.role),
        },
        projects: projects.map((project) => ({ ...project, skills: parseJson(project.skills) })),
        latestVerification,
      });
    }

    if (req.user.role === "client") {
      const [[projectStats]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_projects,
           SUM(CASE WHEN status IN ('hired','in_progress','submitted') THEN 1 ELSE 0 END) AS active_projects,
           SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pending_reviews,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_projects
         FROM projects
         WHERE client_id = ?`,
        [req.user.id]
      );
      const [[paymentStats]] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status = 'funded' THEN amount ELSE 0 END), 0) AS in_escrow
         FROM escrows
         WHERE client_id = ?`,
        [req.user.id]
      );
      const [projects] = await pool.query(
        `SELECT p.*, e.status AS escrow_status
         FROM projects p
         LEFT JOIN escrows e ON e.project_id = p.id
         WHERE p.client_id = ?
         ORDER BY p.created_at DESC
         LIMIT 2`,
        [req.user.id]
      );

      return res.json({
        stats: {
          availableBalance: 0,
          activeProjects: Number(projectStats.active_projects || 0),
          profileRating: 0,
          verifiedSkills: 0,
          skillScore: 0,
          inEscrow: Number(paymentStats.in_escrow || 0),
          completedProjects: Number(projectStats.completed_projects || 0),
          openProjects: Number(projectStats.open_projects || 0),
          pendingReviews: Number(projectStats.pending_reviews || 0),
          profileCompletion: profileCompletion(profile, req.user.role),
        },
        projects: projects.map((project) => ({ ...project, skills: parseJson(project.skills) })),
      });
    }

    res.json({ stats: {}, projects: [] });
  } catch (error) { next(error); }
});

module.exports = router;
