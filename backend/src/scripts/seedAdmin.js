require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function seedAdmin() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding an admin.");
  }
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified_at)
     VALUES (?, ?, ?, 'admin', NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin', email_verified_at = NOW()`,
    [process.env.ADMIN_NAME || "SkillShurokkha Admin", process.env.ADMIN_EMAIL.toLowerCase(), passwordHash]
  );
  console.log(`Admin ready: ${process.env.ADMIN_EMAIL.toLowerCase()}`);
}

seedAdmin()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
    return pool.end();
  });
