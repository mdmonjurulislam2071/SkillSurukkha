const express = require("express");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const router = express.Router();

router.get("/mine", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const ownerColumn = req.user.role === "client" ? "e.client_id" : "e.freelancer_id";
    const [transactions] = await pool.query(
      `SELECT e.id, e.project_id, e.amount, e.payment_method, e.transaction_reference, e.status, e.funded_at, e.released_at, p.title
       FROM escrows e JOIN projects p ON p.id = e.project_id
       WHERE ${ownerColumn} = ? ORDER BY e.funded_at DESC, e.id DESC`,
      [req.user.id]
    );
    const summary = transactions.reduce(
      (totals, transaction) => {
        totals.total += Number(transaction.amount);
        totals[transaction.status] += Number(transaction.amount);
        return totals;
      },
      { total: 0, funded: 0, released: 0, refunded: 0 }
    );
    res.json({ summary, transactions });
  } catch (error) { next(error); }
});

module.exports = router;
