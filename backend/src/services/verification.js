const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

async function sendVerification(contact, channel, code) {
  if (process.env.OTP_DEV_MODE === "true") {
    console.log(`[DEV OTP] ${channel} ${contact}: ${code}`);
    return;
  }
  if (channel === "email") {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: contact,
      subject: "Verify your SkillShurokkha account",
      text: `Your SkillShurokkha verification code is ${code}. It expires soon.`,
    });
    return;
  }
  throw new Error("Configure an SMS provider adapter before enabling production mobile OTP delivery.");
}

async function createVerification(pool, { contact, channel, payload }) {
  const code = makeOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  await pool.query(
    `INSERT INTO verification_codes (contact, channel, code_hash, payload, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [contact, channel, codeHash, JSON.stringify(payload), minutes]
  );
  await sendVerification(contact, channel, code);
  return process.env.OTP_DEV_MODE === "true" ? code : undefined;
}

module.exports = { createVerification };
