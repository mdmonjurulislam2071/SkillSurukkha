const express = require("express");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const notify = require("../services/notifications");
const { finalizeSubmission } = require("../services/escrowReleases");
const router = express.Router();

router.get("/users", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.status, u.created_at, n.status AS nid_status
       FROM users u
       LEFT JOIN nid_verifications n ON n.id = (
         SELECT nv.id FROM nid_verifications nv WHERE nv.user_id = u.id ORDER BY nv.id DESC LIMIT 1
       )
       ORDER BY u.created_at DESC`
    );
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
    const [[escrows]] = await pool.query(`SELECT COALESCE(SUM(GREATEST(amount - released_amount - refunded_amount, 0)), 0) AS funded FROM escrows WHERE status IN ('funded','partially_released')`);
    const [[pendingSkills]] = await pool.query(`SELECT COUNT(*) AS total FROM skill_verifications WHERE status IN ('pending','processing','review_ready')`);
    const [[pendingNids]] = await pool.query(`SELECT COUNT(*) AS total FROM nid_verifications WHERE status = 'pending'`);
    res.json({ users: users.total, projects: projects.total, fundedEscrow: escrows.funded, pendingSkillReviews: pendingSkills.total, pendingNidReviews: pendingNids.total });
  } catch (error) { next(error); }
});

router.get("/nid-verifications", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [verifications] = await pool.query(
      `SELECT n.*, u.name, u.email, u.mobile, u.role, reviewer.name AS reviewer_name
       FROM nid_verifications n
       JOIN users u ON u.id = n.user_id
       LEFT JOIN users reviewer ON reviewer.id = n.reviewed_by
       ORDER BY FIELD(n.status, 'pending', 'rejected', 'verified'), n.created_at DESC, n.id DESC`
    );
    res.json({ verifications });
  } catch (error) { next(error); }
});

router.patch("/nid-verifications/:id", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const status = req.body.status;
    const reason = req.body.reason?.trim() || null;
    if (!["verified", "rejected"].includes(status)) return res.status(400).json({ message: "Choose verified or rejected." });
    if (status === "rejected" && !reason) return res.status(400).json({ message: "Provide a rejection reason." });
    const [result] = await pool.query(
      `UPDATE nid_verifications
       SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [status, status === "rejected" ? reason : null, req.user.id, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Pending NID verification not found." });
    const [[verification]] = await pool.query(`SELECT user_id FROM nid_verifications WHERE id = ?`, [req.params.id]);
    await notify(
      pool,
      verification.user_id,
      "nid_verification_updated",
      status === "verified" ? "NID verification approved" : "NID verification rejected",
      status === "verified" ? "Your NID has been verified. You can now access your account dashboard." : `Your NID verification was rejected: ${reason}`,
      { route: "dashboard", nidStatus: status }
    );
    res.json({ message: status === "verified" ? "NID verification approved." : "NID verification rejected." });
  } catch (error) { next(error); }
});

router.get("/skill-verifications", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [verifications] = await pool.query(`SELECT s.*, u.name AS freelancer_name FROM skill_verifications s JOIN users u ON u.id = s.freelancer_id ORDER BY s.created_at DESC`);
    res.json({ verifications });
  } catch (error) { next(error); }
});

router.get("/disputes", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [disputes] = await pool.query(
      `SELECT d.*, p.title, p.client_id, a.freelancer_id, u.name AS opened_by_name
       FROM project_disputes d
       JOIN projects p ON p.id = d.project_id
       JOIN users u ON u.id = d.opened_by
       LEFT JOIN applications a ON a.project_id = p.id AND a.status = 'hired'
       ORDER BY d.created_at DESC, d.id DESC`
    );
    res.json({ disputes });
  } catch (error) { next(error); }
});

router.get("/withdrawals", authenticate, allowRoles("admin"), async (_, res, next) => {
  try {
    const [withdrawals] = await pool.query(
      `SELECT w.*, u.name AS freelancer_name, u.email, u.mobile
       FROM withdrawal_requests w JOIN users u ON u.id = w.freelancer_id
       ORDER BY w.created_at DESC, w.id DESC`
    );
    res.json({ withdrawals });
  } catch (error) { next(error); }
});

