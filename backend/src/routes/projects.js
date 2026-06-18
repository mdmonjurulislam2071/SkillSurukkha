const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const notify = require("../services/notifications");
const { syncOverdueProjects } = require("../services/deadlines");
const { ensureConversation } = require("../services/messages");
const { createPaymentSession, normalizeCheckoutUrl } = require("../services/paymentProviders");
const { analyzeProjectSubmission } = require("../services/projectEvaluation");
const { finalizeSubmission } = require("../services/escrowReleases");
const router = express.Router();
const proposalUpload = multer({
  storage: multer.diskStorage({
    destination: async (_, __, done) => {
      const directory = path.join(__dirname, "../../uploads/proposals");
      try {
        await fs.mkdir(directory, { recursive: true });
        done(null, directory);
      } catch (error) { done(error); }
    },
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.PROPOSAL_DOCUMENT_MAX_MB || 5) * 1024 * 1024 },
  fileFilter: (_, file, done) => {
    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(extension)) return done(Object.assign(new Error("Only PDF, DOC, DOCX and TXT proposal documents are allowed."), { status: 400 }));
    done(null, true);
  },
});
const submissionUpload = multer({
  storage: multer.diskStorage({
    destination: async (_, __, done) => {
      const directory = path.join(__dirname, "../../private/submissions");
      try {
        await fs.mkdir(directory, { recursive: true });
        done(null, directory);
      } catch (error) { done(error); }
    },
    filename: (_, file, done) => done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.zip`),
  }),
  limits: { fileSize: Number(process.env.PROJECT_ARCHIVE_MAX_MB || 1024) * 1024 * 1024 },
  fileFilter: (_, file, done) => path.extname(file.originalname).toLowerCase() === ".zip"
    ? done(null, true)
    : done(Object.assign(new Error("Only ZIP project archives are allowed."), { status: 400 })),
});

const positiveAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const dateOnly = (value) => value instanceof Date
  ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
  : String(value).slice(0, 10);
const removeUploadedFile = (file) => file ? fs.rm(file.path, { force: true }).catch(() => {}) : Promise.resolve();
async function getProject(connection, projectId) {
  const [rows] = await connection.query(`SELECT * FROM projects WHERE id = ?`, [projectId]);
  return rows[0];
}
async function getHiredFreelancer(connection, projectId) {
  const [rows] = await connection.query(`SELECT freelancer_id FROM applications WHERE project_id = ? AND status = 'hired' LIMIT 1`, [projectId]);
  return rows[0]?.freelancer_id;
}

async function hasActiveFreelancerMarketplaceAccount(freelancerId) {
  const threshold = Number(process.env.SKILL_ACTIVATION_SCORE || 50);
  const [rows] = await pool.query(
    `SELECT id FROM skill_verifications
     WHERE freelancer_id = ? AND ai_score >= ? AND status IN ('verified', 'review_ready')
     LIMIT 1`,
    [freelancerId, threshold]
  );
  return rows.length > 0;
}

router.get("/", async (_, res, next) => {
  try {
    const [projects] = await pool.query(`SELECT p.*, u.name AS client_name FROM projects p JOIN users u ON u.id = p.client_id ORDER BY p.created_at DESC`);
    res.json({ projects });
  } catch (error) { next(error); }
});

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    await syncOverdueProjects(pool);
    const query = req.user.role === "client"
      ? `SELECT p.*, e.status AS escrow_status, d.status AS dispute_status,
           s.id AS latest_submission_id, s.status AS latest_submission_status,
           s.version_number AS latest_submission_version, s.evaluation_score AS latest_evaluation_score,
           s.review_deadline AS latest_review_deadline, submitter.name AS latest_freelancer_name,
           fr.rating AS freelancer_review_rating, fr.comment AS freelancer_review_comment,
           (SELECT COUNT(*) FROM work_submissions counted WHERE counted.project_id = p.id) AS submission_count
         FROM projects p
         LEFT JOIN escrows e ON e.project_id = p.id
         LEFT JOIN project_disputes d ON d.project_id = p.id AND d.status = 'open'
         LEFT JOIN work_submissions s ON s.id = (
           SELECT latest.id FROM work_submissions latest
           WHERE latest.project_id = p.id
           ORDER BY latest.version_number DESC, latest.id DESC LIMIT 1
         )
         LEFT JOIN users submitter ON submitter.id = s.freelancer_id
         LEFT JOIN freelancer_reviews fr ON fr.project_id = p.id
         WHERE p.client_id = ?
         ORDER BY CASE WHEN p.status = 'submitted' THEN 0 ELSE 1 END, p.created_at DESC`
      : `SELECT p.*, u.name AS client_name, a.status AS application_status, e.status AS escrow_status, d.status AS dispute_status,
           s.id AS latest_submission_id, s.status AS latest_submission_status,
           s.version_number AS latest_submission_version, s.evaluation_score AS latest_evaluation_score,
           s.review_deadline AS latest_review_deadline, submitter.name AS latest_freelancer_name,
           fr.rating AS freelancer_review_rating, fr.comment AS freelancer_review_comment,
           (SELECT COUNT(*) FROM work_submissions counted WHERE counted.project_id = p.id) AS submission_count
         FROM applications a
         JOIN projects p ON p.id = a.project_id
         JOIN users u ON u.id = p.client_id
         LEFT JOIN escrows e ON e.project_id = p.id
         LEFT JOIN project_disputes d ON d.project_id = p.id AND d.status = 'open'
         LEFT JOIN work_submissions s ON s.id = (
           SELECT latest.id FROM work_submissions latest
           WHERE latest.project_id = p.id
           ORDER BY latest.version_number DESC, latest.id DESC LIMIT 1
         )
         LEFT JOIN users submitter ON submitter.id = s.freelancer_id
         LEFT JOIN freelancer_reviews fr ON fr.project_id = p.id
         WHERE a.freelancer_id = ?
         ORDER BY a.created_at DESC`;
    const [projects] = await pool.query(query, [req.user.id]);
    res.json({ projects });
  } catch (error) { next(error); }
});

router.post("/", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const { title, description, budget, deadline, skills = [], requirements = [] } = req.body;
    if (!title?.trim() || !description?.trim() || !positiveAmount(budget) || !deadline) return res.status(400).json({ message: "Title, description, a positive budget and deadline are required." });
    if (Number.isNaN(Date.parse(deadline)) || new Date(`${deadline}T23:59:59`) <= new Date()) return res.status(400).json({ message: "Choose a future project deadline." });
    const normalizedRequirements = (Array.isArray(requirements) ? requirements : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 30)
      .map((requirement, index) => ({ id: index + 1, title: requirement, weight: 1 }));
    if (!normalizedRequirements.length) return res.status(400).json({ message: "Add at least one clear acceptance requirement." });
    const [result] = await pool.query(`INSERT INTO projects (client_id, title, description, budget, deadline, skills, requirements) VALUES (?, ?, ?, ?, ?, ?, ?)`, [req.user.id, title.trim(), description.trim(), budget, deadline, JSON.stringify(skills), JSON.stringify(normalizedRequirements)]);
    res.status(201).json({ message: "Project created.", projectId: result.insertId });
  } catch (error) { next(error); }
});

router.post("/:id/apply", authenticate, allowRoles("freelancer"), proposalUpload.single("coverLetterFile"), async (req, res, next) => {
  try {
    if (!await hasActiveFreelancerMarketplaceAccount(req.user.id)) {
      await removeUploadedFile(req.file);
      return res.status(403).json({ message: "Verify a skill with an AI video score of 50% or higher before applying to projects." });
    }
    const { coverLetter, proposedBudget, estimatedDeliveryDate, attachmentUrl } = req.body;
    if ((!coverLetter?.trim() && !req.file) || !positiveAmount(proposedBudget) || !estimatedDeliveryDate) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "Write a cover letter or attach a document, then provide a positive budget and delivery date." });
    }
    const project = await getProject(pool, req.params.id);
    if (!project || project.status !== "open") {
      await removeUploadedFile(req.file);
      return res.status(409).json({ message: "This project is not accepting applications." });
    }
    const deliveryDate = new Date(`${estimatedDeliveryDate}T23:59:59`);
    const projectDeadline = new Date(`${dateOnly(project.deadline)}T23:59:59`);
    if (Number.isNaN(deliveryDate.getTime()) || deliveryDate <= new Date() || deliveryDate > projectDeadline) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "Choose a future delivery date on or before the project deadline." });
    }
    if (attachmentUrl && (typeof attachmentUrl !== "string" || attachmentUrl.length > 500)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "Attachment URL must be 500 characters or fewer." });
    }
    const documentUrl = req.file ? `/uploads/proposals/${req.file.filename}` : attachmentUrl?.trim() || null;
    await pool.query(`INSERT INTO applications (project_id, freelancer_id, cover_letter, proposed_budget, estimated_delivery_date, attachment_url) VALUES (?, ?, ?, ?, ?, ?)`, [req.params.id, req.user.id, coverLetter?.trim() || "", proposedBudget, estimatedDeliveryDate, documentUrl]);
    await notify(pool, project.client_id, "application_received", "New project application", "A freelancer applied to your project.", { projectId: Number(req.params.id) });
    res.status(201).json({ message: "Application submitted." });
  } catch (error) {
    await removeUploadedFile(req.file);
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "You have already applied to this project." });
    next(error);
  }
});

router.get("/:id/applications", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id) return res.status(404).json({ message: "Project not found." });
    const [applications] = await pool.query(`SELECT a.*, u.name, p.avatar_url, p.headline, p.bio, p.country, p.city, p.hourly_rate, p.availability, p.skills, c.id AS conversation_id, ROUND(AVG(CASE WHEN sv.status = 'verified' THEN sv.ai_score END)) AS verified_skill_score, ROUND(AVG(fr.rating), 1) AS profile_rating, COUNT(DISTINCT fr.id) AS review_count FROM applications a JOIN users u ON u.id = a.freelancer_id LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN conversations c ON c.project_id = a.project_id AND c.freelancer_id = a.freelancer_id LEFT JOIN skill_verifications sv ON sv.freelancer_id = u.id LEFT JOIN freelancer_reviews fr ON fr.freelancer_id = u.id WHERE a.project_id = ? GROUP BY a.id, c.id ORDER BY a.created_at DESC, a.id DESC`, [req.params.id]);
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
    const provider = req.body.provider || req.body.paymentMethod || "dev_mock";
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "open") return res.status(409).json({ message: "Escrow cannot be funded for this project." });
    const [[existing]] = await pool.query(`SELECT * FROM escrows WHERE project_id = ? AND status IN ('pending','funded') LIMIT 1`, [project.id]);
    if (existing?.status === "funded") return res.status(409).json({ message: "Escrow is already funded." });
    if (existing?.status === "pending") {
      const checkoutUrl = normalizeCheckoutUrl(existing.checkout_url);
      if (checkoutUrl !== existing.checkout_url) await pool.query(`UPDATE escrows SET checkout_url = ? WHERE id = ?`, [checkoutUrl, existing.id]);
      return res.json({ message: "Escrow payment is already pending.", escrow: { ...existing, checkout_url: checkoutUrl }, checkoutUrl });
    }
    const session = await createPaymentSession({ project, provider });
    await pool.query(
      `INSERT INTO escrows (project_id, client_id, amount, payment_method, transaction_reference, payment_provider, provider_session_id, checkout_url, status, funded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${session.status === "funded" ? "NOW()" : "NULL"})`,
      [project.id, req.user.id, project.budget, session.provider, session.reference, session.provider, session.providerSessionId, session.checkoutUrl, session.status]
    );
    const [[escrow]] = await pool.query(`SELECT * FROM escrows WHERE project_id = ?`, [project.id]);
    if (session.mode === "manual_review") {
      await notify.role(
        pool,
        "admin",
        "escrow_review_requested",
        "Escrow payment needs review",
        `${project.title} has a ${session.provider.replace(/_/g, " ")} payment pending admin verification.`,
        { projectId: project.id, escrowId: escrow.id, route: "dashboard" }
      );
    }
    res.status(201).json({
      message: session.status === "funded" ? "Escrow funded successfully." : "Escrow payment session created.",
      escrow,
      checkoutUrl: session.checkoutUrl,
      paymentMode: session.mode,
    });
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
    await ensureConversation(project.id, connection);
    await notify(connection, freelancerId, "hired", "You have been hired", "A client hired you for a project. You can start working now.", { projectId: project.id });
    await connection.commit();
    res.json({ message: "Freelancer hired. Project is now in progress." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.patch("/:id/deadline", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    await syncOverdueProjects(pool);
    const project = await getProject(pool, req.params.id);
    const extendedDeadline = req.body.deadline;
    if (!project || project.client_id !== req.user.id || !["in_progress", "overdue"].includes(project.status)) return res.status(409).json({ message: "The deadline cannot be extended for this project." });
    if (!extendedDeadline || Number.isNaN(Date.parse(extendedDeadline)) || new Date(`${extendedDeadline}T23:59:59`) <= new Date()) return res.status(400).json({ message: "Choose a future deadline." });
    if (!req.body.reason?.trim()) return res.status(400).json({ message: "Provide a reason for the deadline extension." });
    await pool.query(`INSERT INTO deadline_extensions (project_id, previous_deadline, extended_deadline, reason, created_by) VALUES (?, ?, ?, ?, ?)`, [project.id, project.deadline, extendedDeadline, req.body.reason.trim(), req.user.id]);
    await pool.query(`UPDATE projects SET deadline = ?, status = 'in_progress', overdue_notified_at = NULL WHERE id = ?`, [extendedDeadline, project.id]);
    const freelancerId = await getHiredFreelancer(pool, project.id);
    if (freelancerId) await notify(pool, freelancerId, "deadline_extended", "Project deadline extended", `${project.title} now has a deadline of ${extendedDeadline}.`, { projectId: project.id });
    res.json({ message: "Project deadline extended.", deadline: extendedDeadline });
  } catch (error) { next(error); }
});

router.post("/:id/explanation", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    await syncOverdueProjects(pool);
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "overdue") return res.status(409).json({ message: "An explanation can only be requested for an overdue project." });
    const freelancerId = await getHiredFreelancer(pool, project.id);
    if (!freelancerId) return res.status(409).json({ message: "No hired freelancer found." });
    const message = req.body.message?.trim() || `Please explain the missed deadline for ${project.title}.`;
    await notify(pool, freelancerId, "deadline_explanation_requested", "Deadline explanation requested", message, { projectId: project.id });
    res.json({ message: "Explanation request sent." });
  } catch (error) { next(error); }
});

router.patch("/:id/cancel-refund", authenticate, allowRoles("client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await syncOverdueProjects(connection);
    const project = await getProject(connection, req.params.id);
    if (!project || project.client_id !== req.user.id || !["open", "overdue"].includes(project.status)) throw Object.assign(new Error("This project cannot be cancelled with an automatic refund."), { status: 409 });
    const [[{ total }]] = await connection.query(`SELECT COUNT(*) AS total FROM work_submissions WHERE project_id = ?`, [project.id]);
    if (Number(total)) throw Object.assign(new Error("Work has already been submitted. Open a dispute for a reviewed refund decision."), { status: 409 });
    const [escrows] = await connection.query(`SELECT * FROM escrows WHERE project_id = ? AND status = 'funded'`, [project.id]);
    if (!escrows.length) throw Object.assign(new Error("No funded escrow is available for refund."), { status: 409 });
    await connection.query(`UPDATE escrows SET status = 'refunded', refunded_at = NOW() WHERE project_id = ? AND status = 'funded'`, [project.id]);
    await connection.query(`UPDATE projects SET status = 'cancelled' WHERE id = ?`, [project.id]);
    const freelancerId = await getHiredFreelancer(connection, project.id);
    if (freelancerId) await notify(connection, freelancerId, "project_cancelled", "Project cancelled", `${project.title} was cancelled and its escrow was refunded to the client.`, { projectId: project.id });
    await connection.commit();
    res.json({ message: "Project cancelled and escrow refunded." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.post("/:id/disputes", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await syncOverdueProjects(connection);
    const project = await getProject(connection, req.params.id);
    const freelancerId = await getHiredFreelancer(connection, req.params.id);
    if (!project || ![project.client_id, freelancerId].includes(req.user.id) || !["in_progress", "overdue", "submitted", "revision_required"].includes(project.status)) throw Object.assign(new Error("A dispute cannot be opened for this project."), { status: 409 });
    if (!req.body.reason?.trim()) throw Object.assign(new Error("Provide a reason for the dispute."), { status: 400 });
    const [[existing]] = await connection.query(`SELECT id FROM project_disputes WHERE project_id = ? AND status = 'open' LIMIT 1`, [project.id]);
    if (existing) throw Object.assign(new Error("An open dispute already exists for this project."), { status: 409 });
    const [result] = await connection.query(`INSERT INTO project_disputes (project_id, opened_by, reason) VALUES (?, ?, ?)`, [project.id, req.user.id, req.body.reason.trim()]);
    await connection.query(`UPDATE projects SET status = 'disputed' WHERE id = ?`, [project.id]);
    const otherPartyId = req.user.id === project.client_id ? freelancerId : project.client_id;
    if (otherPartyId) await notify(connection, otherPartyId, "project_disputed", "Project dispute opened", `${project.title} has an open dispute.`, { projectId: project.id, disputeId: result.insertId });
    await notify.role(
      connection,
      "admin",
      "dispute_review_requested",
      "Dispute needs review",
      `${project.title} has a new dispute waiting for administrator review.`,
      { projectId: project.id, disputeId: result.insertId, route: "dashboard" }
    );
    await connection.commit();
    res.status(201).json({ message: "Dispute opened for administrator review.", disputeId: result.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.post("/:id/submissions", authenticate, allowRoles("freelancer"), submissionUpload.single("projectArchive"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    const hiredFreelancer = await getHiredFreelancer(pool, req.params.id);
    if (!project || hiredFreelancer !== req.user.id || !["in_progress", "overdue", "revision_required"].includes(project.status)) {
      await removeUploadedFile(req.file);
      return res.status(409).json({ message: "You cannot submit work for this project." });
    }
    const message = req.body.message?.trim();
    const repositoryUrl = req.body.repositoryUrl?.trim() || null;
    const liveUrl = req.body.liveUrl?.trim() || null;
    const implementationNotes = req.body.implementationNotes?.trim() || null;
    const validUrl = (value) => !value || /^https?:\/\/\S+$/i.test(value);
    if (!message || (!req.file && !repositoryUrl && !liveUrl)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "Describe the work and provide a ZIP archive, repository URL or live demo URL." });
    }
    if (!validUrl(repositoryUrl) || !validUrl(liveUrl)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: "Repository and live demo links must be valid HTTP(S) URLs." });
    }
    const [[previous]] = await pool.query(`SELECT id, version_number FROM work_submissions WHERE project_id = ? ORDER BY version_number DESC, id DESC LIMIT 1`, [project.id]);
    const versionNumber = Number(previous?.version_number || 0) + 1;
    const [result] = await pool.query(
      `INSERT INTO work_submissions
       (project_id, freelancer_id, message, repository_url, live_url, archive_url, archive_path, implementation_notes, status, version_number, previous_submission_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'analyzing', ?, ?)`,
      [project.id, req.user.id, message, repositoryUrl, liveUrl, null, req.file?.path || null, implementationNotes, versionNumber, previous?.id || null]
    );
    await notify(pool, project.client_id, "work_analysis_started", "Submitted work is being checked", "The freelancer submitted work and automated requirement review has started.", { projectId: project.id, submissionId: result.insertId });
    analyzeProjectSubmission(result.insertId).catch((error) => console.error(`Project submission analysis ${result.insertId} failed:`, error.message));
    res.status(202).json({ message: "Project submitted. Automated requirement review has started.", submissionId: result.insertId, status: "analyzing" });
  } catch (error) {
    await removeUploadedFile(req.file);
    next(error);
  }
});

router.get("/:id/submissions", authenticate, async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    const freelancerId = await getHiredFreelancer(pool, req.params.id);
    if (!project || ![project.client_id, freelancerId].includes(req.user.id)) return res.status(404).json({ message: "Project not found." });
    const [submissions] = await pool.query(`SELECT * FROM work_submissions WHERE project_id = ? ORDER BY created_at DESC, id DESC`, [project.id]);
    res.json({
      submissions: submissions.map((submission) => {
        const { archive_path: archivePath, ...publicSubmission } = submission;
        const clientOwnsProject = Number(project.client_id) === Number(req.user.id);
        const clientPassThreshold = Number(process.env.AI_CLIENT_PASS_SCORE || 50);
        const clientCanPreviewLiveUrl = clientOwnsProject
          && Number(submission.evaluation_score || 0) > clientPassThreshold
          && ["submitted", "ai_revision_required", "revision_requested", "approved"].includes(submission.status);
        const clientCanAccessSource = clientOwnsProject && project.status === "completed";
        const freelancerCanAccessSource = Number(freelancerId) === Number(req.user.id);
        return {
          ...publicSubmission,
          repository_url: (freelancerCanAccessSource || clientCanAccessSource) ? publicSubmission.repository_url : null,
          live_url: (freelancerCanAccessSource || clientCanAccessSource || clientCanPreviewLiveUrl) ? publicSubmission.live_url : null,
          archive_url: (freelancerCanAccessSource || clientCanAccessSource) ? publicSubmission.archive_url : null,
          has_archive: (freelancerCanAccessSource || clientCanAccessSource) && Boolean(archivePath),
        };
      }),
    });
  } catch (error) { next(error); }
});

router.get("/:id/submissions/:submissionId/download", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.freelancer_id, s.archive_path, s.status AS submission_status,
              p.id AS project_id, p.client_id, p.title, p.status AS project_status,
              e.status AS escrow_status
       FROM work_submissions s
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN escrows e ON e.project_id = p.id
       WHERE s.id = ? AND s.project_id = ?`,
      [req.params.submissionId, req.params.id]
    );
    const submission = rows[0];
    if (!submission?.archive_path) return res.status(404).json({ message: "Project archive not found." });
    const isFreelancer = req.user.role === "freelancer" && Number(submission.freelancer_id) === Number(req.user.id);
    const clientCanDownload = req.user.role === "client"
      && Number(submission.client_id) === Number(req.user.id)
      && submission.project_status === "completed"
      && submission.escrow_status === "released";
    if (!isFreelancer && !clientCanDownload) {
      return res.status(403).json({ message: "The client can download source files only after approving the work and releasing escrow." });
    }
    const allowedRoots = [
      path.resolve(__dirname, "../../private/submissions"),
      path.resolve(__dirname, "../../uploads/submissions"),
    ];
    const archivePath = path.resolve(submission.archive_path);
    if (!allowedRoots.some((root) => archivePath.startsWith(`${root}${path.sep}`))) {
      return res.status(403).json({ message: "Invalid project archive path." });
    }
    await fs.access(archivePath);
    const safeTitle = submission.title.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project";
    res.download(archivePath, `${safeTitle}-delivery.zip`);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ message: "Project archive not found." });
    next(error);
  }
});

