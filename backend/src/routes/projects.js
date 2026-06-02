const express = require("express");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const notify = require("../services/notifications");
const router = express.Router();

const positiveAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
async function getProject(connection, projectId) {
  const [rows] = await connection.query(`SELECT * FROM projects WHERE id = ?`, [projectId]);
  return rows[0];
}
async function getHiredFreelancer(connection, projectId) {
  const [rows] = await connection.query(`SELECT freelancer_id FROM applications WHERE project_id = ? AND status = 'hired' LIMIT 1`, [projectId]);
  return rows[0]?.freelancer_id;
}

router.get("/", async (_, res, next) => {
  try {
    const [projects] = await pool.query(`SELECT p.*, u.name AS client_name FROM projects p JOIN users u ON u.id = p.client_id WHERE p.status = 'open' ORDER BY p.created_at DESC`);
    res.json({ projects });
  } catch (error) { next(error); }
});

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const query = req.user.role === "client"
      ? `SELECT p.*, e.status AS escrow_status FROM projects p LEFT JOIN escrows e ON e.project_id = p.id WHERE p.client_id = ? ORDER BY p.created_at DESC`
      : `SELECT p.*, u.name AS client_name, a.status AS application_status, e.status AS escrow_status FROM applications a JOIN projects p ON p.id = a.project_id JOIN users u ON u.id = p.client_id LEFT JOIN escrows e ON e.project_id = p.id WHERE a.freelancer_id = ? ORDER BY a.created_at DESC`;
    const [projects] = await pool.query(query, [req.user.id]);
    res.json({ projects });
  } catch (error) { next(error); }
});

router.post("/", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const { title, description, budget, deadline, skills = [] } = req.body;
    if (!title?.trim() || !description?.trim() || !positiveAmount(budget) || !deadline) return res.status(400).json({ message: "Title, description, a positive budget and deadline are required." });
    const [result] = await pool.query(`INSERT INTO projects (client_id, title, description, budget, deadline, skills) VALUES (?, ?, ?, ?, ?, ?)`, [req.user.id, title.trim(), description.trim(), budget, deadline, JSON.stringify(skills)]);
    res.status(201).json({ message: "Project created.", projectId: result.insertId });
  } catch (error) { next(error); }
});

router.post("/:id/apply", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const { coverLetter, proposedBudget } = req.body;
    if (!coverLetter?.trim() || !positiveAmount(proposedBudget)) return res.status(400).json({ message: "Cover letter and a positive proposed budget are required." });
    const project = await getProject(pool, req.params.id);
    if (!project || project.status !== "open") return res.status(409).json({ message: "This project is not accepting applications." });
    await pool.query(`INSERT INTO applications (project_id, freelancer_id, cover_letter, proposed_budget) VALUES (?, ?, ?, ?)`, [req.params.id, req.user.id, coverLetter.trim(), proposedBudget]);
    await notify(pool, project.client_id, "application_received", "New project application", "A freelancer applied to your project.", { projectId: Number(req.params.id) });
    res.status(201).json({ message: "Application submitted." });
  } catch (error) { next(error); }
});

router.get("/:id/applications", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id) return res.status(404).json({ message: "Project not found." });
    const [applications] = await pool.query(`SELECT a.*, u.name, p.avatar_url, p.headline, p.skills FROM applications a JOIN users u ON u.id = a.freelancer_id LEFT JOIN profiles p ON p.user_id = u.id WHERE a.project_id = ? ORDER BY a.created_at DESC, a.id DESC`, [req.params.id]);
    res.json({ applications });
  } catch (error) { next(error); }
});

router.patch("/:id/applications/:applicationId/shortlist", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "open") return res.status(409).json({ message: "This application cannot be shortlisted." });
    const [result] = await pool.query(`UPDATE applications SET status = 'shortlisted' WHERE id = ? AND project_id = ? AND status = 'pending'`, [req.params.applicationId, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Application not found." });
    const [rows] = await pool.query(`SELECT freelancer_id FROM applications WHERE id = ?`, [req.params.applicationId]);
    await notify(pool, rows[0].freelancer_id, "application_shortlisted", "Application shortlisted", "A client shortlisted your project application.", { projectId: Number(req.params.id) });
    res.json({ message: "Application shortlisted." });
  } catch (error) { next(error); }
});

router.post("/:id/escrow", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const { paymentMethod, transactionReference } = req.body;
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "open") return res.status(409).json({ message: "Escrow cannot be funded for this project." });
    if (!paymentMethod?.trim() || !transactionReference?.trim()) return res.status(400).json({ message: "Payment method and transaction reference are required." });
    await pool.query(`INSERT INTO escrows (project_id, client_id, amount, payment_method, transaction_reference) VALUES (?, ?, ?, ?, ?)`, [project.id, req.user.id, project.budget, paymentMethod.trim(), transactionReference.trim()]);
    res.status(201).json({ message: "Escrow funded successfully." });
  } catch (error) { next(error); }
});