router.patch("/withdrawals/:id", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!["processing", "paid", "rejected"].includes(status)) return res.status(400).json({ message: "Choose processing, paid or rejected." });
    const reference = req.body.transactionReference?.trim() || null;
    if (status === "paid" && !reference) return res.status(400).json({ message: "A payout transaction reference is required." });
    const [result] = await pool.query(
      `UPDATE withdrawal_requests
       SET status = ?, transaction_reference = COALESCE(?, transaction_reference), admin_note = ?, processed_at = IF(? IN ('paid','rejected'), NOW(), processed_at)
       WHERE id = ? AND status IN ('pending','processing')`,
      [status, reference, req.body.adminNote?.trim() || null, status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Open withdrawal request not found." });
    const [[withdrawal]] = await pool.query(`SELECT freelancer_id, amount FROM withdrawal_requests WHERE id = ?`, [req.params.id]);
    await notify(pool, withdrawal.freelancer_id, "withdrawal_updated", `Withdrawal ${status}`, `${Number(withdrawal.amount).toFixed(2)} payout is ${status}.`, { withdrawalId: Number(req.params.id), route: "payments" });
    res.json({ message: `Withdrawal marked ${status}.` });
  } catch (error) { next(error); }
});

router.patch("/disputes/:id/resolve", authenticate, allowRoles("admin"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (!["refund", "release", "resume"].includes(req.body.action) || !req.body.resolution?.trim()) throw Object.assign(new Error("Choose refund, release or resume and provide a resolution note."), { status: 400 });
    const [rows] = await connection.query(
      `SELECT d.*, p.title, p.client_id, a.freelancer_id
       FROM project_disputes d
       JOIN projects p ON p.id = d.project_id
       LEFT JOIN applications a ON a.project_id = p.id AND a.status = 'hired'
       WHERE d.id = ? AND d.status = 'open'`,
      [req.params.id]
    );
    const dispute = rows[0];
    if (!dispute) throw Object.assign(new Error("Open dispute not found."), { status: 404 });
    if (req.body.action === "refund") {
      await connection.query(
        `UPDATE escrows
         SET refunded_amount = GREATEST(amount - released_amount, 0), status = 'refunded', refunded_at = NOW()
         WHERE project_id = ? AND status IN ('funded','partially_released')`,
        [dispute.project_id]
      );
      await connection.query(`UPDATE projects SET status = 'cancelled' WHERE id = ?`, [dispute.project_id]);
    } else if (req.body.action === "release") {
      const [[submission]] = await connection.query(`SELECT s.*, p.client_id FROM work_submissions s JOIN projects p ON p.id = s.project_id WHERE s.project_id = ? ORDER BY s.version_number DESC, s.id DESC LIMIT 1`, [dispute.project_id]);
      if (!submission) throw Object.assign(new Error("No submission is available to release."), { status: 409 });
      await finalizeSubmission(connection, submission, "Administrator resolved the dispute in favor of release.");
    } else {
      await connection.query(
        `UPDATE projects
         SET status = CASE
           WHEN EXISTS (SELECT 1 FROM work_submissions s WHERE s.project_id = projects.id AND s.status = 'submitted') THEN 'submitted'
           WHEN deadline < CURDATE() THEN 'overdue'
           ELSE 'in_progress'
         END
         WHERE id = ?`,
        [dispute.project_id]
      );
      await connection.query(
        `UPDATE work_submissions
         SET review_deadline = DATE_ADD(NOW(), INTERVAL 1 DAY), review_reminder_stage = 0
         WHERE project_id = ? AND status = 'submitted'
         ORDER BY version_number DESC, id DESC LIMIT 1`,
        [dispute.project_id]
      );
    }
    await connection.query(`UPDATE project_disputes SET status = 'resolved', resolution = ?, resolved_at = NOW() WHERE id = ?`, [req.body.resolution.trim(), dispute.id]);
    const message = `${dispute.title}: ${req.body.resolution.trim()}`;
    await notify(connection, dispute.client_id, "dispute_resolved", "Project dispute resolved", message, { projectId: dispute.project_id, disputeId: dispute.id });
    if (dispute.freelancer_id) await notify(connection, dispute.freelancer_id, "dispute_resolved", "Project dispute resolved", message, { projectId: dispute.project_id, disputeId: dispute.id });
    await connection.commit();
    res.json({ message: "Dispute resolved." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

module.exports = router;
