const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const pool = require("./db");

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [process.env.DB_NAME, table, column]
  );
  if (!rows[0].count) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function initDb() {
  const database = process.env.DB_NAME;
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error("DB_NAME may only contain letters, numbers and underscores.");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NULL UNIQUE,
      mobile VARCHAR(30) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','freelancer','client') NOT NULL,
      email_verified_at DATETIME NULL,
      mobile_verified_at DATETIME NULL,
      status ENUM('active','suspended') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      contact VARCHAR(190) NOT NULL,
      channel ENUM('email','mobile') NOT NULL,
      purpose ENUM('register','resend') NOT NULL DEFAULT 'register',
      code_hash VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_verification_contact (contact, channel, created_at)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INT UNSIGNED PRIMARY KEY,
      avatar_url VARCHAR(500) NULL,
      headline VARCHAR(180) NULL,
      bio TEXT NULL,
      country VARCHAR(100) NULL,
      city VARCHAR(100) NULL,
      languages JSON NULL,
      skills JSON NULL,
      experience JSON NULL,
      education JSON NULL,
      portfolio JSON NULL,
      social_links JSON NULL,
      hourly_rate DECIMAL(10,2) NULL,
      availability VARCHAR(80) NULL,
      company_name VARCHAR(180) NULL,
      company_website VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id INT UNSIGNED NOT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NOT NULL,
      budget DECIMAL(12,2) NOT NULL,
      deadline DATE NOT NULL,
      skills JSON NULL,
      status ENUM('open','hired','in_progress','submitted','completed','cancelled') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_project_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      cover_letter TEXT NOT NULL,
      proposed_budget DECIMAL(12,2) NOT NULL,
      status ENUM('pending','shortlisted','hired','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_application (project_id, freelancer_id),
      CONSTRAINT fk_application_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_application_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS escrows (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL UNIQUE,
      client_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(80) NOT NULL,
      transaction_reference VARCHAR(180) NOT NULL,
      status ENUM('funded','released','refunded') NOT NULL DEFAULT 'funded',
      funded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      released_at DATETIME NULL,
      CONSTRAINT fk_escrow_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_escrow_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_escrow_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_submissions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      status ENUM('submitted','revision_requested','approved') NOT NULL DEFAULT 'submitted',
      client_feedback TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_submission_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_submission_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      data JSON NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notification_user (user_id, read_at, created_at),
      CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skill_verifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      freelancer_id INT UNSIGNED NOT NULL,
      skill_name VARCHAR(120) NOT NULL,
      task_description TEXT NOT NULL,
      video_url VARCHAR(500) NOT NULL,
      ai_score DECIMAL(5,2) NULL,
      status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
      badge_reference VARCHAR(255) NULL,
      reviewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_skill_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`ALTER TABLE skill_verifications MODIFY COLUMN status ENUM('pending','processing','review_ready','verified','rejected','failed') NOT NULL DEFAULT 'pending'`);
  await addColumnIfMissing("skill_verifications", "video_path", "VARCHAR(500) NULL");
  await addColumnIfMissing("skill_verifications", "transcript", "LONGTEXT NULL");
  await addColumnIfMissing("skill_verifications", "media_metadata", "JSON NULL");
  await addColumnIfMissing("skill_verifications", "authenticity_report", "JSON NULL");
  await addColumnIfMissing("skill_verifications", "analysis_error", "TEXT NULL");
  await addColumnIfMissing("skill_verifications", "analyzed_at", "DATETIME NULL");

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at)
       VALUES (?, ?, ?, 'admin', NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [process.env.ADMIN_NAME || "SkillShurokkha Admin", process.env.ADMIN_EMAIL, passwordHash]
    );
  }
}

module.exports = initDb;
