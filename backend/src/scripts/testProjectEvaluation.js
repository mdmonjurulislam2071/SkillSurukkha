require("dotenv").config();
const pool = require("../config/db");

async function main() {
  const [[projectColumns], [submissionColumns]] = await Promise.all([
    pool.query("SHOW COLUMNS FROM projects"),
    pool.query("SHOW COLUMNS FROM work_submissions"),
  ]);
  const projectNames = projectColumns.map((column) => column.Field);
  const submissionNames = submissionColumns.map((column) => column.Field);
  const requiredSubmissionColumns = [
    "repository_url",
    "live_url",
    "archive_path",
    "evaluation_score",
    "evaluation_report",
    "ai_badge_reference",
    "version_number",
    "review_deadline",
    "initial_release_at",
  ];
  if (!projectNames.includes("requirements")) throw new Error("projects.requirements is missing.");
  const missing = requiredSubmissionColumns.filter((column) => !submissionNames.includes(column));
  if (missing.length) throw new Error(`Missing work_submissions columns: ${missing.join(", ")}`);
  const [[walletTable]] = await pool.query(`SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('wallet_transactions','withdrawal_requests')`, [process.env.DB_NAME]);
  if (Number(walletTable.total) !== 2) throw new Error("Wallet tables are missing.");
  console.log(JSON.stringify({
    schemaReady: true,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_PROJECT_REVIEW_MODEL || "gpt-5.5",
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