router.post("/:id/submissions/:submissionId/retry-analysis", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id FROM work_submissions s
       JOIN projects p ON p.id = s.project_id
       JOIN applications a ON a.project_id = s.project_id AND a.freelancer_id = s.freelancer_id AND a.status = 'hired'
       WHERE s.id = ? AND s.project_id = ?
         AND (s.freelancer_id = ? OR p.client_id = ?)
         AND s.status IN ('analysis_failed', 'ai_revision_required')`,
      [req.params.submissionId, req.params.id, req.user.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Project analysis not found or cannot be retried." });
    analyzeProjectSubmission(req.params.submissionId).catch((error) => console.error(`Project submission analysis ${req.params.submissionId} failed:`, error.message));
    res.status(202).json({ message: "Automated requirement review restarted." });
  } catch (error) { next(error); }
});

router.patch("/:id/submissions/:submissionId/revision", authenticate, allowRoles("client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await syncOverdueProjects(connection);
    const project = await getProject(connection, req.params.id);
    const requirementIds = Array.isArray(req.body.requirementIds) ? req.body.requirementIds.map(Number).filter(Number.isFinite) : [];
    const issue = req.body.issue?.trim();
    const expectedResult = req.body.expectedResult?.trim();
    const evidence = req.body.evidence?.trim();
    if (!project || project.client_id !== req.user.id || !["submitted", "in_progress", "overdue", "revision_required"].includes(project.status)) throw Object.assign(new Error("This project is not awaiting client review."), { status: 409 });
    if (!requirementIds.length || !issue || !expectedResult || !evidence) throw Object.assign(new Error("Select original requirements and provide the issue, expected result and evidence."), { status: 400 });
    const requirements = typeof project.requirements === "string" ? JSON.parse(project.requirements || "[]") : project.requirements || [];
    const validIds = new Set(requirements.map((item) => Number(item.id)));
    if (requirementIds.some((id) => !validIds.has(id))) throw Object.assign(new Error("Revision requests must refer only to original project requirements."), { status: 400 });
    const revisionDetails = { requirementIds, issue, expectedResult, evidence, requestedAt: new Date().toISOString() };
    const [result] = await connection.query(
      `UPDATE work_submissions SET status = 'revision_requested', client_feedback = ?, revision_details = ?
       WHERE id = ? AND project_id = ? AND status IN ('submitted', 'ai_revision_required')
         AND (review_deadline IS NULL OR review_deadline > NOW())
         AND id = (SELECT latest_id FROM (SELECT MAX(id) AS latest_id FROM work_submissions WHERE project_id = ?) latest)`,
      [issue, JSON.stringify(revisionDetails), req.params.submissionId, project.id, project.id]
    );
    if (!result.affectedRows) throw Object.assign(new Error("Submission not found."), { status: 404 });
    await connection.query(`UPDATE projects SET status = 'revision_required' WHERE id = ?`, [project.id]);
    await notify(connection, await getHiredFreelancer(connection, project.id), "revision_requested", "Requirement-specific revision requested", `${issue} Expected: ${expectedResult}`, { projectId: project.id, submissionId: Number(req.params.submissionId), requirementIds });
    await connection.commit();
    res.json({ message: "Revision requested. The existing submission remains preserved as an immutable version." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.patch("/:id/submissions/:submissionId/approve", authenticate, allowRoles("client"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await syncOverdueProjects(connection);
    const rating = req.body.rating === undefined || req.body.rating === null || req.body.rating === "" ? null : Number(req.body.rating);
    const reviewComment = String(req.body.reviewComment || "").trim();
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw Object.assign(new Error("Rating must be between 1 and 5."), { status: 400 });
    const project = await getProject(connection, req.params.id);
    if (!project || project.client_id !== req.user.id || !["submitted", "in_progress", "overdue", "revision_required"].includes(project.status)) throw Object.assign(new Error("This submission cannot be approved."), { status: 409 });
    const clientPassThreshold = Number(process.env.AI_CLIENT_PASS_SCORE || 50);
    const [rows] = await connection.query(
      `SELECT s.*, p.client_id
       FROM work_submissions s JOIN projects p ON p.id = s.project_id
       WHERE s.id = ? AND s.project_id = ?
         AND (s.status = 'submitted' OR (s.status = 'ai_revision_required' AND s.evaluation_score > ?))
         AND s.id = (SELECT latest_id FROM (SELECT MAX(id) AS latest_id FROM work_submissions WHERE project_id = ?) latest)
       FOR UPDATE`,
      [req.params.submissionId, project.id, clientPassThreshold, project.id]
    );
    const submission = rows[0];
    if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
    await finalizeSubmission(connection, submission, "Client approved the submitted work.");
    if (rating !== null) {
      await connection.query(
        `INSERT INTO freelancer_reviews (project_id, client_id, freelancer_id, submission_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), submission_id = VALUES(submission_id)`,
        [project.id, req.user.id, submission.freelancer_id, submission.id, rating, reviewComment || null]
      );
      await notify(connection, submission.freelancer_id, "client_review_received", "Client rated your work", `You received ${rating}/5 stars for ${project.title}.`, { projectId: project.id, rating });
    }
    await connection.commit();
    res.json({ message: "Work approved. All remaining escrow was released and every submission version is now downloadable." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

router.post("/:id/review", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    const project = await getProject(pool, req.params.id);
    if (!project || project.client_id !== req.user.id || project.status !== "completed") return res.status(409).json({ message: "You can rate the freelancer after the project is completed." });
    const freelancerId = await getHiredFreelancer(pool, project.id);
    if (!freelancerId) return res.status(404).json({ message: "No hired freelancer found for this project." });
    const rating = Number(req.body.rating);
    const reviewComment = String(req.body.reviewComment || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be between 1 and 5." });
    const [[submission = {}]] = await pool.query(`SELECT id FROM work_submissions WHERE project_id = ? AND freelancer_id = ? ORDER BY version_number DESC, id DESC LIMIT 1`, [project.id, freelancerId]);
    await pool.query(
      `INSERT INTO freelancer_reviews (project_id, client_id, freelancer_id, submission_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), submission_id = VALUES(submission_id)`,
      [project.id, req.user.id, freelancerId, submission.id || null, rating, reviewComment || null]
    );
    await notify(pool, freelancerId, "client_review_received", "Client rated your work", `You received ${rating}/5 stars for ${project.title}.`, { projectId: project.id, rating });
    res.json({ message: "Freelancer review saved." });
  } catch (error) { next(error); }
});

module.exports = router;
