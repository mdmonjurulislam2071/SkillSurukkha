require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { finalizeSubmission, releaseInitialShare } = require("../services/escrowReleases");

async function main() {
  const connection = await pool.getConnection();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash("TestPassword123!", 4);
    const [clientResult] = await connection.query(`INSERT INTO users (name, email, password_hash, role, email_verified_at) VALUES ('Release Test Client', ?, ?, 'client', NOW())`, [`release-client-${stamp}@example.com`, passwordHash]);
    const [freelancerResult] = await connection.query(`INSERT INTO users (name, email, password_hash, role, email_verified_at) VALUES ('Release Test Freelancer', ?, ?, 'freelancer', NOW())`, [`release-freelancer-${stamp}@example.com`, passwordHash]);
    const clientId = clientResult.insertId;
    const freelancerId = freelancerResult.insertId;
    await connection.query(`INSERT INTO profiles (user_id) VALUES (?), (?)`, [clientId, freelancerId]);
    const [projectResult] = await connection.query(
      `INSERT INTO projects (client_id, title, description, budget, deadline, requirements, status)
       VALUES (?, 'Escrow release test', 'Disposable workflow test', 1000, DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, 'submitted')`,
      [clientId, JSON.stringify([{ id: 1, title: "Test requirement", weight: 1 }])]
    );
    const projectId = projectResult.insertId;
    await connection.query(`INSERT INTO applications (project_id, freelancer_id, cover_letter, proposed_budget, estimated_delivery_date, status) VALUES (?, ?, 'Test', 1000, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'hired')`, [projectId, freelancerId]);
    const [escrowResult] = await connection.query(
      `INSERT INTO escrows (project_id, client_id, freelancer_id, amount, payment_method, transaction_reference, status, funded_at)
       VALUES (?, ?, ?, 1000, 'test', ?, 'funded', NOW())`,
      [projectId, clientId, freelancerId, `TEST-${stamp}`]
    );
    const [submissionResult] = await connection.query(
      `INSERT INTO work_submissions
       (project_id, freelancer_id, message, status, version_number, evaluation_score, evaluation_provider, ai_qualified, dispute_deadline, review_deadline)
       VALUES (?, ?, 'Test submission', 'submitted', 1, 96, 'openai', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 4 DAY))`,
      [projectId, freelancerId]
    );
    const submission = { id: submissionResult.insertId, project_id: projectId, freelancer_id: freelancerId, client_id: clientId };
    const initial = await releaseInitialShare(connection, submission);
    const duplicate = await releaseInitialShare(connection, submission);
    if (initial !== 900 || duplicate !== 0) throw new Error(`Initial release assertion failed: ${initial}, ${duplicate}`);
    await finalizeSubmission(connection, submission, "Disposable test approval.");
    const [[escrow]] = await connection.query(`SELECT status, released_amount FROM escrows WHERE id = ?`, [escrowResult.insertId]);
    const [[wallet]] = await connection.query(`SELECT COUNT(*) AS entries, SUM(amount) AS total FROM wallet_transactions WHERE escrow_id = ?`, [escrowResult.insertId]);
    const [[project]] = await connection.query(`SELECT status FROM projects WHERE id = ?`, [projectId]);
    if (escrow.status !== "released" || Number(escrow.released_amount) !== 1000 || Number(wallet.entries) !== 2 || Number(wallet.total) !== 1000 || project.status !== "completed") {
      throw new Error("Final release workflow assertion failed.");
    }
    console.log(JSON.stringify({ initialRelease: initial, duplicateRelease: duplicate, finalReleased: Number(escrow.released_amount), walletEntries: Number(wallet.entries), projectStatus: project.status }));
    await connection.rollback();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