router.patch("/:id/applications/:applicationId/hire", authenticate, allowRoles("client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const project = await getProject(connection, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "open") throw Object.assign(new Error("This project cannot be hired."), { status: 409 });
    const [escrows] = await connection.query(`SELECT * FROM escrows WHERE project_id = ? AND status = 'funded'`, [project.id]);
    if (!escrows.length) throw Object.assign(new Error("Fund escrow before hiring a freelancer."), { status: 409 });
    const [applications] = await connection.query(`SELECT * FROM applications WHERE id = ? AND project_id = ? AND status IN ('pending','shortlisted')`, [req.params.applicationId, project.id]);
    if (!applications.length) throw Object.assign(new Error("Application not found."), { status: 404 });
    const freelancerId = applications[0].freelancer_id;
    await connection.query(`UPDATE applications SET status = CASE WHEN id = ? THEN 'hired' ELSE 'rejected' END WHERE project_id = ?`, [req.params.applicationId, project.id]);
    await connection.query(`UPDATE escrows SET freelancer_id = ? WHERE project_id = ?`, [freelancerId, project.id]);
    await connection.query(`UPDATE projects SET status = 'in_progress' WHERE id = ?`, [project.id]);
    await notify(connection, freelancerId, "hired", "You have been hired", "A client hired you for a project. You can start working now.", { projectId: project.id });
    await connection.commit();
    res.json({ message: "Freelancer hired. Project is now in progress." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.post("/:id/submissions", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    const hiredFreelancer = await getHiredFreelancer(pool, req.params.id);
    if (!project || hiredFreelancer !== req.user.id || !["in_progress", "submitted"].includes(project.status)) return res.status(409).json({ message: "You cannot submit work for this project." });
    if (!req.body.message?.trim()) return res.status(400).json({ message: "A submission message is required." });
    await pool.query(`INSERT INTO work_submissions (project_id, freelancer_id, message, attachment_url) VALUES (?, ?, ?, ?)`, [project.id, req.user.id, req.body.message.trim(), req.body.attachmentUrl || null]);
    await pool.query(`UPDATE projects SET status = 'submitted' WHERE id = ?`, [project.id]);
    await notify(pool, project.client_id, "work_submitted", "Work submitted", "The freelancer submitted work for your review.", { projectId: project.id });
    res.status(201).json({ message: "Work submitted for client review." });
  } catch (error) { next(error); }
});

router.get("/:id/submissions", authenticate, async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    const freelancerId = await getHiredFreelancer(pool, req.params.id);
    if (!project || ![project.client_id, freelancerId].includes(req.user.id)) return res.status(404).json({ message: "Project not found." });
    const [submissions] = await pool.query(`SELECT * FROM work_submissions WHERE project_id = ? ORDER BY created_at DESC, id DESC`, [project.id]);
    res.json({ submissions });
  } catch (error) { next(error); }
});

router.patch("/:id/submissions/:submissionId/revision", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "submitted" || !req.body.feedback?.trim()) return res.status(409).json({ message: "Provide feedback for a submitted project." });
    const [result] = await pool.query(`UPDATE work_submissions SET status = 'revision_requested', client_feedback = ? WHERE id = ? AND project_id = ? AND status = 'submitted'`, [req.body.feedback.trim(), req.params.submissionId, project.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Submission not found." });
    await pool.query(`UPDATE projects SET status = 'in_progress' WHERE id = ?`, [project.id]);
    await notify(pool, await getHiredFreelancer(pool, project.id), "revision_requested", "Revision requested", req.body.feedback.trim(), { projectId: project.id });
    res.json({ message: "Revision requested." });
  } catch (error) { next(error); }
});

router.patch("/:id/submissions/:submissionId/approve", authenticate, allowRoles("client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const project = await getProject(connection, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "submitted") throw Object.assign(new Error("This submission cannot be approved."), { status: 409 });
    const [result] = await connection.query(`UPDATE work_submissions SET status = 'approved' WHERE id = ? AND project_id = ? AND status = 'submitted'`, [req.params.submissionId, project.id]);
    if (!result.affectedRows) throw Object.assign(new Error("Submission not found."), { status: 404 });
    const freelancerId = await getHiredFreelancer(connection, project.id);
    await connection.query(`UPDATE escrows SET status = 'released', released_at = NOW() WHERE project_id = ? AND status = 'funded'`, [project.id]);
    await connection.query(`UPDATE projects SET status = 'completed' WHERE id = ?`, [project.id]);
    await notify(connection, freelancerId, "payment_released", "Payment released", "The client approved your work and escrow payment was released.", { projectId: project.id });
    await connection.commit();
    res.json({ message: "Work approved and escrow payment released." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

module.exports = router;
