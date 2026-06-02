const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(`SELECT id, role, status FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    if (!rows.length || rows[0].status !== "active") return res.status(401).json({ message: "This session is no longer active." });
    req.user.role = rows[0].role;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." });
    next();
  };
}

module.exports = { authenticate, allowRoles };
