require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const pool = require("../config/db");

const run = promisify(execFile);
const baseUrl = `http://localhost:${process.env.PORT || 5000}/api`;
const temporaryVideo = path.join(__dirname, "../../uploads/skills/integration-sample.mp4");

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.message}`);
  return data;
}

async function main() {
  const stamp = Date.now();
  const email = `integration.ai.${stamp}@example.com`;
  const password = "StrongPass123!";
  await run(process.env.FFMPEG_PATH || "ffmpeg", [
    "-y", "-f", "lavfi", "-i", "color=c=blue:s=640x360:d=2",
    "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
    "-shortest", "-c:v", "libx264", "-c:a", "aac", temporaryVideo,
  ], { windowsHide: true });
  let userId;
  try {
    const registration = await request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Integration AI Freelancer", email, password, role: "freelancer" }),
    });
    const session = await request("/auth/verify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: email, channel: "email", code: registration.devOtp }),
    });
    userId = session.user.id;
    await request("/profiles/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ skills: ["UI/UX Design"] }),
    });
    const body = new FormData();
    body.append("skillName", "UI/UX Design");
    body.append("taskDescription", "Explain a transaction history screen design.");
    body.append("video", new Blob([await fs.readFile(temporaryVideo)], { type: "video/mp4" }), "sample.mp4");
    const upload = await request("/skills/upload", { method: "POST", headers: { Authorization: `Bearer ${session.token}` }, body });
    let verification;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mine = await request("/skills/mine", { headers: { Authorization: `Bearer ${session.token}` } });
      verification = mine.verifications.find((item) => item.id === upload.verificationId);
      if (!["pending", "processing"].includes(verification.status)) break;
    }
    console.log(JSON.stringify({ verificationId: verification.id, status: verification.status, analysisError: verification.analysis_error }));
    if (!process.env.HF_TOKEN && (verification.status !== "failed" || verification.analysis_error !== "HF_TOKEN is not configured.")) {
      throw new Error("Expected a clear missing HF_TOKEN failure.");
    }
    if (process.env.HF_TOKEN && verification.status !== "review_ready") {
      throw new Error(verification.analysis_error || `Expected review_ready status, received ${verification.status}.`);
    }
  } finally {
    if (userId) {
      const [rows] = await pool.query(`SELECT video_path FROM skill_verifications WHERE freelancer_id = ?`, [userId]);
      await pool.query(`DELETE FROM users WHERE id = ?`, [userId]);
      await Promise.all(rows.map((row) => fs.rm(row.video_path, { force: true })));
    }
    await fs.rm(temporaryVideo, { force: true });
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
