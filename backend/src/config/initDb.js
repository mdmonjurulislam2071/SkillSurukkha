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

async function addIndexIfMissing(table, index, definition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [process.env.DB_NAME, table, index]
  );
  if (!rows[0].count) await pool.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
}

async function dropIndexIfExists(table, index) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [process.env.DB_NAME, table, index]
  );
  if (rows[0].count) await pool.query(`ALTER TABLE \`${table}\` DROP INDEX \`${index}\``);
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
      requirements JSON NULL,
      status ENUM('open','hired','in_progress','overdue','submitted','revision_required','disputed','completed','cancelled') DEFAULT 'open',
      overdue_notified_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_project_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`ALTER TABLE projects MODIFY COLUMN status ENUM('open','hired','in_progress','overdue','submitted','revision_required','disputed','completed','cancelled') DEFAULT 'open'`);
  await addColumnIfMissing("projects", "overdue_notified_at", "DATETIME NULL");
  await addColumnIfMissing("projects", "requirements", "JSON NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      cover_letter TEXT NOT NULL,
      proposed_budget DECIMAL(12,2) NOT NULL,
      estimated_delivery_date DATE NOT NULL,
      attachment_url VARCHAR(500) NULL,
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
      payment_provider VARCHAR(80) NULL,
      provider_session_id VARCHAR(190) NULL,
      checkout_url VARCHAR(600) NULL,
      status ENUM('pending','funded','partially_released','released','refunded','failed') NOT NULL DEFAULT 'pending',
      released_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      funded_at DATETIME NULL,
      released_at DATETIME NULL,
      refunded_at DATETIME NULL,
      CONSTRAINT fk_escrow_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_escrow_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_escrow_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await addColumnIfMissing("applications", "estimated_delivery_date", "DATE NULL");
  await addColumnIfMissing("applications", "attachment_url", "VARCHAR(500) NULL");
  await pool.query(`ALTER TABLE escrows MODIFY COLUMN status ENUM('pending','funded','partially_released','released','refunded','failed') NOT NULL DEFAULT 'pending'`);
  await addColumnIfMissing("escrows", "released_amount", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await addColumnIfMissing("escrows", "refunded_amount", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await pool.query(`ALTER TABLE escrows MODIFY COLUMN funded_at DATETIME NULL`);
  await addColumnIfMissing("escrows", "payment_provider", "VARCHAR(80) NULL");
  await addColumnIfMissing("escrows", "provider_session_id", "VARCHAR(190) NULL");
  await addColumnIfMissing("escrows", "checkout_url", "VARCHAR(600) NULL");
  await addColumnIfMissing("escrows", "refunded_at", "DATETIME NULL");
  await addIndexIfMissing("escrows", "idx_escrow_provider_session", "INDEX idx_escrow_provider_session (payment_provider, provider_session_id)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deadline_extensions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      previous_deadline DATE NOT NULL,
      extended_deadline DATE NOT NULL,
      reason TEXT NOT NULL,
      created_by INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_extension_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_extension_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_disputes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      opened_by INT UNSIGNED NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('open','resolved') NOT NULL DEFAULT 'open',
      resolution TEXT NULL,
      resolved_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dispute_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_dispute_user FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_submissions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      repository_url VARCHAR(500) NULL,
      live_url VARCHAR(500) NULL,
      archive_url VARCHAR(500) NULL,
      archive_path VARCHAR(500) NULL,
      implementation_notes TEXT NULL,
      status ENUM('analyzing','ai_revision_required','analysis_failed','submitted','revision_requested','approved') NOT NULL DEFAULT 'analyzing',
      version_number INT UNSIGNED NOT NULL DEFAULT 1,
      previous_submission_id INT UNSIGNED NULL,
      client_feedback TEXT NULL,
      revision_details JSON NULL,
      evaluation_score DECIMAL(5,2) NULL,
      evaluation_provider VARCHAR(80) NULL,
      evaluation_model VARCHAR(120) NULL,
      evaluation_report JSON NULL,
      evaluation_error TEXT NULL,
      ai_badge_reference VARCHAR(255) NULL,
      ai_qualified TINYINT(1) NOT NULL DEFAULT 0,
      evaluated_at DATETIME NULL,
      dispute_deadline DATETIME NULL,
      review_deadline DATETIME NULL,
      initial_release_at DATETIME NULL,
      final_release_at DATETIME NULL,
      approved_at DATETIME NULL,
      review_reminder_stage TINYINT UNSIGNED NOT NULL DEFAULT 0,
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
  await pool.query(`ALTER TABLE work_submissions MODIFY COLUMN status ENUM('analyzing','ai_revision_required','analysis_failed','submitted','revision_requested','approved') NOT NULL DEFAULT 'analyzing'`);
  await addColumnIfMissing("work_submissions", "repository_url", "VARCHAR(500) NULL");
  await addColumnIfMissing("work_submissions", "live_url", "VARCHAR(500) NULL");
  await addColumnIfMissing("work_submissions", "archive_url", "VARCHAR(500) NULL");
  await addColumnIfMissing("work_submissions", "archive_path", "VARCHAR(500) NULL");
  await addColumnIfMissing("work_submissions", "implementation_notes", "TEXT NULL");
  await addColumnIfMissing("work_submissions", "version_number", "INT UNSIGNED NOT NULL DEFAULT 1");
  await addColumnIfMissing("work_submissions", "previous_submission_id", "INT UNSIGNED NULL");
  await addColumnIfMissing("work_submissions", "revision_details", "JSON NULL");
  await addColumnIfMissing("work_submissions", "evaluation_score", "DECIMAL(5,2) NULL");
  await addColumnIfMissing("work_submissions", "evaluation_provider", "VARCHAR(80) NULL");
  await addColumnIfMissing("work_submissions", "evaluation_model", "VARCHAR(120) NULL");
  await addColumnIfMissing("work_submissions", "evaluation_report", "JSON NULL");
  await addColumnIfMissing("work_submissions", "evaluation_error", "TEXT NULL");
  await addColumnIfMissing("work_submissions", "ai_badge_reference", "VARCHAR(255) NULL");
  await addColumnIfMissing("work_submissions", "ai_qualified", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("work_submissions", "evaluated_at", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "dispute_deadline", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "review_deadline", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "initial_release_at", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "final_release_at", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "approved_at", "DATETIME NULL");
  await addColumnIfMissing("work_submissions", "review_reminder_stage", "TINYINT UNSIGNED NOT NULL DEFAULT 0");
  await addIndexIfMissing("work_submissions", "idx_submission_version", "INDEX idx_submission_version (project_id, version_number)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS freelancer_reviews (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL UNIQUE,
      client_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      submission_id INT UNSIGNED NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_review_freelancer (freelancer_id, created_at),
      CONSTRAINT fk_review_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_submission FOREIGN KEY (submission_id) REFERENCES work_submissions(id) ON DELETE SET NULL,
      CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      project_id INT UNSIGNED NULL,
      escrow_id INT UNSIGNED NULL,
      submission_id INT UNSIGNED NULL,
      type ENUM('ai_release','final_release','withdrawal','adjustment') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wallet_user (user_id, created_at),
      CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_wallet_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      CONSTRAINT fk_wallet_escrow FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE SET NULL,
      CONSTRAINT fk_wallet_submission FOREIGN KEY (submission_id) REFERENCES work_submissions(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      freelancer_id INT UNSIGNED NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      method ENUM('bank','bkash','nagad','rocket','paypal','wise') NOT NULL,
      account_details JSON NOT NULL,
      status ENUM('pending','processing','paid','rejected') NOT NULL DEFAULT 'pending',
      transaction_reference VARCHAR(190) NULL,
      admin_note TEXT NULL,
      processed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_withdrawal_freelancer (freelancer_id, status, created_at),
      CONSTRAINT fk_withdrawal_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nid_verifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      nid_number VARCHAR(40) NOT NULL,
      front_image_url VARCHAR(500) NOT NULL,
      back_image_url VARCHAR(500) NOT NULL,
      status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      reviewed_by INT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nid_user_status (user_id, status, created_at),
      INDEX idx_nid_status (status, created_at),
      CONSTRAINT fk_nid_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_nid_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id INT UNSIGNED NOT NULL,
      application_id INT UNSIGNED NULL,
      client_id INT UNSIGNED NOT NULL,
      freelancer_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_conversation_pair (project_id, freelancer_id),
      CONSTRAINT fk_conversation_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_conversation_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      CONSTRAINT fk_conversation_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_conversation_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await addColumnIfMissing("conversations", "application_id", "INT UNSIGNED NULL");
  await pool.query(`UPDATE conversations c JOIN applications a ON a.project_id = c.project_id AND a.freelancer_id = c.freelancer_id SET c.application_id = COALESCE(c.application_id, a.id)`);
  await addIndexIfMissing("conversations", "unique_conversation_pair", "UNIQUE KEY unique_conversation_pair (project_id, freelancer_id)");
  await addIndexIfMissing("conversations", "unique_conversation_application", "UNIQUE KEY unique_conversation_application (application_id)");
  await pool.query(`
    SET @project_unique_name = (
      SELECT INDEX_NAME FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'conversations' AND column_name = 'project_id' AND NON_UNIQUE = 0
      AND INDEX_NAME NOT IN ('PRIMARY', 'unique_conversation_pair')
      GROUP BY INDEX_NAME HAVING COUNT(*) = 1 LIMIT 1
    )
  `);
  await pool.query(`SET @drop_project_unique = IF(@project_unique_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE conversations DROP INDEX \`', @project_unique_name, '\`'))`);
  await pool.query(`PREPARE drop_project_unique_stmt FROM @drop_project_unique`);
  await pool.query(`EXECUTE drop_project_unique_stmt`);
  await pool.query(`DEALLOCATE PREPARE drop_project_unique_stmt`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT UNSIGNED NOT NULL,
      sender_id INT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_message_conversation (conversation_id, created_at, id),
      CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await addColumnIfMissing("messages", "edited_at", "DATETIME NULL");
  await addColumnIfMissing("messages", "deleted_at", "DATETIME NULL");
  await addColumnIfMissing("messages", "reactions", "JSON NULL");
  await addColumnIfMissing("messages", "project_id", "INT UNSIGNED NULL");
  await pool.query(`UPDATE messages m JOIN conversations c ON c.id = m.conversation_id SET m.project_id = COALESCE(m.project_id, c.project_id)`);
  await addIndexIfMissing("conversations", "idx_conversation_project", "INDEX idx_conversation_project (project_id)");
  await addIndexIfMissing("conversations", "idx_conversation_application", "INDEX idx_conversation_application (application_id)");
  await dropIndexIfExists("conversations", "unique_conversation_application");
  await dropIndexIfExists("conversations", "unique_conversation_pair");
  await pool.query(`
    UPDATE messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN (
      SELECT client_id, freelancer_id, MIN(id) AS keep_id
      FROM conversations
      GROUP BY client_id, freelancer_id
    ) keeper ON keeper.client_id = c.client_id AND keeper.freelancer_id = c.freelancer_id
    SET m.conversation_id = keeper.keep_id
    WHERE m.conversation_id <> keeper.keep_id
  `);
  await pool.query(`
    DELETE c FROM conversations c
    JOIN (
      SELECT client_id, freelancer_id, MIN(id) AS keep_id
      FROM conversations
      GROUP BY client_id, freelancer_id
    ) keeper ON keeper.client_id = c.client_id AND keeper.freelancer_id = c.freelancer_id
    WHERE c.id <> keeper.keep_id
  `);
  await addIndexIfMissing("conversations", "unique_conversation_people", "UNIQUE KEY unique_conversation_people (client_id, freelancer_id)");
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
