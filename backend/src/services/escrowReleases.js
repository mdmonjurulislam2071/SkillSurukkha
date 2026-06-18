const pool = require("../config/db");
const notify = require("./notifications");

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

async function releaseEscrowAmount(connection, escrow, amount, releaseType, submissionId, description) {
  const remaining = money(Number(escrow.amount) - Number(escrow.released_amount || 0));
  const releaseAmount = money(Math.min(Math.max(Number(amount || 0), 0), remaining));
  if (releaseAmount <= 0) return 0;
  await connection.query(
    `INSERT INTO wallet_transactions
     (user_id, project_id, escrow_id, submission_id, type, amount, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [escrow.freelancer_id, escrow.project_id, escrow.id, submissionId || null, releaseType, releaseAmount, description]
  );
  const releasedTotal = money(Number(escrow.released_amount || 0) + releaseAmount);
  const fullyReleased = releasedTotal >= money(escrow.amount);
  await connection.query(
    `UPDATE escrows
     SET released_amount = ?, status = ?, released_at = IF(?, NOW(), released_at)
     WHERE id = ?`,
    [releasedTotal, fullyReleased ? "released" : "partially_released", fullyReleased, escrow.id]
  );
  escrow.released_amount = releasedTotal;
  escrow.status = fullyReleased ? "released" : "partially_released";
  return releaseAmount;
}

async function releaseInitialShare(connection, submission) {
  const [rows] = await connection.query(`SELECT * FROM escrows WHERE project_id = ? FOR UPDATE`, [submission.project_id]);
  const escrow = rows[0];
  if (!escrow || !["funded", "partially_released"].includes(escrow.status) || !escrow.freelancer_id) return 0;
  if (Number(escrow.released_amount || 0) > 0) {
    await connection.query(`UPDATE work_submissions SET initial_release_at = COALESCE(initial_release_at, NOW()) WHERE id = ?`, [submission.id]);
    return 0;
  }
  const percentage = Number(process.env.AI_INITIAL_RELEASE_PERCENT || 90);
  const amount = money(Number(escrow.amount) * percentage / 100);
  const released = await releaseEscrowAmount(
    connection,
    escrow,
    amount,
    "ai_release",
    submission.id,
    `${percentage}% released after the AI dispute hold expired.`
  );
  if (released) {
    await connection.query(`UPDATE work_submissions SET initial_release_at = NOW() WHERE id = ?`, [submission.id]);
    await notify(connection, submission.freelancer_id, "partial_payment_released", "90% payment released", `${released.toFixed(2)} is now available in your SkillShurokkha wallet.`, { projectId: submission.project_id, submissionId: submission.id });
    await notify(connection, submission.client_id, "partial_payment_released", "Protected payment released", `The AI-verified submission passed its dispute window and ${percentage}% of escrow was released.`, { projectId: submission.project_id, submissionId: submission.id });
  }
  return released;
}

async function releaseRemainingShare(connection, submission, reason = "Client approved the submitted work.") {
  const [rows] = await connection.query(`SELECT * FROM escrows WHERE project_id = ? FOR UPDATE`, [submission.project_id]);
  const escrow = rows[0];
  if (!escrow || !["funded", "partially_released"].includes(escrow.status) || !escrow.freelancer_id) return 0;
  const remaining = money(Number(escrow.amount) - Number(escrow.released_amount || 0));
  const released = await releaseEscrowAmount(connection, escrow, remaining, "final_release", submission.id, reason);
  if (released) {
    await connection.query(`UPDATE work_submissions SET final_release_at = NOW() WHERE id = ?`, [submission.id]);
    await notify(connection, submission.freelancer_id, "payment_released", "Remaining payment released", `${released.toFixed(2)} was released to your SkillShurokkha wallet.`, { projectId: submission.project_id, submissionId: submission.id });
  }
  return released;
}

async function finalizeSubmission(connection, submission, reason) {
  await releaseRemainingShare(connection, submission, reason);
  await connection.query(`UPDATE work_submissions SET status = 'approved', approved_at = NOW() WHERE id = ?`, [submission.id]);
  await connection.query(`UPDATE projects SET status = 'completed' WHERE id = ?`, [submission.project_id]);
  await notify(connection, submission.client_id, "project_completed", "Project completed", "The final deliverables and all submission versions are now available for download.", { projectId: submission.project_id, submissionId: submission.id });
}

async function syncSubmissionPayments(connection = pool) {
  const ownConnection = connection === pool ? await pool.getConnection() : null;
  const db = ownConnection || connection;
  try {
    if (ownConnection) await db.beginTransaction();
    const [initialCandidates] = await db.query(
      `SELECT s.*, p.client_id
       FROM work_submissions s
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN project_disputes d ON d.project_id = p.id AND d.status = 'open'
       WHERE s.status = 'submitted' AND s.ai_qualified = 1
         AND s.dispute_deadline IS NOT NULL AND s.dispute_deadline <= NOW()
         AND s.initial_release_at IS NULL AND d.id IS NULL`
    );
    for (const submission of initialCandidates) await releaseInitialShare(db, submission);

    const [reminders] = await db.query(
      `SELECT s.id, s.project_id, p.client_id, s.freelancer_id, s.version_number, s.review_deadline, s.review_reminder_stage, p.title
       FROM work_submissions s
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN project_disputes d ON d.project_id = p.id AND d.status = 'open'
       WHERE s.status = 'submitted' AND s.ai_qualified = 1 AND s.review_deadline > NOW()
         AND d.id IS NULL AND s.review_reminder_stage < 2
         AND s.id = (SELECT MAX(latest.id) FROM work_submissions latest WHERE latest.project_id = s.project_id)`
    );
    for (const submission of reminders) {
      const millisecondsLeft = new Date(submission.review_deadline).getTime() - Date.now();
      const hoursLeft = millisecondsLeft / 3600000;
      const nextStage = hoursLeft <= 24 ? 2 : hoursLeft <= 48 ? 1 : 0;
      if (!nextStage || nextStage <= Number(submission.review_reminder_stage)) continue;
      await notify(db, submission.client_id, nextStage === 2 ? "review_final_reminder" : "review_reminder", nextStage === 2 ? "Final project review reminder" : "Project review reminder", `${submission.title} version ${submission.version_number} will auto-complete in about ${Math.max(1, Math.ceil(hoursLeft))} hours unless you approve, request a requirement-specific revision, or open a dispute.`, { projectId: submission.project_id, submissionId: submission.id });
      await db.query(`UPDATE work_submissions SET review_reminder_stage = ? WHERE id = ?`, [nextStage, submission.id]);
    }

    const [finalCandidates] = await db.query(
      `SELECT s.*, p.client_id
       FROM work_submissions s
       JOIN projects p ON p.id = s.project_id
       JOIN escrows e ON e.project_id = p.id
       LEFT JOIN project_disputes d ON d.project_id = p.id AND d.status = 'open'
       WHERE s.status = 'submitted' AND s.ai_qualified = 1
         AND s.review_deadline IS NOT NULL AND s.review_deadline <= NOW()
         AND e.status IN ('funded','partially_released') AND d.id IS NULL
         AND s.id = (SELECT MAX(latest.id) FROM work_submissions latest WHERE latest.project_id = s.project_id)`
    );
    for (const submission of finalCandidates) {
      await releaseInitialShare(db, submission);
      await finalizeSubmission(db, submission, "Client review deadline expired without a dispute.");
    }
    if (ownConnection) await db.commit();
  } catch (error) {
    if (ownConnection) await db.rollback();
    throw error;
  } finally {
    if (ownConnection) ownConnection.release();
  }
}

module.exports = { finalizeSubmission, money, releaseInitialShare, releaseRemainingShare, syncSubmissionPayments };
