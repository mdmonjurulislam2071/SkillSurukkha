const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { createVerification } = require("../services/verification");

const router = express.Router();
const normalize = (value) => value?.trim().toLowerCase();
const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role });
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validMobile = (value) => /^\+?[0-9]{8,15}$/.test(value);

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    const contact = normalize(email || mobile);
    const channel = email ? "email" : "mobile";
    if (!name || !contact || !password || !["freelancer", "client"].includes(role)) {
      return res.status(400).json({ message: "Name, email or mobile, password and a valid role are required." });
    }
    if ((email && !validEmail(contact)) || (mobile && !validMobile(contact)) || (email && mobile)) return res.status(400).json({ message: "Provide one valid email address or mobile number." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const [existing] = await pool.query(`SELECT id FROM users WHERE email = ? OR mobile = ? LIMIT 1`, [email ? contact : null, mobile ? contact : null]);
    if (existing.length) return res.status(409).json({ message: "An account already exists with this contact." });
    const payload = { name: name.trim(), email: email ? contact : null, mobile: mobile ? contact : null, passwordHash: await bcrypt.hash(password, 12), role };
    const devOtp = await createVerification(pool, { contact, channel, payload });
    res.status(201).json({ message: `Verification code sent to your ${channel}.`, contact, channel, devOtp });
  } catch (error) { next(error); }
});

router.post("/resend-registration", async (req, res, next) => {
  try {
    const contact = normalize(req.body.contact);
    const channel = req.body.channel;
    if (!contact || !["email", "mobile"].includes(channel)) return res.status(400).json({ message: "Contact and channel are required." });
    const [rows] = await pool.query(`SELECT payload, created_at FROM verification_codes WHERE contact = ? AND channel = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`, [contact, channel]);
    if (!rows.length) return res.status(404).json({ message: "Registration request not found." });
    const resendSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
    if (Date.now() - new Date(rows[0].created_at).getTime() < resendSeconds * 1000) return res.status(429).json({ message: `Wait ${resendSeconds} seconds before requesting another code.` });
    const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    const devOtp = await createVerification(pool, { contact, channel, payload });
    res.json({ message: "Verification code resent.", devOtp });
  } catch (error) { next(error); }
});

router.post("/verify-registration", async (req, res, next) => {
  try {
    const { contact, channel, code } = req.body;
    if (!contact || !["email", "mobile"].includes(channel) || !/^\d{6}$/.test(String(code))) return res.status(400).json({ message: "Provide a valid 6-digit verification code." });
    const [rows] = await pool.query(
      `SELECT * FROM verification_codes WHERE contact = ? AND channel = ? AND consumed_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1`,
      [normalize(contact), channel]
    );
    if (!rows.length || !(await bcrypt.compare(String(code), rows[0].code_hash))) return res.status(400).json({ message: "Invalid or expired verification code." });
    const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    const [result] = await pool.query(
      `INSERT INTO users (name, email, mobile, password_hash, role, email_verified_at, mobile_verified_at)
       VALUES (?, ?, ?, ?, ?, ${channel === "email" ? "NOW()" : "NULL"}, ${channel === "mobile" ? "NOW()" : "NULL"})`,
      [payload.name, payload.email, payload.mobile, payload.passwordHash, payload.role]
    );
    await pool.query(`INSERT INTO profiles (user_id) VALUES (?)`, [result.insertId]);
    await pool.query(`UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?`, [rows[0].id]);
    const user = { id: result.insertId, name: payload.name, email: payload.email, mobile: payload.mobile, role: payload.role };
    res.status(201).json({ message: "Account verified successfully.", token: signToken(user), user });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const contact = normalize(req.body.contact);
    const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1`, [contact, contact]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password_hash))) return res.status(401).json({ message: "Invalid login credentials." });
    if (user.status !== "active") return res.status(403).json({ message: "This account is suspended." });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, name, email, mobile, role FROM users WHERE id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found." });
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
