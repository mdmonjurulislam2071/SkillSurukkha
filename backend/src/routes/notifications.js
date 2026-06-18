const express = require("express");
const pool = require("../config/db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const [notifications] = await pool.query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`, [req.user.id]);
    const [[{ unreadCount }]] = await pool.query(`SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND read_at IS NULL`, [req.user.id]);
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await pool.query(`UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE user_id = ?`, [req.user.id]);
    res.json({ message: "Notifications marked as read." });
  } catch (error) { next(error); }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    await pool.query(`UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ message: "Notification marked as read." });
  } catch (error) { next(error); }
});

module.exports = router;
